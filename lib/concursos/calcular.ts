import { fmtInt, fmtPct } from "@/lib/format"

import { ESCOLARIDADES, TIPOS, resolverAnos, tiposAtivos, type Autorizacao, type Concursos, type FiltrosConcursos } from "./dados"

export const FAIXAS_TAMANHO = [
  { rotulo: "Cadastro reserva", de: 0, ate: 0 },
  { rotulo: "1 a 20", de: 1, ate: 20 },
  { rotulo: "21 a 50", de: 21, ate: 50 },
  { rotulo: "51 a 100", de: 51, ate: 100 },
  { rotulo: "101 a 300", de: 101, ate: 300 },
  { rotulo: "301 a 1.000", de: 301, ate: 1000 },
  { rotulo: "Mais de 1.000", de: 1001, ate: Number.POSITIVE_INFINITY },
]

function filtrar(c: Concursos, f: FiltrosConcursos, a: number, b: number): Autorizacao[] {
  const tipos = tiposAtivos(f)
  return c.registros.filter(
    (r) =>
      r.ano >= a &&
      r.ano <= b &&
      tipos.has(r.tipo) &&
      (f.esc.length === 0 || f.esc.includes(r.escolaridade)) &&
      (f.ministerio.length === 0 || f.ministerio.includes(r.vinculo)) &&
      (f.cargos !== "ti" || r.ti),
  )
}

const somaVagas = (rs: Autorizacao[]) => rs.reduce((s, r) => s + r.vagas, 0)

function porChave(rs: Autorizacao[], chave: (r: Autorizacao) => string) {
  const m = new Map<string, number>()
  for (const r of rs) m.set(chave(r), (m.get(chave(r)) ?? 0) + r.vagas)
  return [...m.entries()].map(([nome, n]) => ({ nome, n })).sort((x, y) => y.n - x.n)
}

export function calcularConcursos(c: Concursos, f: FiltrosConcursos) {
  const { a, b } = resolverAnos(c, f)
  const anos = c.anos.filter((x) => x >= a && x <= b)
  const atuais = filtrar(c, f, a, b)
  const n = b - a + 1
  const temAnterior = a - n >= c.anos[0]
  const anteriores = temAnterior ? filtrar(c, f, a - n, a - 1) : []

  const vagas = somaVagas(atuais)
  const vagasAnt = somaVagas(anteriores)
  const vagasSuperior = somaVagas(atuais.filter((r) => r.escolaridade === "Superior"))
  const vagasSuperiorAnt = somaVagas(anteriores.filter((r) => r.escolaridade === "Superior"))

  const semPlanilha = new Set(c.fonte.anosSemPlanilha)
  const tiposVisiveis = TIPOS.filter((t) => tiposAtivos(f).has(t.nome))
  const seriePorTipo = tiposVisiveis.map((t) => ({
    nome: t.nome,
    cor: t.cor,
    valores: anos.map((ano) => (semPlanilha.has(ano) ? null : somaVagas(atuais.filter((r) => r.ano === ano && r.tipo === t.nome)))),
  }))
  const vagasPorAno = anos.map((ano) => (semPlanilha.has(ano) ? Number.NaN : somaVagas(atuais.filter((r) => r.ano === ano))))

  const orgaos = porChave(atuais, (r) => r.orgao)
  const ministerios = porChave(atuais, (r) => r.vinculo)
  const escolaridade = ESCOLARIDADES.map((nome) => ({ nome, n: somaVagas(atuais.filter((r) => r.escolaridade === nome)) })).filter((x) => x.n > 0)
  const areas = porChave(atuais.filter((r) => r.area !== "Não informada"), (r) => r.area)
  const tamanhos = FAIXAS_TAMANHO.map((fx) => ({
    nome: fx.rotulo,
    n: atuais.filter((r) => (fx.de === 0 ? r.cadastroReserva : !r.cadastroReserva && r.vagas >= fx.de && r.vagas <= fx.ate)).length,
  }))

  const conclusoes: { id: string; titulo: string; texto: string }[] = []
  const anoPico = anos.reduce<{ ano: number; v: number } | null>((m, ano, i) => (Number.isFinite(vagasPorAno[i]) && (!m || vagasPorAno[i] > m.v) ? { ano, v: vagasPorAno[i] } : m), null)
  if (anoPico && vagas > 0 && anos.length > 1) {
    conclusoes.push({
      id: "pico",
      titulo: "Ano de mais vagas",
      texto: `${anoPico.ano} foi o ano com mais vagas autorizadas no recorte: ${fmtInt(anoPico.v)}, ${fmtPct(anoPico.v / vagas, 0)} de todo o período.`,
    })
  }
  if (orgaos[0] && vagas > 0) {
    conclusoes.push({
      id: "orgao",
      titulo: "Órgão que mais abriu vagas",
      texto: `${orgaos[0].nome} lidera com ${fmtInt(orgaos[0].n)} vagas (${fmtPct(orgaos[0].n / vagas, 0)} do total). Os 3 maiores órgãos somam ${fmtPct(orgaos.slice(0, 3).reduce((s, o) => s + o.n, 0) / vagas, 0)}.`,
    })
  }
  if (vagas > 0) {
    conclusoes.push({
      id: "superior",
      titulo: "Nível de escolaridade",
      texto:
        vagasSuperior / vagas >= 0.5
          ? `${fmtPct(vagasSuperior / vagas, 0)} das vagas são exclusivas para nível superior: a maior parte das oportunidades federais pede diploma.`
          : `${fmtPct(vagasSuperior / vagas, 0)} das vagas são exclusivas para nível superior; as demais aceitam (ou exigem) nível médio.`,
    })
  }
  const ti = atuais.filter((r) => r.ti)
  if (f.cargos !== "ti" && ti.length > 0) {
    conclusoes.push({
      id: "ti",
      titulo: "Cargos de TI e dados",
      texto: `${fmtInt(ti.length)} autorizações (${fmtInt(somaVagas(ti))} vagas) incluem cargos de tecnologia, dados ou estatística. Use o filtro "Cargos" para ver só esses.`,
    })
  }
  if (!tiposAtivos(f).has("Contratação temporária")) {
    const temp = c.registros.filter((r) => r.tipo === "Contratação temporária" && r.ano >= a && r.ano <= b)
    if (temp.length) {
      conclusoes.push({
        id: "temporarias",
        titulo: "Temporárias fora da conta",
        texto: `Por padrão, ${fmtInt(somaVagas(temp))} vagas de contratação temporária ficam de fora — a maior parte é do Censo do IBGE (2019 e 2021), que distorceria a série. Inclua-as no filtro "Tipo".`,
      })
    }
  }

  return {
    a, b, anos, atuais, temAnterior,
    rotuloAnterior: temAnterior ? (n === 1 ? String(a - 1) : `${a - n}–${a - 1}`) : "",
    kpis: {
      vagas,
      vagasAnt,
      autorizacoes: atuais.length,
      autorizacoesAnt: anteriores.length,
      orgaos: new Set(atuais.map((r) => r.orgao)).size,
      orgaosAnt: new Set(anteriores.map((r) => r.orgao)).size,
      pctSuperior: vagas ? vagasSuperior / vagas : Number.NaN,
      pctSuperiorAnt: vagasAnt ? vagasSuperiorAnt / vagasAnt : Number.NaN,
    },
    vagasPorAno,
    seriePorTipo,
    orgaos,
    ministerios,
    escolaridade,
    areas,
    tamanhos,
    conclusoes: conclusoes.slice(0, 5),
  }
}
