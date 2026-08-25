// Máquina de estados de la partida. Sin DOM y sin red: el anfitrión (o el
// modo local) es el único que la ejecuta, y reparte instantáneas al rival.

export const RONDAS = 8

export const NIVELES = [
  {nombre: 'Difícil',      segs: 360, min: '6 min', nota: 'Margen para pensar mientras hablas'},
  {nombre: 'Más difícil',  segs: 300, min: '5 min', nota: 'Ritmo de debate real'},
  {nombre: 'Dificilísimo', segs: 240, min: '4 min', nota: 'Sin pausas: al grano'}
]

export const NOMBRES_POR_DEFECTO = ['Jugador 1', 'Jugador 2']

const barajar = n => {
  const a = [...Array(n).keys()]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Estado inicial. `barajas` sólo se usa para conocer el tamaño de cada mazo. */
export const nuevoEstado = (barajas, nombres = NOMBRES_POR_DEFECTO) => ({
  fase: 'nivel',            // nivel → lanzar → tema → debate → lanzar …
  nivel: null,
  segs: null,               // duración del turno en segundos
  rondas: RONDAS,
  ronda: 1,
  turno: 0,                 // 0 = anfitrión, 1 = invitado
  puntos: [0, 0],
  nombres: [...nombres],
  cara: null,               // 'cara' (a favor) | 'cruz' (en contra)
  girando: false,
  tema: null,               // índice en data/temas.json
  bono: null,               // índice en data/bonos.json
  nArg: 0,
  mBonos: [false, false, false],
  seg: null,
  corriendo: false,
  fin: false,
  mazoTemas: barajar(barajas.temas.length),
  mazoBonos: barajar(barajas.bonos.length),
  v: 0                      // versión, para descartar paquetes atrasados
})

/** Instantánea que viaja por la red: todo menos los mazos. */
export const instantanea = e => ({
  fase: e.fase, nivel: e.nivel, segs: e.segs,
  rondas: e.rondas, ronda: e.ronda, turno: e.turno,
  puntos: e.puntos, nombres: e.nombres,
  cara: e.cara, girando: e.girando,
  tema: e.tema, bono: e.bono, nArg: e.nArg, mBonos: e.mBonos,
  seg: e.seg, corriendo: e.corriendo, fin: e.fin,
  quedanTemas: e.mazoTemas.length, quedanBonos: e.mazoBonos.length,
  v: e.v
})

export const puntosDelTurno = e => e.nArg + e.mBonos.filter(Boolean).length

export const relojTexto = seg => {
  const s = Math.max(0, seg ?? 0)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Reparte la carta superior; si el mazo se agota, se vuelve a barajar. */
const robar = (mazo, total) => {
  const m = mazo.length ? mazo : barajar(total)
  return [m[0], m.slice(1)]
}

// ── Transiciones ──────────────────────────────────────────────────────
// Cada una devuelve el estado modificado (mutación local, el estado nunca
// se comparte por referencia fuera de este módulo).

export const elegirNivel = (e, i) => {
  const n = NIVELES[i]
  if (!n || e.fase !== 'nivel') return e
  return Object.assign(e, {nivel: n.nombre, segs: n.segs, seg: n.segs, fase: 'lanzar'})
}

export const empezarLanzamiento = e =>
  e.fase !== 'lanzar' || e.girando ? e : Object.assign(e, {girando: true, cara: null})

export const resolverLanzamiento = (e, cara) =>
  !e.girando ? e : Object.assign(e, {girando: false, cara, fase: 'tema'})

export const voltearCartas = (e, barajas) => {
  if (e.fase !== 'tema') return e
  const [tema, mazoTemas] = robar(e.mazoTemas, barajas.temas.length)
  const [bono, mazoBonos] = robar(e.mazoBonos, barajas.bonos.length)
  return Object.assign(e, {
    tema, bono, mazoTemas, mazoBonos,
    // El reloj queda parado a propósito: quien habla lee su carta con calma
    // y lo arranca cuando esté listo.
    fase: 'debate', seg: e.segs, corriendo: false
  })
}

export const ajustarArgumentos = (e, d) =>
  e.fase !== 'debate' ? e : Object.assign(e, {nArg: Math.max(0, Math.min(3, e.nArg + d))})

export const marcarBono = (e, i) => {
  if (e.fase !== 'debate' || i < 0 || i > 2) return e
  const mBonos = [...e.mBonos]
  mBonos[i] = !mBonos[i]
  return Object.assign(e, {mBonos})
}

export const alternarReloj = e => {
  if (e.fase !== 'debate') return e
  const seg = e.seg ?? e.segs
  if (!e.corriendo && seg === 0) return e      // se acabó el tiempo: no se reanuda
  return Object.assign(e, {corriendo: !e.corriendo, seg})
}

/** Un segundo de reloj. Devuelve `true` si algo ha cambiado. */
export const tic = e => {
  if (!e.corriendo || !e.seg) return false
  e.seg -= 1
  if (e.seg === 0) e.corriendo = false
  return true
}

export const terminarTurno = e => {
  if (e.fase !== 'debate') return e
  const puntos = [...e.puntos]
  puntos[e.turno] += puntosDelTurno(e)

  const cierraRonda = e.turno === 1
  const ronda = cierraRonda ? e.ronda + 1 : e.ronda
  const fin = cierraRonda && ronda > e.rondas

  return Object.assign(e, {
    puntos,
    turno: e.turno === 0 ? 1 : 0,
    ronda: fin ? e.ronda : ronda,
    fin,
    fase: 'lanzar',
    cara: null, tema: null, bono: null,
    nArg: 0, mBonos: [false, false, false],
    seg: e.segs, corriendo: false
  })
}

/** Nueva partida conservando los mazos ya repartidos y los nombres. */
export const reiniciar = e => Object.assign(e, {
  fase: 'nivel', nivel: null, segs: null,
  ronda: 1, turno: 0, puntos: [0, 0],
  cara: null, girando: false,
  tema: null, bono: null, nArg: 0, mBonos: [false, false, false],
  seg: null, corriendo: false, fin: false
})

export const ponerNombre = (e, i, valor) => {
  const nombres = [...e.nombres]
  nombres[i] = (valor || '').slice(0, 18) || NOMBRES_POR_DEFECTO[i]
  return Object.assign(e, {nombres})
}

// ── Textos derivados ──────────────────────────────────────────────────

export const ACCIONES = {
  nivel:  'Elige la dificultad',
  lanzar: 'Lanzar el peso',
  tema:   'Voltear las cartas',
  debate: 'Terminar turno'
}

export const relojEtiqueta = s => {
  if (s.corriendo) return 'Pausa'
  return s.seg == null || s.seg === s.segs ? 'Empezar' : 'Seguir'
}

export const posicionDe = cara => {
  if (cara == null) return {
    estado: 'neutro', texto: '¿A FAVOR O EN CONTRA?',
    nota: 'Lanza el peso para saber qué defiendes',
    simbolo: '$', etiqueta: 'peso'
  }
  return cara === 'cara'
    ? {estado: 'favor',  texto: 'A FAVOR',   nota: 'Defiende el tema con tus argumentos', simbolo: '+', etiqueta: 'cara'}
    : {estado: 'contra', texto: 'EN CONTRA', nota: 'Rebate el tema con tus argumentos',   simbolo: '−', etiqueta: 'sello'}
}
