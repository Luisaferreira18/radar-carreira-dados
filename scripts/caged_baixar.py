"""Baixa os microdados do Novo CAGED (FTP do Ministério do Trabalho).

Para cada competência (mês) existem três arquivos:
  CAGEDMOV  movimentações declaradas no prazo
  CAGEDFOR  movimentações declaradas fora do prazo
  CAGEDEXC  movimentações excluídas (canceladas) pelo empregador

Os arquivos .7z ficam em data/raw/caged/AAAAMM/ e NÃO vão para o Git
(somam ~4 GB). Um arquivo já baixado com o mesmo tamanho do FTP é pulado.

Uso:  python scripts/caged_baixar.py [--desde 202001] [--ate 202608]
"""

from __future__ import annotations

import argparse
import re
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

from comum import DIR_RAW, baixar

FTP_BASE = "ftp://ftp.mtps.gov.br/pdet/microdados/NOVO CAGED/"
DIR_CAGED = DIR_RAW / "caged"
TIPOS = ("MOV", "FOR", "EXC")


def _url(caminho: str) -> str:
    return urllib.parse.quote(caminho, safe=":/")


def listar(caminho: str) -> list[str]:
    """Lista um diretório do FTP (formato DOS: data hora tamanho nome)."""
    with urllib.request.urlopen(_url(FTP_BASE + caminho), timeout=60) as resp:
        return resp.read().decode("latin-1").splitlines()


def competencias_disponiveis() -> list[str]:
    meses: list[str] = []
    anos = [l.split()[-1] for l in listar("") if re.fullmatch(r".*\b20\d\d", l)]
    for ano in anos:
        meses += [l.split()[-1] for l in listar(f"{ano}/") if re.search(r"\b20\d{4}$", l)]
    return sorted(meses)


def arquivos_do_mes(mes: str) -> list[tuple[str, int]]:
    saida = []
    for linha in listar(f"{mes[:4]}/{mes}/"):
        partes = linha.split()
        if partes and partes[-1].endswith(".7z"):
            saida.append((partes[-1], int(partes[-2])))
    return saida


def baixar_mes(mes: str) -> str:
    destino_dir = DIR_CAGED / mes
    baixados = 0
    for nome, tamanho in arquivos_do_mes(mes):
        destino = destino_dir / nome
        if destino.exists() and destino.stat().st_size == tamanho:
            continue
        baixar(_url(f"{FTP_BASE}{mes[:4]}/{mes}/{nome}"), destino, timeout=600)
        baixados += 1
    return f"{mes}: {baixados} arquivo(s) novo(s)"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--desde", default="202001")
    parser.add_argument("--ate", default="999999")
    parser.add_argument("--paralelo", type=int, default=4)
    args = parser.parse_args()

    meses = [m for m in competencias_disponiveis() if args.desde <= m <= args.ate]
    print(f"Novo CAGED: {len(meses)} competências ({meses[0]} a {meses[-1]})")
    with ThreadPoolExecutor(max_workers=args.paralelo) as pool:
        for futuro in as_completed([pool.submit(baixar_mes, m) for m in meses]):
            print(" ", futuro.result(), flush=True)


if __name__ == "__main__":
    main()
