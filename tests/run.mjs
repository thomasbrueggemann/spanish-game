#!/usr/bin/env node
// Lanza todas las pruebas. Las de navegador se saltan solas si Playwright no
// está instalado, para que `node tests/run.mjs` funcione sin dependencias.
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {join} from 'node:path'

const AQUI = fileURLToPath(new URL('.', import.meta.url))
const soloRapidas = process.argv.includes('--rapidas')
const conProduccion = process.argv.includes('--produccion')

const SUITES = [
  {archivo: 'reglas.test.mjs',     nombre: 'reglas del juego',        navegador: false},
  {archivo: 'local.test.mjs',      nombre: 'partida en un aparato',   navegador: false},
  {archivo: 'partida.test.mjs',    nombre: 'partida completa',        navegador: false},
  {archivo: 'red.test.mjs',        nombre: 'dos jugadores en red',    navegador: false},
  {archivo: 'navegador.test.mjs',  nombre: 'navegador de verdad',     navegador: true},
  {archivo: 'sala-llena.test.mjs', nombre: 'sala llena y códigos',    navegador: true},
  {archivo: 'produccion.test.mjs', nombre: 'sitio publicado',         navegador: true, opcional: true}
]

const hay = async paquete => { try { await import(paquete); return true } catch { return false } }

const correr = archivo => new Promise(listo => {
  const hijo = spawn(process.execPath, [join(AQUI, archivo)], {stdio: ['ignore', 'pipe', 'pipe']})
  let salida = ''
  hijo.stdout.on('data', d => { salida += d })
  hijo.stderr.on('data', d => { salida += d })
  hijo.on('close', codigo => listo({codigo, salida}))
})

const hayJsdom = await hay('jsdom')
const hayPlaywright = await hay('playwright')
if (!hayJsdom) {
  console.error('Falta jsdom. Instala las dependencias de desarrollo con:  npm install')
  process.exit(1)
}

let fallidas = 0
for (const s of SUITES) {
  if (s.navegador && !hayPlaywright) { console.log(`— ${s.nombre.padEnd(24)} saltada (falta Playwright)`); continue }
  if (s.opcional && !conProduccion)  { console.log(`— ${s.nombre.padEnd(24)} saltada (usa --produccion)`); continue }
  if (s.navegador && soloRapidas)    { console.log(`— ${s.nombre.padEnd(24)} saltada (--rapidas)`); continue }

  process.stdout.write(`· ${s.nombre.padEnd(24)} `)
  const {codigo, salida} = await correr(s.archivo)
  const marcas = (salida.match(/✓/g) || []).length
  if (codigo === 0) {
    console.log(`bien (${marcas} comprobaciones)`)
  } else {
    fallidas++
    console.log('FALLA')
    console.log(salida.split('\n').map(l => '    ' + l).join('\n'))
  }
}

console.log(fallidas ? `\n${fallidas} suite(s) con fallos.` : '\nTodo correcto.')
process.exit(fallidas ? 1 : 0)
