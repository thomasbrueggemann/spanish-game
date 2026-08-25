// Todo el trato con el DOM vive aquí. `pintar()` recibe una instantánea del
// estado y deja la pantalla igual a ella; nunca decide reglas del juego.

import {ACCIONES, NIVELES, posicionDe, relojTexto} from './game.js'

const $ = id => document.getElementById(id)

const el = {
  chipRonda: $('chipRonda'), chipRondas: $('chipRondas'), chipNivel: $('chipNivel'),
  chipSala: $('chipSala'), btnReglas: $('btnReglas'), reglas: $('reglas'),

  jugadorA: $('jugadorA'), jugadorB: $('jugadorB'),
  nombreA: $('nombreA'), nombreB: $('nombreB'),
  puntosA: $('puntosA'), puntosB: $('puntosB'),
  turnoA: $('turnoA'), turnoB: $('turnoB'),
  yoA: $('yoA'), yoB: $('yoB'),

  peso: $('peso'), pesoSimbolo: $('pesoSimbolo'), pesoTexto: $('pesoTexto'),
  posicion: $('posicion'), posicionNota: $('posicionNota'),
  quedanTemas: $('quedanTemas'), quedanBonos: $('quedanBonos'),

  envTema: $('envTema'), cartaTema: $('cartaTema'),
  temaNumero: $('temaNumero'), temaTitulo: $('temaTitulo'),
  btnMenosArg: $('btnMenosArg'), btnMasArg: $('btnMasArg'), nArg: $('nArg'),

  envBono: $('envBono'), cartaBono: $('cartaBono'),
  bonoNumero: $('bonoNumero'), conectores: $('conectores'),

  reloj: $('reloj'), btnReloj: $('btnReloj'),
  puntosTurno: $('puntosTurno'), btnAccion: $('btnAccion'),
  espera: $('espera'), esperaTexto: $('esperaTexto'),

  ovLobby: $('ovLobby'), btnCrear: $('btnCrear'), btnUnirse: $('btnUnirse'), btnLocal: $('btnLocal'),
  formUnirse: $('formUnirse'), codigoSala: $('codigoSala'), errorSala: $('errorSala'),
  lobbyEspera: $('lobbyEspera'), lobbyCodigo: $('lobbyCodigo'), lobbyEstado: $('lobbyEstado'),
  btnCopiar: $('btnCopiar'), btnCancelar: $('btnCancelar'),

  ovNivel: $('ovNivel'), niveles: $('niveles'), nivelEspera: $('nivelEspera'),
  ovFin: $('ovFin'), finGanador: $('finGanador'), finResultado: $('finResultado'), btnReiniciar: $('btnReiniciar'),

  aviso: $('aviso')
}

const ver = (nodo, visible) => { nodo.hidden = !visible }
const texto = (nodo, valor) => { if (nodo.textContent !== valor) nodo.textContent = valor }

let temporizadorAviso = null

export const avisar = (mensaje, ms = 4200) => {
  clearTimeout(temporizadorAviso)
  el.aviso.textContent = mensaje
  el.aviso.hidden = false
  if (ms) temporizadorAviso = setTimeout(() => { el.aviso.hidden = true }, ms)
}

/** Reinicia la animación de "carta que cae" cuando cambia la carta. */
const reanimar = nodo => {
  nodo.classList.remove('pegar')
  void nodo.offsetWidth
  nodo.classList.add('pegar')
}

// ── Enganche de eventos ───────────────────────────────────────────────

/**
 * @param {object} acciones  callbacks hacia main.js
 */
