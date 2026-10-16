"use client"

import { BarChart, LineChart, ScatterChart } from "echarts/charts"
import { AriaComponent, GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components"
import * as echarts from "echarts/core"
import { SVGRenderer } from "echarts/renderers"
import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import type { ChartTheme } from "./use-chart-theme"

// Só os módulos usados entram no bundle (tree-shaking do ECharts).
echarts.use([BarChart, LineChart, ScatterChart, GridComponent, TooltipComponent, MarkLineComponent, AriaComponent, SVGRenderer])

export type EChartsOption = echarts.EChartsCoreOption

type Props = {
  option: EChartsOption
  className?: string
  /** descrição para leitores de tela */
  ariaLabel: string
  onClickItem?: (indice: number) => void
}

export function EChart({ option, className, ariaLabel, onClickItem }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const clickRef = useRef(onClickItem)

  useEffect(() => {
    clickRef.current = onClickItem
  }, [onClickItem])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const chart = echarts.init(el, null, { renderer: "svg" })
    chartRef.current = chart
    chart.on("click", (p) => {
      if (typeof p.dataIndex === "number") clickRef.current?.(p.dataIndex)
    })
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(el)
    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption({ animationDuration: 350, aria: { enabled: true, label: { description: ariaLabel } }, ...option }, { notMerge: true })
  }, [option, ariaLabel])

  return <div ref={ref} role="img" aria-label={ariaLabel} className={cn("h-64 w-full", className)} />
}

/** Estilo padrão do tooltip, no mesmo visual dos popovers do shadcn. */
export function estiloTooltip(t: ChartTheme) {
  return {
    backgroundColor: t.popover,
    borderColor: t.border,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: t.popoverText, fontSize: 12, fontFamily: t.fonte },
    extraCssText: "border-radius:8px;box-shadow:0 4px 16px rgb(0 0 0 / 0.12);",
    confine: true,
  }
}

/** Eixos discretos: grade fina, textos em tom secundário. */
export function eixoValor(t: ChartTheme, formatador: (v: number) => string) {
  return {
    type: "value" as const,
    axisLabel: { color: t.muted, fontSize: 11, formatter: formatador },
    splitLine: { lineStyle: { color: t.grid, width: 1 } },
    axisLine: { show: false },
    axisTick: { show: false },
  }
}

export function eixoCategoria(t: ChartTheme, dados: string[], extra: Record<string, unknown> = {}) {
  return {
    type: "category" as const,
    data: dados,
    axisLabel: { color: t.muted, fontSize: 11 },
    axisLine: { lineStyle: { color: t.axis } },
    axisTick: { show: false },
    ...extra,
  }
}

/** Linha do tooltip: ponto colorido (identidade) + rótulo + valor em tinta normal. */
export function linhaTooltip(cor: string, rotulo: string, valor: string) {
  return `<div style="display:flex;align-items:center;gap:8px;justify-content:space-between;min-width:160px">
    <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:9999px;background:${cor}"></span>${rotulo}</span>
    <b style="font-variant-numeric:tabular-nums;font-weight:600">${valor}</b></div>`
}

export function tituloTooltip(texto: string) {
  return `<div style="font-weight:600;margin-bottom:4px">${texto}</div>`
}
