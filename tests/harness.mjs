// Monta index.html en jsdom, deja globals listos y carga los módulos reales.
import {JSDOM} from 'jsdom'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {join} from 'node:path'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))

export async function montar() {
  const dom = new JSDOM(readFileSync(join(RAIZ, 'index.html'), 'utf8'), {
    url: 'http://localhost/',
    pretendToBeVisual: true
  })

  const {window} = dom
  for (const k of ['window', 'document', 'HTMLElement', 'Node', 'Event', 'CustomEvent',
                   'navigator', 'location', 'getComputedStyle', 'requestAnimationFrame']) {
    Object.defineProperty(globalThis, k, {value: window[k], configurable: true, writable: true})
  }
  Object.defineProperty(window, 'crypto', {value: globalThis.crypto, configurable: true})

  // fetch → disco
  globalThis.fetch = async url => {
    const ruta = join(RAIZ, new URL(url).pathname)
    try {
      const cuerpo = readFileSync(ruta, 'utf8')
      return {ok: true, status: 200, json: async () => JSON.parse(cuerpo)}
    } catch {
      return {ok: false, status: 404, json: async () => null}
    }
  }

  return {dom, window, document: window.document}
}

export const $ = id => globalThis.document.getElementById(id)
export const visible = id => !$(id).hidden
export const txt = id => $(id).textContent.trim()
