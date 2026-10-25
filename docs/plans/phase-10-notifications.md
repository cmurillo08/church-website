# Phase 10 — Notificaciones: recordatorios de promesas pendientes por WhatsApp

## Context
Las promesas se pagan después (efectivo o SINPE). Hoy, para recordarle a alguien, el admin exporta el CSV y escribe a mano. Queremos una pestaña **Notificaciones** en `/admin` que liste las promesas pendientes (nombre, teléfono, monto/detalle) y, por cada una, un enlace a WhatsApp que abra el chat de esa persona con un mensaje ya escrito desde una plantilla editable. Resuelve el `deferred-whatsapp-reminders.md` con la opción "enlace `wa.me` que el admin toca" (sin WhatsApp Business API, sin costos).

Decisiones ya tomadas con el usuario:
- Se **guarda en la base de datos** a quién ya se le abrió el recordatorio (fecha), para no repetir y ver quién falta.
- La plantilla del mensaje se **edita en Configuración**.

## Alcance

### Incluido
1. **Pestaña "Notificaciones"** (`/admin/notificaciones`), entre Reportes y Configuración en `AdminNav`.
2. **Botón "Generar listado"** → carga las donaciones `pending`, más antiguas primero. Después el botón dice "Actualizar".
   - Filtros: **Artículo** (todos / uno) y **Mostrar**: "Todas" (default) / "Sin recordar" / "Ya recordadas".
   - Cada fila: nombre, teléfono (`formatPhone`), detalle (`2 × Saco de cemento, 3 × Block`), total (`formatCRC`), fecha del último recordatorio si existe ("Recordada el 24 oct").
   - Móvil: tarjetas; `lg`: tabla (mismo patrón que `components/admin/EntityTable.js`). Botón con `min-h-11`.
   - Contador arriba: "N promesas pendientes · ₡X en total".
3. **Botón "Enviar por WhatsApp"** por fila: `<a target="_blank" rel="noopener noreferrer" href="https://wa.me/506{telefono}?text={mensaje codificado}">`. `wa.me` abre WhatsApp Web en computadora y la app en el teléfono. Al tocarlo se llama (sin esperar) a `POST /api/admin/donations/[id]/reminder` que guarda `reminded_at = now()`; la fila pasa a "Recordada" sin recargar. Se puede volver a enviar (actualiza la fecha).
4. **Plantilla editable** en Configuración (nuevo campo "Mensaje de recordatorio", textarea) con ayuda que lista los marcadores y una **vista previa** con datos de ejemplo.
   - Marcadores: `{nombre}` (nombre del donante), `{monto}` (total, ej. `₡24.000`), `{detalle}` (ej. `2 × Saco de cemento, 3 × Block`).
   - Texto por defecto (identifica a la iglesia): *"Bendiciones, {nombre}. Te escribimos de parte de la Iglesia Dios es Fiel. Queríamos recordarte que tienes pendiente el aporte de tu promesa para la construcción de nuestro templo: {detalle}, por un total de {monto}. ¡Dios te bendiga!"*
   - Marcador desconocido (`{otro}`) se deja tal cual; plantilla vacía → se usa el texto por defecto.
5. Textos de UI en español simple; código/DB/docs en inglés.

### No incluido
- Envío automático / WhatsApp Business API; recordatorios por SMS o correo.
- Historial de varios recordatorios (solo el último), ni contador de envíos.
- Editar la plantilla desde la pestaña Notificaciones.

## Implementación

### 1. Migración `migrations/20261025_add_donations_reminded_at.sql`
```sql
ALTER TABLE donations ADD COLUMN reminded_at TIMESTAMPTZ;
INSERT INTO site_settings (key, value) VALUES ('reminder_message', '<texto por defecto>')
ON CONFLICT (key) DO NOTHING;
```
Aplicar con `npm run migrate` (local y luego Neon antes de desplegar).

### 2. `lib/reminders.js` (nuevo, puro; usable en cliente y servidor)
- `DEFAULT_REMINDER_MESSAGE`, `REMINDER_PLACEHOLDERS`.
- `formatLines(lines)` → `"2 × Saco de cemento, 3 × Block"`.
- `renderReminder(template, { name, totalCrc, lines })` → reemplaza `{nombre}`, `{monto}` (con `formatCRC` de `lib/format.js`), `{detalle}`.
- `whatsappUrl(phone, text)` → `https://wa.me/506${phone}?text=${encodeURIComponent(text)}`.

