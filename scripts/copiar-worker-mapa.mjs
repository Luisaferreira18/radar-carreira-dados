// Copia o worker do MapLibre para public/vendor (o bundler não resolve o caminho
// dinâmico que a biblioteca usa). Roda no postinstall, então a versão sempre bate.
import { copyFileSync, mkdirSync } from "node:fs"

mkdirSync("public/vendor", { recursive: true })
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/vendor/maplibre-gl-worker.mjs")
console.log("worker do MapLibre copiado para public/vendor/")
