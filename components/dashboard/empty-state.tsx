import { SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"

type Props = {
  titulo?: string
  mensagem?: string
  onLimpar?: () => void
}

/** Mensagem amigável quando a combinação de filtros não retorna nada. */
export function EmptyState({
  titulo = "Nenhum resultado para esses filtros",
  mensagem = "Tente ampliar o período, escolher outro local ou remover algum filtro.",
  onLimpar,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-muted">
        <SearchX className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{titulo}</p>
        <p className="max-w-md text-sm text-pretty text-muted-foreground">{mensagem}</p>
      </div>
      {onLimpar && (
        <Button variant="outline" size="sm" onClick={onLimpar}>
          Limpar filtros
        </Button>
      )}
    </div>
  )
}

/** Versão compacta, dentro de um card de gráfico. */
export function SemDados({ mensagem = "Sem dados suficientes neste recorte." }: { mensagem?: string }) {
  return <div className="grid min-h-40 flex-1 place-items-center text-center text-sm text-muted-foreground">{mensagem}</div>
}
