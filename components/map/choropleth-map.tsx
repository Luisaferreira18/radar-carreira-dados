"use client"

import "maplibre-gl/dist/maplibre-gl.css"

import type { Map as MapaMapLibre, Popup } from "maplibre-gl"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const ESTILOS = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
}
const LIMITES_MG: [[number, number], [number, number]] = [[-51.1, -22.95], [-39.8, -14.2]]
const CLASSES = 5

export type ValorMunicipio = { codigo: string; nome: string; valor: number }

type Props = {
  valores: ValorMunicipio[]
  selecionado: string | null
  onSelecionar: (codigo: string) => void
  formatar: (v: number) => string
  rotuloValor: string
  className?: string
}

/** Quebras por quantil entre os municípios com valor > 0 (dados muito concentrados em BH). */
function calcularQuebras(valores: number[]): number[] {
  const positivos = valores.filter((v) => v > 0).sort((a, b) => a - b)
  if (positivos.length === 0) return []
  const quebras: number[] = []
  for (let i = 1; i < CLASSES; i++) {
    const v = positivos[Math.floor((positivos.length * i) / CLASSES)] ?? positivos[positivos.length - 1]
    // cada quebra precisa ser maior que o início da faixa anterior (a 1ª faixa começa em 1)
    if (v > (quebras[quebras.length - 1] ?? 1)) quebras.push(v)
  }
  return quebras
}

