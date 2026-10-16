"""Atualiza todos os dados do painel. É o que a GitHub Action roda toda semana.

Uso:  python scripts/atualizar.py      (ou: npm run dados)

Etapas (cada uma só grava arquivos se algo mudou de verdade):
  1. caged_extrair.py  baixa só os arquivos novos do Novo CAGED e atualiza o recorte de MG
  2. caged_painel.py   limpa e gera public/data/mercado.json
  3. concursos.py      descobre, baixa e limpa as planilhas de concursos -> public/data/concursos.json
  4. geo.py            malha municipal de MG -> public/data/mg-municipios.geojson

Se uma fonte falhar (servidor fora do ar, por exemplo), as outras continuam; no fim o
script sai com código 1 para a falha aparecer (a Action manda e-mail).

Não precisa dos ~3,5 GB de arquivos brutos: o recorte já processado fica versionado em
data/raw/ e só os meses novos são baixados. Para espelhar o FTP inteiro localmente,
use scripts/caged_baixar.py.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

PASTA = Path(__file__).resolve().parent
ETAPAS = [
    ("caged_extrair.py", "Novo CAGED: arquivos novos"),
    ("caged_painel.py", "Novo CAGED: JSON do painel"),
    ("concursos.py", "Concursos federais"),
    ("geo.py", "Malha municipal (IBGE)"),
]


def main() -> int:
    falhas = []
    for script, descricao in ETAPAS:
        print(f"\n=== {descricao} ({script}) ===", flush=True)
        if subprocess.run([sys.executable, str(PASTA / script)], cwd=PASTA).returncode != 0:
            falhas.append(descricao)
            print(f"!!! falhou: {descricao}", flush=True)
    if falhas:
        print(f"\nTerminado com falhas: {', '.join(falhas)}")
        return 1
    print("\nPronto. Os arquivos em public/data só mudam quando a fonte publica dados novos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
