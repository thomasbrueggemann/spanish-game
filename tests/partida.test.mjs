import {montar, $} from './harness.mjs'
const {window} = await montar()
const clic = id => $(id).dispatchEvent(new window.Event('click', {bubbles: true}))
const t = id => $(id).textContent.trim()
const vis = id => !$(id).hidden
const espera = ms => new Promise(r => setTimeout(r, ms))
const fallos = []
const ok = (c, m) => { if (!c) { fallos.push(m); console.log('  ✗', m) } else console.log('  ✓', m) }

await import('../js/main.js')
await espera(80)
clic('btnLocal'); await espera(20)
$('niveles').children[0].dispatchEvent(new window.Event('click', {bubbles: true}))
await espera(20)

for (let turno = 0; turno < 16; turno++) {
  clic('btnAccion'); await espera(1250)            // lanzar
  clic('btnAccion'); await espera(30)              // voltear
  if (turno % 2 === 0) clic('btnMasArg')           // el jugador 1 saca 1 punto por turno
  await espera(20)
  clic('btnAccion'); await espera(40)              // terminar
}

console.log('— Fin de partida —')
ok(vis('ovFin'), 'sale el panel de fin de partida')
ok(t('finGanador') === 'Jugador 1', `gana el jugador 1 (${t('finGanador')})`)
ok(/8 — 0/.test(t('finResultado')), `marcador final: ${t('finResultado')}`)
ok(/16 turnos/.test(t('finResultado')), 'se cuentan 16 turnos')
ok(t('chipRonda') === '8', `el marcador se queda en la ronda 8 (${t('chipRonda')})`)

clic('btnReiniciar'); await espera(40)
ok(!vis('ovFin'), 'nueva partida cierra el panel')
ok(vis('ovNivel'), 'y vuelve a pedir dificultad')
ok(t('puntosA') === '0' && t('puntosB') === '0', 'el marcador se pone a cero')
ok(t('chipRonda') === '1', 'y se vuelve a la ronda 1')

if (fallos.length) { console.log(`\n${fallos.length} FALLOS`); process.exit(1) }
console.log('\nTodo correcto.')
process.exit(0)
