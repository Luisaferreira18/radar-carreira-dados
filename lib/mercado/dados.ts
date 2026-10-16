// Tipos e carregamento de public/data/mercado.json (gerado por scripts/caged_painel.py).

export type Municipio = { c: string; n: string; rmbh: boolean }
export type Ocupacao = { c: string; n: string; g: number }

type Fonte = { nome: string; url: string; ftp: string; geradoEm: string; ultimaCompetencia: string }

type MercadoJson = {
  fonte: Fonte
  meses: string[]
  municipios: Municipio[]
  ocupacoes: Ocupacao[]
  grupos: string[]
  secoes: string[]
  escolaridades: string[]
  sexos: string[]
  racas: string[]
  mov: Record<"m" | "mu" | "o" | "s" | "e" | "i" | "x" | "r" | "t" | "sal" | "ok", number[]>
  totais: Record<"m" | "mu" | "adm" | "desl", number[]>
}

/** Movimentações em arrays tipados (colunar): rápido de filtrar no navegador. */
export type Movimentacoes = {
  n: number
  m: Uint8Array // índice do mês
  mu: Uint16Array // índice do município
  o: Uint8Array // índice da ocupação
  s: Uint8Array // seção CNAE (setor)
  e: Uint8Array // escolaridade
  i: Int8Array // idade (-1 = não informada)
  x: Uint8Array // sexo
  r: Uint8Array // raça/cor
  /** 1 admissão, -1 desligamento, 2/-2 exclusão de admissão/desligamento */
  t: Int8Array
  sal: Int32Array
  /** 1 se o salário entra nas estatísticas (ver README) */
  ok: Uint8Array
}

export type Mercado = Omit<MercadoJson, "mov" | "totais"> & {
  mov: Movimentacoes
  totais: { n: number; m: Uint8Array; mu: Uint16Array; adm: Int32Array; desl: Int32Array }
  idxBH: number
  /** municípios (índices) com pelo menos uma movimentação de Dados e TI */
  municipiosComDados: number[]
}

export const URL_MERCADO = "/data/mercado.json"

export function decodificarMercado(bruto: MercadoJson): Mercado {
  const v = bruto.mov
  const mov: Movimentacoes = {
    n: v.m.length,
    m: Uint8Array.from(v.m),
    mu: Uint16Array.from(v.mu),
    o: Uint8Array.from(v.o),
    s: Uint8Array.from(v.s),
    e: Uint8Array.from(v.e),
    i: Int8Array.from(v.i),
    x: Uint8Array.from(v.x),
    r: Uint8Array.from(v.r),
    t: Int8Array.from(v.t),
    sal: Int32Array.from(v.sal),
    ok: Uint8Array.from(v.ok),
  }
  const presentes = new Set<number>()
  for (let k = 0; k < mov.n; k++) presentes.add(mov.mu[k])
  return {
    ...bruto,
    mov,
    totais: {
      n: bruto.totais.m.length,
      m: Uint8Array.from(bruto.totais.m),
      mu: Uint16Array.from(bruto.totais.mu),
      adm: Int32Array.from(bruto.totais.adm),
      desl: Int32Array.from(bruto.totais.desl),
    },
    idxBH: bruto.municipios.findIndex((m) => m.c === "310620"),
    municipiosComDados: [...presentes].sort((a, b) =>
      bruto.municipios[a].n.localeCompare(bruto.municipios[b].n, "pt-BR"),
    ),
  }
}
