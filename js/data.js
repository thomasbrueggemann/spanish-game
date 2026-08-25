// Carga de las barajas. Los dos ficheros JSON de data/ son la única fuente
// de verdad del contenido: edítalos y el juego cambia, sin tocar código.

const rutas = {
  temas: 'data/temas.json',
  bonos: 'data/bonos.json'
}

const leer = async ruta => {
  const res = await fetch(new URL(ruta, document.baseURI))
  if (!res.ok) throw new Error(`No se ha podido cargar ${ruta} (${res.status})`)
  return res.json()
}

/**
 * @returns {Promise<{temas: {tema: string, aspectos: string[]}[],
 *                    bonos: {frase: string, tipo: string}[][]}>}
 */
export const cargarBarajas = async () => {
  const [temas, bonos] = await Promise.all([leer(rutas.temas), leer(rutas.bonos)])

  if (!Array.isArray(temas) || !temas.length) throw new Error('data/temas.json está vacío o mal formado')
  if (!Array.isArray(bonos) || !bonos.length) throw new Error('data/bonos.json está vacío o mal formado')

  const malas = bonos.findIndex(c => !Array.isArray(c) || c.length !== 3)
  if (malas !== -1) throw new Error(`La carta bono n.º ${malas + 1} no tiene exactamente 3 conectores`)

  return {temas, bonos}
}
