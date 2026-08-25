# El Peso del Debate

Juego de argumentación en español para dos jugadores. Lanzas el peso para saber
si te toca defender o rebatir el tema, volteas una carta de **tema** y una carta
de **bono**, y hablas contra reloj: cada argumento propio suma 1 punto y cada
conector de la carta bono que uses de forma natural suma otro.

Aplicación web estática — HTML, CSS y JavaScript sin build — pensada para
publicarse en GitHub Pages. Se puede jugar **en línea entre dos navegadores**
(uno crea la sala, el otro entra con el código) o **en un solo dispositivo**.

---

## Cómo se juega

1. **El peso.** Cara → defiendes el tema (*a favor*). Cruz → lo rebates (*en contra*).
2. **La carta de tema.** Se voltea junto a la de bono. Construye hasta tres
   puntos de argumentación propios: 1 punto cada uno.
3. **La carta bono.** Tres conectores. Cada uno que uses con naturalidad, +1.
4. **El turno.** Lees tu carta con calma, arrancas el reloj cuando estés listo y
   hablas. **El otro jugador hace de juez**: escucha y marca los puntos que
   consigas. Después se cambia el turno.

La partida son 8 rondas (16 turnos). La dificultad —que elige el Jugador 1— fija
el tiempo por turno: 6, 5 o 4 minutos.

---

## Multijugador en línea

