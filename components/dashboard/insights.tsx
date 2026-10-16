import { Lightbulb } from "lucide-react"

import { Card } from "@/components/ui/card"

type Props = {
  itens: { id: string; titulo: string; texto: string }[]
  descricao: string
}

/** Seção "Principais conclusões": 3 a 5 descobertas em linguagem simples. */
export function Insights({ itens, descricao }: Props) {
  if (itens.length === 0) return null
  return (
    <Card className="gap-4 px-5 py-5" id="conclusoes">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Lightbulb className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold">Principais conclusões</h2>
          <p className="text-sm text-muted-foreground">{descricao}</p>
        </div>
      </div>
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {itens.map((c, i) => (
          <li key={c.id} className="flex gap-3 rounded-lg border bg-background/60 p-4">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold tabular text-muted-foreground">
              {i + 1}
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">{c.titulo}</p>
              <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{c.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}
