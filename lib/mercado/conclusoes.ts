// "Principais conclusões": frases em linguagem simples geradas a partir dos
// números do recorte atual. Cada regra só entra quando há dados suficientes.

import { fmtInt, fmtMoeda, fmtPct } from "@/lib/format"

import type { Mercado } from "./dados"
import type { FiltroResolvido } from "./filtros"
import type { Resumo } from "./calcular"

export type Conclusao = { id: string; titulo: string; texto: string }

const MIN_AMOSTRA = 30

export function gerarConclusoes(d: Mercado, f: FiltroResolvido, r: Resumo): Conclusao[] {
  const saida: Conclusao[] = []
  const { kpis } = r
  if (kpis.adm <= 0) return saida
  const onde = f.rotuloLocal === "Minas Gerais" ? "em Minas Gerais" : f.rotuloLocal.startsWith("Região") || f.rotuloLocal.startsWith("Interior") ? `na ${f.rotuloLocal.replace(/^Interior/, "região do interior")}` : `em ${f.rotuloLocal}`
  const nMeses = r.meses.length
  const periodo = nMeses === 1 ? "no mês" : `nos ${nMeses} meses selecionados`

  // 1. ocupação que mais contrata
  const lider = r.ocupacoes[0]
  if (lider && lider.n > 0) {
    const sal = r.salarioPorOcupacao.find((x) => x.idx === lider.idx)
    const comSalario = sal && sal.n >= MIN_AMOSTRA ? `, com salário mediano de ${fmtMoeda(sal.mediana)}` : ""
    saida.push({
      id: "lider",
      titulo: "Quem mais contrata",
      texto: `${lider.nome} foi a ocupação com mais contratações ${onde} ${periodo}: ${fmtInt(lider.n)}, ou ${fmtPct(lider.n / kpis.adm, 0)} do total${comSalario}.`,
    })
  }

  // 2. tendência frente ao período anterior
  if (r.temAnterior && kpis.admAnt > 0) {
    const v = (kpis.adm - kpis.admAnt) / kpis.admAnt
    const direcao = Math.abs(v) < 0.02 ? "ficaram estáveis" : v > 0 ? `cresceram ${fmtPct(v)}` : `caíram ${fmtPct(-v)}`
    const saldo = kpis.saldo >= 0 ? `O saldo foi positivo: ${fmtInt(kpis.saldo)} contratações a mais do que demissões.` : `O saldo foi negativo: ${fmtInt(-kpis.saldo)} demissões a mais do que contratações.`
    saida.push({
      id: "tendencia",
      titulo: "Ritmo de contratação",
      texto: `As contratações ${direcao} em relação ao período anterior de mesma duração. ${saldo}`,
    })
  }

  // 3. TI não é só empresa de tecnologia
  const setorTi = d.secoes.indexOf("Informação e comunicação")
  const emTi = r.setores.find((s) => s.idx === setorTi)?.n ?? 0
  const foraTi = kpis.adm - emTi
  const topSetor = r.setores[0]
  if (kpis.adm >= MIN_AMOSTRA && topSetor) {
    saida.push({
      id: "setores",
      titulo: "Onde estão as vagas",
      texto: `${fmtPct(foraTi / kpis.adm, 0)} das contratações de Dados e TI aconteceram fora de empresas de tecnologia (setor de informação e comunicação). O setor que mais contratou foi ${topSetor.nome.toLowerCase()}, com ${fmtPct(topSetor.n / kpis.adm, 0)} das vagas.`,
    })
  }

  // 4. prêmio do diploma
  const esc = (nome: string) => r.salarioPorEscolaridade.find((x) => x.nome === nome)
  const superior = esc("Superior completo")
  const medio = esc("Médio completo")
  if (superior && medio && superior.n >= MIN_AMOSTRA && medio.n >= MIN_AMOSTRA && medio.mediana > 0) {
    const premio = superior.mediana / medio.mediana - 1
    saida.push({
      id: "diploma",
      titulo: "Quanto vale o diploma",
      texto: `Quem foi contratado com ensino superior completo teve salário mediano de ${fmtMoeda(superior.mediana)}, ${premio >= 0 ? `${fmtPct(premio, 0)} acima` : `${fmtPct(-premio, 0)} abaixo`} de quem tinha ensino médio completo (${fmtMoeda(medio.mediana)}).`,
    })
  }

  // 5. diferença entre mulheres e homens
  const { homem, mulher } = r.salarioPorSexo
  if (Number.isFinite(kpis.pctMulher) && homem.n >= MIN_AMOSTRA && mulher.n >= MIN_AMOSTRA) {
    const gap = mulher.mediana / homem.mediana - 1
    const comparacao = Math.abs(gap) < 0.02 ? "praticamente igual ao dos homens" : `${fmtPct(Math.abs(gap), 0)} ${gap < 0 ? "abaixo" : "acima"} do dos homens (${fmtMoeda(homem.mediana)})`
    saida.push({
      id: "genero",
      titulo: "Mulheres na área",
      texto: `Mulheres foram ${fmtPct(kpis.pctMulher, 0)} das contratações. O salário mediano delas na contratação foi de ${fmtMoeda(mulher.mediana)}, ${comparacao}.`,
    })
  }

  // 6. concentração em BH (quando o recorte é o estado)
  if (f.rotuloLocal === "Minas Gerais") {
    let totalMg = 0
    for (const v of r.porMunicipio) totalMg += v
    const bh = r.porMunicipio[d.idxBH]
    if (totalMg > 0) {
      saida.push({
        id: "concentracao",
        titulo: "Concentração na capital",
        texto: `Belo Horizonte concentrou ${fmtPct(bh / totalMg, 0)} das contratações de Dados e TI de Minas Gerais no período.`,
      })
    }
  }

  return saida.slice(0, 5)
}
