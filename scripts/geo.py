"""Baixa os contornos e nomes dos municípios de Minas Gerais (API do IBGE).

Saídas:
  data/raw/geo/mg_municipios_ibge.geojson   original do IBGE
  data/raw/geo/mg_municipios_nomes.json     original do IBGE
  public/data/mg-municipios.geojson         só código (6 dígitos, padrão CAGED) e nome

Uso:  python scripts/geo.py
"""

from __future__ import annotations

import json

from comum import DIR_PUBLICO, DIR_RAW, baixar, ler_texto, salvar_json

URL_MALHA = (
    "https://servicodados.ibge.gov.br/api/v3/malhas/estados/31"
    "?intrarregiao=municipio&formato=application/vnd.geo%2Bjson&qualidade=minima"
)
URL_NOMES = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/31/municipios"
DIR_GEO = DIR_RAW / "geo"

# Região Metropolitana de Belo Horizonte (34 municípios, Lei Complementar Estadual 89/2006).
RMBH = {
    "Baldim", "Belo Horizonte", "Betim", "Brumadinho", "Caeté", "Capim Branco", "Confins",
    "Contagem", "Esmeraldas", "Florestal", "Ibirité", "Igarapé", "Itaguara", "Itatiaiuçu",
    "Jaboticatubas", "Juatuba", "Lagoa Santa", "Mário Campos", "Mateus Leme", "Matozinhos",
    "Nova Lima", "Nova União", "Pedro Leopoldo", "Raposos", "Ribeirão das Neves", "Rio Acima",
    "Rio Manso", "Sabará", "Santa Luzia", "São Joaquim de Bicas", "São José da Lapa", "Sarzedo",
    "Taquaraçu de Minas", "Vespasiano",
}


def arredondar(coords, casas=3):
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], casas), round(coords[1], casas)]
    return [arredondar(c, casas) for c in coords]


def municipios() -> list[dict]:
    """Lista de municípios de MG com código CAGED (6 dígitos) e marcação RMBH."""
    caminho = DIR_GEO / "mg_municipios_nomes.json"
    if not caminho.exists():
        baixar(URL_NOMES, caminho)
    dados = json.loads(ler_texto(caminho))
    lista = [{"codigo": str(m["id"])[:6], "nome": m["nome"], "rmbh": m["nome"] in RMBH} for m in dados]
    assert sum(m["rmbh"] for m in lista) == len(RMBH), "nomes da RMBH não batem com o IBGE"
    return lista


def main() -> None:
    print("Malha municipal de MG (IBGE)")
    malha = DIR_GEO / "mg_municipios_ibge.geojson"
    if not malha.exists():
        baixar(URL_MALHA, malha)
    nomes = {m["codigo"]: m["nome"] for m in municipios()}
    geo = json.loads(ler_texto(malha))
    for feature in geo["features"]:
        codigo = str(feature["properties"]["codarea"])[:6]
        feature["properties"] = {"c": codigo, "n": nomes.get(codigo, "")}
        feature["geometry"]["coordinates"] = arredondar(feature["geometry"]["coordinates"])
    print(f"  {len(geo['features'])} municípios")
    salvar_json(geo, DIR_PUBLICO / "mg-municipios.geojson")


if __name__ == "__main__":
    main()
