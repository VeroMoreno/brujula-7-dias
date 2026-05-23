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

## Cómo se construye

El proyecto se trabaja en **mini-sesiones de ~30 min**, ~5h/semana variables, plan de **5 semanas**. Cada mini-sesión deja el repo en estado coherente y termina con un commit.

### Convenciones

- **Lenguaje**: código, nombres y commits en inglés; copys de UI en español.
- **Commits**: formato `tipo: descripción corta` (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- **Branch principal**: `main`. Sin GitFlow ni ramas de feature por ahora — desarrollo trunk-based, mini-sesiones tan cortas que no lo necesitan.
- **Gestión git**: GitHub Desktop (autenticación ya configurada en Windows). En Mac, configurar `git config --global core.autocrlf input`.
- **Estilo**: 2 espacios de indentación (decidido en sesión 1.2). ES Modules (`type: module`).
- **Tests**: pequeños y rápidos, con `node --test`. Sesiones cortas → tests que corren en <1s.

### Progreso

- ✅ **1.1 Bootstrap** — `.gitignore`, `README.md`, `LICENSE`, repo publicado en GitHub.
- ✅ **1.2 Express "hola mundo"** — `package.json` (ESM, Express 5), `server/index.js` sirviendo `/web` estático, puerto vía `PORT` (default 3000), `web/index.html`.
- ✅ **1.3** — Módulo `markdown.js` (`writeEntry`, `readEntry`, `listEntries`; tests en `tests/markdown.test.js`).
- ⏭️ **1.4** — Endpoint `POST /api/entries`.
- 1.5 — Endpoint `GET /api/entries`.
- 1.6 — Tests del módulo markdown.
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
