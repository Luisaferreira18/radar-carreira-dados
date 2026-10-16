"use client"

import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs"

import type { Mercado } from "./dados"

export const AREAS = [
  { slug: "desenvolvimento", grupo: 0 },
  { slug: "dados", grupo: 1 },
  { slug: "infra", grupo: 2 },
  { slug: "gestao", grupo: 3 },
] as const

export const ESCOLARIDADE_SLUGS = [
  "fundamental",
  "medio-incompleto",
  "medio",
  "superior-incompleto",
  "superior",
  "pos",
  "nao-identificada",
] as const

export const LOCAIS_FIXOS: Record<string, string> = {
  bh: "Belo Horizonte",
  rmbh: "Região Metropolitana de BH",
  interior: "Interior (fora da RMBH)",
  mg: "Minas Gerais",
}

const parsers = {
  de: parseAsString,
  ate: parseAsString,
  local: parseAsString.withDefault("bh"),
  area: parseAsArrayOf(parseAsString).withDefault([]),
  ocup: parseAsArrayOf(parseAsString).withDefault([]),
  esc: parseAsArrayOf(parseAsString).withDefault([]),
}

/** Filtros globais do painel Mercado, salvos na URL (?local=bh&area=dados&de=2025-01...). */
export function useFiltrosMercado() {
  return useQueryStates(parsers, { history: "replace", scroll: false })
}

export type FiltrosMercado = ReturnType<typeof useFiltrosMercado>[0]

export type FiltroResolvido = {
  a: number
  b: number
  munOk: Uint8Array
  ocupOk: Uint8Array
  escOk: Uint8Array
  rotuloLocal: string
  rotuloPeriodo: string
  /** filtro de local "neutro" (todos os municípios) — usado no mapa */
  todosMun: Uint8Array
  ativos: number
}

export type Preset = { id: string; rotulo: string; a: number; b: number }

/** Atalhos de período calculados a partir do último mês disponível. */
export function presetsPeriodo(d: Mercado): Preset[] {
  const L = d.meses.length - 1
  const anoAtual = d.meses[L].slice(0, 4)
  const inicioAno = d.meses.findIndex((m) => m.startsWith(anoAtual))
  const presets: Preset[] = [
    { id: "12m", rotulo: "Últimos 12 meses", a: Math.max(0, L - 11), b: L },
    { id: "ano", rotulo: `${anoAtual} (até agora)`, a: inicioAno, b: L },
  ]
  const anos = [...new Set(d.meses.map((m) => m.slice(0, 4)))].filter((a) => a !== anoAtual).reverse()
  for (const ano of anos) {
    const a = d.meses.findIndex((m) => m.startsWith(ano))
    const b = d.meses.findLastIndex((m) => m.startsWith(ano))
    presets.push({ id: ano, rotulo: ano, a, b })
  }
  presets.push({ id: "tudo", rotulo: `Tudo (desde ${d.meses[0].slice(0, 4)})`, a: 0, b: L })
  return presets
}

export function resolverPeriodo(d: Mercado, f: Pick<FiltrosMercado, "de" | "ate">) {
  const L = d.meses.length - 1
  const idx = (chave: string | null, padrao: number) => {
    if (!chave) return padrao
    const i = d.meses.indexOf(chave)
    return i === -1 ? padrao : i
  }
  let a = idx(f.de, Math.max(0, L - 11))
  let b = idx(f.ate, L)
  if (a > b) [a, b] = [b, a]
  return { a, b }
}

export function resolverFiltro(d: Mercado, f: FiltrosMercado): FiltroResolvido {
  const { a, b } = resolverPeriodo(d, f)

  const munOk = new Uint8Array(d.municipios.length)
  const todosMun = new Uint8Array(d.municipios.length).fill(1)
  let rotuloLocal = LOCAIS_FIXOS[f.local]
  if (f.local === "mg" || (!rotuloLocal && !/^\d{6}$/.test(f.local))) {
    munOk.fill(1)
    rotuloLocal = LOCAIS_FIXOS.mg
  } else if (f.local === "bh") {
    munOk[d.idxBH] = 1
  } else if (f.local === "rmbh" || f.local === "interior") {
    const querRmbh = f.local === "rmbh"
    d.municipios.forEach((m, i) => (munOk[i] = m.rmbh === querRmbh ? 1 : 0))
  } else {
    const i = d.municipios.findIndex((m) => m.c === f.local)
    if (i >= 0) {
      munOk[i] = 1
      rotuloLocal = d.municipios[i].n
    } else {
      munOk.fill(1)
      rotuloLocal = LOCAIS_FIXOS.mg
    }
  }

  const gruposOk = new Set<number>(
    f.area.map((s) => AREAS.find((x) => x.slug === s)?.grupo).filter((g): g is (typeof AREAS)[number]["grupo"] => g !== undefined),
  )
  const ocupOk = new Uint8Array(d.ocupacoes.length)
  d.ocupacoes.forEach((o, i) => {
    const passaArea = gruposOk.size === 0 || gruposOk.has(o.g)
    const passaOcup = f.ocup.length === 0 || f.ocup.includes(o.c)
    ocupOk[i] = passaArea && passaOcup ? 1 : 0
  })

  const escOk = new Uint8Array(d.escolaridades.length)
  d.escolaridades.forEach((_, i) => {
    escOk[i] = f.esc.length === 0 || f.esc.includes(ESCOLARIDADE_SLUGS[i]) ? 1 : 0
  })

  const ativos =
    (f.de || f.ate ? 1 : 0) + (f.local !== "bh" ? 1 : 0) + (f.area.length ? 1 : 0) + (f.ocup.length ? 1 : 0) + (f.esc.length ? 1 : 0)

  return {
    a,
    b,
    munOk,
    ocupOk,
    escOk,
    rotuloLocal,
    rotuloPeriodo: a === b ? d.meses[a] : `${d.meses[a]}|${d.meses[b]}`,
    todosMun,
    ativos,
  }
}
