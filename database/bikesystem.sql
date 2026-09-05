-- Habilitar extensión oficial de PostgreSQL para búsqueda por similitud y subcadenas masivas
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- 1. TABLAS INDEPENDIENTES

CREATE TABLE Usuario (
    id_usuario INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE CONSTRAINT chk_usuario_nombre_min CHECK (length(trim(nombre_usuario)) >= 3),
    contrasena VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CONSTRAINT chk_usuario_rol CHECK (rol IN ('EMPLEADO', 'ADMIN', 'SUPERADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Cliente (
    id_cliente INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL CONSTRAINT chk_cliente_nombre_min CHECK (length(trim(nombre)) >= 2),
    apellido VARCHAR(100) NOT NULL CONSTRAINT chk_cliente_apellido_min CHECK (length(trim(apellido)) >= 2),
    dni VARCHAR(20) UNIQUE CONSTRAINT chk_cliente_dni_min CHECK (dni IS NULL OR length(trim(dni)) >= 6),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Proveedor (
    id_proveedor INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_empresa VARCHAR(100) NOT NULL CONSTRAINT chk_prov_nombre_min CHECK (length(trim(nombre_empresa)) >= 2),
    cuit VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Productos (
    id_producto INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL CONSTRAINT chk_prod_nombre_min CHECK (length(trim(nombre)) >= 2),
    marca VARCHAR(50),
    modelo VARCHAR(50) NULL,
    tipo_prod VARCHAR(50) NOT NULL CONSTRAINT chk_prod_tipo_valido CHECK (LOWER(tipo_prod) IN ('bicicleta', 'repuesto', 'accesorio')),
    cantidad INT DEFAULT 0 CONSTRAINT chk_productos_cantidad CHECK (cantidad >= 0),
    precio DECIMAL(10, 2) DEFAULT 0 CONSTRAINT chk_productos_precio CHECK (precio >= 0),
    stock_minimo INT DEFAULT 0 CONSTRAINT chk_productos_stock_minimo CHECK (stock_minimo >= 0),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Producto_BiciNueva (
    id_producto INT PRIMARY KEY,
    marca VARCHAR(50) NULL,
    color VARCHAR(30) NULL,
    rodado VARCHAR(20) NULL,
    talle VARCHAR(20) NULL,
    CONSTRAINT fk_bicinueva_prod FOREIGN KEY (id_producto) REFERENCES Productos(id_producto) ON DELETE CASCADE
);

CREATE TABLE Metodo_Pago (
    id_metodo_pago INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO Metodo_Pago (nombre) VALUES 
('Efectivo'), 
('Transferencia Bancaria'), 
('Cheque'), 
('Mercado Pago');

-- 2. TABLAS DEPENDIENTES

CREATE TABLE Bicicleta (
    id_bicicleta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente INT NOT NULL,
    marca VARCHAR(50) NOT NULL CONSTRAINT chk_bici_marca_min CHECK (length(trim(marca)) >= 1),
    modelo VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bici_cliente FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente) ON DELETE RESTRICT
);

-- 3. TABLAS TRANSACCIONALES (Cabeceras)

CREATE TABLE Venta (
    id_venta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_usuario INT NOT NULL,
    id_metodo_pago INT NOT NULL DEFAULT 1,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    costo_total DECIMAL(10, 2) NOT NULL DEFAULT 0 CONSTRAINT chk_venta_costo_total CHECK (costo_total >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADA' CONSTRAINT chk_venta_estado CHECK (estado IN ('COMPLETADA', 'ANULADA')),
    fecha_anulacion TIMESTAMPTZ NULL,
    motivo_anulacion TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente) ON DELETE RESTRICT,
    CONSTRAINT fk_venta_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT fk_venta_metodo FOREIGN KEY (id_metodo_pago) REFERENCES Metodo_Pago(id_metodo_pago) ON DELETE RESTRICT
);

CREATE TABLE Reparacion (
    id_reparacion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_bicicleta INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_egreso DATE,
    estado VARCHAR(50) NOT NULL CONSTRAINT chk_reparacion_estado_valido CHECK (estado IN ('Recibida', 'En Reparación', 'Lista', 'Entregada')),
    descripcion TEXT,
    costo_mano_obra DECIMAL(10, 2) DEFAULT 0 CONSTRAINT chk_reparacion_mano_obra CHECK (costo_mano_obra >= 0),
    costo_total DECIMAL(10, 2) DEFAULT 0 CONSTRAINT chk_reparacion_costo_total CHECK (costo_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rep_bicicleta FOREIGN KEY (id_bicicleta) REFERENCES Bicicleta(id_bicicleta) ON DELETE RESTRICT,
    CONSTRAINT fk_rep_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT
);

CREATE TABLE Pago_Proveedor (
    id_pago INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_proveedor INT NOT NULL,
    id_usuario INT NOT NULL,
    id_metodo_pago INT NOT NULL, 
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    monto_total DECIMAL(10, 2) NOT NULL CONSTRAINT chk_pago_monto_total CHECK (monto_total > 0),
    observaciones TEXT,	
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pago_prov FOREIGN KEY (id_proveedor) REFERENCES Proveedor(id_proveedor) ON DELETE RESTRICT,
    CONSTRAINT fk_pago_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT fk_pago_metodo FOREIGN KEY (id_metodo_pago) REFERENCES Metodo_Pago(id_metodo_pago) ON DELETE RESTRICT
);

-- 4. TABLAS TRANSACCIONALES (Detalles)

CREATE TABLE Detalle_Venta (
    id_detalle_venta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL CONSTRAINT chk_detventa_cantidad CHECK (cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL,
    costo_total DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_detventa_venta FOREIGN KEY (id_venta) REFERENCES Venta(id_venta) ON DELETE CASCADE,
    CONSTRAINT fk_detventa_prod FOREIGN KEY (id_producto) REFERENCES Productos(id_producto) ON DELETE RESTRICT
);

CREATE TABLE Detalle_Reparacion (
    id_detalle_rep INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reparacion INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL CONSTRAINT chk_detrep_cantidad CHECK (cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL,
    costo_total DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_detrep_rep FOREIGN KEY (id_reparacion) REFERENCES Reparacion(id_reparacion) ON DELETE CASCADE,
    CONSTRAINT fk_detrep_prod FOREIGN KEY (id_producto) REFERENCES Productos(id_producto) ON DELETE RESTRICT
);

CREATE TABLE Movimiento_Stock (
    id_movimiento INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_producto INT NOT NULL,
    id_usuario INT NOT NULL,
    tipo_movimiento VARCHAR(20) NOT NULL CONSTRAINT chk_mov_tipo CHECK (tipo_movimiento IN ('INGRESO', 'EGRESO')),
    cantidad INT NOT NULL CONSTRAINT chk_mov_cant CHECK (cantidad > 0),
    motivo VARCHAR(100) NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mov_prod FOREIGN KEY (id_producto) REFERENCES Productos(id_producto) ON DELETE RESTRICT,
    CONSTRAINT fk_mov_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT
);

CREATE TABLE Bitacora_Actividad (
    id_bitacora INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario INT NULL,
    nombre_usuario VARCHAR(50) NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bitacora_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE SET NULL
);

-- 5. FUNCIÓN TRIGGER DE AUDITORÍA 

CREATE OR REPLACE FUNCTION actualizar_timestamp_modificacion()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON Productos FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_modificacion();
CREATE TRIGGER trg_cliente_updated_at BEFORE UPDATE ON Cliente FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_modificacion();
CREATE TRIGGER trg_venta_updated_at BEFORE UPDATE ON Venta FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_modificacion();
CREATE TRIGGER trg_reparacion_updated_at BEFORE UPDATE ON Reparacion FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_modificacion();
CREATE TRIGGER trg_pago_updated_at BEFORE UPDATE ON Pago_Proveedor FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_modificacion();
CREATE TRIGGER trg_usuario_updated_at BEFORE UPDATE ON Usuario FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_modificacion();
CREATE TRIGGER trg_bici_updated_at BEFORE UPDATE ON Bicicleta FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_modificacion();
CREATE TRIGGER trg_prov_updated_at BEFORE UPDATE ON Proveedor FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_modificacion();

-- 6. ÍNDICES DE RENDIMIENTO (B-Tree)

-- Índices en Claves Foráneas (Acelera búsquedas relacionadas y JOINs)
CREATE INDEX idx_detalle_venta_id_venta ON Detalle_Venta(id_venta);
CREATE INDEX idx_detalle_venta_id_producto ON Detalle_Venta(id_producto);
CREATE INDEX idx_detalle_rep_id_reparacion ON Detalle_Reparacion(id_reparacion);
CREATE INDEX idx_detalle_rep_id_producto ON Detalle_Reparacion(id_producto);
CREATE INDEX idx_bicicleta_id_cliente ON Bicicleta(id_cliente);
CREATE INDEX idx_venta_id_cliente ON Venta(id_cliente);
CREATE INDEX idx_venta_id_usuario ON Venta(id_usuario);
CREATE INDEX idx_reparacion_id_bicicleta ON Reparacion(id_bicicleta);
CREATE INDEX idx_reparacion_id_usuario ON Reparacion(id_usuario);
CREATE INDEX idx_pago_prov_id_proveedor ON Pago_Proveedor(id_proveedor);
CREATE INDEX idx_pago_prov_id_metodo ON Pago_Proveedor(id_metodo_pago);

-- Índices en Fechas y Estados (Acelera generación de Dashboard y Reportes)
CREATE INDEX idx_venta_fecha ON Venta(fecha);
CREATE INDEX idx_venta_estado ON Venta(estado);
CREATE INDEX idx_mov_producto ON Movimiento_Stock(id_producto);
CREATE INDEX idx_bitacora_fecha ON Bitacora_Actividad(created_at DESC);
CREATE INDEX idx_bitacora_modulo ON Bitacora_Actividad(modulo);
CREATE INDEX idx_reparacion_estado ON Reparacion(estado);
CREATE INDEX idx_reparacion_fechas ON Reparacion(fecha_ingreso, fecha_egreso);

-- Índice Parcial (Acelera catálogo visible en stock/ventas ocupando mínima RAM)
CREATE INDEX idx_productos_activos ON Productos(tipo_prod) WHERE activo = true;

-- 7. ÍNDICES GIN TRIGRAM (Búsqueda Masiva Instantánea con pg_trgm)

CREATE INDEX idx_productos_nombre_trgm ON Productos USING gin (nombre gin_trgm_ops);
CREATE INDEX idx_productos_marca_trgm ON Productos USING gin (marca gin_trgm_ops);
CREATE INDEX idx_productos_modelo_trgm ON Productos USING gin (modelo gin_trgm_ops);
CREATE INDEX idx_cliente_busqueda_trgm ON Cliente USING gin ((nombre || ' ' || apellido) gin_trgm_ops);
CREATE INDEX idx_cliente_dni_trgm ON Cliente USING gin (dni gin_trgm_ops);

-- INSTRUCCIONES DE DESPLIEGUE:
-- 1. Clonar el proyecto
-- 2. Levantar la DB
-- docker-compose up -d
-- 3. Crear las tablas (desde la carpeta database)
-- docker exec -i bikesystem-db psql -U admin_bikesystem -d bikesystem_db < bikesystem.sql
-- 4. Backend (necesita el .env que creamos)
-- cd backend && pnpm dev
-- 5. Frontend
-- cd frontend && pnpm dev