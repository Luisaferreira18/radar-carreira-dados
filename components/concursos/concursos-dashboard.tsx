"use client"

import { ExternalLink } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import { BarListChart } from "@/components/charts/bar-list-chart"
import { ColumnChart } from "@/components/charts/column-chart"
import { StackedBarChart } from "@/components/charts/stacked-bar-chart"
import { ChartCard, Legenda } from "@/components/dashboard/chart-card"
import { DataTable, type Coluna } from "@/components/dashboard/data-table"
import { EmptyState, SemDados } from "@/components/dashboard/empty-state"
import { Insights } from "@/components/dashboard/insights"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { Segmented } from "@/components/dashboard/segmented"
import { DashboardSkeleton } from "@/components/dashboard/skeletons"
import { SourceFooter } from "@/components/dashboard/source-footer"
import { FilterBar } from "@/components/filters/filter-bar"
import { MultiSelect } from "@/components/filters/multi-select"
import { PeriodFilter } from "@/components/filters/period-filter"
import { SingleSelect } from "@/components/filters/single-select"
import { calcularConcursos } from "@/lib/concursos/calcular"
import {
  decodificarConcursos,
  ESCOLARIDADES,
  resolverAnos,
  TIPOS,
  tiposAtivos,
  URL_CONCURSOS,
  useFiltrosConcursos,
  type Concursos,
} from "@/lib/concursos/dados"
import { fmtData, fmtEixo, fmtInt, fmtPct, fmtPontos, fmtVariacao } from "@/lib/format"
import { useDados } from "@/lib/use-dados"

export function ConcursosDashboard() {
  const { dados, erro } = useDados(URL_CONCURSOS, decodificarConcursos)
  if (erro) return <EmptyState titulo="Não foi possível carregar os dados" mensagem={`Recarregue a página. Detalhe técnico: ${erro}.`} />
  if (!dados) return <DashboardSkeleton kpis={4} comMapa={false} />
  return <Painel c={dados} />
}

const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

function direcao(v: number): -1 | 0 | 1 {
  if (!Number.isFinite(v) || Math.abs(v) < 0.0005) return 0
  return v > 0 ? 1 : -1
}

