"""Limpa o recorte de Dados e TI do Novo CAGED e gera public/data/mercado.json.

Entrada:  data/raw/caged_mg_dados_ti_original.csv.gz      (gerado por caged_extrair.py)
          data/processed/caged_mg_totais_por_arquivo.csv.gz
Saída:    public/data/mercado.json  (formato colunar: uma lista por campo, com
          dimensões codificadas como índices, para o arquivo ficar leve)

Regras de limpeza (detalhadas no README):
  - contagens seguem o Ministério: no prazo (MOV) + fora do prazo (FOR) - excluídas (EXC);
  - o mês considerado é a competência da movimentação (competênciamov);
  - salário só entra nas estatísticas para admissões com remuneração mensal,
    jornada >= 30 h, sem trabalho intermitente, sem aprendiz e entre R$ 500 e R$ 100 mil;
  - idade fora de 14-90 anos vira "não informada";
  - códigos são traduzidos para nomes legíveis (dicionário oficial do CAGED).

Uso:  python scripts/caged_painel.py
"""

from __future__ import annotations

import csv
from datetime import datetime, timezone

import polars as pl

from comum import DIR_PROCESSADO, DIR_PUBLICO, DIR_RAW, RAIZ, salvar_json
from geo import municipios

ENTRADA = DIR_RAW / "caged_mg_dados_ti_original.csv.gz"
TOTAIS = DIR_PROCESSADO / "caged_mg_totais_por_arquivo.csv.gz"

GRUPOS = ["Desenvolvimento", "Dados e Negócios", "Infraestrutura e Suporte", "Gestão de TI"]
SECOES = {
    "A": "Agropecuária", "B": "Indústria extrativa", "C": "Indústria de transformação",
    "D": "Eletricidade e gás", "E": "Água, esgoto e resíduos", "F": "Construção",
    "G": "Comércio", "H": "Transporte e logística", "I": "Alojamento e alimentação",
    "J": "Informação e comunicação", "K": "Finanças e seguros", "L": "Atividades imobiliárias",
    "M": "Serviços profissionais e técnicos", "N": "Serviços administrativos",
    "O": "Administração pública", "P": "Educação", "Q": "Saúde e serviços sociais",
    "R": "Artes, cultura e esporte", "S": "Outros serviços", "T": "Serviços domésticos",
    "U": "Organismos internacionais", "Z": "Não identificado",
}
ESCOLARIDADES = [
    "Fundamental", "Médio incompleto", "Médio completo", "Superior incompleto",
    "Superior completo", "Pós-graduação", "Não identificada",
]
COD_ESCOLARIDADE = {
    **{str(c): 0 for c in range(1, 6)}, "6": 1, "7": 2, "8": 3, "9": 4, "10": 5, "11": 5, "80": 5,
}
SEXOS = ["Homem", "Mulher", "Não identificado"]
COD_SEXO = {"1": 0, "3": 1}
RACAS = ["Branca", "Preta", "Parda", "Amarela", "Indígena", "Não informada"]
COD_RACA = {"1": 0, "2": 1, "3": 2, "4": 3, "5": 4}


def ler_ocupacoes() -> list[dict]:
    with open(RAIZ / "scripts" / "grupos_cbo.csv", encoding="utf-8") as f:
        return [{"c": l["cbo"], "n": l["nome"], "g": GRUPOS.index(l["grupo"])} for l in csv.DictReader(f, delimiter=";")]


def numero(coluna: str) -> pl.Expr:
    return pl.col(coluna).str.replace(",", ".").cast(pl.Float64, strict=False)


