# CLAUDE.md — Contexto del proyecto para Claude

> Este archivo lo lee Claude Code automáticamente al abrir el proyecto. Si eres humano y quieres entender Brújula, mira [`README.md`](./README.md). Si vienes como asistente IA, lee esto primero.

---

## Qué es Brújula · 7 días

App **local-first** que acompaña a una persona durante 7 días en una transición profesional o vital (despido, vuelta tras baja, decisión grande, cambio de carrera, momento de duda).

- 1 pregunta al día, 7 días.
- Resumen IA al séptimo día: **patrones, no consejos**.
- Todo en archivos `.md` locales que pertenecen al usuario para siempre.

Es un mini-producto autocontenido, pensado como **semilla de "Brújula" completa** (ciclos más largos, packs especializados, versión cloud) si la v1 tiene tracción.

## Filosofía técnica (no negociable)

- **Local-first**: nada se envía a la nube por defecto. Sin login, sin analytics, sin telemetría.
- **Markdown como base de datos**: los archivos `.md` SON el producto. Sobreviven a la app, se abren en cualquier editor, son Obsidian-compatible.
- **IA con criterio**: Ollama local (`llama3.2:3b`) por defecto. Claude opcional con la API key del propio usuario.
- **Minimalismo deliberado**: sin React, sin bundlers, sin Docker. Un fork del repo debe entenderse **sin `npm install`**.
- **No es terapia ni coaching**: es un espejo estructurado. Disclaimer claro en producto.
- **Sin gamificación, sin notificaciones, sin enganche**: el usuario vuelve porque le sirve, no porque le recuerda.

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 22+ (LTS) |
| Backend | Express |
| Frontend | HTML + Vanilla JS + Alpine.js |
| Storage | Archivos `.md` planos (`gray-matter` para frontmatter) |
| IA local | Ollama + modelo `llama3.2:3b` |
| IA cloud (opcional) | `@anthropic-ai/sdk` (Claude Haiku 4.5) |
| Tests | `node --test` nativo (Node 22+) |

**No usamos** (deliberadamente): React, Vue, Tailwind, MongoDB, build tools, Docker, dotenv (Node 22 ya trae `--env-file`).

## Estructura del repo (irá creciendo)

```
brujula-7-dias/
├── server/         ← Express + lógica de negocio
│   ├── index.js
│   ├── routes/
│   ├── lib/
│   └── prompts/    ← prompts versionados en markdown
├── web/            ← HTML estático + Alpine.js + CSS
├── data/           ← gitignored — reflexiones del usuario
├── tests/
└── CLAUDE.md       ← este archivo
```

## Setup en máquina nueva

Para clonar y ponerse a trabajar (sobre todo al saltar de Windows a Mac o viceversa):

1. **Pre-requisitos**: Node 22+ (LTS). Comprobar con `node -v`.
2. **Clonar**: `git clone https://github.com/VeroMoreno/brujula-7-dias.git && cd brujula-7-dias`.
3. **Identidad git LOCAL** (no `--global`) — paso obligatorio:
   ```sh
   git config user.email "veronica.moreno.work@gmail.com"
   git config user.name  "Veronica Moreno TVP"
   ```
   La misma máquina se usa para repos personales y de empresa. El `user.email` global suele apuntar al de empresa; en este repo personal hay que usar el personal para no mezclar identidades en el historial. Todos los commits previos están bajo el personal.
4. **Mac sólo**: `git config --global core.autocrlf input` (una vez por máquina, no por repo).
5. **Deps**: `npm install`.
6. **Correr**: `npm start` → http://localhost:3000.
7. **Tests**: `node --test`.
8. **Simular fechas** (útil para Ollama en 1.x+): `BRUJULA_TODAY=2026-06-04 npm start` salta la cuenta de días al 4 de junio.

## Cómo se construye

El proyecto se trabaja en **mini-sesiones de ~30 min**, ~5h/semana variables, plan de **5 semanas**. Cada mini-sesión deja el repo en estado coherente y termina con un commit.

