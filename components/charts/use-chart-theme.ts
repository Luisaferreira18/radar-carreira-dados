"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export type ChartTheme = {
  series: string[]
  seq: string[]
  mutedSeries: string
  text: string
  muted: string
  grid: string
  axis: string
  surface: string
  popover: string
  popoverText: string
  border: string
  deltaUp: string
  deltaDown: string
  fonte: string
  modo: "light" | "dark"
}

function ler(): ChartTheme {
  const css = getComputedStyle(document.documentElement)
  const v = (nome: string) => css.getPropertyValue(nome).trim()
  return {
    series: [1, 2, 3, 4, 5, 6].map((i) => v(`--series-${i}`)),
    seq: [1, 2, 3, 4, 5, 6, 7].map((i) => v(`--seq-${i}`)),
    mutedSeries: v("--series-muted"),
    text: v("--chart-text"),
    muted: v("--chart-muted"),
    grid: v("--chart-grid"),
    axis: v("--chart-axis"),
    surface: v("--chart-surface"),
    popover: v("--popover"),
    popoverText: v("--popover-foreground"),
    border: v("--border"),
    deltaUp: v("--delta-up"),
    deltaDown: v("--delta-down"),
    fonte: css.getPropertyValue("font-family"),
    modo: document.documentElement.classList.contains("dark") ? "dark" : "light",
  }
}

/** Cores dos gráficos lidas dos tokens CSS — trocam junto com o tema claro/escuro. */
export function useChartTheme(): ChartTheme | null {
  const { resolvedTheme } = useTheme()
  const [tema, setTema] = useState<ChartTheme | null>(null)
  useEffect(() => {
    // espera o next-themes aplicar a classe no <html> antes de ler as variáveis
    const id = requestAnimationFrame(() => setTema(ler()))
    return () => cancelAnimationFrame(id)
  }, [resolvedTheme])
  return tema
}
