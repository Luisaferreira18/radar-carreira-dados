// Formatação no padrão brasileiro (pt-BR) usada em todo o painel.

const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })
const compacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 })
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const moedaCompacta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
})

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

export const fmtInt = (n: number) => inteiro.format(n)
export const fmtCompacto = (n: number) => (Math.abs(n) < 10_000 ? inteiro.format(n) : compacto.format(n))
export const fmtMoeda = (n: number) => moeda.format(n)

const decimal1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
/** Rótulos de eixo curtos e consistentes: 800 · 1,5 mil · 10 mil · 1,2 mi */
export function fmtEixo(n: number) {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${decimal1.format(n / 1_000_000)} mi`
  if (a >= 1_000) return `${decimal1.format(n / 1_000)} mil`
  return inteiro.format(n)
}
export const fmtEixoMoeda = (n: number) => (n === 0 ? "R$ 0" : `R$ ${fmtEixo(n)}`)
export const fmtMoedaCompacta = (n: number) => (Math.abs(n) < 10_000 ? moeda.format(n) : moedaCompacta.format(n))

export function fmtPct(fracao: number, casas = 1) {
  return `${(fracao * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`
}

/** Variação com sinal explícito: "+12,3%" / "−4,0%". */
export function fmtVariacao(fracao: number) {
  const texto = fmtPct(Math.abs(fracao))
  if (Math.abs(fracao) < 0.0005) return "0,0%"
  return `${fracao > 0 ? "+" : "−"}${texto}`
}

/** Diferença em pontos percentuais: "+2,1 p.p." */
export function fmtPontos(diferenca: number) {
  const v = (Math.abs(diferenca) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (Math.abs(diferenca) < 0.0005) return "0,0 p.p."
  return `${diferenca > 0 ? "+" : "−"}${v} p.p.`
}

export function fmtSaldo(n: number) {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${inteiro.format(Math.abs(n))}`
}

/** "2026-08" -> "ago/2026" */
export function fmtMes(chave: string) {
  const [ano, mes] = chave.split("-")
  return `${MESES_CURTOS[Number(mes) - 1]}/${ano}`
}

/** "2026-08" -> "ago/26" (para espaços curtos, como os cards de KPI) */
export function fmtMesCurto(chave: string) {
  const [ano, mes] = chave.split("-")
  return `${MESES_CURTOS[Number(mes) - 1]}/${ano.slice(2)}`
}

/** "2026-08" -> "agosto de 2026" */
export function fmtMesLongo(chave: string) {
  const [ano, mes] = chave.split("-")
  return `${MESES_LONGOS[Number(mes) - 1]} de ${ano}`
}

/** "2026-03-04" -> "04/03/2026" */
export function fmtData(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-")
  return `${dia}/${mes}/${ano}`
}

export function plural(n: number, singular: string, pluralForma: string) {
  return `${fmtInt(n)} ${n === 1 ? singular : pluralForma}`
}
