import {chromium} from 'playwright'
import {servir} from './servidor.mjs'

const sitio = await servir()
const espera = ms => new Promise(r => setTimeout(r, ms))
const fallos = []
const ok = (c, m) => { if (!c) { fallos.push(m); console.log('  ✗', m) } else console.log('  ✓', m) }

const nav = await chromium.launch({args: ['--disable-features=WebRtcHideLocalIpsWithMdns']})
const pagina = async () => (await (await nav.newContext({viewport: {width: 1200, height: 800}})).newPage())

const A = await pagina(), B = await pagina(), C = await pagina()
await A.goto(sitio.url, {waitUntil: 'networkidle'})
await A.click('#btnCrear')
await A.waitForFunction(() => !document.getElementById('lobbyEspera').hidden)
const codigo = (await A.locator('#lobbyCodigo').textContent()).trim()
console.log('  sala:', codigo)

await B.goto(`${sitio.url}?sala=${codigo}`, {waitUntil: 'networkidle'})
await B.waitForFunction(() => document.getElementById('ovLobby').hidden, null, {timeout: 60000})
ok(true, 'el segundo jugador entra')

await C.goto(`${sitio.url}?sala=${codigo}`, {waitUntil: 'networkidle'})
await C.waitForFunction(() => !document.getElementById('errorSala').hidden, null, {timeout: 60000})
  .catch(() => {})
const err = (await C.locator('#errorSala').textContent()).trim()
ok(/dos jugadores/.test(err), `al tercero se le rechaza: "${err}"`)
ok(await B.evaluate(() => document.getElementById('ovLobby').hidden), 'el segundo jugador sigue dentro')
ok(await A.evaluate(() => document.getElementById('ovLobby').hidden), 'y el anfitrión también')

console.log('\n— Código mal escrito —')
const D = await pagina()
await D.goto(sitio.url, {waitUntil: 'networkidle'})
await D.click('#btnUnirse')
await D.fill('#codigoSala', 'ABC')
await D.click('#formUnirse button[type=submit]')
await espera(300)
ok(/6 caracteres/.test(await D.locator('#errorSala').textContent()), 'un código corto se rechaza al momento')

await nav.close()
await sitio.cerrar()
if (fallos.length) { console.log(`\n${fallos.length} FALLOS`); process.exit(1) }
console.log('\nTodo correcto.')
