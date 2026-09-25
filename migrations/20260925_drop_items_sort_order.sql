-- Phase 7 (M4): items are listed by creation date (oldest first), so the
-- manual list order is no longer used.
ALTER TABLE items DROP COLUMN sort_order;
