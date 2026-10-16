/** Quantil por interpolação linear sobre um array JÁ ORDENADO. */
export function quantil(ordenado: ArrayLike<number>, q: number): number {
  const n = ordenado.length
  if (n === 0) return Number.NaN
  const pos = (n - 1) * q
  const base = Math.floor(pos)
  const resto = pos - base
  const prox = ordenado[Math.min(base + 1, n - 1)]
  return ordenado[base] + resto * (prox - ordenado[base])
}

export function ordenar(valores: number[]): Float64Array {
  return Float64Array.from(valores).sort()
}

/** Variação relativa; NaN quando a base é zero. */
export function variacao(atual: number, anterior: number): number {
  if (!Number.isFinite(anterior) || anterior === 0) return Number.NaN
  return (atual - anterior) / Math.abs(anterior)
}
