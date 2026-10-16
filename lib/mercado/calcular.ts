// Todos os números do painel Mercado saem desta função: uma passada pelas
// movimentações filtradas, sem objetos intermediários (rápido mesmo com
// centenas de milhares de linhas).

import { ordenar, quantil, variacao } from "@/lib/estatistica"

import type { Mercado } from "./dados"
import type { FiltroResolvido } from "./filtros"

export type Distribuicao = { n: number; p25: number; mediana: number; p75: number }
export type ItemContagem = { idx: number; nome: string; n: number }
export type ItemSalario = Distribuicao & { idx: number; nome: string; grupo?: number }

export const FAIXAS_IDADE = ["Até 24", "25 a 29", "30 a 34", "35 a 39", "40 a 49", "50 ou mais"] as const
const LIMITES_IDADE = [24, 29, 34, 39, 49, 200]

export const FAIXAS_SALARIO_INICIO = 2000
export const FAIXAS_SALARIO_FIM = 20000
export const FAIXAS_SALARIO_PASSO = 1000

export type Resumo = {
  meses: string[]
  temAnterior: boolean
  rotuloAnterior: string
  kpis: {
    adm: number
    admAnt: number
    desl: number
    deslAnt: number
    saldo: number
    saldoAnt: number
    mediana: number
    medianaAnt: number
    pctMulher: number
    pctMulherAnt: number
    pctSuperior: number
    pctSuperiorAnt: number
    participacao: number
    nSalario: number
  }
  variacoes: { adm: number; saldo: number; mediana: number }
  serie: { adm: number[]; desl: number[]; saldo: number[]; mediana: number[]; pctMulher: number[]; pctSuperior: number[] }
  salarioPorGrupo: ItemSalario[]
  salarioPorOcupacao: ItemSalario[]
  salarioPorEscolaridade: ItemSalario[]
  histograma: { rotulo: string; de: number; ate: number | null; n: number }[]
  setores: ItemContagem[]
  ocupacoes: ItemContagem[]
  idade: ItemContagem[]
  escolaridade: ItemContagem[]
  salarioPorSexo: { homem: Distribuicao; mulher: Distribuicao }
  /** admissões por município (ignora o filtro de local) — usado no mapa */
  porMunicipio: Int32Array
  /** índices das linhas (admissões e desligamentos) que passam nos filtros, mais recentes primeiro */
  linhas: Int32Array
}

function distribuicao(valores: number[]): Distribuicao {
  const o = ordenar(valores)
  return { n: o.length, p25: quantil(o, 0.25), mediana: quantil(o, 0.5), p75: quantil(o, 0.75) }
}

