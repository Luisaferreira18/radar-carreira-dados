import type { Metadata } from "next"
import { Suspense } from "react"

import { ConcursosDashboard } from "@/components/concursos/concursos-dashboard"
import { PageHeader, Pagina } from "@/components/dashboard/page-header"
import { DashboardSkeleton } from "@/components/dashboard/skeletons"

export const metadata: Metadata = {
  title: "Concursos federais",
  description: "Vagas autorizadas em concursos e nomeações do Poder Executivo federal desde 2016 (MGI).",
}

export default function ConcursosPage() {
  return (
    <Pagina>
      <PageHeader
        selo="Ministério da Gestão (MGI) · 2016–2026"
        titulo="Concursos federais: vagas autorizadas"
        descricao="Antes de um concurso federal abrir, o Ministério da Gestão precisa autorizar as vagas. Este painel reúne essas autorizações desde 2016 para mostrar quais órgãos mais contratam, para qual escolaridade e em que ritmo."
      />
      <Suspense fallback={<DashboardSkeleton kpis={4} comMapa={false} />}>
        <ConcursosDashboard />
      </Suspense>
    </Pagina>
  )
}
