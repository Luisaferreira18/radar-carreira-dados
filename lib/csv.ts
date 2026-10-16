// Exportação CSV no formato que o Excel brasileiro abre direto:
// separador ";", vírgula decimal e BOM UTF-8 (para os acentos aparecerem certos).

function celula(valor: string | number): string {
  const texto = typeof valor === "number" ? (Number.isFinite(valor) ? String(valor).replace(".", ",") : "") : valor
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function gerarCsv(cabecalho: string[], linhas: (string | number)[][]): string {
  return [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n")
}

export function baixarCsv(nome: string, cabecalho: string[], linhas: (string | number)[][]) {
  const blob = new Blob(["﻿", gerarCsv(cabecalho, linhas)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nome.endsWith(".csv") ? nome : `${nome}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
