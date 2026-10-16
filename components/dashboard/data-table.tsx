"use client"

import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react"
import { useDeferredValue, useMemo, useRef, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { baixarCsv } from "@/lib/csv"
import { fmtInt } from "@/lib/format"
import { cn } from "@/lib/utils"

export type Coluna = {
  id: string
  titulo: string
  /** valor usado na ordenação e no CSV */
  valor: (linha: number) => string | number
  /** conteúdo da célula (padrão: o próprio valor) */
  celula?: (linha: number) => ReactNode
  numerica?: boolean
  largura?: string
}

type Props = {
  colunas: Coluna[]
  /** índices das linhas (as linhas em si vivem em arrays colunares) */
  linhas: ArrayLike<number>
  /** cria um teste de busca a partir do texto digitado (feito pelo chamador, de forma eficiente) */
  criarBusca: (texto: string) => (linha: number) => boolean
  placeholderBusca: string
  nomeArquivo: string
  vazio?: ReactNode
}

const ALTURA_LINHA = 40

export function DataTable({ colunas, linhas, criarBusca, placeholderBusca, nomeArquivo, vazio }: Props) {
  const [busca, setBusca] = useState("")
  const buscaAdiada = useDeferredValue(busca)
  const [ordem, setOrdem] = useState<{ id: string; desc: boolean } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const visiveis = useMemo(() => {
    const texto = buscaAdiada.trim()
    let base = Int32Array.from(linhas as ArrayLike<number>)
    if (texto) {
      const teste = criarBusca(texto)
      base = base.filter(teste)
    }
    if (ordem) {
      const col = colunas.find((c) => c.id === ordem.id)
      if (col) {
        const chaves = new Map<number, string | number>()
        for (const l of base) chaves.set(l, col.valor(l))
        const sinal = ordem.desc ? -1 : 1
        base = base.sort((x, y) => {
          const a = chaves.get(x)!
          const b = chaves.get(y)!
          return (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "pt-BR")) * sinal
        })
      }
    }
    return base
  }, [linhas, buscaAdiada, ordem, colunas, criarBusca])

  const virtualizador = useVirtualizer({
    count: visiveis.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ALTURA_LINHA,
    overscan: 12,
  })
  const itens = virtualizador.getVirtualItems()
  const topo = itens.length ? itens[0].start : 0
  const fundo = itens.length ? virtualizador.getTotalSize() - itens[itens.length - 1].end : 0

  const alternarOrdem = (id: string) =>
    setOrdem((atual) => (atual?.id !== id ? { id, desc: true } : atual.desc ? { id, desc: false } : null))

  const exportar = () =>
    baixarCsv(
      nomeArquivo,
      colunas.map((c) => c.titulo),
      Array.from(visiveis, (l) => colunas.map((c) => c.valor(l))),
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={placeholderBusca}
            className="h-9 pl-8"
            aria-label="Buscar na tabela"
          />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-muted-foreground tabular" aria-live="polite">
            {fmtInt(visiveis.length)} {visiveis.length === 1 ? "linha" : "linhas"}
          </span>
          <Button variant="outline" size="sm" onClick={exportar} disabled={visiveis.length === 0}>
            <Download /> Exportar CSV
          </Button>
        </div>
      </div>

      {visiveis.length === 0 ? (
        (vazio ?? <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma linha encontrada.</p>)
      ) : (
        <div ref={scrollRef} className="h-[480px] overflow-auto rounded-lg border" tabIndex={0} aria-label="Tabela de dados com rolagem">
          <table className="w-full min-w-[880px] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
              <tr>
                {colunas.map((c) => {
                  const ativa = ordem?.id === c.id
                  const Icone = !ativa ? ArrowUpDown : ordem.desc ? ArrowDown : ArrowUp
                  return (
                    <th
                      key={c.id}
                      scope="col"
                      style={{ width: c.largura }}
                      aria-sort={ativa ? (ordem.desc ? "descending" : "ascending") : "none"}
                      className={cn("border-b px-3 py-2 font-medium text-muted-foreground", c.numerica ? "text-right" : "text-left")}
                    >
                      <button
                        type="button"
                        onClick={() => alternarOrdem(c.id)}
                        className={cn("inline-flex items-center gap-1 rounded-sm hover:text-foreground", c.numerica && "flex-row-reverse", ativa && "text-foreground")}
                      >
                        {c.titulo}
                        <Icone className={cn("size-3.5", !ativa && "opacity-40")} aria-hidden />
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {topo > 0 && (
                <tr aria-hidden>
                  <td colSpan={colunas.length} style={{ height: topo }} />
                </tr>
              )}
              {itens.map((item) => {
                const linha = visiveis[item.index]
                return (
                  <tr key={linha} className="hover:bg-muted/50" style={{ height: ALTURA_LINHA }}>
                    {colunas.map((c) => (
                      <td
                        key={c.id}
                        className={cn("truncate border-b border-border/60 px-3 whitespace-nowrap", c.numerica && "text-right tabular")}
                        style={{ maxWidth: c.largura }}
                      >
                        {c.celula ? c.celula(linha) : c.valor(linha)}
                      </td>
                    ))}
                  </tr>
                )
              })}
              {fundo > 0 && (
                <tr aria-hidden>
                  <td colSpan={colunas.length} style={{ height: fundo }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
