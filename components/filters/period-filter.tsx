"use client"

import { CalendarRange, Check } from "lucide-react"
import { useState } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { FilterTrigger } from "./filter-trigger"

export type PresetPeriodo = { id: string; rotulo: string; a: number; b: number }

type Props = {
  /** chaves dos passos de tempo (ex.: meses "2026-08" ou anos "2025") */
  passos: string[]
  formatarPasso: (chave: string) => string
  presets: PresetPeriodo[]
  a: number
  b: number
  onChange: (a: number, b: number) => void
  ativo?: boolean
}

/** Período: atalhos prontos (com ✓ no selecionado) e intervalo personalizado no rodapé. */
export function PeriodFilter({ passos, formatarPasso, presets, a, b, onChange, ativo }: Props) {
  const [aberto, setAberto] = useState(false)
  const presetAtual = presets.find((p) => p.a === a && p.b === b)
  const resumo = presetAtual?.rotulo ?? (a === b ? formatarPasso(passos[a]) : `${formatarPasso(passos[a])} – ${formatarPasso(passos[b])}`)

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <FilterTrigger
          rotulo="Período"
          valor={resumo}
          ativo={ativo}
          icone={<CalendarRange className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-0 p-1">
        <ul role="listbox" aria-label="Atalhos de período" className="max-h-64 overflow-y-auto">
          {presets.map((p) => {
            const sel = p.id === presetAtual?.id
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={sel}
                  onClick={() => {
                    onChange(p.a, p.b)
                    setAberto(false)
                  }}
                  className={cn("flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-muted", sel && "font-semibold")}
                >
                  {p.rotulo}
                  {sel && <Check className="size-4" strokeWidth={2.5} aria-hidden />}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-1 border-t px-2 pt-2 pb-1">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Personalizado</p>
          <div className="grid grid-cols-2 gap-2">
            <SeletorPasso rotulo="De" passos={passos} valor={a} formatar={formatarPasso} onChange={(i) => onChange(Math.min(i, b), Math.max(i, b))} />
            <SeletorPasso rotulo="Até" passos={passos} valor={b} formatar={formatarPasso} onChange={(i) => onChange(Math.min(a, i), Math.max(a, i))} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SeletorPasso({
  rotulo, passos, valor, formatar, onChange,
}: { rotulo: string; passos: string[]; valor: number; formatar: (c: string) => string; onChange: (i: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {rotulo}
      <Select value={String(valor)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger size="sm" className="w-full" aria-label={rotulo}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {passos.map((p, i) => (
            <SelectItem key={p} value={String(i)}>
              {formatar(p)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
