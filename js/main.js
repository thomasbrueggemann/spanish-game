// Orquestador: une barajas, reglas, red e interfaz.
//
// Modelo de autoridad: el anfitrión (o el modo local) es el único que ejecuta
// las reglas. El invitado no muta nada: manda intenciones y pinta la
// instantánea que recibe. Así los dos ven siempre lo mismo y sólo el jugador
// de turno puede actuar.

import {cargarBarajas} from './data.js'
import * as J from './game.js'
import * as UI from './ui.js'
import {abrirSala, generarCodigo, normalizarCodigo} from './net.js'

const ESPERA_MS = 1150      // duración del giro del peso
const TIEMPO_UNIRSE_MS = 30000

let barajas = null
let modo = null             // 'local' | 'anfitrion' | 'invitado'
let yo = 0                  // 0 = jugador 1, 1 = jugador 2
let estado = null           // completo, sólo anfitrión/local
let vista = null            // instantánea que se pinta
let sala = null
let codigo = null
let companeroPresente = false
let cronometro = null
let plazoUnirse = null

// ── Pintado ───────────────────────────────────────────────────────────

const pintar = () => {
  if (!vista) return
  UI.pintar({s: vista, yo, modo, barajas, codigo, companero: companeroPresente})
}

/** El estado ha cambiado: versiona, reparte y pinta. */
const cambiado = () => {
  estado.v += 1
  vista = J.instantanea(estado)
  if (modo === 'anfitrion') sala?.enviarEstado(vista)
  pintar()
}

const arrancarCronometro = () => {
  clearInterval(cronometro)
  cronometro = setInterval(() => { if (J.tic(estado)) cambiado() }, 1000)
}

// ── Reglas: sólo el anfitrión / el modo local pasa por aquí ───────────

const esSuTurno = jugador => modo === 'local' || estado.turno === jugador

const aplicar = (a, jugador) => {
  if (!estado) return

  if (a.t === 'nombre') {
    if (modo !== 'local' && a.i !== jugador) return
    J.ponerNombre(estado, a.i, a.valor)
    return cambiado()
  }

  if (a.t === 'nivel') {
    if (jugador !== 0) return          // la dificultad la fija el anfitrión
    J.elegirNivel(estado, a.i)
    return cambiado()
  }

  if (a.t === 'reiniciar') {
    J.reiniciar(estado)
    return cambiado()
  }

  if (!esSuTurno(jugador)) return

  switch (a.t) {
    case 'lanzar':
      if (estado.girando || estado.fase !== 'lanzar') return
      J.empezarLanzamiento(estado)
      cambiado()
      setTimeout(() => {
        J.resolverLanzamiento(estado, Math.random() < 0.5 ? 'cara' : 'cruz')
        cambiado()
      }, ESPERA_MS)
      return
    case 'voltear':   J.voltearCartas(estado, barajas); break
    case 'arg':       J.ajustarArgumentos(estado, a.d); break
    case 'bono':      J.marcarBono(estado, a.i); break
    case 'reloj':     J.alternarReloj(estado); break
    case 'terminar':  J.terminarTurno(estado); break
    default: return
  }
  cambiado()
}

/** Intención propia: la aplico (anfitrión/local) o la mando (invitado). */
const intentar = a => {
  if (modo === 'invitado') sala?.enviarAccion(a)
  else aplicar(a, yo)
}

const puedoActuar = () => vista && (modo === 'local' || vista.turno === yo)

// ── Acciones de la interfaz ───────────────────────────────────────────

