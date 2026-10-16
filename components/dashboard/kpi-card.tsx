import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react"

import { Sparkline } from "@/components/charts/sparkline"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type Props = {
  titulo: string
  valor: string
  /** texto da variação já formatado (ex.: "+12,3%"); null = sem comparação */
  variacao: string | null
  /** direção da mudança: 1 subiu, -1 caiu, 0 estável */
  direcao: -1 | 0 | 1
  /** se subir é bom (verde) ou ruim; "neutro" deixa sem cor de status */
  sentido?: "maior-melhor" | "menor-melhor" | "neutro"
  comparacao: string
  definicao: string
  tendencia?: number[]
}

/** Card de KPI no padrão Tremor: rótulo pequeno, número grande, selo de variação com ícone. */
export function KpiCard({ titulo, valor, variacao, direcao, sentido = "maior-melhor", comparacao, definicao, tendencia }: Props) {
  const bom = sentido === "neutro" || direcao === 0 ? null : (direcao === 1) === (sentido === "maior-melhor")
  const Icone = direcao === 1 ? ArrowUpRight : direcao === -1 ? ArrowDownRight : Minus
  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{titulo}</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="rounded-sm text-muted-foreground/70 hover:text-foreground" aria-label={`O que é: ${titulo}`}>
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64 text-pretty">{definicao}</TooltipContent>
        </Tooltip>
      </div>
      <p className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{valor}</p>
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {variacao ? (
            <span
              className={cn(
                "inline-flex w-fit items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular",
                bom === true && "bg-good/10 text-delta-up",
                bom === false && "bg-critical/10 text-delta-down",
                bom === null && "bg-muted text-muted-foreground",
              )}
            >
              <Icone className="size-3.5" aria-hidden />
              {variacao}
              <span className="sr-only">{bom === true ? "(melhora)" : bom === false ? "(piora)" : ""}</span>
            </span>
          ) : null}
          <span className="truncate text-xs text-muted-foreground">{comparacao}</span>
        </div>
        {tendencia && <Sparkline valores={tendencia} className="h-7 w-20 shrink-0" />}
      </div>
    </Card>
  )
}
