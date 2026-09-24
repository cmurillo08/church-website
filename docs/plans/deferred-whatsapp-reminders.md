# Deferred: WhatsApp reminders

## Idea
Send a generic reminder message via WhatsApp to everyone with a pending pledge (optionally filtered by item), instead of contacting people manually from the CSV export (Phase 5).

## Why deferred
The manual CSV flow covers the need for now. WhatsApp automation brings real costs and constraints to settle first: WhatsApp Business API account and approved message templates, per-message pricing, opt-in/consent for the donors' numbers, and rate limits.

## To decide when revisited
- Official WhatsApp Business API (via a provider) vs. a simpler "click to chat" `wa.me` link per person that the admin taps to send
- Editable reminder text in `site_settings`
- Whether to record when a reminder was sent (needs a column/table)
