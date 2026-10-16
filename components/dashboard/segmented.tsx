"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Props<T extends string> = {
  valor: T
  opcoes: { valor: T; rotulo: string }[]
  onChange: (v: T) => void
  rotulo: string
}

/** Alternância compacta dentro de um card (ex.: "Por área | Por ocupação"). */
export function Segmented<T extends string>({ valor, opcoes, onChange, rotulo }: Props<T>) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={valor}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={rotulo}
      spacing={0}
    >
      {opcoes.map((o) => (
        <ToggleGroupItem key={o.valor} value={o.valor} className="px-2.5 text-xs">
          {o.rotulo}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
