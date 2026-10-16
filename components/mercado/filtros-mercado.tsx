"use client"

import { MapPin } from "lucide-react"
import { useMemo } from "react"

import { FilterBar } from "@/components/filters/filter-bar"
import { MultiSelect, type Opcao } from "@/components/filters/multi-select"
import { PeriodFilter } from "@/components/filters/period-filter"
import { SingleSelect } from "@/components/filters/single-select"
import { fmtMes } from "@/lib/format"
import type { Mercado } from "@/lib/mercado/dados"
import {
  AREAS,
  ESCOLARIDADE_SLUGS,
  LOCAIS_FIXOS,
  presetsPeriodo,
  resolverPeriodo,
  type FiltroResolvido,
  type FiltrosMercado,
  useFiltrosMercado,
} from "@/lib/mercado/filtros"

type Props = { d: Mercado; filtros: FiltrosMercado; f: FiltroResolvido }

export function FiltrosMercadoBar({ d, filtros, f }: Props) {
  const [, setFiltros] = useFiltrosMercado()
  const presets = useMemo(() => presetsPeriodo(d), [d])
  const { a, b } = resolverPeriodo(d, filtros)

  const opcoesLocal: Opcao[] = useMemo(
    () => [
      ...Object.entries(LOCAIS_FIXOS).map(([valor, rotulo]) => ({ valor, rotulo, grupo: "Regiões" })),
      ...d.municipiosComDados
        .filter((i) => i !== d.idxBH)
        .map((i) => ({ valor: d.municipios[i].c, rotulo: d.municipios[i].n, grupo: "Municípios", detalhe: d.municipios[i].rmbh ? "Região Metropolitana" : undefined })),
    ],
    [d],
  )
  const opcoesArea: Opcao[] = AREAS.map((x) => ({ valor: x.slug, rotulo: d.grupos[x.grupo] }))
  const gruposSelecionados = filtros.area.map((s) => AREAS.find((x) => x.slug === s)?.grupo)
  const opcoesOcupacao: Opcao[] = d.ocupacoes
    .filter((o) => gruposSelecionados.length === 0 || gruposSelecionados.includes(o.g as never))
    .map((o) => ({ valor: o.c, rotulo: o.n, grupo: d.grupos[o.g], detalhe: `CBO ${o.c.slice(0, 4)}-${o.c.slice(4)}` }))
  const opcoesEsc: Opcao[] = d.escolaridades.map((nome, i) => ({ valor: ESCOLARIDADE_SLUGS[i], rotulo: nome }))

  const L = d.meses.length - 1
  const definirPeriodo = (na: number, nb: number) => {
    const padrao = na === Math.max(0, L - 11) && nb === L
    setFiltros({ de: padrao ? null : d.meses[na], ate: padrao ? null : d.meses[nb] })
  }
  const limpar = () => setFiltros({ de: null, ate: null, local: null, area: null, ocup: null, esc: null })

  const resumo = `${f.rotuloLocal} · ${a === b ? fmtMes(d.meses[a]) : `${fmtMes(d.meses[a])}–${fmtMes(d.meses[b])}`}`

  return (
    <FilterBar ativos={f.ativos} onLimpar={limpar} resumo={resumo}>
      <PeriodFilter
        passos={d.meses}
        formatarPasso={fmtMes}
        presets={presets}
        a={a}
        b={b}
        onChange={definirPeriodo}
        ativo={!!(filtros.de || filtros.ate)}
      />
      <SingleSelect
        rotulo="Local"
        opcoes={opcoesLocal}
        valor={filtros.local}
        onChange={(v) => setFiltros({ local: v === "bh" ? null : v })}
        ativo={filtros.local !== "bh"}
        icone={<MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
        placeholderBusca="Buscar município..."
      />
      <MultiSelect
        rotulo="Área"
        opcoes={opcoesArea}
        selecionados={filtros.area}
        onChange={(v) => setFiltros({ area: v.length ? v : null, ocup: null })}
        busca={false}
      />
      <MultiSelect rotulo="Ocupação" opcoes={opcoesOcupacao} selecionados={filtros.ocup} onChange={(v) => setFiltros({ ocup: v.length ? v : null })} />
      <MultiSelect rotulo="Escolaridade" opcoes={opcoesEsc} selecionados={filtros.esc} onChange={(v) => setFiltros({ esc: v.length ? v : null })} busca={false} />
    </FilterBar>
  )
}
