// Dos procesos = dos navegadores. El padre hace de red entre ellos.
import {fork} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

const aqui = dirname(fileURLToPath(import.meta.url))
const espera = ms => new Promise(r => setTimeout(r, ms))
const fallos = []
const ok = (cond, msg) => { if (!cond) { fallos.push(msg); console.log('  ✗', msg) } else console.log('  ✓', msg) }

const lanzar = nombre => {
  const p = fork(join(aqui, 'child.mjs'), [], {
    execArgv: ['--import', join(aqui, 'register-hooks.mjs')],
    stdio: ['ignore', 'inherit', 'inherit', 'ipc']
  })
  p.nombre = nombre
  p.pendientes = new Map()
  p.siguienteId = 0
  return p
}

const anfitrion = lanzar('anfitrión')
const invitado = lanzar('invitado')

// Relé: lo que uno manda le llega al otro.
for (const [de, a] of [[anfitrion, invitado], [invitado, anfitrion]]) {
  de.on('message', m => {
    if (m.tipo === 'st' || m.tipo === 'ac') a.send(m)
    else if (m.tipo === 'foto' || m.tipo === 'hecho') {
      de.pendientes.get(m.id)?.(m.datos)
      de.pendientes.delete(m.id)
    }
  })
}

const mandar = (p, cmd) => new Promise(res => {
  const id = ++p.siguienteId
  p.pendientes.set(id, res)
  p.send({cmd, id})
})
const foto = p => mandar(p, 'foto')

await espera(400)

console.log('\n— Crear y unirse —')
await mandar(anfitrion, 'crear')
await espera(120)
await mandar(invitado, 'unirse:PRUEB4')
await espera(120)
anfitrion.send({tipo: 'peer'})     // el invitado ha entrado en la sala
await espera(200)

let A = await foto(anfitrion), B = await foto(invitado)
ok(!A.lobby && !B.lobby, 'los dos salen del vestíbulo')
ok(A.sala === 'SALA PRUEB4' || /PRUEB4/.test(A.sala || ''), `el anfitrión ve el código (${A.sala})`)
ok(A.yoA && !A.yoB, 'el anfitrión se ve como jugador 1')
ok(!B.yoA && B.yoB, 'el invitado se ve como jugador 2')
ok(!A.desactivadoA && A.desactivadoB, 'el anfitrión sólo edita su nombre')
ok(B.desactivadoA && !B.desactivadoB, 'el invitado sólo edita el suyo')

console.log('\n— La dificultad la elige el anfitrión —')
ok(A.nivelPanel && A.niveles, 'el anfitrión ve los tres niveles')
ok(B.nivelPanel && !B.niveles && B.nivelEspera, 'el invitado sólo ve el aviso de espera')
await mandar(anfitrion, 'nivel:0')
await espera(150)
A = await foto(anfitrion); B = await foto(invitado)
ok(!A.nivelPanel && !B.nivelPanel, 'el panel se cierra en los dos')
ok(A.nivel === B.nivel && /Difícil/.test(A.nivel), `nivel sincronizado: ${B.nivel}`)
ok(A.reloj === '6:00' && B.reloj === '6:00', 'los dos relojes marcan 6:00')

console.log('\n— Reparto de mandos: habla uno, puntúa el otro —')
ok(A.botonAccion && !B.botonAccion, 'el botón de acción es de quien habla')
ok(A.papel && /Es tu turno/.test(A.papel), `el que habla lee: "${A.papel}"`)
ok(B.papel && /marca los puntos/.test(B.papel), `el juez lee: "${B.papel}"`)

await mandar(anfitrion, 'clic:btnAccion')      // lanzar
await espera(1500)
A = await foto(anfitrion); B = await foto(invitado)
ok(A.posicion === B.posicion, `la posición se sincroniza (${B.posicion})`)
await mandar(anfitrion, 'clic:btnAccion')      // voltear
await espera(200)
A = await foto(anfitrion); B = await foto(invitado)
ok(A.tema && A.tema === B.tema, `los dos ven el mismo tema: "${B.tema}"`)
ok(JSON.stringify(A.bono) === JSON.stringify(B.bono), 'los dos ven la misma carta bono')

ok(B.bonoEsBoton === 'BUTTON', 'los conectores los pulsa EL JUEZ')
ok(A.bonoEsBoton === 'DIV', 'quien habla los ve sin botón')
ok(B.botonMas && !A.botonMas, 'el contador de argumentos es del JUEZ')
ok(A.botonReloj && !B.botonReloj, 'el reloj lo lleva quien habla')
ok(A.etiquetaReloj === 'Empezar' && !/^0:/.test(A.reloj), 'el reloj está parado esperando a que arranque')

