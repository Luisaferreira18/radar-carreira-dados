"""Mantém atualizado o recorte do Novo CAGED usado no painel — de forma incremental.

O Ministério do Trabalho publica, para cada mês de declaração, três arquivos no FTP:
  CAGEDMOV  movimentações declaradas no prazo
  CAGEDFOR  movimentações declaradas fora do prazo
  CAGEDEXC  movimentações excluídas (canceladas) pelo empregador

O script compara a lista do FTP com data/raw/caged_manifesto.json (arquivos já
processados e seus tamanhos) e só processa o que é novo ou mudou. Para cada arquivo:
  1. usa a cópia local em data/raw/caged/ se existir; senão baixa (~50 MB) e apaga depois;
  2. mantém só Minas Gerais (uf = 31);
  3. guarda SEM ALTERAÇÕES as linhas das ocupações de Dados e TI
     (scripts/grupos_cbo.csv), acrescentando só a coluna `arquivo_origem`;
  4. soma admissões e desligamentos de TODAS as ocupações por município e mês
     (contexto: "Dados e TI representam X% das contratações").

Como cada linha guarda o arquivo de origem, um arquivo republicado pelo Ministério
tem suas linhas antigas substituídas — nada é contado duas vezes.

Saídas (versionadas no Git, para a atualização rodar sem o histórico bruto de ~3,5 GB):
  data/raw/caged_mg_dados_ti_original.csv.gz
  data/raw/caged_manifesto.json
  data/processed/caged_mg_totais_por_arquivo.csv.gz

Uso:  python scripts/caged_extrair.py
Saída do processo: 0 = atualizou, 0 com "nada novo" = nada a fazer, 1 = erro.
"""

from __future__ import annotations

import csv
import io
import json
import sys
import time

import polars as pl
import py7zr

from caged_baixar import FTP_BASE, _url, arquivos_do_mes, competencias_disponiveis
from comum import DIR_PROCESSADO, DIR_RAW, RAIZ, baixar, escrever_se_mudou, gzip_deterministico

DIR_CAGED = DIR_RAW / "caged"  # espelho local opcional (não vai para o Git)
DIR_TMP = RAIZ / "data" / "tmp" / "caged"
DIR_CACHE = RAIZ / "data" / "tmp" / "caged_cache"
MANIFESTO = DIR_RAW / "caged_manifesto.json"
SAIDA_ORIGINAL = DIR_RAW / "caged_mg_dados_ti_original.csv.gz"
SAIDA_TOTAIS = DIR_PROCESSADO / "caged_mg_totais_por_arquivo.csv.gz"

# Nomes oficiais das colunas (layout do Ministério do Trabalho), usados para
# devolver ao recorte original os nomes exatos que vêm nos arquivos.
COLUNAS_OFICIAIS = [
    "competênciamov", "região", "uf", "município", "seção", "subclasse", "saldomovimentação",
    "categoria", "cbo2002ocupação", "graudeinstrução", "idade", "horascontratuais", "raçacor",
    "sexo", "tipoempregador", "tipoestabelecimento", "tipomovimentação", "tipodedeficiência",
    "indtrabintermitente", "indtrabparcial", "salário", "tamestabjan", "indicadoraprendiz",
    "origemdainformação", "competênciadec", "competênciaexc", "indicadordeexclusão",
    "indicadordeforadoprazo", "unidadesaláriocódigo", "valorsaláriofixo",
]


def normalizar(coluna: str) -> str:
    """Os arquivos MOV vêm em UTF-8 e os FOR/EXC em Latin-1. Lidos como UTF-8
    "lossy", os acentos viram caracteres inválidos; descartando tudo que não é
    ASCII, os dois casos chegam ao mesmo nome (ex.: 'competnciamov')."""
    return coluna.encode("ascii", "ignore").decode().strip().lower()


OFICIAIS = {normalizar(c): c for c in COLUNAS_OFICIAIS}


def ler_cbos() -> list[str]:
    with open(RAIZ / "scripts" / "grupos_cbo.csv", encoding="utf-8") as f:
        return [linha["cbo"] for linha in csv.DictReader(f, delimiter=";")]


def processar_arquivo(arquivo_7z, cbos: list[str]) -> tuple[pl.DataFrame, pl.DataFrame]:
    """Lê um .7z do CAGED e devolve (linhas de Dados e TI em MG, totais de MG por município/mês)."""
    DIR_TMP.mkdir(parents=True, exist_ok=True)
    with py7zr.SevenZipFile(arquivo_7z) as z:
        nome_txt = z.getnames()[0]
        z.extractall(path=DIR_TMP)
    caminho_txt = DIR_TMP / nome_txt
    try:
        df = pl.read_csv(caminho_txt, separator=";", encoding="utf8-lossy", infer_schema=False, quote_char=None)
    finally:
        caminho_txt.unlink(missing_ok=True)

    df = df.rename({c: normalizar(c) for c in df.columns})
    mg = df.filter(pl.col("uf") == "31")
    sinal = -1 if "EXC" in arquivo_7z.name else 1  # exclusões anulam a movimentação original
    totais = (
        mg.group_by(["competnciamov", "municpio"])
        .agg(
            (pl.col("saldomovimentao") == "1").sum().cast(pl.Int64).alias("adm"),
            (pl.col("saldomovimentao") == "-1").sum().cast(pl.Int64).alias("desl"),
        )
        .with_columns(pl.col("adm") * sinal, pl.col("desl") * sinal)
    )
    ti = mg.filter(pl.col("cbo2002ocupao").is_in(cbos))
    return ti, totais


