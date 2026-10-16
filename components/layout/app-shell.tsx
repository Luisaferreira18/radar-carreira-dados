"use client"

import { Menu, Radar } from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import { Nav } from "./nav"
import { ThemeToggle } from "./theme-toggle"

function Marca() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Radar className="size-4" aria-hidden />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm">Radar de Carreira</span>
        <span className="text-xs font-normal text-muted-foreground">Dados e TI · MG</span>
      </span>
    </Link>
  )
}

/** Layout do painel: barra lateral fixa no desktop; no celular, cabeçalho com menu. */
export function AppShell({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false)
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar px-4 py-5 lg:flex">
        <Marca />
        <Nav />
        <div className="mt-auto flex items-center justify-between rounded-lg border bg-card px-3 py-2">
          <span className="text-xs text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:hidden">
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-6 bg-sidebar px-4 py-5">
              <SheetHeader className="p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SheetDescription className="sr-only">Navegação entre as seções do painel</SheetDescription>
                <Marca />
              </SheetHeader>
              <Nav onNavegar={() => setMenuAberto(false)} />
            </SheetContent>
          </Sheet>
          <Marca />
          <ThemeToggle />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
