# Plan de Finalizacion REY30VERSE

## Objetivo

Llevar la app a una experiencia premium tipo "command center" inspirada en la imagen de referencia:

- Vista principal compuesta por feed, chats, streaming, perfil, puntos, salas activas y editor de cartas.
- Jerarquia visual fuerte, estilo neon premium y sensacion de producto terminado.
- Flujo real entre lobby, partida, chat, marketplace, streaming y personalizacion.

## Lo que ya existe en el repo

- Feed social base
- Chat system base
- Lobby y mesa de cartas
- Streaming UI
- Marketplace UI
- Editor de cartas UI
- Tema neon oscuro

## Gap actual contra la referencia

- La home aun no consolida toda la experiencia real en una sola vista operativa.
- Falta persistencia real para perfiles, salas, partidas, inventario y progreso.
- No hay tiempo real real para chat, mesa, gifts ni estado de salas.
- La vista movil mostrada en la referencia todavia es una representacion, no una experiencia nativa o responsive equivalente completa.
- El editor de cartas necesita pipeline real de upload, crop, guardado y aplicacion al mazo.

## Fase 1. Limpieza y base de marca

Estado: hecho en esta iteracion

- Eliminar dependencia y branding residual de la plataforma AI original.
- Renombrar identidad tecnica del proyecto a `rey30verse`.
- Reemplazar logo y metadata.
- Crear un arranque estable con `REY30_START_DEV.bat`.

## Fase 2. Home premium tipo mockup

Estado: hecho parcialmente en esta iteracion

- Consolidar la portada como hub visual.
- Mostrar en una sola pantalla:
  - inicio social
  - chats
  - streaming destacado
  - panel de puntos
  - salas activas
  - mesa central
  - editor de cartas
- Afinar responsive para mobile y tablet.

## Fase 3. Tiempo real real

Estado: base implementada en esta iteracion

- Socket server para:
  - chat global
  - chat de sala
  - presencia online
  - invites
  - estado de turnos
  - gifts y reacciones
- Reconexion y sincronizacion de estado.
- Indicadores de latencia, offline y rejoin.

Implementado ahora:

- Canal realtime via SSE en `/api/realtime/stream`.
- Pulso persistente de presencia en `/api/presence/pulse`.
- Broadcast de eventos para mensajes y creacion de salas.
- Reconexion visual, sync en vivo y estado de latencia en la shell principal.

## Fase 4. Backend de producto

Estado: base implementada en esta iteracion

- Prisma models para:
  - users
  - profiles
  - rooms
  - matches
  - match_events
  - messages
  - inventory
  - deck_styles
  - gifts
  - live_sessions
- API routes para CRUD de cada modulo.
- Auth y permisos por sala, perfil y contenido.

## Fase 5. Mesa de juego completa

Estado: base jugable implementada en esta iteracion

- Reglas completas del juego y validacion de turnos.
- Reconexion segura si un jugador sale.
- Bots configurables con dificultad real.
- Historial de ronda, tabla de puntos y fin de partida.
- Voice/chat in room con controles persistentes.

Implementado ahora:

- Estado de mesa persistente en SQLite con `GameMatch` y `GameMatchEvent`.
- Mano real, validacion de palo, resolucion de baza y puntos de penalidad.
- Bots de apoyo que juegan hasta devolverte el turno.
- Historial de acciones, marcador y nueva ronda con reset persistente.
- Controles persistentes de voz, chat y tema de mesa, todos con broadcast realtime.

## Fase 6. Streaming y comunidad

Estado: base persistente implementada en esta iteracion

- Crear stream real o simulacion avanzada con datos persistentes.
- Chat overlay real.
- Sistema de gifts y monedas.
- Panel de creador con seguidores, highlights y clips.
- Integracion futura con video ingest o proveedor de streaming.

Implementado ahora:

- Snapshot vivo persistente con streams, clips, gifts y panel de creador.
- Chat de stream real via Prisma con broadcast `stream-updated`.
- Envio de regalos descontando coins o gems del perfil activo.
- Selector de stream y recarga en vivo desde `/api/live/state`.

## Fase 7. Card Lab y marketplace

- Upload real de imagen.
- Crop, zoom, rotate y preview persistente.
- Aplicar estilo a una carta o a todo el mazo.
- Guardar deck templates por usuario.
- Marketplace con compra, inventario, rareza y equipamiento.

## Fase 8. Calidad de producto

- Estados vacios, loading y error en todas las vistas.
- Tests de componentes clave.
- Tests de reglas de juego.
- Lint y build sin `ignoreBuildErrors`.
- Analitica, logs y health checks.

## Orden recomendado de implementacion

1. Persistencia base con Prisma
2. Auth y perfiles
3. Tiempo real para chat y presencia
4. Tiempo real para salas y partida
5. Card Lab real
6. Marketplace + inventario
7. Streaming + gifts
8. Hardening, testing y deploy

## Criterio de "100 por ciento como la imagen"

La app puede considerarse al nivel de la referencia cuando cumpla estos puntos:

- Home compuesta y navegable con el mismo nivel de densidad visual.
- Todos los paneles principales conectados a datos reales.
- Mesa jugable multiusuario.
- Chats y salas en tiempo real.
- Puntos, estadisticas y progreso persistentes.
- Editor de cartas funcional de extremo a extremo.
- Marketplace con equipamiento real.
- Mobile premium coherente con desktop.
