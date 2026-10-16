"use client"

import { useCallback, useMemo } from "react"

import { DataTable, type Coluna } from "@/components/dashboard/data-table"
import { Badge } from "@/components/ui/badge"
import { fmtMes, fmtMoeda } from "@/lib/format"
import type { Mercado } from "@/lib/mercado/dados"

const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

type Props = { d: Mercado; linhas: Int32Array }

export function TabelaMercado({ d, linhas }: Props) {
  const { mov } = d

  const colunas: Coluna[] = useMemo(
    () => [
      { id: "mes", titulo: "Mês", valor: (k) => d.meses[mov.m[k]], celula: (k) => fmtMes(d.meses[mov.m[k]]), largura: "96px" },
      {
        id: "tipo",
        titulo: "Movimentação",
        valor: (k) => (mov.t[k] === 1 ? "Admissão" : "Desligamento"),
        celula: (k) =>
          mov.t[k] === 1 ? (
            <Badge variant="secondary" className="bg-primary/10 text-primary">Admissão</Badge>
          ) : (
            <Badge variant="secondary">Desligamento</Badge>
          ),
        largura: "128px",
      },
      { id: "municipio", titulo: "Município", valor: (k) => d.municipios[mov.mu[k]].n, largura: "160px" },
      { id: "ocupacao", titulo: "Ocupação", valor: (k) => d.ocupacoes[mov.o[k]].n, largura: "260px" },
      { id: "area", titulo: "Área", valor: (k) => d.grupos[d.ocupacoes[mov.o[k]].g], largura: "170px" },
      { id: "setor", titulo: "Setor", valor: (k) => d.secoes[mov.s[k]], largura: "200px" },
      { id: "escolaridade", titulo: "Escolaridade", valor: (k) => d.escolaridades[mov.e[k]], largura: "150px" },
      { id: "idade", titulo: "Idade", valor: (k) => (mov.i[k] >= 0 ? mov.i[k] : ""), numerica: true, largura: "72px" },
      { id: "sexo", titulo: "Sexo", valor: (k) => d.sexos[mov.x[k]], largura: "96px" },
      {
        id: "salario",
        titulo: "Salário (R$)",
        valor: (k) => mov.sal[k],
        celula: (k) => (mov.sal[k] > 0 ? fmtMoeda(mov.sal[k]) : "—"),
        numerica: true,
        largura: "120px",
      },
    ],
    [d, mov],
  )

  // Busca eficiente: testa o texto contra os dicionários (municípios, ocupações,
  // áreas, setores) uma vez, e depois só consulta os índices de cada linha.
  const criarBusca = useCallback(
    (texto: string) => {
      const q = normalizar(texto)
      const munOk = d.municipios.map((m) => normalizar(m.n).includes(q))
      const grupoOk = d.grupos.map((g) => normalizar(g).includes(q))
      const ocupOk = d.ocupacoes.map((o) => normalizar(o.n).includes(q) || o.c.startsWith(q) || grupoOk[o.g])
      const setorOk = d.secoes.map((s) => normalizar(s).includes(q))
      return (k: number) => munOk[mov.mu[k]] || ocupOk[mov.o[k]] || setorOk[mov.s[k]]
    },
    [d, mov],
  )

  return (
    <DataTable
      colunas={colunas}
      linhas={linhas}
      criarBusca={criarBusca}
      placeholderBusca="Ex.: Contagem, analista, finanças..."
      nomeArquivo="radar-carreira-caged-dados-ti"
    />
  )
}