export const conectarEventos = acciones => {
  el.btnReglas.addEventListener('click', () => {
    const abierto = el.reglas.hidden
    el.reglas.hidden = !abierto
    el.btnReglas.setAttribute('aria-expanded', String(abierto))
  })

  el.btnAccion.addEventListener('click', () => acciones.avanzar())
  el.btnReloj.addEventListener('click', () => acciones.alternarReloj())
  el.btnMasArg.addEventListener('click', () => acciones.argumentos(1))
  el.btnMenosArg.addEventListener('click', () => acciones.argumentos(-1))
  el.btnReiniciar.addEventListener('click', () => acciones.reiniciar())

  el.conectores.addEventListener('click', ev => {
    const boton = ev.target.closest('button[data-indice]')
    if (boton) acciones.bono(Number(boton.dataset.indice))
  })

  el.niveles.addEventListener('click', ev => {
    const boton = ev.target.closest('button[data-nivel]')
    if (boton) acciones.nivel(Number(boton.dataset.nivel))
  })

  for (const [i, campo] of [[0, el.nombreA], [1, el.nombreB]]) {
    campo.addEventListener('change', () => acciones.nombre(i, campo.value.trim()))
    campo.addEventListener('keydown', ev => { if (ev.key === 'Enter') campo.blur() })
  }

  el.btnCrear.addEventListener('click', () => acciones.crearSala())
  el.btnLocal.addEventListener('click', () => acciones.jugarLocal())
  el.btnUnirse.addEventListener('click', () => {
    ver(el.formUnirse, true)
    el.codigoSala.focus()
  })
  el.formUnirse.addEventListener('submit', ev => {
    ev.preventDefault()
    acciones.unirseSala(el.codigoSala.value)
  })
  el.btnCancelar.addEventListener('click', () => acciones.cancelarSala())
  el.btnCopiar.addEventListener('click', () => acciones.copiarEnlace())
  el.chipSala.addEventListener('click', () => acciones.copiarEnlace())

  // Los niveles son fijos: se pintan una sola vez.
  el.niveles.innerHTML = NIVELES.map((n, i) => `
    <button type="button" class="nivel" data-nivel="${i}">
      <div class="nivel-nombre">${n.nombre}</div>
      <div class="nivel-min">${n.min}</div>
      <div class="nivel-nota">${n.nota}</div>
    </button>`).join('')
}

// ── Vestíbulo ─────────────────────────────────────────────────────────

export const mostrarVestibulo = () => {
  ver(el.ovLobby, true)
  ver(el.ovNivel, false)
  ver(el.ovFin, false)
  ver(el.lobbyEspera, false)
  ver(el.formUnirse, false)
  ver(el.errorSala, false)
  el.codigoSala.value = ''
}

export const ocultarVestibulo = () => ver(el.ovLobby, false)

export const esperarCompanero = (codigo, estado) => {
  ver(el.lobbyEspera, true)
  ver(el.formUnirse, false)
  texto(el.lobbyCodigo, codigo)
  el.lobbyEstado.lastChild.textContent = ` ${estado}`
}

export const errorVestibulo = mensaje => {
  el.errorSala.textContent = mensaje
  ver(el.errorSala, true)
  ver(el.lobbyEspera, false)
  ver(el.formUnirse, true)
}

export const prefijarCodigo = codigo => {
  ver(el.formUnirse, true)
  el.codigoSala.value = codigo
}

// ── Pintado principal ─────────────────────────────────────────────────

let ultimoTema = null
let ultimoBono = null

/**
 * @param {object} vista
 * @param {object} vista.s          instantánea del estado
 * @param {number} vista.yo         0 o 1: qué jugador soy
 * @param {'local'|'anfitrion'|'invitado'} vista.modo
 * @param {object} vista.barajas    {temas, bonos}
 * @param {string|null} vista.codigo
 * @param {boolean} vista.companero  ¿está el rival conectado?
 */