console.log('\n— Nadie se puntúa a sí mismo —')
await mandar(anfitrion, 'clic:btnMasArg')      // el que habla lo intenta
await mandar(anfitrion, 'conector:0')
await espera(200)
A = await foto(anfitrion)
ok(A.nArg === '0', `quien habla no puede subirse los argumentos (nArg = ${A.nArg})`)
ok(A.marcados.every(m => !m), 'ni marcarse los conectores')

console.log('\n— El juez no puede llevar el turno ajeno —')
await mandar(invitado, 'clic:btnAccion')
await mandar(invitado, 'clic:btnReloj')
await espera(200)
A = await foto(anfitrion)
ok(A.tema !== null, 'el juez no adelanta la fase')
ok(A.etiquetaReloj === 'Empezar', 'ni arranca el reloj')

console.log('\n— El reloj lo arranca quien habla —')
await mandar(anfitrion, 'clic:btnReloj')
await espera(1400)
A = await foto(anfitrion); B = await foto(invitado)
ok(A.etiquetaReloj === 'Pausa', 'el botón pasa a Pausa')
ok(A.reloj === B.reloj && A.reloj !== '6:00', `y corre en las dos pantallas (${B.reloj})`)

console.log('\n— El juez puntúa —')
await mandar(invitado, 'clic:btnMasArg')
await mandar(invitado, 'clic:btnMasArg')
await mandar(invitado, 'conector:1')
await espera(200)
A = await foto(anfitrion); B = await foto(invitado)
ok(A.nArg === '2' && B.nArg === '2', 'el contador sube y se ve en los dos')
ok(A.marcados[1] === true, 'quien habla ve la casilla que le han marcado')
ok(A.puntosTurno === '+3' && B.puntosTurno === '+3', 'los puntos del turno cuadran')

console.log('\n— Terminar el turno es de quien habla —')
await mandar(anfitrion, 'clic:btnAccion')
await espera(200)
A = await foto(anfitrion); B = await foto(invitado)
ok(A.puntosA === '3' && B.puntosA === '3', 'se anotan 3 puntos al jugador 1')
ok(A.turnoB && B.turnoB, 'el turno pasa al jugador 2 en las dos pantallas')
ok(!A.botonAccion && B.botonAccion, 'ahora el mando del turno es del invitado')
ok(A.botonMas === null && B.botonMas === null, 'sin cartas en la mesa no hay contador')

console.log('\n— Turno del invitado: los papeles se cambian —')
await mandar(invitado, 'clic:btnAccion')       // lanzar
await espera(1500)
await mandar(invitado, 'clic:btnAccion')       // voltear
await espera(200)
A = await foto(anfitrion); B = await foto(invitado)
ok(B.tema && A.tema === B.tema, 'el anfitrión ve el tema que le ha tocado al invitado')
ok(A.bonoEsBoton === 'BUTTON' && B.bonoEsBoton === 'DIV', 'ahora puntúa el anfitrión')
ok(A.botonMas && !B.botonMas, 'y el contador es suyo')
ok(B.botonReloj && !A.botonReloj, 'el reloj lo lleva el invitado, que es quien habla')
await mandar(anfitrion, 'conector:0')
await mandar(anfitrion, 'conector:2')
await espera(150)
await mandar(invitado, 'clic:btnAccion')       // terminar
await espera(200)
A = await foto(anfitrion); B = await foto(invitado)
ok(A.puntosB === '2' && B.puntosB === '2', 'el jugador 2 suma los 2 que le ha dado el juez')
ok(A.ronda === '2' && B.ronda === '2', 'la ronda avanza a la 2')
ok(A.turnoA && B.turnoA, 'y el turno vuelve al jugador 1')

console.log('\n— Nombres sincronizados —')
await mandar(invitado, 'nombre:nombreB=Lucía')
await espera(200)
A = await foto(anfitrion)
ok(A.nombreB === 'Lucía', `el anfitrión ve el nombre nuevo (${A.nombreB})`)

console.log('\n— Desconexión —')
invitado.send({tipo: 'adios'}); anfitrion.send({tipo: 'adios'})
await espera(200)
A = await foto(anfitrion)
ok(/no está conectado/.test(A.papel || ''), `se avisa de la desconexión: "${A.papel}"`)

anfitrion.kill(); invitado.kill()
if (fallos.length) { console.log(`\n${fallos.length} FALLOS`); process.exit(1) }
console.log('\nTodo correcto.')
process.exit(0)
