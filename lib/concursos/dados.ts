"use client"

import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs"

export type Autorizacao = {
  ano: number
  data: string | null
  orgao: string
  vinculo: string
  cargos: string[]
  escolaridade: string
  vagas: number
  cadastroReserva: boolean
  tipo: string
  tipoOriginal: string
  area: string
  ato: string
  link: string
  ti: boolean
}

export type Concursos = {
  fonte: { nome: string; url: string; geradoEm: string; anosSemPlanilha: number[]; ultimaDataAto: string }
  registros: Autorizacao[]
  anos: number[]
}

export const URL_CONCURSOS = "/data/concursos.json"

export function decodificarConcursos(bruto: Omit<Concursos, "anos">): Concursos {
  const min = Math.min(...bruto.registros.map((r) => r.ano))
  const max = Math.max(...bruto.registros.map((r) => r.ano))
  return { ...bruto, anos: Array.from({ length: max - min + 1 }, (_, i) => min + i) }
}

// Ordem fixa dos tipos = ordem fixa das cores (a cor acompanha a categoria, nunca a posição)
export const TIPOS = [
  { slug: "concurso", nome: "Concurso público", cor: 0 },
  { slug: "nomeacao", nome: "Nomeação de aprovados", cor: 1 },
  { slug: "judicial", nome: "Decisão judicial", cor: 2 },
  { slug: "temporaria", nome: "Contratação temporária", cor: 3 },
] as const

export const ESCOLARIDADES = ["Superior", "Superior e médio", "Médio", "Inclui fundamental", "Não informado"] as const

const parsers = {
  de: parseAsString,
  ate: parseAsString,
  tipo: parseAsArrayOf(parseAsString).withDefault([]),
  esc: parseAsArrayOf(parseAsString).withDefault([]),
  ministerio: parseAsArrayOf(parseAsString).withDefault([]),
  cargos: parseAsString.withDefault("todos"),
}

export function useFiltrosConcursos() {
  return useQueryStates(parsers, { history: "replace", scroll: false })
}

export type FiltrosConcursos = ReturnType<typeof useFiltrosConcursos>[0]

/** Sem seleção de tipo, o padrão é tudo menos contratação temporária (o Censo do IBGE distorce a série). */
export function tiposAtivos(f: FiltrosConcursos): Set<string> {
  const slugs = f.tipo.length ? f.tipo : ["concurso", "nomeacao", "judicial"]
  return new Set(TIPOS.filter((t) => slugs.includes(t.slug)).map((t) => t.nome))
}

export function resolverAnos(c: Concursos, f: FiltrosConcursos) {
  const ini = c.anos[0]
  const fim = c.anos[c.anos.length - 1]
  const conv = (v: string | null, padrao: number) => {
    const n = Number(v)
    return v && Number.isInteger(n) && n >= ini && n <= fim ? n : padrao
  }
  let a = conv(f.de, ini)
  let b = conv(f.ate, fim)
  if (a > b) [a, b] = [b, a]
  return { a, b }
}
