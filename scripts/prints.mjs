// Tira os prints do README e confere se as páginas carregam sem erros no console.
// Uso: com o site rodando (npm run dev ou npm start), execute
//   node scripts/prints.mjs [url-base]
// Usa o Chrome instalado no computador (channel "chrome"); não baixa navegador.

import { mkdirSync } from "node:fs"
import { chromium } from "playwright-core"

const BASE = process.argv[2] ?? "http://localhost:3000"
const SAIDA = "docs/prints"
mkdirSync(SAIDA, { recursive: true })

const CENAS = [
  { nome: "mercado-claro", caminho: "/", tema: "light", largura: 1440, altura: 900, inteira: true },
  { nome: "mercado-escuro", caminho: "/?local=mg&area=dados", tema: "dark", largura: 1440, altura: 900, inteira: true },
  { nome: "concursos-claro", caminho: "/concursos", tema: "light", largura: 1440, altura: 900, inteira: true },
  { nome: "mercado-celular", caminho: "/", tema: "light", largura: 390, altura: 844, inteira: false },
]

const navegador = await chromium.launch({ channel: "chrome" })
let falhas = 0
for (const cena of CENAS) {
  const contexto = await navegador.newContext({
    viewport: { width: cena.largura, height: cena.altura },
    deviceScaleFactor: cena.largura < 500 ? 2 : 1,
    colorScheme: cena.tema,
  })
  const pagina = await contexto.newPage()
  const erros = []
  pagina.on("console", (m) => m.type() === "error" && erros.push(m.text()))
  pagina.on("pageerror", (e) => erros.push(e.message))
  await pagina.goto(BASE + cena.caminho, { waitUntil: "networkidle" })
  await pagina.waitForSelector("#conclusoes, [aria-label='Indicadores principais']", { timeout: 60_000 })
  await pagina.waitForTimeout(2500) // animações dos gráficos e tiles do mapa
  await pagina.screenshot({ path: `${SAIDA}/${cena.nome}.png`, fullPage: cena.inteira })
  const larguraDoc = await pagina.evaluate(() => document.documentElement.scrollWidth)
  const rolagemHorizontal = larguraDoc > cena.largura + 1
  console.log(`${cena.nome}: ${erros.length} erro(s) no console${rolagemHorizontal ? ` · ROLAGEM HORIZONTAL (${larguraDoc}px)` : ""}`)
  for (const e of erros) console.log("   ", e.slice(0, 300))
  falhas += erros.length + (rolagemHorizontal ? 1 : 0)
  await contexto.close()
}
await navegador.close()
process.exit(falhas ? 1 : 0)