const acciones = {
  avanzar() {
    if (!puedoActuar()) return
    const paso = {lanzar: 'lanzar', tema: 'voltear', debate: 'terminar'}[vista.fase]
    if (paso) intentar({t: paso})
  },
  alternarReloj() { if (puedoActuar()) intentar({t: 'reloj'}) },
  argumentos(d)   { if (puedoActuar()) intentar({t: 'arg', d}) },
  bono(i)         { if (puedoActuar()) intentar({t: 'bono', i}) },
  nivel(i)        { if (modo !== 'invitado') intentar({t: 'nivel', i}) },
  nombre(i, valor) {
    if (modo !== 'local' && i !== yo) return
    intentar({t: 'nombre', i, valor})
  },
  reiniciar() { intentar({t: 'reiniciar'}) },

  jugarLocal() {
    modo = 'local'
    yo = 0
    codigo = null
    estado = J.nuevoEstado(barajas)
    UI.ocultarVestibulo()
    arrancarCronometro()
    cambiado()
  },

  async crearSala() {
    codigo = generarCodigo()
    modo = 'anfitrion'
    yo = 0
    estado = J.nuevoEstado(barajas)
    cambiado()
    UI.esperarCompanero(codigo, 'Esperando al segundo jugador…')

    try {
      sala = await abrirSala({
        codigo,
        anfitrion: true,
        alEntrarCompanero: () => {
          companeroPresente = true
          UI.ocultarVestibulo()
          UI.avisar('El segundo jugador ha entrado en la sala.')
          arrancarCronometro()
          cambiado()
        },
        alSalirCompanero: () => {
          companeroPresente = false
          estado.corriendo = false
          UI.avisar('El otro jugador se ha desconectado. La partida queda en pausa.')
          cambiado()
        },
        alRecibirAccion: a => aplicar(a, 1),
        alFallar: err => UI.errorVestibulo(`No se ha podido abrir la sala: ${err.message}`)
      })
    } catch (err) {
      UI.errorVestibulo(err.message)
    }
  },

  async unirseSala(texto) {
    const c = normalizarCodigo(texto)
    if (c.length !== 6) return UI.errorVestibulo('El código tiene 6 caracteres. Revísalo e inténtalo otra vez.')

    codigo = c
    modo = 'invitado'
    yo = 1
    estado = null
    UI.esperarCompanero(codigo, 'Conectando con la sala…')

    clearTimeout(plazoUnirse)
    plazoUnirse = setTimeout(() => {
      if (!vista) {
        acciones.cancelarSala()
        UI.errorVestibulo('No hemos encontrado esa sala. Comprueba el código o pide al otro jugador que la vuelva a crear.')
      }
    }, TIEMPO_UNIRSE_MS)

    try {
      sala = await abrirSala({
        codigo,
        anfitrion: false,
        alRecibirEstado: instantanea => {
          if (vista && instantanea.v < vista.v) return   // paquete atrasado
          const primera = !vista
          vista = instantanea
          companeroPresente = true
          if (primera) {
            clearTimeout(plazoUnirse)
            UI.ocultarVestibulo()
          }
          pintar()
        },
        alSalirCompanero: () => {
          companeroPresente = false
          UI.avisar('El anfitrión se ha desconectado. La partida queda en pausa.')
          pintar()
        },
        alRechazar: () => {
          clearTimeout(plazoUnirse)
          acciones.cancelarSala()
          UI.errorVestibulo('Esa sala ya tiene dos jugadores.')
        },
        alFallar: err => UI.errorVestibulo(`No se ha podido entrar: ${err.message}`)
      })
    } catch (err) {
      clearTimeout(plazoUnirse)
      UI.errorVestibulo(err.message)
    }
  },

  cancelarSala() {
    clearTimeout(plazoUnirse)
    clearInterval(cronometro)
    sala?.salir()
    sala = null
    modo = null
    estado = null
    vista = null
    codigo = null
    companeroPresente = false
    UI.mostrarVestibulo()
  },

  async copiarEnlace() {
    if (!codigo) return
    const url = new URL(location.href)
    url.search = `?sala=${codigo}`
    const enlace = url.toString()
    try {
      await navigator.clipboard.writeText(enlace)
      UI.avisar('Enlace de invitación copiado al portapapeles.')
    } catch {
      UI.avisar(`Comparte este enlace: ${enlace}`, 9000)
    }
  }
}

// ── Arranque ──────────────────────────────────────────────────────────

const arrancar = async () => {
  UI.conectarEventos(acciones)

  try {
    barajas = await cargarBarajas()
  } catch (err) {
    UI.errorVestibulo(`No se han podido cargar las barajas: ${err.message}`)
    UI.avisar('Sirve la carpeta por HTTP (por ejemplo con `python3 -m http.server`); abrir el archivo con file:// no funciona.', 0)
    return
  }

  const invitacion = normalizarCodigo(new URLSearchParams(location.search).get('sala') || '')
  if (invitacion.length === 6) {
    UI.prefijarCodigo(invitacion)
    acciones.unirseSala(invitacion)
  }
}

window.addEventListener('beforeunload', () => sala?.salir())

arrancar()
