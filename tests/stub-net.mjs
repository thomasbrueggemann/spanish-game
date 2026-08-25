// Sustituto de js/net.js: en vez de WebRTC, mensajes por IPC al proceso padre.
export const APP_ID = 'prueba'
export const generarCodigo = () => 'PRUEB4'
export const normalizarCodigo = t => (t || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6)

export const abrirSala = async ({codigo, anfitrion, alEntrarCompanero = () => {},
                                 alSalirCompanero = () => {}, alRecibirEstado = () => {},
                                 alRecibirAccion = () => {}, alRechazar = () => {}}) => {
  process.on('message', m => {
    if (m.tipo === 'peer') alEntrarCompanero('otro')
    if (m.tipo === 'adios') alSalirCompanero('otro')
    if (m.tipo === 'lleno') alRechazar()
    if (m.tipo === 'st' && !anfitrion) alRecibirEstado(m.datos)
    if (m.tipo === 'ac' && anfitrion) alRecibirAccion(m.datos, 'otro')
  })
  process.send({tipo: 'sala', anfitrion, codigo})
  return {
    codigo, anfitrion, companero: () => 'otro',
    enviarEstado: s => process.send({tipo: 'st', datos: s}),
    enviarAccion: a => process.send({tipo: 'ac', datos: a}),
    salir: () => {}
  }
}
