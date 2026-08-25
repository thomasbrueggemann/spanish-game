// Capa de red: Trystero sobre WebRTC (descubrimiento por Nostr).
// Sólo hay dos roles. El anfitrión posee el estado y lo reparte; el invitado
// manda intenciones y pinta lo que recibe.

export const APP_ID = 'el-peso-del-debate'

// Sin 0/O ni 1/I: los códigos se dictan en voz alta.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const generarCodigo = (n = 6) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALFABETO[b % ALFABETO.length]).join('')

export const normalizarCodigo = txt =>
  (txt || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6)

const CDNS = [
  'https://esm.sh/trystero@0.25.3',
  'https://cdn.jsdelivr.net/npm/trystero@0.25.3/+esm'
]

let trystero = null

const cargarTrystero = async () => {
  if (trystero) return trystero
  const fallos = []
  for (const url of CDNS) {
    try {
      trystero = await import(/* @vite-ignore */ url)
      return trystero
    } catch (err) {
      fallos.push(`${url}: ${err.message}`)
    }
  }
  throw new Error(`No se ha podido cargar Trystero. ${fallos.join(' · ')}`)
}

/**
 * Abre (o entra en) una sala.
 *
 * @param {object} opciones
 * @param {string}  opciones.codigo      código de 6 caracteres
 * @param {boolean} opciones.anfitrion   true = crea la sala
 * @param {(id: string) => void} opciones.alEntrarCompanero
 * @param {(id: string) => void} opciones.alSalirCompanero
 * @param {(snapshot: object) => void} opciones.alRecibirEstado   (invitado)
 * @param {(accion: object, peerId: string) => void} opciones.alRecibirAccion (anfitrión)
 * @param {() => void} opciones.alRechazar   la sala ya tiene dos jugadores
 * @param {(err: Error) => void} opciones.alFallar
 */
export const abrirSala = async ({
  codigo,
  anfitrion,
  alEntrarCompanero = () => {},
  alSalirCompanero = () => {},
  alRecibirEstado = () => {},
  alRecibirAccion = () => {},
  alRechazar = () => {},
  alFallar = () => {}
}) => {
  const {joinRoom} = await cargarTrystero()

  const sala = joinRoom(
    {appId: APP_ID, password: codigo},
    codigo,
    {onJoinError: detalles => alFallar(new Error(detalles.error))}
  )

  // Espacios de nombres cortos: Trystero los limita a 12 bytes.
  const canalEstado = sala.makeAction('st')
  const canalAccion = sala.makeAction('ac')
  const canalPuerta = sala.makeAction('no')

  let companero = null

  sala.onPeerJoin = id => {
    if (anfitrion) {
      // La mesa es de dos. A cualquier tercero se le cierra la puerta.
      if (companero && companero !== id) {
        canalPuerta.send({motivo: 'llena'}, {target: id}).catch(() => {})
        return
      }
      companero = id
      alEntrarCompanero(id)
    } else {
      // El invitado no sabe aún quién es el anfitrión: lo confirma la
      // primera instantánea que reciba (ver canalEstado.onMessage).
      if (!companero) alEntrarCompanero(id)
    }
  }

  sala.onPeerLeave = id => {
    if (companero !== id) return
    companero = null
    alSalirCompanero(id)
  }

  canalEstado.onMessage = (datos, {peerId}) => {
    if (anfitrion) return
    companero = peerId               // quien reparte estado es el anfitrión
    alRecibirEstado(datos)
  }

  canalAccion.onMessage = (datos, {peerId}) => {
    if (!anfitrion || peerId !== companero) return
    alRecibirAccion(datos, peerId)
  }

  canalPuerta.onMessage = () => {
    if (!anfitrion) alRechazar()
  }

  return {
    codigo,
    anfitrion,
    companero: () => companero,
    enviarEstado: snapshot => {
      if (!anfitrion || !companero) return
      canalEstado.send(snapshot, {target: companero}).catch(() => {})
    },
    enviarAccion: accion => {
      if (anfitrion || !companero) return
      canalAccion.send(accion, {target: companero}).catch(() => {})
    },
    salir: () => sala.leave().catch(() => {})
  }
}