La sincronización usa [Trystero](https://trystero.dev/) sobre WebRTC, con
descubrimiento de pares por la red Nostr. **No hace falta servidor propio**: por
eso funciona en GitHub Pages tal cual.

- El **Jugador 1** pulsa *Crear una sala* y recibe un código de 6 caracteres
  (alfabeto sin `0/O` ni `1/I`, para poder dictarlo). También puede copiar un
  enlace de invitación con el código ya puesto (`?sala=ABCDEF`).
- El **Jugador 2** pulsa *Unirme a una sala*, escribe el código y entra. Si abre
  el enlace de invitación, entra solo.
- Los dos ven el mismo tablero: mismo tema, mismo bono, mismo marcador y mismo
  reloj.
- **Cada turno reparte dos papeles, y los mandos van con ellos.** Nadie se
  puntúa a sí mismo:
  - *Quien habla* lleva el hilo del turno: lanza el peso, voltea las cartas,
    arranca y pausa el reloj y termina el turno. No ve los mandos de puntuar.
  - *El rival hace de juez*: es el único con el contador de argumentos y las
    casillas de conectores. No ve el botón de acción ni el del reloj.

  Los dos ven en todo momento las mismas cartas, el mismo reloj y el mismo
  marcador; sólo cambia qué botones les salen, y un aviso les recuerda qué papel
  les toca.
- **El reloj no arranca solo.** Al voltear las cartas queda parado para que quien
  habla lea su tema sin prisa; el botón pasa por *Empezar → Pausa → Seguir*.
- Una sala admite exactamente dos jugadores; a un tercero se le rechaza.
- Si alguien se desconecta, la partida se pausa y se retoma cuando vuelve.

### Modelo de autoridad

El anfitrión ejecuta las reglas y es dueño del estado; reparte una instantánea
tras cada cambio. El invitado nunca muta nada: manda *intenciones*
(`{t: 'voltear'}`, `{t: 'bono', i: 2}`…) y pinta lo que recibe.

El anfitrión comprueba de quién viene cada intención antes de aplicarla, así que
ocultar los botones no es la única defensa. Hay dos comprobaciones, una por
papel (`js/main.js`): `esQuienHabla` para `lanzar`, `voltear`, `reloj` y
`terminar`; `esElJuez` para `arg` y `bono`. En el modo local una sola persona
cumple los dos papeles.

Los mazos barajados viven sólo en el anfitrión; por la red viajan únicamente los
índices de la carta actual, así que cada paquete son unos pocos cientos de bytes.

### Sobre la privacidad

Los datos del juego van cifrados de extremo a extremo y directos entre los dos
navegadores; sólo el descubrimiento inicial pasa por relés públicos de Nostr. El
código de la sala se usa además como contraseña de la sala, así que trátalo como
un secreto compartido de andar por casa: sirve para que nadie entre por
casualidad, no para guardar nada sensible.

---

## Editar el contenido

Todo el contenido está en `data/`, en JSON, y es lo único que hay que tocar para
cambiar el juego. **Las 150 cartas de tema y las 150 cartas de bono están
pre-generadas**: se leen tal cual, no se calculan al arrancar.

### `data/temas.json` — 150 cartas de tema

```json
[
  {
    "tema": "El uniforme escolar debería ser obligatorio",
    "aspectos": ["El coste para las familias", "La igualdad entre alumnos", "La libertad de expresarse"]
  }
]
```

- `tema` es la frase que se ve en la carta amarilla.
- `aspectos` son tres pistas de apoyo. Hoy no se muestran en la mesa (la carta
  las deja fuera a propósito), pero se conservan por si quieres usarlas como
  ayuda para principiantes.

Añade, quita o reescribe entradas libremente: el mazo se baraja con el tamaño
real del fichero, no con el número 150.

### `data/bonos.json` — 150 cartas de bono

Cada carta es una lista de exactamente tres conectores:

```json
[
  [
    { "frase": "Sin embargo", "tipo": "contraste" },
    { "frase": "Incluso", "tipo": "adición" },
    { "frase": "Diría que", "tipo": "opinión" }
  ]
]
```

`frase` se ve grande en la carta azul y `tipo` es la etiqueta pequeña de debajo.
Edita cualquier carta a mano: el juego lee este fichero directamente.

### `data/conectores.json` — el banco de 160 conectores

Es la materia prima con la que se generó `bonos.json`, agrupada en 15 tipos
(contraste, consecuencia, causa, secuencia, adición, ejemplo, concesión,
conclusión, opinión, reformulación, condición, énfasis, tiempo, referencia,
interpelación).

Si cambias el banco y quieres rehacer el mazo entero:

```bash
node tools/generate-bonos.mjs
```

Reparte los conectores por las 150 cartas sin repetir ninguno dentro de una
carta (hoy: los 160 conectores usados, 0 cartas con el tipo repetido). **Ojo:
sobrescribe `data/bonos.json` y se pierden las ediciones a mano.**

### Otros ajustes

- Número de rondas y duraciones: `RONDAS` y `NIVELES`, al principio de
  [`js/game.js`](js/game.js).
- Quién maneja cada mando: `esQuienHabla` / `esElJuez` en
  [`js/main.js`](js/main.js) y `hablo` / `juzgo` en [`js/ui.js`](js/ui.js).
- Foto de fondo: coloca `assets/fondo.jpg`. Si no está, se usa el degradado.

---

## Ejecutar en local

Los módulos ES no funcionan desde `file://`, así que hace falta un servidor:

```bash
python3 -m http.server 8080
```

Y abre <http://localhost:8080>. Para probar el multijugador, abre el enlace de
invitación en una segunda ventana (mejor en modo incógnito o en otro navegador,
para no compartir estado).

---

## Pruebas

```bash
npm install     # jsdom y Playwright, sólo para las pruebas
npm test
```

Las dependencias son de desarrollo: el sitio que se publica no las usa ni las
incluye. Las suites levantan su propio servidor en un puerto libre, así que no
hay que arrancar nada a mano.

```
tests/reglas.test.mjs        las reglas puras de js/game.js, sin DOM
tests/local.test.mjs         la partida en un aparato, sobre jsdom
tests/partida.test.mjs       16 turnos seguidos hasta el marcador final
tests/red.test.mjs           dos procesos = dos jugadores; comprueba el
                             reparto de mandos y que el anfitrión rechaza
                             lo que no toca (la red va simulada por IPC)
tests/navegador.test.mjs     Chromium de verdad, dos pestañas, Trystero,
                             Nostr y WebRTC reales; deja capturas en
                             tests/capturas/
tests/sala-llena.test.mjs    se rechaza al tercer jugador y a los códigos mal
tests/produccion.test.mjs    lo mismo contra el sitio ya publicado
```

`npm run test:rapidas` salta las de navegador; `npm run test:produccion` añade
la que va contra GitHub Pages. Si Playwright no está instalado, las de navegador
se saltan solas en vez de fallar.

## Publicar en GitHub Pages

**Opción A — desde una rama** (lo más simple): sube el repositorio y en
*Settings → Pages* elige *Deploy from a branch*, rama `main`, carpeta `/ (root)`.

**Opción B — con Actions**: ya está `.github/workflows/pages.yml`. En
*Settings → Pages* elige *GitHub Actions* como origen y cada `push` a `main`
publica.

No hay paso de compilación: lo que hay en el repositorio es lo que se sirve. El
único requisito de red en tiempo de ejecución es la CDN desde la que se carga
Trystero (`esm.sh`, con `jsdelivr` como reserva) y Google Fonts.

---

## Estructura

```
index.html                estructura de la página
css/styles.css            todo el estilo
js/data.js                carga y valida los JSON
js/game.js                reglas y máquina de estados (sin DOM, sin red)
js/net.js                 salas Trystero: crear, entrar, repartir
js/ui.js                  pintado del DOM y eventos
js/main.js                orquestador: une las cuatro piezas
data/temas.json           150 cartas de tema
data/bonos.json           150 cartas de bono
data/conectores.json      banco de 160 conectores
tools/generate-bonos.mjs  regenera bonos.json desde el banco
tests/                    pruebas (ver arriba); no se publican
```
