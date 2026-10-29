# Mejoras EduQuery — Duelo, Flashcards, Progreso, Personaje/Tienda

Este paquete acumula todo lo construido en la conversación, en orden:
1. **Duelo de batalla** en tiempo real (Socket.io)
2. **Mini reproductor de música** (en el duelo y en modo lección)
3. **Flashcards** (repaso relámpago)
4. **Progreso visual** por materia
5. **Personaje + Tienda** (monedas, XP, nivel, cosméticos)

Todo sigue las convenciones que ya tiene tu repo: Sequelize con `sequelize.define`
y columnas snake_case, controllers/services estáticos, `req.user.id`, respuestas
`{ ok, mensaje, data }`, sin React Router (switch-case en `Dashboard`), estilos
con las variables de `design-system.css`, **sin librerías externas nuevas**
(los gráficos y el personaje son SVG/CSS hechos a mano).

## 1. Dependencias nuevas

```bash
cd server
npm install socket.io

cd ../client
npm install socket.io-client
```

Nada más — Flashcards, Progreso y Personaje/Tienda son 100% código propio,
sin paquetes adicionales.

## 2. Archivos NUEVOS (solo copiar)

```
server/src/models/duelo.models/duelo.js
server/src/models/duelo.models/dueloParticipante.js
server/src/models/duelo.models/dueloRespuesta.js
server/src/models/personaje.models/personaje.js
server/src/models/personaje.models/itemTienda.js
server/src/models/personaje.models/usuarioItem.js
server/src/services/duelo.service.js
server/src/services/personaje.service.js
server/src/controllers/duelo.controller.js
server/src/controllers/personaje.controller.js
server/src/routes/duelo.routes.js
server/src/routes/personaje.routes.js
server/src/sockets/duelo.socket.js

client/src/hooks/useDuelo.js
client/src/utils/youtube.js
client/src/components/Duelo/Duelo.jsx
client/src/components/Duelo/DueloLobby.jsx
client/src/components/Duelo/DueloSala.jsx
client/src/components/Duelo/DueloJuego.jsx
client/src/components/Duelo/DueloResultados.jsx
client/src/components/Duelo/DueloMusica.jsx
client/src/components/Duelo/Duelo.css
client/src/components/Materias/LeccionMusica.jsx
client/src/components/Materias/LeccionMusica.css
client/src/components/Materias/Flashcards.jsx
client/src/components/Materias/Flashcards.css
client/src/components/Materias/ProgresoMateria.jsx
client/src/components/Materias/ProgresoMateria.css
client/src/components/Personaje/PersonajeSVG.jsx
client/src/components/Personaje/PersonajePagina.jsx
client/src/components/Personaje/MiPersonaje.jsx
client/src/components/Personaje/Tienda.jsx
client/src/components/Personaje/Personaje.css
```

## 3. Archivos que se REEMPLAZAN (van completos y actualizados)

```
server/index.js                          → Socket.io + siembra de la tienda al arrancar
server/src/models/index.js               → exporta los modelos nuevos
server/src/models/relacionesModel.js     → asociaciones de duelo + personaje
server/src/routes/api.routes.js          → monta /duelos y /personaje
server/src/services/evaluacion.service.js → otorga monedas al enviar examen y al guardar lección

client/src/services/api.js               → endpoints de duelo y personaje/tienda
client/src/components/Dashboard/Dashboard.jsx  → cases "duelo" y "personaje"
client/src/components/Dashboard/Navbar.jsx     → ítems "Duelo" y "Personaje"
client/src/components/Materias/MateriasList.jsx → botón de Flashcards
client/src/components/Materias/Historial.jsx    → tab "Progreso"
client/vite.config.js                    → proxy de websockets /socket.io
```

> Revisa que no tengas cambios locales sin commitear en esos archivos antes
> de sobrescribirlos.

## 4. Un solo archivo para pegar a mano

`client/APPEND_A_Materias.css.txt` — su contenido va al final de tu
`client/src/components/Materias/Materias.css` real (es el estilo del botón
de Flashcards; no lo reemplacé porque no tengo el archivo completo).

## 5. Base de datos

Como en el resto del proyecto, no hace falta migración manual: `dbConnect()`
corre `sequelize.sync({ alter: true })` al arrancar, así que las tablas nuevas
(`duelo`, `duelo_participante`, `duelo_respuesta`, `personaje`, `item_tienda`,
`usuario_item`) se crean solas la primera vez que levantes el backend con
estos modelos ya importados.

La tienda además se **auto-siembra** con 9 items base (lentes, gorros, capas,
mochila, marcos) la primera vez que el server arranca y encuentra la tabla
`item_tienda` vacía — no necesitas insertarlos a mano.

## 6. Resumen de cada módulo

### Duelo de batalla
Tiempo real vía Socket.io (namespace `/duelo`), hasta 10 participantes,
preguntas de `BancoPregunta` de una materia, puntaje por velocidad
(1000 → 100 pts según qué tan rápido respondiste). Limitación conocida: el
temporizador de la pregunta activa vive en memoria del proceso — si el server
se reinicia a mitad de un duelo, ese duelo queda huérfano (aceptable para una
sola instancia de Node).

### Música
- En el duelo: el creador pega un link de YouTube, se sincroniza para todos
  vía socket (`duelo:musica`), pero cada quien la reproduce en su navegador
  de forma independiente (sin sync de play/pause/segundo exacto).
- En modo lección (`TestMode`): personal, guardada en `localStorage` del
  navegador, sin backend.

### Flashcards
Reutiliza el mismo endpoint que el Modo Evaluación (`getPreguntasTest`) —
sin cambios de backend. Solo preguntas `MULTIPLE`, `VERDADERO_FALSO` y
`SELECCION_MULTIPLE` (las de Ordenar/Completar no tienen una "respuesta
corta" clara para el reverso de la tarjeta). Sistema tipo Anki: "Ya me la sé"
la saca del mazo, "Repasar de nuevo" la manda al final de la cola.

### Progreso visual
Nueva pestaña "Progreso" en Historial. Reutiliza `api.getHistorial()` —
sin backend nuevo. Barras de precisión promedio por materia (las más flojas
primero) + línea de evolución de notas en SVG puro al hacer clic en una.

### Personaje + Tienda
- Cada usuario tiene un personaje (1-1, se crea solo en su primer uso) con
  género (hombre/mujer), tono de piel, color de cabello y de outfit —
  **libres y gratis** de cambiar.
- Se ganan **monedas** estudiando: por acierto en lección (con tope diario
  de 30 monedas para evitar que se farmee repitiendo el mismo test sin
  límite), por nota en examen formal, y por posición en un duelo
  (100/60/40/20 monedas).
- Las monedas se gastan en la **Tienda** en accesorios **cosméticos**
  (gafas, sombrero, capa, mochila, marco) — a propósito nada que dé ventaja
  real en examen o duelo, para no incentivar "pagar" en vez de estudiar.
- El personaje se dibuja 100% en SVG hecho a mano (sin imágenes, sin
  librerías): cada accesorio equipado es una capa extra que se pinta encima.

## 7. Prueba rápida

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Entra con un usuario, ve a "Personaje" para personalizarlo, resuelve una
lección o examen para ganar tus primeras monedas, y cómprate algo en la
Tienda.
