-- Donor says whether they are a current church member ("Soy miembro de la
-- iglesia" checkbox on the public page). Anyone may donate; this lets the
-- admin tell members and non-members apart. Existing rows default to false.
ALTER TABLE donations ADD COLUMN is_member BOOLEAN NOT NULL DEFAULT false;
