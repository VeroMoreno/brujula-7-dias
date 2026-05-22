# Diseño — Módulo `markdown.js` (sesión 1.3)

> Spec de la capa de persistencia de Brújula · 7 días. Aprobado por Vero el 2026-05-22.

## Propósito

`server/lib/markdown.js` es la **única** capa que lee y escribe entries como
archivos `.md` con frontmatter. Ningún otro módulo toca el disco directamente.
Es el corazón de la filosofía local-first: los `.md` *son* la base de datos y
sobreviven a la app.

## Formato en disco

- Un solo ciclo de 7 días, archivos planos: `data/day-1.md … data/day-7.md`.
- Frontmatter serializado con `gray-matter`.

```markdown
---
version: 1
day: 1
date: 2026-05-22
created: 2026-05-22T09:14:00Z
updated: 2026-05-22T09:14:00Z
question: "¿Qué te trajo hasta aquí?"
---
La reflexión del usuario, texto libre en markdown.
```

| Campo      | Tipo            | Significado                                            |
|------------|-----------------|--------------------------------------------------------|
| `version`  | número          | Versión del esquema (hoy `1`). Permite migrar a futuro. |
| `day`      | número 1–7      | Día del ciclo.                                          |
| `date`     | `YYYY-MM-DD`    | Día en que se respondió por primera vez. Fijo al crear. |
| `created`  | ISO 8601 UTC    | Primera escritura. No cambia al editar.                 |
| `updated`  | ISO 8601 UTC    | Última escritura.                                       |
| `question` | string          | Pregunta de ese día, guardada dentro del archivo para  |
|            |                 | que el `.md` se entienda solo en cualquier editor.      |

El **cuerpo** del archivo = la reflexión del usuario.

## API pública (3 funciones)

Todas reciben `dataDir` como primer parámetro explícito (sin estado global): los
tests pasan un directorio temporal, el server pasa la ruta real a `data/`.

### `writeEntry(dataDir, { day, question, content })`
- Crea o sobreescribe `data/day-N.md`.
- Si el archivo ya existe: conserva su `created`, actualiza `updated` a ahora.
- Si es nuevo: `created`, `updated` y `date` = ahora.
- `date` se fija al crear y **no** cambia al editar (es el día al que pertenece
  la reflexión; las ediciones se reflejan solo en `updated`).
- Crea `dataDir` si no existe.
- Devuelve la entry escrita (mismo shape que `readEntry`).

### `readEntry(dataDir, day)`
- Devuelve `{ version, day, date, created, updated, question, content }`.
- Devuelve `null` si el archivo no existe (= "aún no respondido", no es error).

### `listEntries(dataDir)`
- Devuelve un array de todas las entries existentes, ordenadas por `day` ascendente.
- `data/` vacío o inexistente → `[]`.

## Manejo de errores

| Caso                                   | Comportamiento                          |
|----------------------------------------|-----------------------------------------|
| `day` fuera de 1–7                     | Lanza `Error: day must be 1-7`          |
| `content` vacío/whitespace en write    | Lanza `Error: content is required`      |
| `readEntry` de día inexistente         | Devuelve `null`                         |
| `listEntries` sin `data/`              | Devuelve `[]`                           |

## Principios aplicados

- **KISS** rige: 3 funciones puras, sin clases, sin estado global, sin factory.
- **DRY de conocimiento**: el esquema del frontmatter (campos y defaults) vive en
  un solo sitio del módulo, no repartido entre write y read.
- **YAGNI**: nada de `mood`, tags, títulos derivados ni multi-ciclo hasta que algo
  los necesite.

## Testing (prep sesión 1.6)

- Funciones puras sobre un `dataDir` temporal vía `node:fs` `mkdtemp`.
- `node --test` nativo, suite < 1s.
- Casos: write+read round-trip, edición preserva `created`, `readEntry` null,
  `listEntries` ordenado y vacío, validación de `day` y `content`.

## Fuera de alcance

- Endpoints HTTP (`POST`/`GET /api/entries`) → sesiones 1.4 y 1.5.
- Resumen IA del día 7 → más adelante, es otro artefacto (no una entry).
- Multi-ciclo → futura "Brújula" completa; migración trivial si llega.
