import { ChevronDown } from "lucide-react"
import { forwardRef, type ComponentProps, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type Props = ComponentProps<"button"> & {
  rotulo: string
  valor: ReactNode
  ativo?: boolean
  icone?: ReactNode
}

/** Botão de filtro: rótulo discreto + valor atual. Destaca quando o filtro foge do padrão. */
export const FilterTrigger = forwardRef<HTMLButtonElement, Props>(function FilterTrigger(
  { rotulo, valor, ativo, icone, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border bg-card px-3 text-left text-sm shadow-xs transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto",
        ativo && "border-primary/40 bg-primary/5",
        className,
      )}
      {...props}
    >
      {icone}
      <span className="shrink-0 text-muted-foreground">{rotulo}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{valor}</span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
})
