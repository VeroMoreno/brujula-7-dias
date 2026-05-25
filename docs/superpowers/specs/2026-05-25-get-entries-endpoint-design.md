# Diseño — `GET /api/entries` (sesión 1.5)

> Lectura del listado de entries. Acordado con Vero el 2026-05-25.

## Propósito

Exponer por HTTP la lectura del listado completo de entries del usuario.
Capa fina sobre `listEntries` de `server/lib/markdown.js`.

## Contrato

- **Ruta:** `GET /api/entries`
- **Sin query params** en v1.
- **Éxito:** `200 OK` + **array JSON** de entries ordenadas por `day` ascendente.
  Cada entry tiene la forma que devuelve `readEntry`:
  `{ version, day, date, created, updated, question, content }`.
- **Sin entries (o `dataDir` aún no creado):** `200 OK` + `[]`. No es un error
  — `listEntries` ya devuelve `[]` ante ENOENT.
- **Error inesperado:** `500 Internal Server Error` + `{ error: "<mensaje>" }`,
  emitido por el error middleware central en `server/app.js`.

## Decisiones

- **Array directo, sin envoltorio `{ entries: [...] }`.** Consistente con
  `POST /api/entries`, que ya devuelve la entry directa. Si en el futuro hace
  falta paginación o metadata, será un endpoint nuevo o un breaking change
  tolerable en v1.
- **No se valida nada en la ruta** — no hay input.

## Testing

- Mismo archivo `tests/entries.api.test.js`, nuevo `describe('GET /api/entries')`
  con su propio `before`/`after` (puerto efímero, `dataDir` temporal) y un
  `beforeEach` que limpia el `dataDir` entre tests, porque cada caso mira el
  directorio completo y necesita aislamiento.
- Setup de entries vía `writeEntry` directo (no vía POST): más rápido y
  específico — los tests del POST ya cubren el endpoint de escritura.
- Casos:
  1. Sin entries → `200` + `[]`.
  2. Con entries escritas en orden no creciente (day 3, 1, 2) → `200` + array
     ordenado por día ascendente.

## Fuera de alcance

- Filtros (`?day=`, `?since=`).
- Paginación.
- Endpoint `GET /api/entries/:day` individual.

## Principios

- **KISS**: capa fina, sin envoltura, sin opciones.
- **DRY**: el ordenamiento y la lectura viven en `listEntries`; la ruta solo
  traduce a HTTP.
- **YAGNI**: sin paginación ni filtros en v1.
