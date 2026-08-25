// Servidor estático mínimo para las pruebas de navegador. Escucha en un puerto
// libre, así que se pueden lanzar varias a la vez sin pisarse.
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {extname, join, normalize} from 'node:path'
import {fileURLToPath} from 'node:url'

export const RAIZ = fileURLToPath(new URL('..', import.meta.url))

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png'
}

export const servir = async () => {
  const servidor = createServer(async (pet, res) => {
    const ruta = decodeURIComponent(new URL(pet.url, 'http://interno').pathname)
    const rel = normalize(ruta === '/' ? 'index.html' : ruta.slice(1)).replace(/^(\.\.[/\\])+/, '')
    try {
      const cuerpo = await readFile(join(RAIZ, rel))
      res.writeHead(200, {'content-type': TIPOS[extname(rel)] ?? 'application/octet-stream'})
      res.end(cuerpo)
    } catch {
      res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'})
      res.end('no encontrado')
    }
  })
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo))
  return {
    url: `http://127.0.0.1:${servidor.address().port}/`,
    cerrar: () => new Promise(listo => servidor.close(listo))
  }
}
