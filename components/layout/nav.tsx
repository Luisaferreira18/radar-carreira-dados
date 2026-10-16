"use client"

import { BarChart3, BookOpen, Landmark } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export const PAGINAS = [
  { href: "/", rotulo: "Mercado de Dados e TI", descricao: "Contratações e salários (CAGED)", icone: BarChart3 },
  { href: "/concursos", rotulo: "Concursos federais", descricao: "Vagas autorizadas (MGI)", icone: Landmark },
  { href: "/sobre", rotulo: "Sobre os dados", descricao: "Fontes e metodologia", icone: BookOpen },
] as const

export function Nav({ onNavegar }: { onNavegar?: () => void }) {
  const caminho = usePathname()
  return (
    <nav aria-label="Seções do painel">
      <ul className="flex flex-col gap-1">
        {PAGINAS.map(({ href, rotulo, descricao, icone: Icone }) => {
          const ativo = href === "/" ? caminho === "/" : caminho.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavegar}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "group flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  ativo ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icone className={cn("mt-0.5 size-4 shrink-0", ativo && "text-primary")} aria-hidden />
                <span className="flex flex-col">
                  <span className="font-medium">{rotulo}</span>
                  <span className="text-xs text-muted-foreground">{descricao}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
