"use client"

import { useEffect, useState } from "react"

type Estado<T> = { dados: T | null; erro: string | null }

const cache = new Map<string, Promise<unknown>>()

/** Busca um JSON estático uma vez por sessão e o transforma com `decodificar`. */
export function useDados<B, T>(url: string, decodificar: (bruto: B) => T): Estado<T> {
  const [estado, setEstado] = useState<Estado<T>>({ dados: null, erro: null })

  useEffect(() => {
    let ativo = true
    if (!cache.has(url)) {
      cache.set(
        url,
        fetch(url).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return (r.json() as Promise<B>).then(decodificar)
        }),
      )
    }
    ;(cache.get(url) as Promise<T>).then(
      (dados) => ativo && setEstado({ dados, erro: null }),
      (e: Error) => {
        cache.delete(url)
        if (ativo) setEstado({ dados: null, erro: e.message })
      },
    )
    return () => {
      ativo = false
    }
  }, [url, decodificar])

  return estado
}
