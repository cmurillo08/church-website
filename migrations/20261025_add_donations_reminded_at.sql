-- Phase 10: WhatsApp reminders for pending pledges.
-- reminded_at = last time the admin opened a reminder for the donation.
ALTER TABLE donations ADD COLUMN reminded_at TIMESTAMPTZ;

INSERT INTO site_settings (key, value) VALUES
  ('reminder_message', 'Bendiciones, {nombre}. Te escribimos de parte de la Iglesia Dios es Fiel. Queríamos recordarte que tienes pendiente el aporte de tu promesa para la construcción de nuestro templo: {detalle}, por un total de {monto}. ¡Dios te bendiga!')
ON CONFLICT (key) DO NOTHING;
