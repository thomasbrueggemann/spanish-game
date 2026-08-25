// Prueba de verdad: dos navegadores, Trystero real sobre Nostr y WebRTC.
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {servir} from './servidor.mjs'

const TIROS = fileURLToPath(new URL('./capturas', import.meta.url))
mkdirSync(TIROS, {recursive: true})

const sitio = await servir()

const fallos = []
const ok = (c, m) => { if (!c) { fallos.push(m); console.log('  ✗', m) } else console.log('  ✓', m) }
const espera = ms => new Promise(r => setTimeout(r, ms))

const navegador = await chromium.launch({
  args: ['--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-running-insecure-content']
})

const abrir = async nombre => {
  const ctx = await navegador.newContext({viewport: {width: 1440, height: 900}})
  const pag = await ctx.newPage()
  pag.on('console', m => { if (m.type() === 'error' && !/fondo\.jpg/.test(m.location()?.url || '')) console.log(`   [${nombre}] error de consola:`, m.text(), m.location()?.url) })
  pag.on('pageerror', e => console.log(`   [${nombre}] EXCEPCIÓN:`, e.message))
  return {ctx, pag}
}

const A = await abrir('anfitrión')
const B = await abrir('invitado')

console.log('— Carga —')
await A.pag.goto(sitio.url, {waitUntil: 'networkidle'})
ok(await A.pag.locator('#ovLobby').isVisible(), 'el vestíbulo se ve al arrancar')
ok(await A.pag.locator('h1').textContent() === 'El Peso del Debate', 'el título carga')
await A.pag.screenshot({path: `${TIROS}/1-vestibulo.png`})

console.log('\n— Crear sala —')
await A.pag.click('#btnCrear')
await A.pag.waitForFunction(() => !document.getElementById('lobbyEspera').hidden)
const codigo = (await A.pag.locator('#lobbyCodigo').textContent()).trim()
ok(/^[A-Z2-9]{6}$/.test(codigo), `código válido: ${codigo}`)
await A.pag.screenshot({path: `${TIROS}/2-sala-creada.png`})

console.log('\n— El invitado entra con el enlace —')
await B.pag.goto(`${sitio.url}?sala=${codigo}`, {waitUntil: 'networkidle'})

const conectado = await Promise.race([
  Promise.all([
    A.pag.waitForFunction(() => document.getElementById('ovLobby').hidden, null, {timeout: 60000}),
    B.pag.waitForFunction(() => document.getElementById('ovLobby').hidden, null, {timeout: 60000})
  ]).then(() => true),
  espera(60000).then(() => false)
])
ok(conectado, 'los dos navegadores se conectan por WebRTC')
if (!conectado) {
  console.log('   estado del invitado:', await B.pag.locator('#lobbyEstado').textContent())
  console.log('   error:', await B.pag.locator('#errorSala').textContent())
  await B.pag.screenshot({path: `${TIROS}/x-fallo-conexion.png`})
  await navegador.close(); await sitio.cerrar(); process.exit(1)
}

console.log('\n— Dificultad —')
ok(await A.pag.locator('#niveles').isVisible(), 'el anfitrión elige dificultad')
ok(await B.pag.locator('#nivelEspera').isVisible(), 'el invitado espera')
await B.pag.screenshot({path: `${TIROS}/3-invitado-espera-nivel.png`})
await A.pag.locator('#niveles button').nth(1).click()
await espera(600)
ok(await B.pag.locator('#chipNivel').textContent() === 'Más difícil · 5 min por turno', 'el nivel llega al invitado')

console.log('\n— Reparto de mandos —')
ok(await A.pag.locator('#btnAccion').isVisible(), 'el que habla tiene el botón de acción')
ok(!await B.pag.locator('#btnAccion').isVisible(), 'el juez no lo tiene')
ok(/Es tu turno/.test(await A.pag.locator('#papel').textContent()), 'el que habla ve su papel')
ok(/marca los puntos/.test(await B.pag.locator('#papel').textContent()), 'el juez ve el suyo')

await A.pag.click('#btnAccion')                       // lanzar
await espera(1800)
const posA = await A.pag.locator('#posicion').textContent()
const posB = await B.pag.locator('#posicion').textContent()
ok(posA === posB && /A FAVOR|EN CONTRA/.test(posA), `posición sincronizada: ${posA}`)

await A.pag.click('#btnAccion')                       // voltear
await espera(600)
const temaA = await A.pag.locator('#temaTitulo').textContent()
const temaB = await B.pag.locator('#temaTitulo').textContent()
ok(temaA === temaB && temaA.length > 10, `mismo tema en los dos: "${temaA}"`)
const bonoA = await A.pag.locator('.conector-frase').allTextContents()
const bonoB = await B.pag.locator('.conector-frase').allTextContents()
ok(JSON.stringify(bonoA) === JSON.stringify(bonoB), `mismo bono: ${bonoA.join(' / ')}`)

