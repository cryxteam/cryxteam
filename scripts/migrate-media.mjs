/**
 * Migra archivos de Supabase Storage a tu hosting externo (imagenes.viewalx.com).
 *
 * Requisitos:
 *  - Node 18+ (fetch/FormData nativos)
 *  - Variables de entorno:
 *      SUPABASE_URL
 *      SUPABASE_SERVICE_ROLE_KEY   (o una key con permisos de lectura en el bucket)
 *      SOURCE_BUCKET   (ej. "public")
 *      SOURCE_PREFIX   (opcional, carpeta dentro del bucket; vacío para todo)
 *      UPLOAD_URL      (ej. "https://imagenes.viewalx.com/upload.php")
 *      UPLOAD_TOKEN    (opcional, si tu upload.php lo valida)
 *
 * Uso:
 *    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SOURCE_BUCKET=public \
 *    UPLOAD_URL=https://imagenes.viewalx.com/upload.php \
 *    UPLOAD_TOKEN=hG7nP9xJ3qA2zL1mK8cD5wE4sT0 \
 *    node scripts/migrate-media.js
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.SOURCE_BUCKET || 'public'
const PREFIX = process.env.SOURCE_PREFIX || ''
const UPLOAD_URL = process.env.UPLOAD_URL || 'https://imagenes.viewalx.com/upload.php'
const UPLOAD_TOKEN = process.env.UPLOAD_TOKEN || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function listAll(prefix = '') {
  const pageSize = 100
  const files = []
  const dirs = [prefix]

  while (dirs.length) {
    const current = dirs.pop()
    let offset = 0
    while (true) {
      const { data, error } = await supabase.storage.from(BUCKET).list(current, {
        limit: pageSize,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (error) throw error
      if (!data.length) break

      for (const item of data) {
        const isFolder = !item.metadata && !item.id // supabase marca carpetas sin metadata
        const fullPath = current ? `${current}/${item.name}` : item.name
        if (isFolder) {
          dirs.push(fullPath)
          continue
        }
        files.push(fullPath)
      }

      if (data.length < pageSize) break
      offset += pageSize
    }
  }

  return files
}

async function download(path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) throw error
  return new Uint8Array(await data.arrayBuffer())
}

async function upload(path, bytes) {
  const fileName = path.split('/').pop()
  const folder = path.includes('/') ? path.split('/').slice(0, -1).join('/') : ''

  const formData = new FormData()
  formData.append('file', new Blob([bytes]), fileName)
  formData.append('path', folder) // nuestro upload.php crea subcarpetas con esto
  if (UPLOAD_TOKEN) formData.append('token', UPLOAD_TOKEN)

  const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData })
  let json = {}
  try {
    json = await res.json()
  } catch {
    json = {}
  }
  if (!res.ok || !json.url) {
    const msg = json.error || JSON.stringify(json) || res.statusText
    throw new Error(`Upload falló (${res.status}): ${msg}`)
  }
  return json.url
}

async function main() {
  console.log(`Listando archivos de bucket "${BUCKET}" prefix "${PREFIX || '(root)'}"...`)
  const files = await listAll(PREFIX)
  console.log(`Encontrados ${files.length} archivos`)

  let ok = 0
  let fail = 0

  for (const path of files) {
    try {
      const bytes = await download(path)
      const url = await upload(path, bytes)
      ok += 1
      console.log(`[OK] ${path} -> ${url}`)
    } catch (err) {
      fail += 1
      console.error(`[FAIL] ${path}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`Terminado. Éxitos: ${ok} | Fallos: ${fail}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
