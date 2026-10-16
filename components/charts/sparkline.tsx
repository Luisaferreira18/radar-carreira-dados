type Props = {
  valores: number[]
  className?: string
}

/** Minilinha de tendência para os cards de KPI (SVG puro, sem eixo nem interação). */
export function Sparkline({ valores, className }: Props) {
  const pontos = valores.map((v, i) => [i, v] as const).filter(([, v]) => Number.isFinite(v))
  if (pontos.length < 2) return <div className={className} aria-hidden />
  const ys = pontos.map(([, v]) => v)
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  const largura = 100
  const altura = 28
  const x = (i: number) => (i / (valores.length - 1)) * largura
  const y = (v: number) => (max === min ? altura / 2 : altura - 2 - ((v - min) / (max - min)) * (altura - 4))
  const d = pontos.map(([i, v], k) => `${k ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ")
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none" className={className} aria-hidden>
      <path d={d} fill="none" stroke="var(--series-1)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}
