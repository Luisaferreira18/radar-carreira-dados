import { Skeleton } from "@/components/ui/skeleton"

/** Estado de carregamento do painel: mesma grade da versão final, sem "pulos" de layout. */
export function DashboardSkeleton({ kpis = 5, comMapa = true }: { kpis?: number; comMapa?: boolean }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando painel">
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-40 rounded-lg" />
        ))}
      </div>
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${kpis === 5 ? "lg:grid-cols-3 xl:grid-cols-5" : "xl:grid-cols-4"}`}>
        {Array.from({ length: kpis }, (_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-xl" />
        ))}
      </div>
      {comMapa ? (
        <div className="grid gap-4 xl:grid-cols-5">
          <Skeleton className="h-[420px] rounded-xl xl:col-span-3" />
          <Skeleton className="h-[420px] rounded-xl xl:col-span-2" />
        </div>
      ) : (
        <Skeleton className="h-[380px] rounded-xl" />
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}
