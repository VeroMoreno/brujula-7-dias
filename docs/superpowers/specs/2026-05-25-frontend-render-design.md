# Diseño — Render mínimo en frontend (sesión 1.6)

> Primer tacto visual de Brújula. Acordado con Vero el 2026-05-25.

## Propósito

Convertir el `index.html` placeholder en una UI funcional que permita:

1. **Ver** las entradas ya guardadas (lectura de `GET /api/entries`).
2. **Crear o sobrescribir** la entrada de un día (escritura vía `POST /api/entries`).

Es el primer hito en el que la app se puede tocar a mano en `localhost:3000`.

## Stack

- HTML plano + **Alpine.js 3** desde CDN (jsDelivr, versión pinneada).
- CSS propio en `web/styles.css` — sin frameworks (sin Tailwind, sin
  shadcn). System font stack.
- Sin build step. Un fork del repo debe servir el frontend con `npm start`
  sin instalar nada extra. Alpine se descarga del CDN al abrir el navegador.

## UX

- **Una sola columna**, ~720px max-width, centrada.
- **Form arriba** (crear/sobrescribir), **listado debajo** (lecturas).
- Si el día seleccionado ya tiene entrada → aviso sutil "Sobrescribirás la
  entrada del día N." (semántica del módulo: una entrada por día.)
- Botón deshabilitado mientras hay petición en curso, con texto "Guardando…".
- Errores de la API se muestran en `[role="alert"]` debajo del form.
- Copys en **español** (convención del proyecto).

## Comportamiento del cliente Alpine (`entriesApp`)

- `load()` — `GET /api/entries`. Llamado en `x-init`.
- `submit()` — `POST /api/entries` con `form`. Si OK, limpia `question` y
  `content` (mantiene `day` para iterar), recarga la lista. Si 400/500,
  muestra `error.message` del payload.
- `existingForDay(day)` — helper para el aviso de sobrescritura.

## Lo que NO entra en 1.6

- Edición vía clic en una entrada de la lista (preload del form).
- Borrado.
- Pre-cargar un catálogo de preguntas guiadas (eso es flujo de Brújula
  completa, fuera del alcance del mini-producto en esta sesión).
- Tests automáticos del frontend. La UI es delgada sobre endpoints ya
  testeados; Playwright contradice "minimalismo deliberado" del CLAUDE.md.
  Validación manual: abrir `localhost:3000`, crear una entrada, recargar,
  verificar que persiste en `data/day-N.md`.

## Verificación end-to-end

1. `npm start`.
2. Abrir `http://localhost:3000`.
3. Crear entrada (día 1, pregunta y respuesta cualquiera) → debe aparecer
   abajo.
4. Recargar la página → la entrada sigue ahí (sirvió GET).
5. Comprobar que `data/day-1.md` existe con el contenido en frontmatter +
   cuerpo.
6. Volver a guardar día 1 con texto distinto → aviso de sobrescritura
   visible antes de enviar; entrada actualizada en la lista.

## Principios

- **KISS**: una pantalla, dos acciones, cero estado oculto.
- **YAGNI**: nada de routing, nada de modales, nada de preload de edición.
- **Minimalismo deliberado**: el HTML+JS+CSS total cabe en ~150 líneas.