def obter_7z(mes: str, nome: str, tamanho: int):
    """Usa a cópia local se estiver completa; senão baixa para a pasta temporária."""
    local = DIR_CAGED / mes / nome
    if local.exists() and local.stat().st_size == tamanho:
        return local, False
    destino = DIR_TMP / nome
    baixar(_url(f"{FTP_BASE}{mes[:4]}/{mes}/{nome}"), destino, timeout=600)
    return destino, True


def processar_com_cache(caminho, cbos):
    cache_ti = DIR_CACHE / f"{caminho.stem}_ti.parquet"
    cache_tot = DIR_CACHE / f"{caminho.stem}_totais.parquet"
    if cache_ti.exists() and cache_tot.exists() and cache_ti.stat().st_mtime > caminho.stat().st_mtime:
        return pl.read_parquet(cache_ti), pl.read_parquet(cache_tot)
    ti, totais = processar_arquivo(caminho, cbos)
    DIR_CACHE.mkdir(parents=True, exist_ok=True)
    ti.write_parquet(cache_ti)
    totais.write_parquet(cache_tot)
    return ti, totais


def csv_gz(df: pl.DataFrame) -> bytes:
    buffer = io.BytesIO()
    df.write_csv(buffer, separator=";")
    return gzip_deterministico(buffer.getvalue())


def main() -> int:
    cbos = ler_cbos()
    manifesto: dict[str, int] = json.loads(MANIFESTO.read_text(encoding="utf-8")) if MANIFESTO.exists() else {}

    print("Consultando o FTP do Novo CAGED...")
    disponiveis = [(mes, nome, tam) for mes in competencias_disponiveis() for nome, tam in arquivos_do_mes(mes)]
    pendentes = [(m, n, t) for m, n, t in disponiveis if manifesto.get(n) != t]
    print(f"  {len(disponiveis)} arquivos no FTP, {len(pendentes)} novo(s) ou alterado(s)")
    if not pendentes:
        print("  nada novo para processar")
        return 0

    if manifesto and SAIDA_ORIGINAL.exists() and SAIDA_TOTAIS.exists():
        ti_atual = pl.read_csv(SAIDA_ORIGINAL, separator=";", infer_schema=False)
        tot_atual = pl.read_csv(SAIDA_TOTAIS, separator=";", schema_overrides={c: pl.Utf8 for c in ("arquivo_origem", "competencia", "municipio")})
    else:
        ti_atual, tot_atual = pl.DataFrame(), pl.DataFrame()

    novos_ti, novos_tot, processados = [], [], []
    inicio = time.time()
    for i, (mes, nome, tamanho) in enumerate(pendentes, 1):
        caminho, temporario = obter_7z(mes, nome, tamanho)
        try:
            ti, totais = processar_com_cache(caminho, cbos)
        finally:
            if temporario:
                caminho.unlink(missing_ok=True)
        origem = caminho.stem  # ex.: CAGEDMOV202608
        ti = ti.drop("arquivo", strict=False).rename(lambda c: OFICIAIS.get(c, c))
        novos_ti.append(ti.with_columns(pl.lit(origem).alias("arquivo_origem")))
        novos_tot.append(
            totais.rename({"competnciamov": "competencia", "municpio": "municipio"})
            .with_columns(pl.lit(origem).alias("arquivo_origem"))
            .select("arquivo_origem", "competencia", "municipio", "adm", "desl")
        )
        processados.append((nome, tamanho, origem))
        print(f"  [{i}/{len(pendentes)}] {nome}: {ti.height:,} linhas de Dados e TI ({time.time() - inicio:,.0f}s)", flush=True)

    substituidos = [o for _, _, o in processados]
    if ti_atual.height:
        ti_atual = ti_atual.filter(~pl.col("arquivo_origem").is_in(substituidos))
        tot_atual = tot_atual.filter(~pl.col("arquivo_origem").is_in(substituidos))
    ti = pl.concat([ti_atual, *novos_ti], how="diagonal_relaxed").sort(["competênciamov", "arquivo_origem", "município", "cbo2002ocupação"], maintain_order=True)
    tot = pl.concat([tot_atual, *novos_tot], how="diagonal_relaxed").sort(["arquivo_origem", "competencia", "municipio"])

    print(f"Recorte de Dados e TI em MG: {ti.height:,} linhas")
    escrever_se_mudou(csv_gz(ti), SAIDA_ORIGINAL)
    escrever_se_mudou(csv_gz(tot), SAIDA_TOTAIS)
    for nome, tamanho, _ in processados:
        manifesto[nome] = tamanho
    escrever_se_mudou(json.dumps(dict(sorted(manifesto.items())), indent=1).encode("utf-8"), MANIFESTO)
    return 0


if __name__ == "__main__":
    sys.exit(main())
