"use client"

import { RotateCcw, SlidersHorizontal } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

type Props = {
  children: ReactNode
  ativos: number
  onLimpar: () => void
  resumo: ReactNode
}

/**
 * Barra de filtros globais. No desktop fica fixa no topo, numa linha; no celular
 * vira um botão "Filtros" que abre uma gaveta com os mesmos controles.
 */
export function FilterBar({ children, ativos, onLimpar, resumo }: Props) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="sticky top-14 z-20 -mx-4 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {children}
        {ativos > 0 && (
          <Button variant="ghost" size="sm" onClick={onLimpar} className="text-muted-foreground">
            <RotateCcw /> Limpar filtros
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 md:hidden">
        <p className="min-w-0 truncate text-sm text-muted-foreground">{resumo}</p>
        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              <SlidersHorizontal /> Filtros
              {ativos > 0 && <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{ativos}</Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Os filtros valem para todos os gráficos e ficam salvos no link.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-2">{children}</div>
            <SheetFooter className="flex-row">
              <Button variant="outline" className="flex-1" onClick={onLimpar} disabled={ativos === 0}>
                Limpar
              </Button>
              <Button className="flex-1" onClick={() => setAberto(false)}>
                Ver resultados
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
