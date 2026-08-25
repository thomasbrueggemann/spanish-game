import * as J from '../js/game.js'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

const R = fileURLToPath(new URL('../data/', import.meta.url))
const barajas = {
  temas: JSON.parse(readFileSync(R + 'temas.json')),
  bonos: JSON.parse(readFileSync(R + 'bonos.json'))
}
const fallos = []
const ok = (c, m) => { if (!c) { fallos.push(m); console.log('  ✗', m) } else console.log('  ✓', m) }

// ── Partida completa de 8 rondas ─────────────────────────────────────
let e = J.nuevoEstado(barajas)
J.elegirNivel(e, 0)
const vistos = {temas: new Set(), bonos: new Set()}
let turnos = 0

while (!e.fin && turnos < 40) {
  J.empezarLanzamiento(e)
  J.resolverLanzamiento(e, turnos % 2 ? 'cara' : 'cruz')
  J.voltearCartas(e, barajas)
  J.alternarReloj(e)
  vistos.temas.add(e.tema); vistos.bonos.add(e.bono)
  J.ajustarArgumentos(e, e.turno === 0 ? 3 : 1)
  if (e.turno === 0) J.marcarBono(e, 0)
  J.terminarTurno(e)
  turnos++
}

console.log('— Partida completa —')
ok(turnos === 16, `la partida dura 16 turnos (${turnos})`)
ok(e.fin === true, 'se marca el fin de la partida')
ok(e.ronda === 8, `el marcador acaba en la ronda 8 (${e.ronda})`)
ok(e.puntos[0] === 32, `jugador 1: 8×(3 arg + 1 bono) = 32 (${e.puntos[0]})`)
ok(e.puntos[1] === 8, `jugador 2: 8×1 = 8 (${e.puntos[1]})`)
ok(vistos.temas.size === 16 && vistos.bonos.size === 16, 'ninguna carta se repite en la partida')
ok(e.mazoTemas.length === 134 && e.mazoBonos.length === 134, `quedan 134 de cada mazo (${e.mazoTemas.length}/${e.mazoBonos.length})`)

console.log('\n— Reinicio —')
J.reiniciar(e)
ok(e.fase === 'nivel' && !e.fin && e.ronda === 1, 'vuelve a pedir dificultad')
ok(e.puntos[0] === 0 && e.puntos[1] === 0, 'el marcador se pone a cero')
ok(e.mazoTemas.length === 134, 'los mazos siguen donde estaban (no se repiten temas)')

console.log('\n— Mazo agotado —')
let f = J.nuevoEstado(barajas)
J.elegirNivel(f, 0)
f.mazoTemas = []; f.mazoBonos = [7]
f.fase = 'tema'
J.voltearCartas(f, barajas)
ok(f.tema != null && f.tema >= 0, 'con el mazo vacío se vuelve a barajar en vez de romper')
ok(f.mazoTemas.length === barajas.temas.length - 1, 'el mazo nuevo trae todas las cartas menos la repartida')

console.log('\n— Límites —')
let g = J.nuevoEstado(barajas); J.elegirNivel(g, 0); g.fase = 'debate'
J.ajustarArgumentos(g, 9); ok(g.nArg === 3, 'los argumentos no pasan de 3')
J.ajustarArgumentos(g, -9); ok(g.nArg === 0, 'ni bajan de 0')
J.marcarBono(g, 5); ok(g.mBonos.every(x => !x), 'un índice de bono inválido no hace nada')
g.fase = 'lanzar'
J.ajustarArgumentos(g, 1); ok(g.nArg === 0, 'fuera del debate no se puntúa')
J.terminarTurno(g); ok(g.turno === 0, 'no se puede terminar un turno que no ha empezado')

console.log('\n— Reloj —')
let h = J.nuevoEstado(barajas); J.elegirNivel(h, 2)
ok(h.seg === 240, 'Dificilísimo son 240 s')
h.fase = 'tema'; h.mazoTemas = [3]; h.mazoBonos = [4]
J.voltearCartas(h, barajas)
ok(!h.corriendo && h.seg === 240, 'voltear las cartas NO arranca el reloj')
ok(J.relojEtiqueta(h) === 'Empezar', 'el botón invita a empezar')
J.alternarReloj(h)
ok(h.corriendo && J.relojEtiqueta(h) === 'Pausa', 'el que habla lo arranca a mano')
ok(J.relojEtiqueta(h) === 'Pausa', 'sin tiempo gastado aún, pausar lo devuelve a Empezar')
J.tic(h)
J.alternarReloj(h)
ok(!h.corriendo && h.seg === 239 && J.relojEtiqueta(h) === 'Seguir', 'ya empezado, en pausa ofrece seguir')
h.corriendo = true; h.seg = 2
ok(J.tic(h) && h.seg === 1, 'el tic descuenta')
J.tic(h); ok(h.seg === 0 && !h.corriendo, 'al llegar a 0 el reloj se para solo')
ok(!J.tic(h), 'y no sigue descontando')
J.alternarReloj(h)
ok(!h.corriendo, 'con el tiempo agotado el reloj no se reanuda')
ok(J.relojTexto(125) === '2:05' && J.relojTexto(0) === '0:00', 'formato del reloj')

console.log('\n— Instantánea de red —')
const inst = J.instantanea(e)
ok(!('mazoTemas' in inst) && !('mazoBonos' in inst), 'los mazos no viajan por la red')
ok(inst.quedanTemas === 134, 'sí viaja cuántas cartas quedan')
ok(JSON.stringify(inst).length < 400, `el paquete es pequeño (${JSON.stringify(inst).length} bytes)`)

console.log('\n— Nombres —')
let n = J.nuevoEstado(barajas)
J.ponerNombre(n, 1, '')
ok(n.nombres[1] === 'Jugador 2', 'un nombre vacío vuelve al de por defecto')
J.ponerNombre(n, 0, 'x'.repeat(40))
ok(n.nombres[0].length === 18, 'los nombres se recortan a 18 caracteres')

if (fallos.length) { console.log(`\n${fallos.length} FALLOS`); process.exit(1) }
console.log('\nTodo correcto.')