/** Mapa coroplético de MG: tom de azul mais escuro = mais contratações. Clique filtra o painel. */
export function ChoroplethMap({ valores, selecionado, onSelecionar, formatar, rotuloValor, className }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaMapLibre | null>(null)
  const popup = useRef<Popup | null>(null)
  const codigos = useRef<string[]>([])
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState(false)
  const { resolvedTheme } = useTheme()
  const modo = resolvedTheme === "dark" ? "dark" : "light"

  const porCodigo = useMemo(() => new Map(valores.map((v) => [v.codigo, v])), [valores])
  const quebras = useMemo(() => calcularQuebras(valores.map((v) => v.valor)), [valores])
  const refs = useRef({ porCodigo, formatar, rotuloValor, onSelecionar })
  useEffect(() => {
    refs.current = { porCodigo, formatar, rotuloValor, onSelecionar }
  }, [porCodigo, formatar, rotuloValor, onSelecionar])

  // cria o mapa (recriado ao trocar o tema, porque o mapa-base muda)
  useEffect(() => {
    let cancelado = false
    let instancia: MapaMapLibre | null = null
    ;(async () => {
      try {
        const maplibre = await import("maplibre-gl")
        maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs")
        const geojson = await fetch("/data/mg-municipios.geojson").then((r) => r.json())
        if (cancelado || !container.current) return
        codigos.current = geojson.features.map((f: { properties: { c: string } }) => f.properties.c)
        const css = getComputedStyle(document.documentElement)
        const cor = (v: string) => css.getPropertyValue(v).trim()

        instancia = new maplibre.Map({
          container: container.current,
          style: ESTILOS[modo],
          bounds: LIMITES_MG,
          fitBoundsOptions: { padding: 12 },
          attributionControl: { compact: true },
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
          minZoom: 4.5,
          maxZoom: 11,
        })
        instancia.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right")
        popup.current = new maplibre.Popup({ closeButton: false, closeOnClick: false, offset: 8 })

        instancia.on("load", () => {
          if (!instancia) return
          const primeiraCamadaDeTexto = instancia.getStyle().layers.find((l) => l.type === "symbol")?.id
          instancia.addSource("municipios", { type: "geojson", data: geojson, promoteId: "c" })
          instancia.addLayer(
            {
              id: "municipios-preenchimento",
              type: "fill",
              source: "municipios",
              paint: {
                "fill-color": [
                  "match",
                  ["coalesce", ["feature-state", "classe"], 0],
                  1, cor("--seq-2"),
                  2, cor("--seq-3"),
                  3, cor("--seq-4"),
                  4, cor("--seq-5"),
                  5, cor("--seq-7"),
                  cor("--chart-grid"),
                ],
                "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.85],
              },
            },
            primeiraCamadaDeTexto,
          )
          instancia.addLayer(
            {
              id: "municipios-borda",
              type: "line",
              source: "municipios",
              paint: { "line-color": cor("--chart-surface"), "line-width": 0.4 },
            },
            primeiraCamadaDeTexto,
          )
          instancia.addLayer({
            id: "municipios-selecionado",
            type: "line",
            source: "municipios",
            filter: ["==", ["get", "c"], ""],
            paint: { "line-color": cor("--foreground"), "line-width": 2 },
          })

          let hoverId: string | null = null
          instancia.on("mousemove", "municipios-preenchimento", (e) => {
            const f = e.features?.[0]
            if (!f || !instancia) return
            const codigo = String(f.properties.c)
            if (hoverId !== codigo) {
              if (hoverId) instancia.setFeatureState({ source: "municipios", id: hoverId }, { hover: false })
              hoverId = codigo
              instancia.setFeatureState({ source: "municipios", id: codigo }, { hover: true })
            }
            instancia.getCanvas().style.cursor = "pointer"
            const { porCodigo: dados, formatar: fmt, rotuloValor: rotulo } = refs.current
            const valor = dados.get(codigo)?.valor ?? 0
            popup.current
              ?.setLngLat(e.lngLat)
              .setHTML(`<div style="font-weight:600">${f.properties.n}</div><div style="font-size:12px;opacity:.8">${rotulo}: <b style="font-variant-numeric:tabular-nums">${fmt(valor)}</b></div>`)
              .addTo(instancia)
          })
          instancia.on("mouseleave", "municipios-preenchimento", () => {
            if (hoverId && instancia) instancia.setFeatureState({ source: "municipios", id: hoverId }, { hover: false })
            hoverId = null
            if (instancia) instancia.getCanvas().style.cursor = ""
            popup.current?.remove()
          })
          instancia.on("click", "municipios-preenchimento", (e) => {
            const codigo = e.features?.[0]?.properties.c
            if (codigo) refs.current.onSelecionar(String(codigo))
          })
          mapa.current = instancia
          setPronto(true)
        })
      } catch {
        if (!cancelado) setErro(true)
      }
    })()
    return () => {
      cancelado = true
      popup.current?.remove()
      instancia?.remove()
      mapa.current = null
      setPronto(false)
    }
  }, [modo])

  // aplica valores e classes como feature-state (sem recarregar a geometria)
  useEffect(() => {
    const m = mapa.current
    if (!m || !pronto || !m.getSource("municipios")) return
    for (const codigo of codigos.current) {
      const v = porCodigo.get(codigo)?.valor ?? 0
      const classe = v <= 0 ? 0 : 1 + quebras.filter((q) => v >= q).length
      m.setFeatureState({ source: "municipios", id: codigo }, { classe })
    }
  }, [pronto, porCodigo, quebras])

  useEffect(() => {
    const m = mapa.current
    if (!m || !pronto) return
    m.setFilter("municipios-selecionado", ["==", ["get", "c"], selecionado ?? ""])
  }, [pronto, selecionado])

  const legenda = useMemo(() => {
    if (!quebras.length) return []
    const limites = [1, ...quebras]
    return limites.map((de, i) => {
      const ate = i < quebras.length ? quebras[i] - 1 : null
      const texto = ate === null ? `${formatar(de)} ou mais` : de >= ate ? formatar(de) : `${formatar(de)} a ${formatar(ate)}`
      const tom = ["--seq-2", "--seq-3", "--seq-4", "--seq-5", "--seq-7"][i]
      return { texto, tom }
    })
  }, [quebras, formatar])

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative min-h-72 flex-1 overflow-hidden rounded-lg border bg-muted/40">
        {/* o MapLibre aplica position:relative no container, por isso ele fica dentro de um wrapper absoluto */}
        <div className="absolute inset-0">
          <div ref={container} className="h-full w-full" role="region" aria-label={`Mapa de Minas Gerais: ${rotuloValor} por município`} />
        </div>
        {erro && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">
            Não foi possível carregar o mapa. Os mesmos números estão na tabela abaixo.
          </div>
        )}
        {!pronto && !erro && <div className="absolute inset-0 animate-pulse bg-muted" />}
      </div>
      {legenda.length > 0 && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="Legenda do mapa">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: "var(--chart-grid)" }} />
            Nenhuma
          </li>
          {legenda.map((l) => (
            <li key={l.texto} className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm" style={{ background: `var(${l.tom})` }} />
              <span className="tabular">{l.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
