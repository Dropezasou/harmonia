// Copia o leitor de texto (Tesseract) para public/ocr, para o app não depender de CDN.
import { cpSync, mkdirSync } from 'node:fs'

const nm = (p) => new URL(`../node_modules/${p}`, import.meta.url)
const dest = new URL('../public/ocr/', import.meta.url)
mkdirSync(dest, { recursive: true })
cpSync(nm('tesseract.js/dist/worker.min.js'), new URL('worker.min.js', dest))
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js']) cpSync(nm(`tesseract.js-core/${f}`), new URL(f, dest))
cpSync(nm('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'), new URL('eng.traineddata.gz', dest))
console.log('OCR copiado para public/ocr')
