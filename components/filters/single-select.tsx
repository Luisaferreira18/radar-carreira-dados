"use client"

import { useState, type ReactNode } from "react"

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { FilterTrigger } from "./filter-trigger"
import type { Opcao } from "./multi-select"

type Props = {
  rotulo: string
  opcoes: Opcao[]
  valor: string
  onChange: (valor: string) => void
  ativo?: boolean
  icone?: ReactNode
  busca?: boolean
  placeholderBusca?: string
}

/** Seleção única com busca, agrupada (ex.: Regiões / Municípios). */
export function SingleSelect({ rotulo, opcoes, valor, onChange, ativo, icone, busca = true, placeholderBusca }: Props) {
  const [aberto, setAberto] = useState(false)
  const grupos = [...new Set(opcoes.map((o) => o.grupo ?? ""))]
  const atual = opcoes.find((o) => o.valor === valor)?.rotulo ?? valor
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <FilterTrigger rotulo={rotulo} valor={atual} ativo={ativo} icone={icone} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          {busca && <CommandInput placeholder={placeholderBusca ?? "Buscar..."} />}
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            {grupos.map((g) => (
              <CommandGroup key={g || "todos"} heading={g || undefined}>
                {opcoes
                  .filter((o) => (o.grupo ?? "") === g)
                  .map((o) => (
                    <CommandItem
                      key={o.valor}
                      value={`${o.rotulo} ${o.valor}`}
                      data-checked={o.valor === valor}
                      onSelect={() => {
                        onChange(o.valor)
                        setAberto(false)
                      }}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{o.rotulo}</span>
                        {o.detalhe && <span className="text-xs text-muted-foreground">{o.detalhe}</span>}
                      </span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
