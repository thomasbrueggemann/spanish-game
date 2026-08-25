import {montar, $} from './harness.mjs'

const {window} = await montar()
const clic = id => $(id).dispatchEvent(new window.Event('click', {bubbles: true}))
const clicNodo = n => n.dispatchEvent(new window.Event('click', {bubbles: true}))
const t = id => $(id).textContent.trim()
const vis = id => !$(id).hidden

await import('../js/main.js')

const foto = () => ({
  lobby: vis('ovLobby'), nivelPanel: vis('ovNivel'), fin: vis('ovFin'),
  ronda: t('chipRonda'), nivel: vis('chipNivel') ? t('chipNivel') : null,
  sala: vis('chipSala') ? t('chipSala') : null,
  turnoA: vis('turnoA'), turnoB: vis('turnoB'),
  puntosA: t('puntosA'), puntosB: t('puntosB'),
  nombreA: $('nombreA').value, nombreB: $('nombreB').value,
  desactivadoA: $('nombreA').disabled, desactivadoB: $('nombreB').disabled,
  yoA: vis('yoA'), yoB: vis('yoB'),
  posicion: t('posicion'),
  tema: vis('envTema') ? t('temaTitulo') : null,
  bono: vis('envBono') ? [...$('conectores').children].map(n => n.querySelector('.conector-frase').textContent) : null,
  bonoEsBoton: vis('envBono') ? $('conectores').children[0].tagName : null,
  marcados: vis('envBono') ? [...$('conectores').children].map(n => n.classList.contains('marcado')) : null,
  nArg: vis('envTema') ? t('nArg') : null,
  botonMas: vis('envTema') ? vis('btnMasArg') : null,
  botonAccion: vis('btnAccion'), etiquetaAccion: t('btnAccion'),
  botonReloj: vis('btnReloj'), etiquetaReloj: t('btnReloj'), reloj: t('reloj'),
  papel: vis('papel') ? t('papelTexto') : null,
  puntosTurno: t('puntosTurno'), niveles: vis('niveles'), nivelEspera: vis('nivelEspera')
})

process.on('message', async m => {
  if (m.tipo === 'peer' || m.tipo === 'st' || m.tipo === 'ac' || m.tipo === 'adios' || m.tipo === 'lleno') return
  const [orden, arg] = m.cmd.split(':')
  if (orden === 'crear') clic('btnCrear')
  if (orden === 'unirse') { clic('btnUnirse'); $('codigoSala').value = arg
    $('formUnirse').dispatchEvent(new window.Event('submit', {bubbles: true, cancelable: true})) }
  if (orden === 'clic') clic(arg)
  if (orden === 'nivel') clicNodo($('niveles').children[Number(arg)])
  if (orden === 'conector') clicNodo($('conectores').children[Number(arg)])
  if (orden === 'nombre') { const c = $(arg.split('=')[0]); c.value = arg.split('=')[1]
    c.dispatchEvent(new window.Event('change', {bubbles: true})) }
  if (orden === 'foto') { process.send({tipo: 'foto', id: m.id, datos: foto()}); return }
  process.send({tipo: 'hecho', id: m.id})
})
process.send({tipo: 'arrancado'})
