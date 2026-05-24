# Diseño — `POST /api/entries` (sesión 1.4)

> Contrato del endpoint para guardar la respuesta del día. Acordado con Vero el 2026-05-24. Pendiente de implementar (TDD).

## Propósito

Exponer por HTTP la escritura de entries. Es una capa fina sobre
`writeEntry` de `server/lib/markdown.js` (sesión 1.3); el endpoint no toca el
disco directamente, delega en el módulo.

## Contrato

- **Ruta:** `POST /api/entries`
- **Request body (JSON):** `{ day, question, content }`
- **Éxito:** `201 Created` + la entry escrita en JSON (el objeto que devuelve
  `writeEntry`: `{ version, day, date, created, updated, question, content }`).
- **Error de validación:** `400 Bad Request` + `{ error: "<mensaje>" }`.
  - `day` fuera de 1–7 → mensaje `day must be 1-7`.
  - `content` vacío/whitespace → mensaje `content is required`.
  - body ausente o no-JSON → `400` con mensaje claro.
- **Error inesperado:** `500 Internal Server Error` + `{ error: "<mensaje>" }`.

## Implementación

- `express.json()` como middleware global en `server/index.js` para parsear el body.
- Ruta en `server/routes/entries.js`, montada bajo `/api` en `server/index.js`.
- `dataDir` = constante apuntando a `data/` en la raíz del repo. El módulo
  `markdown.js` ya la recibe como parámetro, así que la ruta se la pasa.
- **Mapeo de errores:** los errores de validación que ya lanza `writeEntry`
  (`day must be 1-7`, `content is required`) se distinguen de un fallo genérico
  comparando el mensaje del error: mensaje conocido → `400`; cualquier otro → `500`.
  Simple y suficiente para v1 (KISS).

## Manejo de errores

| Caso                                   | Status | Body                          |
|----------------------------------------|--------|-------------------------------|
| OK                                     | 201    | entry escrita (JSON)          |
| `day` fuera de 1–7                     | 400    | `{ error: "day must be 1-7" }`|
| `content` vacío                        | 400    | `{ error: "content is required" }` |
| body ausente / JSON inválido           | 400    | `{ error: "<mensaje>" }`      |
| error inesperado                       | 500    | `{ error: "<mensaje>" }`      |

## Testing (TDD)

- Tests de integración del endpoint con la app de Express, escribiendo en un
  `dataDir` temporal (no el `data/` real).
- Casos: 201 + entry devuelta en el happy path, 400 en `day` inválido, 400 en
  `content` vacío, 400 en body ausente.
- Inyectar el `dataDir` temporal: la ruta debe poder recibir el directorio de
  datos (p. ej. factory `createEntriesRouter(dataDir)`) para testear sin tocar
  el `data/` real. (Decisión de implementación a confirmar al arrancar la 1.4.)

## Fuera de alcance

- `GET /api/entries` → sesión 1.5.
- Frontend que consuma el endpoint → más adelante.
- Autenticación → no aplica (local-first, sin login).

## Principios

- **KISS**: capa fina, mapeo de errores por comparación de mensaje, sin librerías
  de validación.
- **DRY de conocimiento**: la validación de `day`/`content` vive en `markdown.js`,
  no se duplica en la ruta — la ruta solo traduce el error a HTTP.
- **YAGNI**: sin paginación, sin auth, sin versionado de API.
