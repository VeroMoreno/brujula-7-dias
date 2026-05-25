# Diseño — Catálogo bilingüe de preguntas guiadas (sesión 1.7b)

> Acordado con Vero el 2026-05-25. Cierra la sensación de "editor de markdown
> vacío" que la sesión 1.6 dejó sobre la mesa.

## Propósito

Servir una pregunta canónica por día y locale, mostrarla pre-rellenada en el
form al cambiar de día o de idioma, **y dejarla editable**. Es punto de
partida, no guion impuesto. Esto respeta la línea del CLAUDE.md "no es terapia
ni coach automático".

## Decisiones

- **Almacenamiento:** `server/prompts/questions.{locale}.md`, una sección por
  día con `## N` (N = 1..7). El encabezado numérico evita escribir `## Day` /
  `## Día` y permite que el parser sea idéntico entre idiomas.
- **Carga:** `loadQuestions(promptsDir, locale)` parsea el `.md` con regex
  `^## (\d+)\s*\n([\s\S]+?)(?=\n## |\s*$)`, valida que haya exactamente 7
  preguntas (1..7), y cachea por `(promptsDir, locale)` en un Map en memoria.
  Si el archivo tiene 6 o 8 preguntas, lanza error explícito —
  preferible romper en boot que servir un catálogo incompleto en silencio.
- **Validación de día:** el mismo mensaje (`day must be 1-7`) que ya usa
  `assertDay` en `server/lib/markdown.js`. Reutilizar el string mantiene la
  superficie de errores HTTP coherente.
- **Negociación de locale:** se reutiliza `resolveLocale` de
  `server/lib/i18n.js`. Locale inválido en `?locale=` se ignora y degrada al
  default — mismo comportamiento que `/api/messages`.

## Contrato HTTP

- **Ruta:** `GET /api/questions/:day?locale=X`
- **200 OK:** `{ day, locale, question }`.
- **400 Bad Request:** `{ error: "day must be 1-7" }` para `day` fuera de
  rango o no numérico.
- **500:** si el archivo del locale no se puede leer o parsear con 7
  secciones — no debería ocurrir con locales soportados y el repo en estado
  coherente.

## Cliente Alpine

Tres añadidos sobre el estado de 1.7a:

- `loadQuestion()` — fetcha `/api/questions/${form.day}?locale=${locale}` y
  asigna el resultado a `form.question`. Si el fetch falla, el input
  conserva su valor actual.
- `init()` añade `$watch('form.day', () => this.loadQuestion())` y
  `$watch('locale', () => this.loadQuestion())`, y llama `loadQuestion()`
  una vez al final para el render inicial.
- `submit()` resetea `form.question` y `form.content`, y al final llama
  `loadQuestion()` para re-poner la pregunta canónica del catálogo del
  día actual.

El usuario puede editar el input libremente entre cambios de día; al cambiar
de día se asume que es un commit mental y la edición se descarta a favor de
la pregunta canónica del nuevo día.

## Testing

- `tests/questions.lib.test.js`: parseo de 7 preguntas, independencia entre
  locales, locale no soportado, archivo con menos de 7 preguntas, validación
  de `day` con el mismo mensaje canónico (`day must be 1-7`) y rechazo de
  enteros fuera de rango y no enteros (`1.5`).
- `tests/questions.api.test.js`: ES por defecto, override `?locale=en`,
  `day=8` → 400, `day=abc` → 400, locale no soportado degrada a ES.

## Fuera de alcance

- Cargar la **respuesta** existente al cambiar de día (UX de edición desde la
  lista — sesión separada).
- Mostrar la pregunta junto al texto de la entrada en la lista (`<article>`)
  cuando se ve una entrada antigua. El form sí, la lista no, en esta sesión.
- Endpoint para servir el catálogo completo `/api/questions?locale=X`. El
  cliente sólo necesita una a la vez por ahora.

## Principios

- **KISS**: regex de una línea, sin gray-matter aquí (el frontmatter del
  archivo es para el lector humano, no para el parser).
- **DRY**: reutiliza `resolveLocale` y el mensaje `day must be 1-7`.
- **YAGNI**: una pregunta por petición; pre-cargar las 7 en el cliente sería
  más eficiente pero innecesario para el flujo de v1.
- **Local-first**: el catálogo viaja con el repo; ningún servicio externo.