ok(await B.pag.locator('#conectores button').count() === 3, 'los conectores los pulsa el juez')
ok(await A.pag.locator('#conectores button').count() === 0, 'quien habla los ve sin botón')
ok(await B.pag.locator('#btnMasArg').isVisible() && !await A.pag.locator('#btnMasArg').isVisible(),
   'el contador de argumentos es del juez')
ok(await A.pag.locator('#btnReloj').isVisible() && !await B.pag.locator('#btnReloj').isVisible(),
   'el reloj lo lleva quien habla')

await A.pag.screenshot({path: `${TIROS}/4-turno-anfitrion.png`})
await B.pag.screenshot({path: `${TIROS}/5-vista-juez.png`})

console.log('\n— El reloj no arranca solo —')
ok(await A.pag.locator('#btnReloj').textContent() === 'Empezar', 'el botón invita a empezar')
const parado = await A.pag.locator('#reloj').textContent()
await espera(2500)
ok(await A.pag.locator('#reloj').textContent() === parado, `sigue parado en ${parado} mientras se lee la carta`)
await A.pag.click('#btnReloj')
await espera(2500)
ok(await A.pag.locator('#btnReloj').textContent() === 'Pausa', 'al arrancarlo pasa a Pausa')
const corriendo = await B.pag.locator('#reloj').textContent()
ok(corriendo !== parado, `ahora corre y el juez lo ve (${parado} → ${corriendo})`)

console.log('\n— El juez puntúa —')
await B.pag.click('#btnMasArg')
await B.pag.locator('#conectores > *').nth(2).click()
await espera(700)
ok(await A.pag.locator('#nArg').textContent() === '1', 'quien habla ve el punto que le han dado')
ok(await A.pag.locator('#conectores > *').nth(2).getAttribute('class') === 'conector marcado', 'y la casilla marcada')
ok(await A.pag.locator('#puntosTurno').textContent() === '+2', 'los puntos del turno cuadran')

console.log('\n— Cambio de turno —')
await A.pag.click('#btnAccion')                       // terminar
await espera(700)
ok(await A.pag.locator('#puntosA').textContent() === '2', 'el anfitrión suma 2')
ok(await B.pag.locator('#puntosA').textContent() === '2', 'y el juez lo ve')
ok(!await A.pag.locator('#btnAccion').isVisible() && await B.pag.locator('#btnAccion').isVisible(),
   'el mando del turno pasa al invitado')
await espera(300)
await B.pag.click('#btnAccion'); await espera(1800); await B.pag.click('#btnAccion'); await espera(600)
ok(await A.pag.locator('#btnMasArg').isVisible() && !await B.pag.locator('#btnMasArg').isVisible(),
   'y ahora el que puntúa es el anfitrión')
await B.pag.screenshot({path: `${TIROS}/6-turno-invitado.png`})

console.log('\n— Nombre —')
await B.pag.fill('#nombreB', 'Lucía')
await B.pag.locator('#nombreB').blur()
await espera(600)
ok(await A.pag.inputValue('#nombreA') === 'Jugador 1', 'el anfitrión conserva su nombre')
ok(await A.pag.inputValue('#nombreB') === 'Lucía', 'y ve el nombre nuevo del invitado')
ok(await A.pag.locator('#nombreB').isDisabled(), 'sin poder editarlo')

console.log('\n— Móvil —')
const M = await navegador.newContext({viewport: {width: 390, height: 844}})
const pm = await M.newPage()
await pm.goto(sitio.url, {waitUntil: 'networkidle'})
await pm.click('#btnLocal')
await pm.locator('#niveles button').nth(0).click()
await pm.click('#btnAccion'); await espera(1600); await pm.click('#btnAccion'); await espera(400)
const desborde = await pm.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
ok(desborde <= 1, `sin desbordamiento horizontal en móvil (${desborde}px)`)
await pm.screenshot({path: `${TIROS}/7-movil.png`, fullPage: true})

console.log('\n— Modo local en escritorio —')
const L = await navegador.newContext({viewport: {width: 1440, height: 980}})
const pl = await L.newPage()
await pl.goto(sitio.url, {waitUntil: 'networkidle'})
await pl.click('#btnLocal')
await pl.locator('#niveles button').nth(0).click()
await pl.click('#btnReglas')
await pl.click('#btnAccion'); await espera(1600); await pl.click('#btnAccion'); await espera(400)
await pl.click('#btnMasArg'); await pl.locator('#conectores > *').nth(1).click()
await espera(300)
await pl.screenshot({path: `${TIROS}/8-mesa-completa.png`, fullPage: true})

await navegador.close()
await sitio.cerrar()
if (fallos.length) { console.log(`\n${fallos.length} FALLOS`); process.exit(1) }
console.log('\nTodo correcto. Capturas en', TIROS)
