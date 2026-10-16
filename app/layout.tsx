import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { AppShell } from "@/components/layout/app-shell"
import { Providers } from "@/components/layout/providers"

import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Radar de Carreira em Dados — MG",
    template: "%s · Radar de Carreira em Dados",
  },
  description:
    "Painel interativo com dados públicos sobre contratações e salários em Dados e TI em Minas Gerais (Novo CAGED) e vagas autorizadas em concursos federais (MGI).",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
