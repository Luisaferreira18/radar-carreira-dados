import type { Metadata } from "next"
import type { ReactNode } from "react"

import { PageHeader, Pagina } from "@/components/dashboard/page-header"
import { Card } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Sobre os dados",
  description: "Fontes, limpeza e limitações dos dados usados no Radar de Carreira em Dados.",
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card className="gap-3 px-5 py-5 sm:px-6">
      <h2 className="text-base font-semibold">{titulo}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-pretty text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_li]:ml-4 [&_li]:list-disc">
        {children}
      </div>
    </Card>
  )
}

export default function SobrePage() {
  return (
    <Pagina>
      <PageHeader
        selo="Metodologia"
        titulo="Sobre os dados"
        descricao="De onde vêm os números, como foram limpos e o que eles não mostram. Todo o processamento é reproduzível pelos scripts em /scripts do repositório."
      />
      <div className="grid gap-4 pb-10 lg:grid-cols-2">
        <Secao titulo="Objetivo">
          <p>
            Ajudar quem busca emprego em <strong>Dados e Tecnologia</strong> em Minas Gerais a entender o mercado com dados oficiais:
            quanto se contrata, quanto se paga, em quais setores e cidades — e acompanhar as vagas autorizadas em concursos federais.
          </p>
        </Secao>

        <Secao titulo="Fontes">
          <ul className="flex flex-col gap-1.5">
            <li>
              <a href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/novo-caged" target="_blank" rel="noreferrer">
                Novo CAGED
              </a>{" "}
              (Ministério do Trabalho e Emprego): microdados de cada admissão e desligamento com carteira assinada, desde jan/2020, baixados do FTP público do PDET.
            </li>
            <li>
              <a href="https://www.gov.br/servidor/pt-br/observatorio-de-pessoal-govbr/autorizacoes-e-provimentos-concursos" target="_blank" rel="noreferrer">
                Tabelas de Autorizações e Provimentos
              </a>{" "}
              (Ministério da Gestão e da Inovação): uma planilha por ano com as vagas autorizadas para concursos e nomeações do Executivo federal.
            </li>
            <li>
              <a href="https://servicodados.ibge.gov.br/api/docs" target="_blank" rel="noreferrer">
                API de malhas e localidades do IBGE
              </a>
              : contornos e nomes dos 853 municípios de MG.
            </li>
          </ul>
        </Secao>

        <Secao titulo="Limpeza do Novo CAGED">
          <ul className="flex flex-col gap-1.5">
            <li>São lidos os três arquivos de cada mês: no prazo (MOV), fora do prazo (FOR) e exclusões (EXC). As contagens seguem o Ministério: <strong>MOV + FOR − EXC</strong>, pela competência da movimentação.</li>
            <li>Os arquivos vêm em codificações diferentes (UTF-8 e Latin-1); os nomes de coluna são normalizados antes da leitura.</li>
            <li>Ficam só as linhas de MG (UF 31) nas <strong>33 ocupações de Dados e TI</strong> listadas em <code>scripts/grupos_cbo.csv</code>, divididas em 4 áreas.</li>
            <li>
              <strong>Salário</strong> entra nas estatísticas só para admissões com pagamento mensal, jornada ≥ 30 h/semana, sem contrato intermitente nem aprendiz, entre R$ 500 e R$ 100 mil. Valores nominais (sem correção pela inflação).
            </li>
            <li>Idades fora de 14–90 anos viram “não informada”. Códigos (município, setor, escolaridade, sexo) viram nomes pelo dicionário oficial.</li>
            <li>O recorte original, sem alterações, fica versionado em <code>data/raw/caged_mg_dados_ti_original.csv.gz</code>.</li>
          </ul>
        </Secao>

        <Secao titulo="Limpeza dos concursos federais">
          <ul className="flex flex-col gap-1.5">
            <li>Cada ano tem colunas com nomes diferentes; o cabeçalho é localizado e as colunas são mapeadas pelo nome.</li>
            <li>Linhas de total e duplicatas exatas são removidas. “CR” (cadastro reserva) vira 0 vaga, com marcação própria.</li>
            <li>Os mais de 20 textos de “tipo de autorização” (inclusive com erros de digitação, como “Oringinal”) são agrupados em 4 categorias.</li>
            <li>A data é extraída do texto do ato (“12 de dezembro de 2017”, “11. Março. 2016”) ou do link do Diário Oficial.</li>
            <li>Cargos de TI e dados são identificados por palavras-chave (tecnologia da informação, dados, estatística, sistemas…).</li>
            <li><strong>2023</strong>: a página oficial não disponibiliza a planilha — o link desse ano abre a tabela de 2024. O ano aparece como lacuna.</li>
          </ul>
        </Secao>

        <Secao titulo="O que os dados não mostram">
          <ul className="flex flex-col gap-1.5">
            <li>O CAGED cobre só emprego formal CLT: não inclui PJ, freelancers, cooperados nem servidores estatutários.</li>
            <li>Não existe código de ocupação para “analista de BI” ou “cientista de dados”: esses cargos aparecem como analista de sistemas, de negócios, estatístico etc.</li>
            <li>Contratação não é vaga anunciada: o CAGED registra quem foi efetivamente contratado.</li>
            <li>Autorização de concurso não é edital aberto: o edital costuma sair meses depois. A tabela do MGI não inclui universidades e institutos federais.</li>
            <li>O último ano de cada fonte é parcial.</li>
          </ul>
        </Secao>

        <Secao titulo="Atualização automática">
          <p>
            Toda segunda-feira uma <strong>GitHub Action</strong> consulta as fontes, baixa só os arquivos novos do CAGED (cerca de 50 MB por mês), descobre as planilhas de concursos na página oficial e regenera os dados. Só há commit — e novo deploy na Vercel — quando alguma fonte publicou dados novos.
          </p>
          <p>
            Para rodar manualmente: <code>python scripts/atualizar.py</code> (ou <code>npm run dados</code>).
          </p>
        </Secao>
      </div>
    </Pagina>
  )
}