export const pintar = ({s, yo, modo, barajas, codigo, companero}) => {
  const local = modo === 'local'
  const puedoActuar = local || s.turno === yo
  const enJuego = s.fase !== 'nivel'
  const pos = posicionDe(s.cara)

  // Cabecera
  texto(el.chipRonda, String(s.ronda))
  texto(el.chipRondas, String(s.rondas))
  ver(el.chipNivel, !!s.nivel)
  if (s.nivel) texto(el.chipNivel, `${s.nivel} · ${Math.round(s.segs / 60)} min por turno`)
  ver(el.chipSala, !!codigo)
  if (codigo) texto(el.chipSala, `Sala ${codigo}`)

  // Fichas de jugador
  el.jugadorA.classList.toggle('activo', s.turno === 0)
  el.jugadorB.classList.toggle('activo', s.turno === 1)
  ver(el.turnoA, s.turno === 0)
  ver(el.turnoB, s.turno === 1)
  ver(el.yoA, !local && yo === 0)
  ver(el.yoB, !local && yo === 1)
  texto(el.puntosA, String(s.puntos[0]))
  texto(el.puntosB, String(s.puntos[1]))
  for (const [i, campo] of [[0, el.nombreA], [1, el.nombreB]]) {
    if (document.activeElement !== campo && campo.value !== s.nombres[i]) campo.value = s.nombres[i]
    campo.disabled = !local && yo !== i
  }

  // El peso
  el.peso.classList.toggle('girando', s.girando)
  texto(el.pesoSimbolo, pos.simbolo)
  texto(el.pesoTexto, pos.etiqueta)
  el.posicion.dataset.estado = pos.estado
  texto(el.posicion, pos.texto)
  texto(el.posicionNota, pos.nota)
  texto(el.quedanTemas, `${s.quedanTemas} cartas`)
  texto(el.quedanBonos, `${s.quedanBonos} cartas`)

  // Carta de tema
  const hayTema = s.tema != null
  ver(el.envTema, hayTema)
  if (hayTema) {
    if (s.tema !== ultimoTema) reanimar(el.cartaTema)
    texto(el.temaNumero, `N.º ${s.tema + 1}`)
    texto(el.temaTitulo, barajas.temas[s.tema].tema)
    texto(el.nArg, String(s.nArg))
    ver(el.btnMasArg, puedoActuar)
    ver(el.btnMenosArg, puedoActuar)
  }
  ultimoTema = s.tema

  // Carta bono
  const hayBono = s.bono != null
  ver(el.envBono, hayBono)
  if (hayBono) {
    if (s.bono !== ultimoBono) {
      reanimar(el.cartaBono)
      texto(el.bonoNumero, `N.º ${s.bono + 1}`)
    }
    pintarConectores(barajas.bonos[s.bono], s.mBonos, puedoActuar, s.bono !== ultimoBono)
  }
  ultimoBono = s.bono

  // Reloj y acción
  const seg = s.seg ?? s.segs ?? 0
  texto(el.reloj, relojTexto(seg))
  el.reloj.classList.toggle('apremio', s.corriendo && seg <= 15)
  ver(el.btnReloj, puedoActuar && s.fase === 'debate')
  texto(el.btnReloj, s.corriendo ? 'Pausa' : 'Reloj')

  texto(el.puntosTurno, `+${s.nArg + s.mBonos.filter(Boolean).length}`)
  ver(el.btnAccion, puedoActuar && enJuego)
  texto(el.btnAccion, ACCIONES[s.fase] || ACCIONES.lanzar)
  el.btnAccion.disabled = s.girando

  // Panel de quien observa
  const observando = enJuego && !puedoActuar
  ver(el.espera, observando || (!local && !companero))
  if (!local && !companero) {
    texto(el.esperaTexto, 'El otro jugador no está conectado. La partida queda en pausa.')
  } else if (observando) {
    texto(el.esperaTexto, `Turno de ${s.nombres[s.turno]}. Escucha, haz de juez y espera tu turno.`)
  }

  // Superposiciones
  const eligiendoNivel = s.fase === 'nivel' && !s.fin
  ver(el.ovNivel, eligiendoNivel)
  ver(el.niveles, !eligiendoNivel || modo !== 'invitado')
  ver(el.nivelEspera, eligiendoNivel && modo === 'invitado')

  ver(el.ovFin, s.fin)
  if (s.fin) {
    const [a, b] = s.puntos
    texto(el.finGanador, a === b ? 'Empate' : s.nombres[a > b ? 0 : 1])
    texto(el.finResultado, `${s.nombres[0]} ${a} — ${b} ${s.nombres[1]} · ${s.rondas * 2} turnos jugados`)
  }
}

const pintarConectores = (carta, marcas, interactivo, recrear) => {
  const necesitaRecrear = recrear || el.conectores.childElementCount !== 3 ||
    el.conectores.dataset.interactivo !== String(interactivo)

  if (necesitaRecrear) {
    el.conectores.dataset.interactivo = String(interactivo)
    el.conectores.replaceChildren(...carta.map((c, i) => {
      const nodo = document.createElement(interactivo ? 'button' : 'div')
      if (interactivo) {
        nodo.type = 'button'
        nodo.dataset.indice = String(i)
      }
      nodo.className = 'conector'
      nodo.innerHTML =
        '<span class="conector-caja" aria-hidden="true"></span>' +
        '<span><span class="conector-frase"></span>' +
        '<span class="conector-tipo"></span></span>'
      nodo.querySelector('.conector-frase').textContent = c.frase
      nodo.querySelector('.conector-tipo').textContent = c.tipo
      return nodo
    }))
  }

  for (const [i, nodo] of [...el.conectores.children].entries()) {
    const marcado = !!marcas[i]
    nodo.classList.toggle('marcado', marcado)
    if (interactivo) nodo.setAttribute('aria-pressed', String(marcado))
    nodo.querySelector('.conector-caja').textContent = marcado ? '✓' : ''
  }
}
