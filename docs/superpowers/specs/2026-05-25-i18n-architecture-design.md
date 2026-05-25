# Diseño — Arquitectura i18n + UI bilingüe (sesión 1.7a)

> Internacionalización casera, sin librerías. Acordado con Vero el 2026-05-25.

## Propósito

Soportar la app en **es** y **en** desde el inicio, con detección
automática, override manual persistente, y arquitectura preparada para
añadir más idiomas sin reescritura.

## Decisiones

- **Idiomas soportados:** lista cerrada en `SUPPORTED_LOCALES = ['es', 'en']`
  (`server/lib/i18n.js`). `DEFAULT_LOCALE = 'es'`. Añadir un tercero =
  un string en el array + un archivo JSON.
- **Sin librerías** (`i18next`, `FormatJS`, etc.). El helper casero
  ronda las 30 líneas y respeta la línea "minimalismo deliberado" del
  CLAUDE.md.
- **Almacén:** `messages/es.json` y `messages/en.json` en la raíz.
  Claves anidadas accedidas por dot-notation desde el cliente
  (`t('form.submit')`).
- **Cache de mensajes** en memoria (Map global) por `(messagesDir, locale)`.
  Función `clearMessagesCache()` exportada solo para tests.
- **Negociación:** `resolveLocale(header, override)` — override
  soportado primero, luego primera lengua de `Accept-Language` (corta
  el subtag regional), luego `DEFAULT_LOCALE`.
- **Interpolación en el cliente:** `t(key, params)` reemplaza `{name}`
  por `params.name` (~3 líneas). Cubre la única clave que la necesita
  (`form.overwrite`).

## Contrato HTTP

- **Ruta:** `GET /api/messages?locale=X`
- **Resolución:** `?locale` > `Accept-Language` > `es`. Un locale no
  soportado se **ignora silenciosamente**, no es un 400 — degrada al
  default sin ruido.
- **200 OK:** `{ locale, messages }`.
- **500:** si el archivo del locale no existe (no debería ocurrir con
  locales soportados y el repo en estado coherente).

## Cambios en la app

- `server/lib/i18n.js` — `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`,
  `isSupportedLocale`, `resolveLocale`, `loadMessages`,
  `clearMessagesCache`.
- `server/routes/messages.js` — factory `createMessagesRouter(messagesDir)`,
  patrón idéntico a `createEntriesRouter`.
- `server/app.js` — `createApp({ dataDir, messagesDir })`; si
  `messagesDir` viene, monta `createMessagesRouter`. Lo hace opcional
  para no romper los tests del POST/GET de entries.
- `server/index.js` — pasa `messagesDir = join(__dirname, '..', 'messages')`.
- `web/index.html`:
  - Estado Alpine: `locale`, `messages`, `init()` que resuelve locale
    desde `localStorage` o `navigator.language` y precarga los mensajes
    antes de la primera llamada a `/api/entries`.
  - Función `t(key, params)` con dot-notation + interpolación mínima.
  - Selector visible (`ES · EN`) en el header. Cambio escribe en
    `localStorage` bajo `brujula-locale` y refetcha los mensajes.
  - Todos los copys visibles que dependen del idioma pasan a `x-text`
    / `:placeholder` apuntando a una clave. El nombre del producto
    (`<title>` y `<h1>`) queda hardcodeado — es marca, no se traduce.
- `web/styles.css` — estilos sobrios del selector (sin botones macizos,
  texto en `--muted` con `--fg` para el activo).

## Testing

- `tests/i18n.lib.test.js`:
  - `resolveLocale`: override > header > default, override no soportado
    se ignora, parse de `Accept-Language` con coma y `q=`, corte de
    subtag regional, default cuando todo falla.
  - `loadMessages`: carga ES y EN desde dir temporal, rechaza locale
    no soportado.
  - Aserción de la lista canónica `SUPPORTED_LOCALES`.
- `tests/messages.api.test.js`:
  - Default ES sin nada, override `?locale=en`, header
    `accept-language: en-US`, override `?locale=jp` (ignorado, vuelve
    a ES).

## Fuera de alcance

- Negociación por subdominio o por ruta (`/en/`, `/es/`).
- Pluralización (`Intl.PluralRules` lo cubriría sin lib en el futuro
  si hiciera falta).
- Catálogo de preguntas guiadas → sesión **1.7b**.

## Principios

- **KISS / YAGNI**: 2 idiomas, sin pluralización, sin formato de
  fechas localizado por ahora (el `date` viene en `YYYY-MM-DD` del
  módulo markdown y se muestra tal cual).
- **Local-first**: cero requests externos, ningún servicio de
  traducción en runtime, todos los `.json` viajan con el repo.
- **Trazabilidad**: igual que `entries.js` reusa el patrón de
  factory, `messages.js` lo replica para que el lector entienda
  el repo leyendo una sola pieza.