export function calcular(d: Mercado, f: FiltroResolvido): Resumo {
  const { mov } = d
  const { a, b, munOk, ocupOk, escOk } = f
  const nMeses = b - a + 1
  const antA = a - nMeses
  const antB = a - 1
  const temAnterior = antA >= 0

  const admM = new Array<number>(nMeses).fill(0)
  const deslM = new Array<number>(nMeses).fill(0)
  const salM: number[][] = Array.from({ length: nMeses }, () => [])
  const mulherM = new Array<number>(nMeses).fill(0)
  const sexoIdM = new Array<number>(nMeses).fill(0)
  const supM = new Array<number>(nMeses).fill(0)
  const escIdM = new Array<number>(nMeses).fill(0)

  let admAnt = 0
  let deslAnt = 0
  const salAnt: number[] = []
  let mulherAnt = 0
  let sexoIdAnt = 0
  let supAnt = 0
  let escIdAnt = 0

  const salGrupo: number[][] = d.grupos.map(() => [])
  const salOcup: number[][] = d.ocupacoes.map(() => [])
  const salEsc: number[][] = d.escolaridades.map(() => [])
  const salHomem: number[] = []
  const salMulher: number[] = []
  const setores = new Array<number>(d.secoes.length).fill(0)
  const ocupacoes = new Array<number>(d.ocupacoes.length).fill(0)
  const idade = new Array<number>(FAIXAS_IDADE.length).fill(0)
  const escolaridade = new Array<number>(d.escolaridades.length).fill(0)
  const porMunicipio = new Int32Array(d.municipios.length)
  const linhas: number[] = []

  for (let k = 0; k < mov.n; k++) {
    const m = mov.m[k]
    if (m < (temAnterior ? antA : a) || m > b) continue
    const o = mov.o[k]
    const e = mov.e[k]
    if (!ocupOk[o] || !escOk[e]) continue
    const t = mov.t[k]
    const pesoAdm = t === 1 ? 1 : t === 2 ? -1 : 0
    const pesoDesl = t === -1 ? 1 : t === -2 ? -1 : 0
    const atual = m >= a

    if (atual) porMunicipio[mov.mu[k]] += pesoAdm
    if (!munOk[mov.mu[k]]) continue

    if (!atual) {
      admAnt += pesoAdm
      deslAnt += pesoDesl
      if (t === 1) {
        if (mov.ok[k]) salAnt.push(mov.sal[k])
        if (mov.x[k] !== 2) {
          sexoIdAnt++
          if (mov.x[k] === 1) mulherAnt++
        }
        if (e !== 6) {
          escIdAnt++
          if (e >= 4) supAnt++
        }
      }
      continue
    }

    const j = m - a
    admM[j] += pesoAdm
    deslM[j] += pesoDesl
    if (t === 1 || t === -1) linhas.push(k)
    if (t !== 1) {
      if (t === 2) {
        setores[mov.s[k]]--
        ocupacoes[o]--
      }
      continue
    }

    setores[mov.s[k]]++
    ocupacoes[o]++
    escolaridade[e]++
    const id = mov.i[k]
    if (id >= 0) idade[LIMITES_IDADE.findIndex((lim) => id <= lim)]++
    if (mov.x[k] !== 2) {
      sexoIdM[j]++
      if (mov.x[k] === 1) mulherM[j]++
    }
    if (e !== 6) {
      escIdM[j]++
      if (e >= 4) supM[j]++
    }
    if (mov.ok[k]) {
      const s = mov.sal[k]
      salM[j].push(s)
      salGrupo[d.ocupacoes[o].g].push(s)
      salOcup[o].push(s)
      salEsc[e].push(s)
      if (mov.x[k] === 0) salHomem.push(s)
      else if (mov.x[k] === 1) salMulher.push(s)
    }
  }

  const soma = (v: number[]) => v.reduce((x, y) => x + y, 0)
  const adm = soma(admM)
  const desl = soma(deslM)
  const todosSal = salM.flat()
  const distAtual = distribuicao(todosSal)
  const medianaAnt = temAnterior ? quantil(ordenar(salAnt), 0.5) : Number.NaN
  const razao = (x: number, y: number) => (y > 0 ? x / y : Number.NaN)

  // Contexto: total de contratações (todas as ocupações) no local e período.
  let totalAdm = 0
  for (let k = 0; k < d.totais.n; k++) {
    const m = d.totais.m[k]
    if (m >= a && m <= b && munOk[d.totais.mu[k]]) totalAdm += d.totais.adm[k]
  }

  const histograma = []
  for (let de = 0; de < FAIXAS_SALARIO_FIM; de = de === 0 ? FAIXAS_SALARIO_INICIO : de + FAIXAS_SALARIO_PASSO) {
    const ate = de === 0 ? FAIXAS_SALARIO_INICIO : de + FAIXAS_SALARIO_PASSO
    histograma.push({ rotulo: "", de, ate, n: 0 })
  }
  histograma.push({ rotulo: "", de: FAIXAS_SALARIO_FIM, ate: null as number | null, n: 0 })
  for (const s of todosSal) {
    const i = s < FAIXAS_SALARIO_INICIO ? 0 : Math.min(histograma.length - 1, 1 + Math.floor((s - FAIXAS_SALARIO_INICIO) / FAIXAS_SALARIO_PASSO))
    histograma[i].n++
  }

  const contagem = (valores: number[], nomes: string[]): ItemContagem[] =>
    valores.map((n, idx) => ({ idx, nome: nomes[idx], n })).filter((x) => x.n > 0)

  const linhasOrdenadas = Int32Array.from(linhas)
  linhasOrdenadas.reverse() // as linhas vêm em ordem cronológica; tabela abre com as mais recentes

  const kpis = {
    adm,
    admAnt,
    desl,
    deslAnt,
    saldo: adm - desl,
    saldoAnt: admAnt - deslAnt,
    mediana: distAtual.mediana,
    medianaAnt,
    pctMulher: razao(soma(mulherM), soma(sexoIdM)),
    pctMulherAnt: razao(mulherAnt, sexoIdAnt),
    pctSuperior: razao(soma(supM), soma(escIdM)),
    pctSuperiorAnt: razao(supAnt, escIdAnt),
    participacao: razao(adm, totalAdm),
    nSalario: distAtual.n,
  }

  return {
    meses: d.meses.slice(a, b + 1),
    temAnterior,
    rotuloAnterior: temAnterior ? `${d.meses[antA]}|${d.meses[antB]}` : "",
    kpis,
    variacoes: {
      adm: temAnterior ? variacao(adm, admAnt) : Number.NaN,
      saldo: temAnterior ? variacao(kpis.saldo, kpis.saldoAnt) : Number.NaN,
      mediana: temAnterior ? variacao(kpis.mediana, medianaAnt) : Number.NaN,
    },
    serie: {
      adm: admM,
      desl: deslM,
      saldo: admM.map((x, i) => x - deslM[i]),
      mediana: salM.map((v) => (v.length >= 5 ? quantil(ordenar(v), 0.5) : Number.NaN)),
      pctMulher: mulherM.map((x, i) => razao(x, sexoIdM[i])),
      pctSuperior: supM.map((x, i) => razao(x, escIdM[i])),
    },
    salarioPorGrupo: salGrupo
      .map((v, idx) => ({ idx, nome: d.grupos[idx], grupo: idx, ...distribuicao(v) }))
      .filter((x) => x.n > 0),
    salarioPorOcupacao: salOcup
      .map((v, idx) => ({ idx, nome: d.ocupacoes[idx].n, grupo: d.ocupacoes[idx].g, ...distribuicao(v) }))
      .filter((x) => x.n > 0),
    salarioPorEscolaridade: salEsc
      .map((v, idx) => ({ idx, nome: d.escolaridades[idx], ...distribuicao(v) }))
      .filter((x) => x.n > 0),
    histograma,
    setores: contagem(setores, d.secoes).sort((x, y) => y.n - x.n),
    ocupacoes: contagem(ocupacoes, d.ocupacoes.map((o) => o.n)).sort((x, y) => y.n - x.n),
    idade: FAIXAS_IDADE.map((nome, idx) => ({ idx, nome, n: idade[idx] })),
    escolaridade: contagem(escolaridade, d.escolaridades),
    salarioPorSexo: { homem: distribuicao(salHomem), mulher: distribuicao(salMulher) },
    porMunicipio,
    linhas: linhasOrdenadas,
  }
}
