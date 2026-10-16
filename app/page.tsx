import { Suspense } from "react"

import { PageHeader, Pagina } from "@/components/dashboard/page-header"
import { DashboardSkeleton } from "@/components/dashboard/skeletons"
import { MercadoDashboard } from "@/components/mercado/mercado-dashboard"

export default function MercadoPage() {
  return (
    <Pagina>
      <PageHeader
        selo="Novo CAGED · Minas Gerais"
        titulo="Mercado de Dados e TI em Minas Gerais"
        descricao="Quantas pessoas são contratadas com carteira assinada em ocupações de dados e tecnologia, quanto ganham na contratação e quais setores mais contratam. Os filtros ficam no link, então você pode compartilhar um recorte pronto."
      />
      {/* Os filtros leem a URL: o Suspense permite pré-renderizar o resto da página (Next.js 16). */}
      <Suspense fallback={<DashboardSkeleton />}>
        <MercadoDashboard />
      </Suspense>
    </Pagina>
  )
}
