// WhatsApp reminder messages for pending pledges. Pure helpers shared by the
// admin pages (client) and the server. The template is edited in Configuración
// and uses these placeholders (Spanish, since admins write them):
//   {nombre} donor name · {monto} total in colones · {detalle} items pledged
import { formatCRC, formatNumber } from './format.js';

export const DEFAULT_REMINDER_MESSAGE =
  'Bendiciones, {nombre}. Te escribimos de parte de la Iglesia Dios es Fiel. Queríamos recordarte que tienes pendiente el aporte de tu promesa para la construcción de nuestro templo: {detalle}, por un total de {monto}. ¡Dios te bendiga!';

export const REMINDER_PLACEHOLDERS = [
  { token: '{nombre}', help: 'nombre de la persona' },
  { token: '{detalle}', help: 'lo que prometió, ej. 2 × Saco de cemento, 3 × Block' },
  { token: '{monto}', help: 'total en colones, ej. ₡24.000' },
];

// [{ quantity: 2, item_name: 'Block' }, …] → "2 × Block, …"
export function formatLines(lines) {
  return (lines || []).map((line) => `${formatNumber(line.quantity)} × ${line.item_name}`).join(', ');
}

// Unknown placeholders are left as typed; an empty template uses the default.
export function renderReminder(template, { name, totalCrc, lines }) {
  const text = typeof template === 'string' && template.trim() ? template : DEFAULT_REMINDER_MESSAGE;
  const values = {
    '{nombre}': name,
    '{monto}': formatCRC(totalCrc),
    '{detalle}': formatLines(lines),
  };
  return text.replace(/\{(nombre|monto|detalle)\}/g, (token) => values[token]);
}

// Click-to-chat link: opens WhatsApp Web on a computer, the app on a phone.
// `phone` is the 8-digit Costa Rica number.
export function whatsappUrl(phone, text) {
  return `https://wa.me/506${phone}?text=${encodeURIComponent(text)}`;
}
