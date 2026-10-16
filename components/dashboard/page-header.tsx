import type { ReactNode } from "react"

type Props = { titulo: string; descricao: ReactNode; selo?: string }

export function PageHeader({ titulo, descricao, selo }: Props) {
  return (
    <header className="flex flex-col gap-2 pt-6 pb-1 lg:pt-8">
      {selo && <span className="w-fit rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{selo}</span>}
      <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{titulo}</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">{descricao}</p>
    </header>
  )
}

/** Container com o gutter padrão (16px no celular). */
export function Pagina({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 sm:px-6 lg:px-8">{children}</div>
}