### 3. `lib/donations.js`
- Añadir `reminder_message` a `SETTING_KEYS` (así `getSettings`/`updateSettings` y su validación de largo ya lo cubren). **Importante:** `getPublicSnapshot()` hoy devuelve *todos* los settings al público → filtrarlo a las claves públicas (`welcome_message`, `payment_instructions`, `sinpe_number`) para que la plantilla no salga en `/api/public/items`.
- `reminded_at` en `DONATION_WITH_LINES_SQL` (lo reutilizan lista y export; el CSV no cambia porque arma sus columnas aparte).
- `listPendingForReminders({ itemId, reminded })`: reusa `buildDonationFilters({ status: 'pending', itemId })` + `DONATION_WITH_LINES_SQL`, filtro `reminded_at IS [NOT] NULL` según `reminded`, orden `created_at ASC, id ASC`, sin paginación (tope de seguridad, p. ej. 500). Devuelve `{ rows, template }` (la plantilla viene de `getSettings()`).
- `markDonationReminded(id)`: `UPDATE donations SET reminded_at = now() WHERE id = $1 AND status = 'pending' RETURNING id, reminded_at`; mismo manejo de 404/409 que `setDonationStatus`.

### 4. API (patrón de `app/api/admin/donations/route.js`, protegida por `middleware.js`)
- `GET /api/admin/reminders?itemId=&reminded=all|no|yes` → `listPendingForReminders`.
- `POST /api/admin/donations/[id]/reminder` → `markDonationReminded`.
- `PUT /api/admin/settings` ya sirve para la plantilla (nueva clave).

### 5. UI
- `components/admin/AdminNav.js`: link `{ href: '/admin/notificaciones', label: 'Notificaciones' }`.
- `app/admin/(dashboard)/notificaciones/page.js` (client, estilo de `reportes/page.js`): filtros, botón "Generar listado", contador, lista. `adminFetch`, `inputClass`/`primaryButton` de `components/admin/buttons.js`. Seguir `.claude/skills/responsive-tailwind-design` y probar a ~390px.
- `app/admin/(dashboard)/configuracion/page.js`: nuevo campo en `FIELDS` (`reminder_message`, multilínea) + texto de ayuda con los marcadores + vista previa con `renderReminder` y datos de ejemplo.
- Estado vacío: "No hay promesas pendientes." Errores en español.

### 6. Docs
- Nuevo `docs/plans/phase-10-notifications.md` (este plan, formato de los otros phase docs, con "Done when").
- `docs/plans/README.md`: fila Fase 10; la fila de `deferred-whatsapp-reminders.md` pasa a "implementado manualmente en Fase 10" (la automatización con API sigue diferida).
- `.env.example`: sin cambios (no hay variables nuevas).

## Archivos críticos
`lib/donations.js`, `lib/reminders.js` (nuevo), `lib/format.js` (reuso), `app/api/admin/reminders/route.js` (nuevo), `app/api/admin/donations/[id]/reminder/route.js` (nuevo), `app/admin/(dashboard)/notificaciones/page.js` (nuevo), `app/admin/(dashboard)/configuracion/page.js`, `components/admin/AdminNav.js`, `migrations/20261025_*.sql`.

## Done when / Verificación
- `npm run migrate` aplica sin error; `npm run seed` da datos para probar (varias promesas pendientes, una recibida y una cancelada que **no** deben salir).
- `npm run lint` pasa.
- En `/admin/notificaciones`: "Generar listado" muestra solo pendientes con nombre, teléfono, detalle y total correctos; filtro por artículo y por "Sin recordar" funciona.
- El enlace abre `https://wa.me/506XXXXXXXX?text=…` con el mensaje renderizado (tildes, `₡`, saltos de línea bien codificados); al tocarlo la fila queda "Recordada" y persiste tras "Actualizar".
- Cambiar la plantilla en Configuración cambia el mensaje y la vista previa; plantilla vacía usa el texto por defecto; `{otro}` no rompe nada.
- `GET /api/public/items` **no** incluye `reminder_message`.
- Marcar una promesa recibida/cancelada como recordada responde 409; sin sesión, 401.
- Se ve bien a ~390px (tarjetas) y en desktop (tabla). Respetar la regla del `.next` compartido (no levantar un segundo dev server si el del usuario corre en :3000).
