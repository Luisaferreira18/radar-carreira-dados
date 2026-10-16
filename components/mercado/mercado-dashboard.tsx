"use client"

import dynamic from "next/dynamic"
import { useCallback, useMemo, useState } from "react"

import { BarListChart } from "@/components/charts/bar-list-chart"
import { ColumnChart } from "@/components/charts/column-chart"
import { DivergingBarChart } from "@/components/charts/diverging-bar-chart"
import { RangeChart } from "@/components/charts/range-chart"
import { TimeSeriesChart } from "@/components/charts/time-series-chart"
import { ChartCard, Legenda } from "@/components/dashboard/chart-card"
import { EmptyState, SemDados } from "@/components/dashboard/empty-state"
import { Insights } from "@/components/dashboard/insights"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { Segmented } from "@/components/dashboard/segmented"
import { DashboardSkeleton } from "@/components/dashboard/skeletons"
import { SourceFooter } from "@/components/dashboard/source-footer"
import { Skeleton } from "@/components/ui/skeleton"
import { fmtData, fmtEixo, fmtInt, fmtMes, fmtMesCurto, fmtMesLongo, fmtMoeda, fmtMoedaCompacta, fmtPct, fmtPontos, fmtSaldo, fmtVariacao } from "@/lib/format"
import { calcular, FAIXAS_SALARIO_FIM, FAIXAS_SALARIO_INICIO } from "@/lib/mercado/calcular"
import { gerarConclusoes } from "@/lib/mercado/conclusoes"
import { decodificarMercado, URL_MERCADO, type Mercado } from "@/lib/mercado/dados"
import { resolverFiltro, useFiltrosMercado } from "@/lib/mercado/filtros"
import { useDados } from "@/lib/use-dados"

import { FiltrosMercadoBar } from "./filtros-mercado"
import { TabelaMercado } from "./tabela-mercado"

// O mapa (MapLibre, ~250 KB) só é baixado quando o painel aparece.
const ChoroplethMap = dynamic(() => import("@/components/map/choropleth-map").then((m) => m.ChoroplethMap), {
  ssr: false,
  loading: () => <Skeleton className="min-h-72 flex-1 rounded-lg" />,
})

const MIN_SALARIOS = 10

export function MercadoDashboard() {
  const { dados, erro } = useDados(URL_MERCADO, decodificarMercado)
  if (erro) {
    return <EmptyState titulo="Não foi possível carregar os dados" mensagem={`Recarregue a página. Detalhe técnico: ${erro}.`} />
  }
  if (!dados) return <DashboardSkeleton />
  return <Painel d={dados} />
}

function rotuloIntervalo(chave: string) {
  const [de, ate] = chave.split("|")
  return ate ? `${fmtMesCurto(de)}–${fmtMesCurto(ate)}` : fmtMes(de)
}

function direcao(v: number): -1 | 0 | 1 {
  if (!Number.isFinite(v) || Math.abs(v) < 0.0005) return 0
  return v > 0 ? 1 : -1
}

