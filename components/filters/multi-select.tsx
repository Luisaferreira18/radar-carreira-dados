"use client"

import { useState } from "react"

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { FilterTrigger } from "./filter-trigger"

export type Opcao = { valor: string; rotulo: string; grupo?: string; detalhe?: string }

type Props = {
  rotulo: string
  opcoes: Opcao[]
  selecionados: string[]
  onChange: (valores: string[]) => void
  textoTodos?: string
  busca?: boolean
}

/** Seleção múltipla com busca (combobox). Vazio = "Todas". */
export function MultiSelect({ rotulo, opcoes, selecionados, onChange, textoTodos = "Todas", busca = true }: Props) {
  const [aberto, setAberto] = useState(false)
  const grupos = [...new Set(opcoes.map((o) => o.grupo ?? ""))]
  const resumo =
    selecionados.length === 0
      ? textoTodos
      : selecionados.length === 1
        ? (opcoes.find((o) => o.valor === selecionados[0])?.rotulo ?? textoTodos)
        : `${selecionados.length} selecionadas`

  const alternar = (valor: string) =>
    onChange(selecionados.includes(valor) ? selecionados.filter((v) => v !== valor) : [...selecionados, valor])

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <FilterTrigger rotulo={rotulo} valor={resumo} ativo={selecionados.length > 0} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          {busca && <CommandInput placeholder={`Buscar ${rotulo.toLowerCase()}...`} />}
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            {grupos.map((g) => (
              <CommandGroup key={g || "todos"} heading={g || undefined}>
                {opcoes
                  .filter((o) => (o.grupo ?? "") === g)
                  .map((o) => (
                    <CommandItem
                      key={o.valor}
                      value={`${o.rotulo} ${o.grupo ?? ""}`}
                      data-checked={selecionados.includes(o.valor)}
                      onSelect={() => alternar(o.valor)}
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
          {selecionados.length > 0 && (
            <div className="border-t p-1">
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => onChange([])}
              >
                Limpar seleção
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
