-- ==========================================
-- 1. TABLAS 
-- ==========================================

CREATE TABLE Usuario (
    id_usuario INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Nom_usuario VARCHAR(50) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL
);

CREATE TABLE Cliente (
    id_cliente INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Apellido VARCHAR(100) NOT NULL,
    Dni VARCHAR(20) UNIQUE,
    Telefono VARCHAR(20),
    Email VARCHAR(100),
    Direccion VARCHAR(200)
);

CREATE TABLE Proveedor (
    id_proveedor INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_empresa VARCHAR(100) NOT NULL,
    cuit VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(200)
);

CREATE TABLE Productos (
    id_producto INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50) NULL,
    Tipo_prod VARCHAR(50) NOT NULL,
    cantidad INT DEFAULT 0,
    Num_serie VARCHAR(100) NULL,
    color VARCHAR(30) NULL,
    rodado VARCHAR(20) NULL,
    talle VARCHAR(20) NULL,
    Precio DECIMAL(10, 2),
    stock_minimo INT DEFAULT 0
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

-- ==========================================
-- 2. TABLAS DEPENDIENTES
-- ==========================================

CREATE TABLE Bicicleta (
    id_bicicleta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente INT NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    CONSTRAINT fk_bici_cliente FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente) ON DELETE RESTRICT
);

-- ==========================================
-- 3. TABLAS TRANSACCIONALES (Cabeceras)
-- ==========================================

CREATE TABLE Venta (
    id_venta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    CostoTotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente) ON DELETE RESTRICT,
    CONSTRAINT fk_venta_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT
);

CREATE TABLE Reparacion (
    id_reparacion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_bicicleta INT NOT NULL,
    id_usuario INT NOT NULL,
    Fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    Fecha_egreso DATE,
    Estado VARCHAR(50) NOT NULL,
    Descripcion TEXT,
    Costo_mano_obra DECIMAL(10, 2) DEFAULT 0,
    Costo_total DECIMAL(10, 2) DEFAULT 0,
    CONSTRAINT fk_rep_bicicleta FOREIGN KEY (id_bicicleta) REFERENCES Bicicleta(id_bicicleta) ON DELETE RESTRICT,
    CONSTRAINT fk_rep_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT
);

CREATE TABLE Ingreso_Stock (
    id_ingreso INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_proveedor INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    num_comprobante VARCHAR(100),
    CONSTRAINT fk_ingreso_prov FOREIGN KEY (id_proveedor) REFERENCES Proveedor(id_proveedor) ON DELETE RESTRICT,
    CONSTRAINT fk_ingreso_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT
);

CREATE TABLE Pago_Proveedor (
    id_pago INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_proveedor INT NOT NULL,
    id_usuario INT NOT NULL,
    id_metodo_pago INT NOT NULL, 
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    monto_total DECIMAL(10, 2) NOT NULL,
    observaciones TEXT,	
    CONSTRAINT fk_pago_prov FOREIGN KEY (id_proveedor) REFERENCES Proveedor(id_proveedor) ON DELETE RESTRICT,
    CONSTRAINT fk_pago_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT fk_pago_metodo FOREIGN KEY (id_metodo_pago) REFERENCES Metodo_Pago(id_metodo_pago) ON DELETE RESTRICT
);

-- ==========================================
-- 4. TABLAS TRANSACCIONALES (Detalles)
-- ==========================================

CREATE TABLE Detalle_Venta (
    id_detalle_venta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    Cantidad INT NOT NULL CHECK (Cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL,
    Costo_total DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_detventa_venta FOREIGN KEY (id_venta) REFERENCES Venta(id_venta) ON DELETE CASCADE,
    CONSTRAINT fk_detventa_prod FOREIGN KEY (id_producto) REFERENCES Productos(id_producto) ON DELETE RESTRICT
);

CREATE TABLE Detalle_Reparacion (
    id_detalle_rep INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reparacion INT NOT NULL,
    id_producto INT NOT NULL,
    Cantidad INT NOT NULL CHECK (Cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL,
    Costo_total DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_detrep_rep FOREIGN KEY (id_reparacion) REFERENCES Reparacion(id_reparacion) ON DELETE CASCADE,
    CONSTRAINT fk_detrep_prod FOREIGN KEY (id_producto) REFERENCES Productos(id_producto) ON DELETE RESTRICT
);

CREATE TABLE Detalle_Ingreso (
    id_detalle_ing INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_ingreso INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_costo DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_deting_ingreso FOREIGN KEY (id_ingreso) REFERENCES Ingreso_Stock(id_ingreso) ON DELETE CASCADE,
    CONSTRAINT fk_deting_prod FOREIGN KEY (id_producto) REFERENCES Productos(id_producto) ON DELETE RESTRICT
);


Para tus compañeros, el proceso sería:
# 1. Clonar el proyecto
# 2. Levantar la DB
docker-compose up -d
# 3. Crear las tablas (desde la carpeta database)
docker exec -i bikesystem-db psql -U admin_bikesystem -d bikesystem_db < bikesystem.sql
# 4. Backend (necesita el .env que creamos)
cd backend && pnpm dev
# 5. Frontend
cd frontend && pnpm dev