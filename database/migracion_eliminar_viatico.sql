-- =====================================================================
-- MIGRACIÓN: eliminar el viático de tarifas (no se usa/necesita).
-- El pago de una designación pasa a ser simplemente el monto de su tarifa.
-- =====================================================================

ALTER TABLE tarifas DROP COLUMN viatico;
