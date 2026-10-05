// Leitura de texto da foto no próprio aparelho (Tesseract), servido pelo próprio app em /ocr.
// Na primeira foto baixa ~7 MB (motor + idioma); depois fica em cache e funciona offline.
let workerPromise

function getWorker(onProgress) {
  if (!workerPromise) {
    const base = new URL('ocr/', document.baseURI).href
    workerPromise = import('tesseract.js').then(({ createWorker, OEM }) =>
      createWorker('eng', OEM.LSTM_ONLY, {
        workerPath: base + 'worker.min.js',
        corePath: base,
        langPath: base,
        workerBlobURL: false,
        logger: (m) => m.status === 'recognizing text' && onProgress?.(m.progress)
      })
    )
    workerPromise.catch(() => { workerPromise = null })
  }
  return workerPromise
}

// reduz, converte para cinza e estica o contraste: melhora a leitura de anéis dourados/brilhantes
async function preprocess(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = img.data
  let min = 255, max = 0
  for (let i = 0; i < px.length; i += 4) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
    px[i] = g
    if (g < min) min = g
    if (g > max) max = g
  }
  const range = Math.max(1, max - min)
  for (let i = 0; i < px.length; i += 4) {
    const v = ((px[i] - min) * 255) / range
    px[i] = px[i + 1] = px[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

export async function readText(file, onProgress) {
  const [worker, canvas] = await Promise.all([getWorker(onProgress), preprocess(file)])
  const { data } = await worker.recognize(canvas)
  return data.text.replace(/\s+/g, ' ').trim()
}
