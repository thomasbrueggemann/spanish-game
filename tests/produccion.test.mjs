import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

const TIROS = fileURLToPath(new URL('./capturas', import.meta.url))
mkdirSync(TIROS, {recursive: true})
const SITIO = 'https://thomasbrueggemann.github.io/spanish-game/'
const espera = ms => new Promise(r => setTimeout(r, ms))
const fallos = []
const ok = (c, m) => { if (!c) { fallos.push(m); console.log('  ✗', m) } else console.log('  ✓', m) }

const nav = await chromium.launch({args: ['--disable-features=WebRtcHideLocalIpsWithMdns']})
const abrir = async n => {
  const p = await (await nav.newContext({viewport: {width: 1400, height: 900}})).newPage()
  p.on('pageerror', e => console.log(`   [${n}] EXCEPTION:`, e.message))
  p.on('console', m => { if (m.type() === 'error' && !/fondo\.jpg/.test(m.location()?.url || '')) console.log(`   [${n}] console error:`, m.text()) })
  return p
}
const A = await abrir('host'), B = await abrir('guest')

console.log('— Live site —')
await A.goto(SITIO, {waitUntil: 'networkidle'})
ok(await A.locator('h1').textContent() === 'El Peso del Debate', 'page loads over HTTPS')
ok(await A.locator('#ovLobby').isVisible(), 'lobby shows')

await A.click('#btnCrear')
await A.waitForFunction(() => !document.getElementById('lobbyEspera').hidden, null, {timeout: 30000})
const codigo = (await A.locator('#lobbyCodigo').textContent()).trim()
ok(/^[A-Z2-9]{6}$/.test(codigo), `room code: ${codigo}`)

const t0 = Date.now()
await B.goto(`${SITIO}?sala=${codigo}`, {waitUntil: 'networkidle'})
await Promise.all([
  A.waitForFunction(() => document.getElementById('ovLobby').hidden, null, {timeout: 90000}),
  B.waitForFunction(() => document.getElementById('ovLobby').hidden, null, {timeout: 90000})
])
ok(true, `peers connected in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

await A.locator('#niveles button').nth(1).click()
await espera(800)
ok(await B.locator('#chipNivel').textContent() === 'Más difícil · 5 min por turno', 'difficulty syncs to guest')

await A.click('#btnAccion'); await espera(1800)
await A.click('#btnAccion'); await espera(900)
const tA = await A.locator('#temaTitulo').textContent()
const tB = await B.locator('#temaTitulo').textContent()
ok(tA === tB, `same topic card on both: "${tA}"`)

ok(await B.locator('#conectores button').count() === 3 && await A.locator('#conectores button').count() === 0,
   'the OPPONENT holds the connector checkboxes')
ok(await B.locator('#btnMasArg').isVisible() && !await A.locator('#btnMasArg').isVisible(),
   'the OPPONENT holds the argument counter')
ok(await A.locator('#btnAccion').isVisible() && !await B.locator('#btnAccion').isVisible(),
   'the speaker keeps the end-turn button')
ok(await A.locator('#btnReloj').textContent() === 'Empezar', 'the clock waits to be started')

const parado = await A.locator('#reloj').textContent()
await espera(2600)
ok(await A.locator('#reloj').textContent() === parado, `clock stays at ${parado} while the card is read`)
await A.click('#btnReloj'); await espera(2600)
ok(await B.locator('#reloj').textContent() !== parado, 'once started it runs on both screens')

await B.click('#btnMasArg'); await B.locator('#conectores > *').nth(1).click()
await espera(800)
ok(await A.locator('#puntosTurno').textContent() === '+2', 'the judge\'s scoring reaches the speaker')
await A.click('#btnAccion'); await espera(800)
ok(await B.locator('#puntosA').textContent() === '2' && await B.locator('#btnAccion').isVisible(),
   'turn hands over to the guest')
await espera(400)
await B.click('#btnAccion'); await espera(1800); await B.click('#btnAccion'); await espera(900)
ok(await A.locator('#btnMasArg').isVisible() && !await B.locator('#btnMasArg').isVisible(),
   'roles swap: the host now scores')

const enlace = await A.evaluate(() => { const u = new URL(location.href); u.search = '?sala=X'; return u.toString() })
ok(enlace.startsWith(SITIO), `invite links keep the /spanish-game/ base path`)

await A.screenshot({path: `${TIROS}/produccion.png`})
await nav.close()
if (fallos.length) { console.log(`\n${fallos.length} FAILURES`); process.exit(1) }
console.log('\nAll good on the live site.')
