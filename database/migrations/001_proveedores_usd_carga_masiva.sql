-- Migración idempotente: Proveedores en Productos, Precios USD/ARS y Configuración del Sistema

CREATE TABLE IF NOT EXISTS Configuracion_Sistema (
    clave VARCHAR(50) PRIMARY KEY,
    valor VARCHAR(100) NOT NULL,
    updated_by INT NULL REFERENCES Usuario(id_usuario) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Configuracion_Sistema (clave, valor)
VALUES ('cotizacion_dolar', '1.00')
ON CONFLICT (clave) DO NOTHING;

ALTER TABLE Proveedor
    ADD COLUMN IF NOT EXISTS cotizacion_dolar DECIMAL(10, 2) NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_prov_cotizacion') THEN
        ALTER TABLE Proveedor ADD CONSTRAINT chk_prov_cotizacion CHECK (cotizacion_dolar IS NULL OR cotizacion_dolar > 0);
    END IF;
END $$;

ALTER TABLE Productos
    ADD COLUMN IF NOT EXISTS id_proveedor INT NULL REFERENCES Proveedor(id_proveedor) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'ARS',
    ADD COLUMN IF NOT EXISTS precio_usd DECIMAL(10, 2) NULL,
    ADD COLUMN IF NOT EXISTS costo_usd DECIMAL(10, 2) NULL,
    ADD COLUMN IF NOT EXISTS porcentaje_ganancia DECIMAL(8, 4) NULL,
    ADD COLUMN IF NOT EXISTS porcentaje_reventa DECIMAL(8, 4) NULL,
    ADD COLUMN IF NOT EXISTS precio_reventa DECIMAL(10, 2) NULL,
    ADD COLUMN IF NOT EXISTS precio_reventa_usd DECIMAL(10, 2) NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_prod_moneda') THEN
        ALTER TABLE Productos ADD CONSTRAINT chk_prod_moneda CHECK (moneda IN ('ARS', 'USD'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_prod_precio_usd') THEN
        ALTER TABLE Productos ADD CONSTRAINT chk_prod_precio_usd CHECK (precio_usd IS NULL OR precio_usd >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_prod_costo_usd') THEN
        ALTER TABLE Productos ADD CONSTRAINT chk_prod_costo_usd CHECK (costo_usd IS NULL OR costo_usd >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_prod_ganancia') THEN
        ALTER TABLE Productos ADD CONSTRAINT chk_prod_ganancia CHECK (porcentaje_ganancia IS NULL OR porcentaje_ganancia >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_prod_porc_reventa') THEN
        ALTER TABLE Productos ADD CONSTRAINT chk_prod_porc_reventa CHECK (porcentaje_reventa IS NULL OR porcentaje_reventa >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_prod_precio_reventa') THEN
        ALTER TABLE Productos ADD CONSTRAINT chk_prod_precio_reventa CHECK (precio_reventa IS NULL OR precio_reventa >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_prod_precio_reventa_usd') THEN
        ALTER TABLE Productos ADD CONSTRAINT chk_prod_precio_reventa_usd CHECK (precio_reventa_usd IS NULL OR precio_reventa_usd >= 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_productos_id_proveedor ON Productos(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON Productos(LOWER(codigo));

ALTER TABLE Pago_Proveedor
    ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'ARS',
    ADD COLUMN IF NOT EXISTS monto_usd DECIMAL(10, 2) NULL,
    ADD COLUMN IF NOT EXISTS cotizacion_dolar DECIMAL(10, 2) NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pago_moneda') THEN
        ALTER TABLE Pago_Proveedor ADD CONSTRAINT chk_pago_moneda CHECK (moneda IN ('ARS', 'USD'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pago_monto_usd') THEN
        ALTER TABLE Pago_Proveedor ADD CONSTRAINT chk_pago_monto_usd CHECK (monto_usd IS NULL OR monto_usd >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pago_cotizacion') THEN
        ALTER TABLE Pago_Proveedor ADD CONSTRAINT chk_pago_cotizacion CHECK (cotizacion_dolar IS NULL OR cotizacion_dolar > 0);
    END IF;
    ALTER TABLE Producto_BiciNueva DROP CONSTRAINT IF EXISTS chk_bicinueva_genero;
    ALTER TABLE Producto_BiciNueva ADD CONSTRAINT chk_bicinueva_genero CHECK (LOWER(genero) IN ('hombre', 'mujer', 'unisex', 'niño/a'));
END $$;

CREATE TABLE IF NOT EXISTS Pago_Proveedor_Pendiente (
    id_pendiente INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_proveedor INT NOT NULL REFERENCES Proveedor(id_proveedor) ON DELETE RESTRICT,
    id_usuario INT NOT NULL REFERENCES Usuario(id_usuario) ON DELETE RESTRICT,
    id_pago_inicial INT NULL REFERENCES Pago_Proveedor(id_pago) ON DELETE SET NULL,
    numero_factura VARCHAR(60) NULL,
    fecha_factura VARCHAR(30) NULL,
    monto_factura_total DECIMAL(12, 2) NOT NULL CHECK (monto_factura_total > 0),
    monto_pagado DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (monto_pagado >= 0),
    saldo_pendiente DECIMAL(12, 2) NOT NULL CHECK (saldo_pendiente >= 0),
    moneda VARCHAR(3) NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS', 'USD')),
    fecha_proximo_pago DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PAGADO', 'CANCELADO')),
    observaciones TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pago_pend_fecha_estado ON Pago_Proveedor_Pendiente(estado, fecha_proximo_pago ASC);
