-- Migración: Inclusión obligatoria de campo 'genero' en Producto_BiciNueva para Supabase PostgreSQL
-- Valores permitidos: 'hombre', 'mujer', 'unisex'

-- 1. Agregar la columna permitiendo temporalmente NULL para no fallar si hay registros
ALTER TABLE Producto_BiciNueva 
ADD COLUMN IF NOT EXISTS genero VARCHAR(20);

-- 2. Asignar 'unisex' a los registros existentes para permitir la restricción NOT NULL
UPDATE Producto_BiciNueva 
SET genero = 'unisex' 
WHERE genero IS NULL;

-- 3. Establecer la columna como NOT NULL
ALTER TABLE Producto_BiciNueva 
ALTER COLUMN genero SET NOT NULL;

-- 4. Agregar constraint CHECK para asegurar valores válidos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_bicinueva_genero'
    ) THEN
        ALTER TABLE Producto_BiciNueva
        ADD CONSTRAINT chk_bicinueva_genero 
        CHECK (LOWER(genero) IN ('hombre', 'mujer', 'unisex'));
    END IF;
END $$;