function Painel({ c }: { c: Concursos }) {
  const [filtros, setFiltros] = useFiltrosConcursos()
  const r = useMemo(() => calcularConcursos(c, filtros), [c, filtros])
  const [visaoComparacao, setVisaoComparacao] = useState<"escolaridade" | "area">("escolaridade")
  const [visaoRanking, setVisaoRanking] = useState<"orgao" | "ministerio">("orgao")

  const { a, b } = resolverAnos(c, filtros)
  const anosTexto = c.anos.map(String)
  const iA = c.anos.indexOf(a)
  const iB = c.anos.indexOf(b)
  const presets = useMemo(() => {
    const ult = c.anos.length - 1
    return [
      { id: "tudo", rotulo: `Tudo (${c.anos[0]}–${c.anos[ult]})`, a: 0, b: ult },
      { id: "5", rotulo: "Últimos 5 anos", a: Math.max(0, ult - 4), b: ult },
      { id: "3", rotulo: "Últimos 3 anos", a: Math.max(0, ult - 2), b: ult },
      ...c.anos.map((ano, i) => ({ id: String(ano), rotulo: String(ano), a: i, b: i })).reverse(),
    ]
  }, [c.anos])

  const ministerios = useMemo(
    () => [...new Set(c.registros.map((x) => x.vinculo))].sort((x, y) => x.localeCompare(y, "pt-BR")).map((v) => ({ valor: v, rotulo: v })),
    [c.registros],
  )
  const tiposSel = tiposAtivos(filtros)
  const ativos = (filtros.de || filtros.ate ? 1 : 0) + (filtros.tipo.length ? 1 : 0) + (filtros.esc.length ? 1 : 0) + (filtros.ministerio.length ? 1 : 0) + (filtros.cargos !== "todos" ? 1 : 0)
  const limpar = () => setFiltros({ de: null, ate: null, tipo: null, esc: null, ministerio: null, cargos: null })

  const k = r.kpis
  const comparacao = r.temAnterior ? `vs. ${r.rotuloAnterior}` : "Série completa"
  const semPlanilha = new Set(c.fonte.anosSemPlanilha)
  const notaAno = useCallback(
    (i: number) => (semPlanilha.has(r.anos[i]) ? "A tabela de 2023 não foi disponibilizada pela fonte (o link oficial abre a de 2024)." : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [r.anos, c.fonte.anosSemPlanilha],
  )

  const comparacaoItens = (visaoComparacao === "escolaridade" ? r.escolaridade : r.areas).map((x) => ({
    nome: x.nome,
    valor: x.n,
    detalhe: `${fmtPct(k.vagas ? x.n / k.vagas : 0)} das vagas`,
  }))
  const ranking = (visaoRanking === "orgao" ? r.orgaos : r.ministerios).slice(0, 10)
  const totalAut = r.tamanhos.reduce((s, x) => s + x.n, 0)

  const linhas = useMemo(() => r.atuais.map((x) => c.registros.indexOf(x)).sort((x, y) => (c.registros[y].data ?? "").localeCompare(c.registros[x].data ?? "")), [r.atuais, c.registros])
  const reg = c.registros
  const colunas: Coluna[] = useMemo(
    () => [
      { id: "ano", titulo: "Ano", valor: (i) => reg[i].ano, numerica: true, largura: "64px" },
      { id: "data", titulo: "Data do ato", valor: (i) => reg[i].data ?? "", celula: (i) => (reg[i].data ? fmtData(reg[i].data!) : "—"), largura: "116px" },
      { id: "orgao", titulo: "Órgão", valor: (i) => reg[i].orgao, celula: (i) => <span title={reg[i].orgao}>{reg[i].orgao}</span>, largura: "240px" },
      { id: "ministerio", titulo: "Ministério", valor: (i) => reg[i].vinculo, largura: "200px" },
      { id: "cargos", titulo: "Cargos", valor: (i) => reg[i].cargos.join(" · "), celula: (i) => <span title={reg[i].cargos.join("\n")}>{reg[i].cargos.join(" · ")}</span>, largura: "280px" },
      { id: "escolaridade", titulo: "Escolaridade", valor: (i) => reg[i].escolaridade, largura: "130px" },
      { id: "tipo", titulo: "Tipo", valor: (i) => reg[i].tipo, largura: "170px" },
      { id: "vagas", titulo: "Vagas", valor: (i) => reg[i].vagas, celula: (i) => (reg[i].cadastroReserva ? "CR" : fmtInt(reg[i].vagas)), numerica: true, largura: "80px" },
      {
        id: "link",
        titulo: "Publicação",
        valor: (i) => reg[i].link,
        celula: (i) =>
          reg[i].link ? (
            <a href={reg[i].link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              DOU <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : (
            <span className="text-muted-foreground" title={reg[i].ato}>Ato próprio</span>
          ),
        largura: "110px",
      },
    ],
    [reg],
  )
  const criarBusca = useCallback(
    (texto: string) => {
      const q = normalizar(texto)
      return (i: number) => normalizar(`${reg[i].orgao} ${reg[i].vinculo} ${reg[i].cargos.join(" ")} ${reg[i].ato}`).includes(q)
    },
    [reg],
  )

  return (
    <div className="flex flex-col gap-6">
      <FilterBar
        ativos={ativos}
        onLimpar={limpar}
        resumo={`${a === b ? a : `${a}–${b}`} · ${filtros.cargos === "ti" ? "Só TI e dados" : "Todos os cargos"}`}
      >
        <PeriodFilter
          passos={anosTexto}
          formatarPasso={(x) => x}
          presets={presets}
          a={iA}
          b={iB}
          onChange={(na, nb) => setFiltros(na === 0 && nb === c.anos.length - 1 ? { de: null, ate: null } : { de: String(c.anos[na]), ate: String(c.anos[nb]) })}
          ativo={!!(filtros.de || filtros.ate)}
        />
        <MultiSelect
          rotulo="Tipo"
          opcoes={TIPOS.map((t) => ({ valor: t.slug, rotulo: t.nome }))}
          selecionados={filtros.tipo}
          onChange={(v) => setFiltros({ tipo: v.length ? v : null })}
          textoTodos="Sem temporárias"
          busca={false}
        />
        <MultiSelect
          rotulo="Escolaridade"
          opcoes={ESCOLARIDADES.map((e) => ({ valor: e, rotulo: e }))}
          selecionados={filtros.esc}
          onChange={(v) => setFiltros({ esc: v.length ? v : null })}
          busca={false}
        />
        <MultiSelect rotulo="Ministério" opcoes={ministerios} selecionados={filtros.ministerio} onChange={(v) => setFiltros({ ministerio: v.length ? v : null })} textoTodos="Todos" />
        <SingleSelect
          rotulo="Cargos"
          opcoes={[{ valor: "todos", rotulo: "Todos os cargos" }, { valor: "ti", rotulo: "Só TI e dados" }]}
          valor={filtros.cargos}
          onChange={(v) => setFiltros({ cargos: v === "todos" ? null : v })}
          ativo={filtros.cargos !== "todos"}
          busca={false}
        />
      </FilterBar>

      {r.atuais.length === 0 ? (
        <EmptyState onLimpar={limpar} />
      ) : (
        <>
          <section aria-label="Indicadores principais" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              titulo="Vagas autorizadas"
              valor={fmtInt(k.vagas)}
              variacao={r.temAnterior && k.vagasAnt > 0 ? fmtVariacao((k.vagas - k.vagasAnt) / k.vagasAnt) : null}
              direcao={direcao(k.vagas - k.vagasAnt)}
              comparacao={comparacao}
              definicao="Soma das vagas nas portarias e decretos de autorização (concursos e nomeações). Cadastro reserva conta como zero."
              tendencia={r.vagasPorAno}
            />
            <KpiCard
              titulo="Autorizações publicadas"
              valor={fmtInt(k.autorizacoes)}
              variacao={r.temAnterior && k.autorizacoesAnt > 0 ? fmtVariacao((k.autorizacoes - k.autorizacoesAnt) / k.autorizacoesAnt) : null}
              direcao={direcao(k.autorizacoes - k.autorizacoesAnt)}
              comparacao={comparacao}
              definicao="Quantidade de atos oficiais (portarias, decretos ou atos próprios) que autorizaram vagas."
            />
            <KpiCard
              titulo="Órgãos contemplados"
              valor={fmtInt(k.orgaos)}
              variacao={r.temAnterior && k.orgaosAnt > 0 ? fmtVariacao((k.orgaos - k.orgaosAnt) / k.orgaosAnt) : null}
              direcao={direcao(k.orgaos - k.orgaosAnt)}
              comparacao={comparacao}
              definicao="Órgãos e entidades diferentes que receberam pelo menos uma autorização."
            />
            <KpiCard
              titulo="Vagas de nível superior"
              valor={Number.isFinite(k.pctSuperior) ? fmtPct(k.pctSuperior) : "—"}
              variacao={r.temAnterior && Number.isFinite(k.pctSuperiorAnt) ? fmtPontos(k.pctSuperior - k.pctSuperiorAnt) : null}
              direcao={direcao(k.pctSuperior - k.pctSuperiorAnt)}
              sentido="neutro"
              comparacao={comparacao}
              definicao="Percentual das vagas em autorizações exclusivas para nível superior (NS)."
            />
          </section>

          <ChartCard
            titulo="Vagas autorizadas por ano"
            descricao={
              semPlanilha.size
                ? `Por tipo de autorização. ${[...semPlanilha].join(", ")}: planilha não disponibilizada pela fonte. ${c.anos[c.anos.length - 1]}: dados parciais, até ${fmtData(c.fonte.ultimaDataAto)}.`
                : "Por tipo de autorização."
            }
            acao={<Legenda itens={TIPOS.filter((t) => tiposSel.has(t.nome)).map((t) => ({ nome: t.nome, cor: t.cor }))} />}
          >
            <StackedBarChart
              categorias={r.anos.map(String)}
              series={r.seriePorTipo}
              formatar={fmtEixo}
              nota={notaAno}
              ariaLabel="Vagas autorizadas por ano e tipo de autorização"
            />
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              titulo={visaoComparacao === "escolaridade" ? "Vagas por escolaridade exigida" : "Vagas por área de atuação"}
              descricao={visaoComparacao === "escolaridade" ? "Escolaridade exigida pelos cargos de cada autorização. “Superior e médio” = autorização com cargos dos dois níveis." : "A fonte só informa a área de atuação a partir de 2024."}
              acao={
                <Segmented
                  rotulo="Comparar por"
                  valor={visaoComparacao}
                  onChange={setVisaoComparacao}
                  opcoes={[{ valor: "escolaridade", rotulo: "Escolaridade" }, { valor: "area", rotulo: "Área" }]}
                />
              }
            >
              {comparacaoItens.length ? (
                <BarListChart itens={comparacaoItens} formatar={fmtInt} rotuloValor="Vagas" ariaLabel="Comparação de vagas entre categorias" cor={0} />
              ) : (
                <SemDados mensagem="A área de atuação não é informada para os anos selecionados." />
              )}
            </ChartCard>

            <ChartCard titulo="Tamanho das autorizações" descricao="Quantas autorizações caem em cada faixa de número de vagas.">
              <ColumnChart
                categorias={r.tamanhos.map((x) => x.nome)}
                valores={r.tamanhos.map((x) => x.n)}
                formatar={fmtInt}
                rotuloValor="Autorizações"
                ariaLabel="Distribuição das autorizações por número de vagas"
                detalhe={(i) => `${fmtPct(totalAut ? r.tamanhos[i].n / totalAut : 0)} das autorizações`}
                className="h-72"
              />
            </ChartCard>
          </div>

          <ChartCard
            titulo={visaoRanking === "orgao" ? "Top 10 órgãos com mais vagas" : "Top 10 ministérios com mais vagas"}
            descricao="Soma das vagas autorizadas no período e nos filtros selecionados."
            acao={
              <Segmented
                rotulo="Ranking por"
                valor={visaoRanking}
                onChange={setVisaoRanking}
                opcoes={[{ valor: "orgao", rotulo: "Órgão" }, { valor: "ministerio", rotulo: "Ministério" }]}
              />
            }
          >
            <BarListChart
              itens={ranking.map((x) => ({ nome: x.nome, valor: x.n, detalhe: `${fmtPct(k.vagas ? x.n / k.vagas : 0)} das vagas` }))}
              formatar={fmtInt}
              rotuloValor="Vagas"
              ariaLabel="Ranking de órgãos por vagas autorizadas"
              onClickItem={visaoRanking === "ministerio" ? (i) => setFiltros({ ministerio: [ranking[i].nome] }) : undefined}
            />
          </ChartCard>

          <Insights itens={r.conclusoes} descricao="Calculadas automaticamente para os filtros atuais." />

          <ChartCard titulo="Autorizações filtradas" descricao="Cada linha é um ato oficial. Busque por órgão, ministério ou cargo; o link abre a publicação no Diário Oficial da União.">
            <DataTable colunas={colunas} linhas={linhas} criarBusca={criarBusca} placeholderBusca="Ex.: Polícia Federal, analista, IBGE..." nomeArquivo="radar-carreira-concursos-federais" />
          </ChartCard>
        </>
      )}

      <SourceFooter
        fontes={[{ nome: c.fonte.nome, url: c.fonte.url }]}
        atualizacao={`Último ato registrado na fonte: ${fmtData(c.fonte.ultimaDataAto)} · dados processados em ${fmtData(c.fonte.geradoEm)}.`}
        observacao="Cobre o Poder Executivo federal (sem universidades e institutos federais, que têm autorização própria). Autorizar vagas não é o mesmo que abrir edital: o edital costuma sair meses depois."
      />
    </div>
  )
}