function Painel({ d }: { d: Mercado }) {
  const [filtros, setFiltros] = useFiltrosMercado()
  const f = useMemo(() => resolverFiltro(d, filtros), [d, filtros])
  const r = useMemo(() => calcular(d, f), [d, f])
  const conclusoes = useMemo(() => gerarConclusoes(d, f, r), [d, f, r])
  const [visaoSalario, setVisaoSalario] = useState<"area" | "ocupacao">("area")
  const [visaoRanking, setVisaoRanking] = useState<"setor" | "ocupacao">("setor")
  const [visaoPerfil, setVisaoPerfil] = useState<"idade" | "escolaridade">("idade")

  const { kpis } = r
  const comparacao = r.temAnterior ? `vs. ${rotuloIntervalo(r.rotuloAnterior)}` : "Primeiro período da série"
  const limpar = () => setFiltros({ de: null, ate: null, local: null, area: null, ocup: null, esc: null })
  const vazio = kpis.adm <= 0 && kpis.desl <= 0

  const selecionadoMapa = filtros.local === "bh" ? "310620" : /^\d{6}$/.test(filtros.local) ? filtros.local : null
  const valoresMapa = useMemo(
    () => d.municipios.map((m, i) => ({ codigo: m.c, nome: m.n, valor: r.porMunicipio[i] })),
    [d, r.porMunicipio],
  )
  const selecionarMunicipio = useCallback(
    (codigo: string) => setFiltros({ local: codigo === "310620" ? null : codigo }),
    [setFiltros],
  )

  // Faixa salarial: por área (padrão) ou pelas 10 ocupações com mais contratações
  const faixas = useMemo(() => {
    const base = visaoSalario === "area" ? r.salarioPorGrupo : [...r.salarioPorOcupacao].sort((x, y) => y.n - x.n).slice(0, 10)
    return base
      .filter((x) => x.n >= MIN_SALARIOS)
      .sort((x, y) => y.mediana - x.mediana)
      .map((x) => ({ nome: x.nome, p25: x.p25, mediana: x.mediana, p75: x.p75, n: x.n, cor: visaoSalario === "area" ? x.grupo ?? 0 : 0 }))
  }, [r, visaoSalario])

  const histograma = r.histograma
  const totalHist = histograma.reduce((s, h) => s + h.n, 0)
  const faixaMediana = Number.isFinite(kpis.mediana)
    ? kpis.mediana < FAIXAS_SALARIO_INICIO
      ? 0
      : Math.min(histograma.length - 1, 1 + Math.floor((kpis.mediana - FAIXAS_SALARIO_INICIO) / 1000))
    : undefined
  const rotulosHist = histograma.map((h) =>
    h.de === 0 ? "< 2 mil" : h.ate === null ? `${FAIXAS_SALARIO_FIM / 1000} mil+` : `${h.de / 1000}–${h.ate / 1000} mil`,
  )

  const ranking = (visaoRanking === "setor" ? r.setores : r.ocupacoes).slice(0, 10)
  const perfil = visaoPerfil === "idade" ? r.idade : r.escolaridade.filter((x) => x.nome !== "Não identificada")
  const totalPerfil = perfil.reduce((s, x) => s + x.n, 0)

  const formatarPct = useCallback((v: number) => fmtPct(v, 0), [])
  const formatarFaixaHist = useCallback(
    (i: number) => `${fmtPct(totalHist ? histograma[i].n / totalHist : 0)} das contratações com salário válido`,
    [histograma, totalHist],
  )

  const atualizacao = `Dados até ${fmtMesLongo(d.fonte.ultimaCompetencia.replace(/(\d{4})(\d{2})/, "$1-$2"))} (última divulgação do Novo CAGED) · processados em ${fmtData(d.fonte.geradoEm)}.`

  return (
    <div className="flex flex-col gap-6">
      <FiltrosMercadoBar d={d} filtros={filtros} f={f} />

      {vazio ? (
        <EmptyState onLimpar={limpar} />
      ) : (
        <>
          <p className="text-sm text-pretty text-muted-foreground">
            <span className="font-medium text-foreground">{f.rotuloLocal}</span>
            {" · "}
            {r.meses.length === 1 ? fmtMesLongo(r.meses[0]) : `${fmtMesLongo(r.meses[0])} a ${fmtMesLongo(r.meses[r.meses.length - 1])}`}
            {Number.isFinite(kpis.participacao) && (
              <>
                {" · "}
                Dados e TI {filtros.area.length || filtros.ocup.length ? "(recorte filtrado) " : ""}representam{" "}
                <span className="font-medium text-foreground">{fmtPct(kpis.participacao)}</span> de todas as contratações com carteira assinada no local.
              </>
            )}
          </p>

          <section aria-label="Indicadores principais" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              titulo="Contratações"
              valor={fmtInt(kpis.adm)}
              variacao={r.temAnterior && Number.isFinite(r.variacoes.adm) ? fmtVariacao(r.variacoes.adm) : null}
              direcao={direcao(r.variacoes.adm)}
              comparacao={comparacao}
              definicao="Admissões com carteira assinada nas ocupações filtradas (declaradas no prazo e fora do prazo, menos as excluídas)."
              tendencia={r.serie.adm}
            />
            <KpiCard
              titulo="Saldo de empregos"
              valor={fmtSaldo(kpis.saldo)}
              variacao={r.temAnterior ? fmtSaldo(kpis.saldo - kpis.saldoAnt) : null}
              direcao={direcao(kpis.saldo - kpis.saldoAnt)}
              comparacao={comparacao}
              definicao="Contratações menos desligamentos. Positivo = o número de pessoas empregadas nessas ocupações cresceu."
              tendencia={r.serie.saldo}
            />
            <KpiCard
              titulo="Salário mediano"
              valor={kpis.nSalario >= MIN_SALARIOS ? fmtMoeda(kpis.mediana) : "—"}
              variacao={r.temAnterior && Number.isFinite(r.variacoes.mediana) && kpis.nSalario >= MIN_SALARIOS ? fmtVariacao(r.variacoes.mediana) : null}
              direcao={direcao(r.variacoes.mediana)}
              comparacao={comparacao}
              definicao="Salário de contratação: metade das pessoas contratadas ganha menos e metade ganha mais que este valor. Considera só contratos mensais de 30 h ou mais (sem aprendiz e intermitente). Valores nominais."
              tendencia={r.serie.mediana}
            />
            <KpiCard
              titulo="Mulheres contratadas"
              valor={Number.isFinite(kpis.pctMulher) ? fmtPct(kpis.pctMulher) : "—"}
              variacao={r.temAnterior && Number.isFinite(kpis.pctMulherAnt) ? fmtPontos(kpis.pctMulher - kpis.pctMulherAnt) : null}
              direcao={direcao(kpis.pctMulher - kpis.pctMulherAnt)}
              sentido="neutro"
              comparacao={comparacao}
              definicao="Percentual de mulheres entre as contratações com sexo informado."
              tendencia={r.serie.pctMulher}
            />
            <KpiCard
              titulo="Com ensino superior"
              valor={Number.isFinite(kpis.pctSuperior) ? fmtPct(kpis.pctSuperior) : "—"}
              variacao={r.temAnterior && Number.isFinite(kpis.pctSuperiorAnt) ? fmtPontos(kpis.pctSuperior - kpis.pctSuperiorAnt) : null}
              direcao={direcao(kpis.pctSuperior - kpis.pctSuperiorAnt)}
              sentido="neutro"
              comparacao={comparacao}
              definicao="Percentual de contratações de pessoas com ensino superior completo ou pós-graduação (entre as com escolaridade informada)."
              tendencia={r.serie.pctSuperior}
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-5">
            <ChartCard
              className="xl:col-span-3"
              titulo="Evolução mensal"
              descricao="Contratações e desligamentos por mês. As barras abaixo mostram o saldo."
              acao={<Legenda itens={[{ nome: "Contratações", cor: 0 }, { nome: "Desligamentos", cor: 1 }]} />}
            >
              <TimeSeriesChart
                meses={r.meses}
                series={[
                  { nome: "Contratações", valores: r.serie.adm, cor: 0 },
                  { nome: "Desligamentos", valores: r.serie.desl, cor: 1 },
                ]}
                formatar={fmtInt}
                formatarEixo={fmtEixo}
                ariaLabel={`Linha do tempo de contratações e desligamentos em ${f.rotuloLocal}`}
                className="h-60"
              />
              <p className="mt-3 mb-1 text-xs font-medium text-muted-foreground">Saldo do mês</p>
              <DivergingBarChart
                meses={r.meses}
                valores={r.serie.saldo}
                rotulo="Saldo"
                formatar={fmtSaldo}
                ariaLabel="Saldo mensal de empregos"
                className="h-24"
              />
            </ChartCard>

            <ChartCard
              className="xl:col-span-2"
              titulo="Contratações por município"
              descricao="Clique em um município para filtrar o painel. Use Ctrl + rolagem para dar zoom."
            >
              <ChoroplethMap
                valores={valoresMapa}
                selecionado={selecionadoMapa}
                onSelecionar={selecionarMunicipio}
                formatar={fmtInt}
                rotuloValor="Contratações"
                className="h-full min-h-80"
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              titulo="Quanto paga cada área"
              descricao="Ponto = salário mediano. Barra = faixa onde está a metade central dos salários (do 1º ao 3º quartil)."
              acao={
                <Segmented
                  rotulo="Agrupar salários por"
                  valor={visaoSalario}
                  onChange={setVisaoSalario}
                  opcoes={[{ valor: "area", rotulo: "Área" }, { valor: "ocupacao", rotulo: "Ocupação" }]}
                />
              }
            >
              {faixas.length ? (
                <RangeChart itens={faixas} formatar={fmtMoedaCompacta} ariaLabel="Faixas salariais por categoria" />
              ) : (
                <SemDados mensagem="Poucas contratações com salário válido neste recorte." />
              )}
            </ChartCard>

            <ChartCard
              titulo="Distribuição dos salários"
              descricao={
                Number.isFinite(kpis.mediana) && kpis.nSalario >= MIN_SALARIOS ? (
                  <>
                    Quantas contratações caem em cada faixa de salário. A coluna escura contém a mediana ({fmtMoeda(kpis.mediana)}).
                  </>
                ) : (
                  "Quantas contratações caem em cada faixa de salário."
                )
              }
            >
              {totalHist >= MIN_SALARIOS ? (
                <ColumnChart
                  categorias={rotulosHist}
                  valores={histograma.map((h) => h.n)}
                  formatar={fmtInt}
                  rotuloValor="Contratações"
                  ariaLabel="Histograma de salários de contratação"
                  detalhe={formatarFaixaHist}
                  destaque={faixaMediana}
                  rotulos={false}
                  className="h-72"
                />
              ) : (
                <SemDados mensagem="Poucas contratações com salário válido neste recorte." />
              )}
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              titulo={visaoRanking === "setor" ? "Top 10 setores que mais contratam" : "Top 10 ocupações que mais contratam"}
              descricao={
                visaoRanking === "setor"
                  ? "Setor da empresa contratante (CNAE). Mostra onde procurar vagas além das empresas de tecnologia."
                  : "Clique em uma ocupação para filtrar o painel."
              }
              acao={
                <Segmented
                  rotulo="Ranking por"
                  valor={visaoRanking}
                  onChange={setVisaoRanking}
                  opcoes={[{ valor: "setor", rotulo: "Setor" }, { valor: "ocupacao", rotulo: "Ocupação" }]}
                />
              }
            >
              {ranking.length ? (
                <BarListChart
                  itens={ranking.map((x) => ({ nome: x.nome, valor: x.n, detalhe: `${fmtPct(x.n / kpis.adm)} das contratações` }))}
                  formatar={fmtInt}
                  rotuloValor="Contratações"
                  ariaLabel="Ranking das categorias com mais contratações"
                  onClickItem={visaoRanking === "ocupacao" ? (i) => setFiltros({ ocup: [d.ocupacoes[ranking[i].idx].c] }) : undefined}
                />
              ) : (
                <SemDados />
              )}
            </ChartCard>

            <ChartCard
              titulo="Perfil de quem é contratado"
              descricao={visaoPerfil === "idade" ? "Contratações por faixa de idade." : "Contratações por escolaridade."}
              acao={
                <Segmented
                  rotulo="Perfil por"
                  valor={visaoPerfil}
                  onChange={setVisaoPerfil}
                  opcoes={[{ valor: "idade", rotulo: "Idade" }, { valor: "escolaridade", rotulo: "Escolaridade" }]}
                />
              }
            >
              {totalPerfil > 0 ? (
                <ColumnChart
                  categorias={perfil.map((x) => x.nome)}
                  valores={perfil.map((x) => (totalPerfil ? x.n / totalPerfil : 0))}
                  formatar={formatarPct}
                  rotuloValor="Participação"
                  ariaLabel="Distribuição das contratações por perfil"
                  detalhe={(i) => `${fmtInt(perfil[i].n)} contratações`}
                  className="h-72"
                />
              ) : (
                <SemDados />
              )}
            </ChartCard>
          </div>

          <Insights itens={conclusoes} descricao={`Calculadas automaticamente para o recorte atual (${f.rotuloLocal}).`} />

          <ChartCard
            titulo="Dados filtrados"
            descricao="Cada linha é uma contratação ou um desligamento registrado no Novo CAGED. Busque por município, ocupação, área ou setor."
          >
            <TabelaMercado d={d} linhas={r.linhas} />
          </ChartCard>
        </>
      )}

      <SourceFooter
        fontes={[
          { nome: "Novo CAGED — Ministério do Trabalho e Emprego", url: d.fonte.url, detalhe: "microdados públicos" },
          { nome: "Malha municipal — IBGE", url: "https://servicodados.ibge.gov.br/api/docs/malhas?versao=3" },
        ]}
        atualizacao={atualizacao}
        observacao="O CAGED registra só empregos com carteira assinada (CLT): não inclui PJ, freelancers nem servidores estatutários. Não existe código de ocupação específico para analista de BI ou cientista de dados; esses profissionais costumam ser registrados como analista de sistemas, de negócios ou estatístico."
      />
    </div>
  )
}
