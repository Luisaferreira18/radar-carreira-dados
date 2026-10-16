"use client"

import { ThemeProvider } from "next-themes"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import type { ReactNode } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <NuqsAdapter>
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      </NuqsAdapter>
    </ThemeProvider>
  )
}
