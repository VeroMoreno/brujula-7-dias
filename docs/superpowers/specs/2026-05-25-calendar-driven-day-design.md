# Diseño — Día por calendario + pregunta como display (sesión 1.7c)

> Corrige dos cosas detectadas al probar 1.7b. Acordado con Vero el
> 2026-05-25.

## Por qué

1. **Bug visual:** la pregunta del día llegaba al `value` del `<input>`
   (no al `placeholder`), así que aparecía en color "normal" y se
   sobrescribía al escribir.
2. **Modelo conceptual incorrecto:** el `<select>` de días contradice la
   filosofía declarada en `CLAUDE.md` ("una pregunta al día", "sin
   gamificación, sin notificaciones, sin enganche"). Brújula debería ser
   un compañero que te recibe en el día que toca, no un formulario que
   te invita a rellenar los 7 días a la vez.

Las dos cosas se resuelven juntas: el día se **calcula** desde
`data/day-1.md`, la pregunta es **display only**.

## Modelo

- El "journey" arranca cuando se guarda la primera entrada. El módulo
  `markdown.js` ya escribe `created: <ISO timestamp>` en el frontmatter
  de cada entrada — eso es nuestra fuente de verdad.
- El "día actual" = `floor((now - start) / 1 día UTC) + 1`, clampado a
  `1..7`.
- "Complete" cuando han pasado 7 días o más desde el inicio.
- Si todavía no existe `day-1.md`, el día actual es `1` y el journey no
  ha empezado (`startedAt: null`).

## Por qué UTC y no zonas horarias

Vero trabaja con doble máquina (Windows + Mac). `data/day-1.md` guarda
`created` en ISO UTC (`new Date().toISOString()`). Hacer las cuentas en
días UTC (`Math.floor(ms / 86_400_000)`) garantiza el mismo resultado en
ambas máquinas y evita el zoológico de zonas horarias por una
funcionalidad que no las necesita. El subhead muestra "Hoy es el día N"
en términos del journey, no de la zona horaria local — lo cual coincide
con la intención.

## Variable de entorno `BRUJULA_TODAY`

Para desarrollar el flujo de 7 días sin esperar 7 días reales:

```
BRUJULA_TODAY=2026-06-01 npm start
```

Si está set (formato `YYYY-MM-DD`), `getNow()` la usa como "now". Si no,
`new Date()`. Sólo afecta al server (el cálculo del día vive ahí). Es la
única "puerta trasera" para testing manual y queda fuera de cualquier
build de producción por estar en env vars.

## Cambios

### Backend
- `server/lib/journey.js` — `getNow`, `computeCurrentDay`,
  `getJourneyState`, `__setNowForTests`.
- `server/routes/journey.js` — `createJourneyRouter(dataDir)`,
  `GET /journey` → `{ day, startedAt, complete }`.
- `server/app.js` — monta `createJourneyRouter` cuando hay `dataDir`.
  (Se aprovecha para hacer `createEntriesRouter` también condicional y
  no romper los tests de otros routers que no pasan `dataDir`.)

### Frontend
- `web/index.html`:
  - Estado Alpine pierde `form.day` y gana `journey` + `question` (la
    pregunta es estado de presentación, no de form).
  - Form: solo `<textarea>` (respuesta). La pregunta se renderiza como
    `<h2 class="question-prompt">`. Encima, un subhead pequeño
    "Hoy es el día N" (`<p class="today-label">`).
  - Si `journey.complete`, el form se oculta y aparece la sección de
    cierre con `journey.completeTitle` + `journey.completeNote`. La
    lista de entradas escritas sigue visible.
- `web/styles.css`:
  - Sale `.hint`.
  - Entran `.today-label`, `.question-prompt`, `.visually-hidden`.
- `messages/{es,en}.json`:
  - Salen `form.title`, `form.day`, `form.question`, `form.overwrite`,
    `form.placeholder.question`.
  - Entran `journey.todayLabel`, `journey.completeTitle`,
    `journey.completeNote`.

## Verificación manual

1. `npm test` — todos verdes (~46 tests).
2. `npm start` con `data/` vacío → "Hoy es el día 1" + pregunta 1.
3. Escribir respuesta, guardar. Recargar → mismo día, mismo número
   (mismo día UTC).
4. `BRUJULA_TODAY=YYYY-MM-DD npm start` simulando +3 días desde el
   `created` de day-1.md → "Hoy es el día 4" + pregunta 4.
5. Simular +7 días → desaparece el form, aparece el cierre. La lista
   sigue.

## Fuera de alcance

- Resumen IA del día 7 — sesión **1.8** candidata.
- Editar entrada pasada desde la lista — sesión separada.
- "Empezar otro journey" tras completar — no v1.
- Mostrar la pregunta histórica junto al texto en el listado.

## Principios

- **YAGNI:** sin `date-fns` ni `dayjs`. Aritmética sobre `getTime()`
  cubre todo.
- **KISS:** el journey es un endpoint apoyado en `readEntry`. No añade
  estado nuevo al módulo `markdown.js`.
- **Coherencia filosófica:** la app no recuerda, no engancha. Si
  vuelves, te recibe en el día que toca. Si no, no pasa nada.
