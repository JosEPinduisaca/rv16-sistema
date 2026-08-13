-- =====================================================================
-- MIGRACIÓN: bloqueo de cuenta por intentos fallidos + recuperación
-- de contraseña por correo.
-- =====================================================================

ALTER TABLE usuarios ADD COLUMN intentos_fallidos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN bloqueado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN reset_token VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN reset_token_expira TIMESTAMP;
