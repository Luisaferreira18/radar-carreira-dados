import type { ReactNode } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Props = {
  titulo: string
  descricao?: ReactNode
  acao?: ReactNode
  rodape?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}

/** Card padrão de visualização: título, subtítulo explicativo, ação opcional (alternância) e conteúdo. */
export function ChartCard({ titulo, descricao, acao, rodape, children, className, id }: Props) {
  return (
    <Card className={cn("gap-4 py-5", className)} id={id}>
      {/* no celular a ação (legenda/alternância) desce para baixo do título em vez de espremê-lo */}
      <CardHeader className="flex flex-col gap-2 px-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="text-[15px] font-semibold">{titulo}</CardTitle>
          {descricao && <CardDescription className="text-pretty">{descricao}</CardDescription>}
        </div>
        {acao && <div className="shrink-0">{acao}</div>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-5">{children}</CardContent>
      {rodape && <div className="px-5 text-xs text-muted-foreground">{rodape}</div>}
    </Card>
  )
}

/** Legenda HTML (sempre presente com 2+ séries): ponto colorido + nome em tinta normal. */
export function Legenda({ itens }: { itens: { nome: string; cor: number }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {itens.map((i) => (
        <li key={i.nome} className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: `var(--series-${i.cor + 1})` }} aria-hidden />
          {i.nome}
        </li>
      ))}
    </ul>
  )
}
