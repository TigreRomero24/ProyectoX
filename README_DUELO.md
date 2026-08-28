# Módulo de Duelo de Batalla — EduQuery

Duelo en tiempo real (tipo Kahoot) para hasta 10 participantes, con preguntas
tomadas de `Banco_Pregunta` de una materia y puntaje según velocidad de
respuesta (más rápido y correcto = más puntos, mínimo 100 / máximo 1000 por
pregunta acertada).

Todo el código sigue las convenciones que ya tiene tu repo: Sequelize con
`sequelize.define` y columnas snake_case, controllers/services estáticos,
`req.user.id`, respuestas `{ ok, mensaje, data }`, sin React Router (switch-case
en `Dashboard`), y estilos con las variables de `design-system.css`.

## 1. Archivos NUEVOS (solo copiar)

```
server/src/models/duelo.models/duelo.js
server/src/models/duelo.models/dueloParticipante.js
server/src/models/duelo.models/dueloRespuesta.js
server/src/services/duelo.service.js
server/src/controllers/duelo.controller.js
server/src/routes/duelo.routes.js
server/src/sockets/duelo.socket.js

client/src/hooks/useDuelo.js
client/src/components/Duelo/Duelo.jsx
client/src/components/Duelo/DueloLobby.jsx
client/src/components/Duelo/DueloSala.jsx
client/src/components/Duelo/DueloJuego.jsx
client/src/components/Duelo/DueloResultados.jsx
client/src/components/Duelo/Duelo.css
```

## 2. Archivos que se REEMPLAZAN (ya existían, aquí van completos y actualizados)

```
server/index.js                          → crea http.createServer + Socket.io
server/src/models/index.js               → exporta Duelo, DueloParticipante, DueloRespuesta
server/src/models/relacionesModel.js     → agrega asociaciones del duelo al final
server/src/routes/api.routes.js          → monta /duelos

client/src/services/api.js               → agrega crearDuelo/obtenerDuelo/unirseDuelo
client/src/components/Dashboard/Dashboard.jsx  → agrega case "duelo"
client/src/components/Dashboard/Navbar.jsx     → agrega ítem "Duelo" (ícono Swords)
client/vite.config.js                    → agrega proxy de websockets /socket.io
```

> Revisa que no tengas cambios locales sin commitear en esos 8 archivos antes
> de sobrescribirlos — son versiones completas basadas en tu código actual,
> pero si tocaste algo después de generar este contexto, compáralos antes de
> pisarlos.

## 3. Dependencias nuevas

```bash
# server/
cd server
npm install socket.io

# client/
cd ../client
npm install socket.io-client
```

No se agregaron variables de entorno nuevas — el `.env` que ya tienes (JWT,
DB, Google) es suficiente porque el socket reutiliza tu `AccessTokenFactory`
y valida la sesión contra `SesionDispositivo`, igual que tus rutas REST.

## 4. Base de datos

No necesitas escribir una migración a mano: tu `dbConnect()` corre
`sequelize.sync({ force: false, alter: true })` al arrancar el server, así
que las tablas `duelo`, `duelo_participante` y `duelo_respuesta` se crean
solas la primera vez que levantes el backend con los modelos nuevos ya
importados en `models/index.js`.

En producción, si prefieres no depender de `alter: true`, genera el DDL
correspondiente a mano a partir de las definiciones en
`server/src/models/duelo.models/*.js` — son las únicas 3 tablas nuevas.

## 5. Cómo funciona (resumen del flujo)

1. **Crear sala** → `POST /api/v1/duelos` (REST) con `{ id_materia,
   cantidad_preguntas, max_participantes, tiempo_por_pregunta_ms }`.
   Devuelve un `codigo` de 6 caracteres y el creador queda como primer
   participante (`listo: true`).
2. **Unirse / conectar** → el cliente abre un socket al namespace `/duelo`
   pasando el JWT en `auth.token`, y emite `duelo:unirse` con el código.
   El servidor valida el token igual que `AuthMiddleware` +
   `SessionMiddleware`, y añade el socket a una room con el mismo código.
3. **Sala de espera** → cada participante emite `duelo:listo`. El creador
   solo puede emitir `duelo:iniciar` cuando hay ≥2 participantes y todos
   están listos. Al iniciar, el server sortea `cantidad_preguntas` de
   `BancoPregunta` (activas) de la materia y guarda el orden en
   `duelo.preguntas_ids`.
4. **Preguntas** → el server emite `duelo:pregunta` a toda la room (sin
   revelar la opción correcta) y arma un `setTimeout` de
   `tiempo_por_pregunta_ms + 800ms` de margen para forzar el avance si no
   todos responden. Cada `duelo:responder` se califica server-side, es
   idempotente (una respuesta por usuario/pregunta) y calcula el puntaje
   con `DueloService.calcularPuntos` (curva lineal entre 1000 y 100 puntos
   según cuán rápido respondió). Si todos los conectados ya respondieron,
   se avanza antes de que expire el timer.
5. **Resultados** → al agotarse las preguntas, se emite `duelo:finalizado`
   con el ranking ordenado por puntaje y aciertos.

## 6. Limitación conocida (aceptable para un MVP)

El estado de "pregunta activa / temporizador" vive en memoria del proceso
Node (`Map` en `duelo.socket.js`). Si el servidor se reinicia a mitad de un
duelo `EN_CURSO`, ese duelo queda huérfano (la fila en BD sigue existiendo
pero nadie vuelve a emitir la siguiente pregunta). Para producción con
múltiples instancias de Node necesitarías mover ese estado a Redis y usar
el adaptador `@socket.io/redis-adapter` para que las rooms funcionen entre
procesos — lo dejo fuera del MVP porque no hay indicios de que corras el
backend con más de una réplica.

## 7. Prueba rápida

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Abre dos pestañas (o un incógnito) en `http://localhost:5173`, entra con dos
usuarios distintos, crea un duelo con uno y únete con el código desde el
otro.