### Convenciones

- **Lenguaje**: código, nombres y commits en inglés; copys de UI en español.
- **Commits**: formato `tipo: descripción corta` (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- **Branch principal**: `main`. Sin GitFlow ni ramas de feature por ahora — desarrollo trunk-based, mini-sesiones tan cortas que no lo necesitan.
- **Gestión git**: GitHub Desktop (autenticación ya configurada en Windows). Para el setup inicial en una máquina nueva, ver la sección **Setup** arriba.
- **Estilo**: 2 espacios de indentación (decidido en sesión 1.2). ES Modules (`type: module`).
- **Tests**: pequeños y rápidos, con `node --test`. Sesiones cortas → tests que corren en <1s.

### Progreso

- ✅ **1.1 Bootstrap** — `.gitignore`, `README.md`, `LICENSE`, repo publicado en GitHub.
- ✅ **1.2 Express "hola mundo"** — `package.json` (ESM, Express 5), `server/index.js` sirviendo `/web` estático, puerto vía `PORT` (default 3000), `web/index.html`.
- ✅ **1.3** — Módulo `markdown.js` (`writeEntry`, `readEntry`, `listEntries`; tests en `tests/markdown.test.js`).
- ✅ **1.4** — Endpoint `POST /api/entries`. App factory `createApp({ dataDir })` en `server/app.js`, router en `server/routes/entries.js`, tests de integración con `node --test` + `fetch` (puerto efímero, `dataDir` temporal).
- ✅ **1.5** — Endpoint `GET /api/entries`. Array directo, ordenado por día asc, `[]` cuando no hay entries. Mismo router/factory; tests con `beforeEach` que limpia el `dataDir` para aislar los casos.
- ✅ **1.6** — Render mínimo en frontend. `web/index.html` + `web/styles.css` con Alpine.js (CDN, sin build). Form para crear/sobrescribir entradas + listado en una sola columna; aviso de sobrescritura cuando el día ya tiene entrada. Copys en español. Sin tests automáticos del frontend — la UI es delgada sobre endpoints ya testeados.
- ✅ **1.7a** — Arquitectura i18n + UI bilingüe (es/en). Helper casero en `server/lib/i18n.js` (sin librerías externas), endpoint `GET /api/messages?locale=X`, archivos `messages/es.json` y `messages/en.json`, selector visible en el header, persistencia en `localStorage` y detección via `Accept-Language` / `navigator.language`.
- ✅ **1.7b** — Catálogo bilingüe de 7 preguntas guiadas (`server/prompts/questions.{es,en}.md`, parser propio en `server/lib/questions.js`, endpoint `GET /api/questions/:day?locale=X`).
- ✅ **1.7c** — Día por calendario + pregunta como display. El día actual se calcula desde el `created` de `data/day-1.md` (sin selector, sin elegir). La pregunta es título display, no input. Estado de fin cuando elapsed ≥ 7 días. Variable `BRUJULA_TODAY=YYYY-MM-DD` para simular fechas en dev. Nuevo módulo `server/lib/journey.js` + endpoint `GET /api/journey`.
- ✅ **1.8a** — Borrar entradas. Helper `deleteEntry(dataDir, day)` en `markdown.js`, endpoint `DELETE /api/entries/:day` (204 ok, 404 si no existe, 400 si `day` inválido), botón "Borrar" por entrada con `confirm()`, nuevas claves i18n `entry.delete` / `entry.deleteConfirm` / `errors.delete`. Tras borrar se recarga `journey` (clave: borrar el día 1 reinicia la cuenta).
- ✅ **1.8b** — Editar entradas desde la lista. Botón "Editar" por entrada que carga `content` y `question` en el formulario de arriba, etiqueta "Editando el día N", par "Guardar cambios" / "Cancelar edición". Reusa el `POST` que sobrescribe (writeEntry preserva `created`). El formulario aparece también con la jornada completa (y oculta el cartel de "terminado" mientras editas), con fundido suave al abrir. Nuevas claves i18n `entry.edit` / `form.update` / `form.cancelEdit` / `journey.editingLabel`. Helper `start.cmd` (Windows) para arrancar la app con doble clic. **Pulido de movimiento sutil** (transiciones calmadas, sin rebotes): se va haciendo donde arregla saltos molestos, no se deja todo "para el final"; lo gamificado queda descartado por tono.
- ✅ **IA-1** — Wrapper Ollama + prompt. `server/lib/ai.js`: `generateSummary(entries, {promptsDir, locale, model, baseUrl, fetchFn})` sobre `buildSummaryPrompt()` (pura) y `loadSummaryTemplate()` (cacheada). La llamada a Ollama (`POST localhost:11434/api/generate`, `stream:false`) va tras un `fetchFn` inyectable → unit-testeada sin modelo vivo. Prompt versionado en `server/prompts/summary.{es,en}.md` con placeholder `{{entries}}` — espejo, patrones no consejos. Tests en `tests/ai.lib.test.js`.
- ✅ **IA-2** — Persistencia del resumen. `readSummary` / `writeSummary` en `markdown.js`, singleton `data/summary.md` con frontmatter (`version`, `created`, `updated`, `model`, `locale`). Regenerar sobrescribe preservando `created` (como `writeEntry`). Tests round-trip + "no existe" + empty en `tests/summary.lib.test.js`.
- ⏭️ **IA-3** — Endpoints `POST /api/summary` (lee las 7 entradas → wrapper → persiste → devuelve) y `GET /api/summary` (404 si no hay). Guard si la jornada no está completa. Tests de integración mockeando el provider.
- ⏭️ **IA-4** — UI del día 7. Botón "Generar resumen" en `journey-complete` → loading → render → "Regenerar" + manejo de error (Ollama no disponible). Claves i18n es/en. Frontend delgado, sin tests.
- ⏭️ **IA-5** (post-v1) — Backend Claude opcional con API key del usuario.

**Decisiones de la fase IA** (sesión 2026-06-10): (1) el resumen se guarda como `.md` propiedad del usuario (local-first); (2) v1 es **solo Ollama**, pero detrás de una interfaz `generateSummary()` para que Claude entre luego sin refactor; (3) generación con **botón explícito** ("Generar resumen"), no automática — acto deliberado acorde al producto, además de evitar latencia sorpresa del modelo local.

- (Plan completo de 5 semanas detallado en el plan original, se irá actualizando aquí.)

🚦 **Checkpoint formal: fin de semana 3.** Decidir seguir / pausar / pivotar **sin culpa**.

---

## Para Claude (asistente IA) — instrucciones de continuidad

Cuando retomes este proyecto en cualquier máquina:

1. **Lee este `CLAUDE.md`** para entender contexto, stack, decisiones y progreso.
2. **Lee `README.md`** para la cara del producto.
3. **Revisa `git log --oneline -20`** para ver qué se ha hecho recientemente.
4. **Pregunta a Vero en qué mini-sesión está** (o cuál quiere atacar) y avanza desde ahí.
5. **No sugieras tecnologías que están en la lista "no usamos"** salvo que Vero plantee explícitamente revisar la decisión.
6. **Respeta el ritmo**: tareas en bloques de 20-30 min, tests rápidos, commits frecuentes, cero deuda mental entre sesiones.
7. **Tono**: directo, sin paternalismo, sin venta. Vero es senior (10+ años front-end, marca "Veritechie" sobre salud mental en tech). Tratar como peer técnico.

La **información personal** de Vero (restricciones de tiempo, contexto vital, preferencias de colaboración) vive en su memoria local de Claude por máquina, no en este repo. Si esa memoria está vacía (primera vez en una máquina nueva), Vero te dará una recapitulación rápida.

## Licencia

MIT. Ver [`LICENSE`](./LICENSE).