def main() -> None:
    print("Gerando public/data/mercado.json")
    lista_mun = municipios()
    idx_mun = {m["codigo"]: i for i, m in enumerate(lista_mun)}
    ocupacoes = ler_ocupacoes()
    idx_ocup = {o["c"]: i for i, o in enumerate(ocupacoes)}
    secoes = list(SECOES)

    df = pl.read_csv(ENTRADA, separator=";", infer_schema=False)
    df = df.with_columns(
        competencia=pl.col("competênciamov"),
        saldo=pl.col("saldomovimentação").cast(pl.Int8),
        sal=numero("salário"),
        horas=numero("horascontratuais"),
        idade_n=pl.col("idade").cast(pl.Int16, strict=False),
    ).filter(pl.col("competencia") >= "202001")

    meses = sorted(df["competencia"].unique().to_list())
    idx_mes = {m: i for i, m in enumerate(meses)}

    exclusao = pl.col("arquivo_origem").str.starts_with("CAGEDEXC")
    elegivel = (
        (pl.col("saldo") == 1) & ~exclusao
        & (pl.col("unidadesaláriocódigo") == "5")
        & (pl.col("horas") >= 30)
        & (pl.col("indtrabintermitente") == "0")
        & (pl.col("indicadoraprendiz") == "0")
        & ~pl.col("categoria").is_in(["103", "111"])
        & pl.col("sal").is_between(500, 100_000)
    )
    df = df.with_columns(
        t=pl.when(exclusao).then(pl.col("saldo") * 2).otherwise(pl.col("saldo")),
        ok=elegivel.cast(pl.Int8),
        idade_ok=pl.when(pl.col("idade_n").is_between(14, 90)).then(pl.col("idade_n")).otherwise(-1),
    ).sort(["competencia", "município", "cbo2002ocupação", "arquivo_origem"], maintain_order=True)

    sem_municipio = df.filter(~pl.col("município").is_in(list(idx_mun)))
    if sem_municipio.height:
        print(f"  ! {sem_municipio.height} linhas com município fora da lista do IBGE (descartadas)")
        df = df.filter(pl.col("município").is_in(list(idx_mun)))

    def mapear(coluna: str, mapa: dict, padrao: int) -> list[int]:
        return [mapa.get(v, padrao) for v in df[coluna].to_list()]

    mov = {
        "m": [idx_mes[v] for v in df["competencia"].to_list()],
        "mu": [idx_mun[v] for v in df["município"].to_list()],
        "o": [idx_ocup[v] for v in df["cbo2002ocupação"].to_list()],
        "s": mapear("seção", {s: i for i, s in enumerate(secoes)}, secoes.index("Z")),
        "e": mapear("graudeinstrução", COD_ESCOLARIDADE, len(ESCOLARIDADES) - 1),
        "i": df["idade_ok"].to_list(),
        "x": mapear("sexo", COD_SEXO, 2),
        "r": mapear("raçacor", COD_RACA, 5),
        "t": df["t"].to_list(),
        "sal": [int(round(v)) if v is not None else 0 for v in df["sal"].to_list()],
        "ok": df["ok"].to_list(),
    }

    # soma os totais de todos os arquivos (MOV + FOR − EXC) por mês e município
    totais = (
        pl.read_csv(TOTAIS, separator=";", infer_schema=False)
        .with_columns(pl.col("adm").cast(pl.Int64), pl.col("desl").cast(pl.Int64))
        .group_by(["competencia", "municipio"])
        .agg(pl.col("adm").sum(), pl.col("desl").sum())
        .filter(pl.col("competencia").is_in(meses) & pl.col("municipio").is_in(list(idx_mun)))
        .sort(["competencia", "municipio"])
    )
    contexto = {
        "m": [idx_mes[v] for v in totais["competencia"].to_list()],
        "mu": [idx_mun[v] for v in totais["municipio"].to_list()],
        "adm": totais["adm"].to_list(),
        "desl": totais["desl"].to_list(),
    }

    admissoes = df.filter(pl.col("t") == 1).height - df.filter(pl.col("t") == 2).height
    desligamentos = df.filter(pl.col("t") == -1).height - df.filter(pl.col("t") == -2).height
    print(f"  {df.height:,} movimentações | admissões {admissoes:,} | desligamentos {desligamentos:,}")
    print(f"  salário elegível em {df['ok'].sum():,} admissões | {len(meses)} meses ({meses[0]} a {meses[-1]})")

    salvar_json(
        {
            "fonte": {
                "nome": "Novo CAGED — Ministério do Trabalho e Emprego",
                "url": "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/novo-caged",
                "ftp": "ftp://ftp.mtps.gov.br/pdet/microdados/NOVO%20CAGED/",
                "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "ultimaCompetencia": meses[-1],
            },
            "meses": [f"{m[:4]}-{m[4:]}" for m in meses],
            "municipios": [{"c": m["codigo"], "n": m["nome"], "rmbh": m["rmbh"]} for m in lista_mun],
            "ocupacoes": ocupacoes,
            "grupos": GRUPOS,
            "secoes": [SECOES[s] for s in secoes],
            "escolaridades": ESCOLARIDADES,
            "sexos": SEXOS,
            "racas": RACAS,
            "mov": mov,
            "totais": contexto,
        },
        DIR_PUBLICO / "mercado.json",
    )


if __name__ == "__main__":
    main()
