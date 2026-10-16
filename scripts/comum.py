"""Funções e caminhos compartilhados pelos scripts de dados."""

from __future__ import annotations

import gzip
import json
import shutil
import time
import urllib.request
from pathlib import Path

import truststore

# Usa o repositório de certificados do sistema operacional. Alguns servidores
# públicos (ex.: API do IBGE) não enviam a cadeia SSL completa, e o sistema
# consegue completá-la; a verificação de certificado continua ativa.
truststore.inject_into_ssl()

RAIZ = Path(__file__).resolve().parent.parent
DIR_RAW = RAIZ / "data" / "raw"
DIR_PROCESSADO = RAIZ / "data" / "processed"
DIR_PUBLICO = RAIZ / "public" / "data"

# O portal gov.br e alguns servidores públicos bloqueiam requisições sem
# um User-Agent de navegador.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/129.0 Safari/537.36"
)


def baixar(url: str, destino: Path, tentativas: int = 4, timeout: int = 300) -> Path:
    """Baixa `url` para `destino` (escrita atômica, com novas tentativas)."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    temporario = destino.with_suffix(destino.suffix + ".part")
    for tentativa in range(1, tentativas + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as resp, open(temporario, "wb") as f:
                shutil.copyfileobj(resp, f, length=1024 * 1024)
            # Alguns servidores (ex.: IBGE) entregam gzip mesmo sem o cliente pedir.
            with open(temporario, "rb") as f:
                comprimido = f.read(2) == b"\x1f\x8b"
            if comprimido and destino.suffix != ".gz":
                temporario.write_bytes(gzip.decompress(temporario.read_bytes()))
            temporario.replace(destino)
            return destino
        except Exception as erro:  # noqa: BLE001 - qualquer falha de rede tenta de novo
            if tentativa == tentativas:
                raise RuntimeError(f"Falha ao baixar {url}: {erro}") from erro
            espera = 5 * tentativa
            print(f"  ! erro ({erro}); nova tentativa em {espera}s")
            time.sleep(espera)
    return destino


def ler_texto(caminho: Path) -> str:
    """Lê um arquivo de texto UTF-8, descompactando se o servidor o entregou em gzip."""
    dados = caminho.read_bytes()
    if dados[:2] == b"\x1f\x8b":
        dados = gzip.decompress(dados)
    return dados.decode("utf-8")


def escrever_se_mudou(conteudo: bytes, destino: Path) -> bool:
    """Grava só se o conteúdo mudou — assim a automação não gera commits vazios."""
    if destino.exists() and destino.read_bytes() == conteudo:
        print(f"  = {destino.relative_to(RAIZ)} (sem mudanças)")
        return False
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(conteudo)
    print(f"  -> {destino.relative_to(RAIZ)} ({len(conteudo) / 1024:,.0f} KB)")
    return True


def gzip_deterministico(conteudo: bytes) -> bytes:
    """gzip sem data no cabeçalho: o mesmo conteúdo gera sempre os mesmos bytes."""
    return gzip.compress(conteudo, compresslevel=9, mtime=0)


def salvar_json(dados: dict, destino: Path) -> bool:
    """Salva o JSON do site. Se só a data de geração mudaria, mantém o arquivo como está."""
    if destino.exists() and isinstance(dados.get("fonte"), dict):
        try:
            anterior = json.loads(destino.read_text(encoding="utf-8"))
            comparavel = {**dados, "fonte": {**dados["fonte"], "geradoEm": anterior["fonte"]["geradoEm"]}}
            if comparavel == anterior:
                dados = comparavel
        except (ValueError, KeyError, TypeError):
            pass
    texto = json.dumps(dados, ensure_ascii=False, separators=(",", ":"))
    return escrever_se_mudou(texto.encode("utf-8"), destino)
