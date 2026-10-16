import { ExternalLink } from "lucide-react"

type Fonte = { nome: string; url: string; detalhe?: string }

type Props = {
  fontes: Fonte[]
  atualizacao: string
  observacao?: string
}

/** Rodapé com a fonte dos dados, link original e data da última atualização. */
export function SourceFooter({ fontes, atualizacao, observacao }: Props) {
  return (
    <footer className="mt-2 flex flex-col gap-2 border-t pt-5 pb-8 text-xs text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">Fonte: </span>
        {fontes.map((f, i) => (
          <span key={f.url}>
            {i > 0 && " · "}
            <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline-offset-2 hover:text-foreground hover:underline">
              {f.nome}
              <ExternalLink className="size-3" aria-hidden />
            </a>
            {f.detalhe && <> ({f.detalhe})</>}
          </span>
        ))}
      </p>
      <p>{atualizacao}</p>
      {observacao && <p className="text-pretty">{observacao}</p>}
      <p>
        Projeto de portfólio com dados públicos · código aberto ·{" "}
        <a href="/sobre" className="underline-offset-2 hover:text-foreground hover:underline">
          metodologia e limpeza dos dados
        </a>
      </p>
    </footer>
  )
}
