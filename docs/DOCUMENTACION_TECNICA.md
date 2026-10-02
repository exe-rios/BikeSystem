# DOCUMENTACIÓN TÉCNICA DE SISTEMA
# BikeSystem — Sistema de Gestión Integral para Bicicleterías y Talleres Mecánicos

---

**Empresa Destinataria:** DN Bikes (Esperanza, Santa Fe — Titular: Diego Nagel)  
**Institución Académica:** Instituto Tecnológico El Molino (ITEC)  
**Cátedra:** Prácticas Profesionalizantes II — Proyecto Final de Graduación / Tesis  
**Equipo de Desarrollo:**  
- Domingues German  
- Cordoba Tomas  
- Rios Exequiel  
**Versión del Software:** 1.0.0 (Release Desktop)  
**Persistencia:** PostgreSQL 16+ en la Nube (**Supabase**)  
**Fecha de Emisión:** Octubre 2026  

---

## ÍNDICE GENERAL

1. [INTRODUCCIÓN Y CONTEXTO DEL SISTEMA](#1-introducción-y-contexto-del-sistema)
   - 1.1 Propósito y Justificación del Proyecto
   - 1.2 Problemática del Negocio y Solución Implementada
   - 1.3 Alcance y Límites Operativos
2. [ARQUITECTURA DEL SISTEMA](#2-arquitectura-del-sistema)
   - 2.1 Patrón Arquitectónico General (Client-Server Desktop Monorepo)
   - 2.2 Stack Tecnológico Detallado y Racionales de Selección
   - 2.3 Estructura Jerárquica del Repositorio (Carpetas y Archivos)
   - 2.4 Patrones de Diseño de Software Implementados
   - 2.5 Modelo de Seguridad, Concurrencia e Integridad Transaccional
   - 2.6 Persistencia Cloud: Arquitectura de Conexión con Supabase
3. [DIAGRAMAS UML](#3-diagramas-uml)
   - 3.1 Diagrama de Contexto del Sistema (C4 / Nivel 1)
   - 3.2 Diagrama de Casos de Uso (UML Use Case)
   - 3.3 Diagrama de Clases del Dominio y Servicios (UML Class Diagram)
   - 3.4 Diagrama Entidad-Relación de Base de Datos (E/R Diagram)
   - 3.5 Diagramas de Estados (UML State Machine)
   - 3.6 Diagramas de Secuencia (UML Sequence Diagrams)
   - 3.7 Catálogo de Archivos Fuente de Diagramas (.mmd) e Imágenes (.png)
4. [DESCRIPCIÓN TÉCNICA DE FUNCIONALIDADES IMPLEMENTADAS](#4-descripción-técnica-de-funcionalidades-implementadas)
   - 4.1 Módulo 1: Seguridad, Autenticación y Control de Accesos (RBAC)
   - 4.2 Módulo 2: Padrón Central de Clientes
   - 4.3 Módulo 3: Bicicletas de Clientes e Historia Clínica de Taller
   - 4.4 Módulo 4: Catálogo de Productos, Inventario y Kardex de Movimientos
   - 4.5 Módulo 5: Ventas, Facturación Atómica y Comprobantes
   - 4.6 Módulo 6: Garantías Postventa de Rodados Nuevos
   - 4.7 Módulo 7: Taller Mecánico, Órdenes de Servicio y Tablero Kanban
   - 4.8 Módulo 8: Proveedores y Liquidación de Pagos/Egresos
   - 4.9 Módulo 9: Analítica Financiera, Dashboard y Reportes Consolidados
   - 4.10 Módulo 10: Bitácora Inmutable de Auditoría y Resguardo de Datos
5. [INFRAESTRUCTURA, DESPLIEGUE Y REQUISITOS TÉCNICOS](#5-infraestructura-despliegue-y-requisitos-técnicos)
   - 5.1 Pipeline de Compilación y Empaquetado
   - 5.2 Variables de Entorno y Configuración
   - 5.3 Requisitos de Hardware y Software

---

## 1. INTRODUCCIÓN Y CONTEXTO DEL SISTEMA

### 1.1 Propósito y Justificación del Proyecto
**BikeSystem** es una solución de software integral de escritorio concebida para modernizar, agilizar y centralizar las operaciones comerciales, de almacén y de taller técnico mecánico de **"DN Bikes"**, un comercio real radicado en la ciudad de Esperanza, Provincia de Santa Fe, propiedad de Diego Nagel.

El sector comercial de las bicicleterías ha experimentado una fuerte tecnificación: la proliferación de transmisiones monoplato, sistemas de frenado hidráulico a disco, suspensiones de aire presurizado y rodados específicos (29, 27.5, gravel) demanda un control milimétrico del inventario de repuestos, cálculo exacto de tiempos y costos de mano de obra especializada, y una rápida gestión en el salón de ventas.

### 1.2 Problemática del Negocio y Solución Implementada
Previo a la concepción de BikeSystem, la empresa operaba mediante un esquema mixto vulnerable y manual:
- **Talonarios manuales en papel** para la recepción de bicicletas en el taller y la emisión de recibos provisionales.
- **Planillas de cálculo (Excel)** descentralizadas para el control de inventario de repuestos y productos terminados.
- **Falta de historia clínica de rodados:** imposibilidad de rastrear qué intervenciones mecánicas previas o sustituciones de componentes se habían realizado sobre una bicicleta determinada.
- **Inconsistencias de caja:** desfasaje entre el efectivo recaudado en mostrador, los servicios concluidos en taller y los egresos abonados a distribuidores mayoristas.

**BikeSystem** erradica estos problemas al consolidar en una plataforma única de escritorio:
1. Padrón único de clientes y sus rodados asociados.
2. Facturación atómica de ventas con control pesimista de stock y múltiples métodos de pago.
3. Gestión ágil de órdenes de servicio mediante un **Tablero Kanban interactivo**.
4. Directorio de proveedores y control de egresos para el cálculo exacto del balance comercial neto en tiempo real.
5. Bitácora inmutable de auditoría para trazabilidad de cada acción de los usuarios.
6. **Persistencia centralizada en la nube mediante Supabase (PostgreSQL 16+):** sin requerir infraestructura local compleja ni contenedores Docker en las terminales del cliente, asegurando copias de seguridad continuas y cifrado TLS de extremo a extremo.

### 1.3 Alcance y Límites Operativos
- **Dentro del Alcance:**
  - Aplicación de escritorio nativa para Windows (empaquetada mediante Electron con instalador ejecutable `.exe` y versión portable `win-unpacked`).
  - API REST interna con base de datos relacional PostgreSQL alojada en **Supabase Cloud** con soporte nativo de transacciones ACID.
  - Tablero Kanban drag-and-drop para el flujo de trabajo operativo de taller.
  - Emisión e impresión directa de comprobantes de venta (`FAC-XXXXXX`) con membrete y políticas de garantía.
  - Control de garantías postventa (30 días automáticos por venta de bicicleta 0km).
  - Trazabilidad Kardex para cualquier movimiento manual o automático de stock.
- **Fuera del Alcance (Límites Formales):**
  - Pasarela de cobro web directo en vivo (el sistema asienta cobros por Mercado Pago, cheque, transferencia o efectivo, pero no realiza el débito bancario vía API online de adquirencia).
  - Facturación electrónica directa con webservice de ARCA/AFIP (se generan comprobantes comerciales de gestión interna).
  - Plataforma e-commerce pública (el sistema es una herramienta de uso exclusivo del personal interno de la empresa).

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Patrón Arquitectónico General (Client-Server Desktop Monorepo)
BikeSystem está diseñado bajo una arquitectura en capas desacopladas organizada en un **Monorepo** administrado por **pnpm**.

```
+-------------------------------------------------------------------------+
|                          BIKESYSTEM MONOREPO                            |
+------------------------------------+------------------------------------+
|            FRONTEND                |              BACKEND               |
|  +------------------------------+  |  +------------------------------+  |
|  |       ELECTRON 42            |  |  |       EXPRESS 5 API          |  |
|  |   (Main Process / Window)    |  |  |  (REST Endpoints / CJS)      |  |
|  +--------------+---------------+  |  +--------------+---------------+  |
|                 |                  |                 |                  |
|  +--------------v---------------+  |  +--------------v---------------+  |
|  |          REACT 19            |  |  |     LAYERED SERVICES         |  |
|  | (Vite SPA + TypeScript + UI) |  |  |  (Controllers -> Services)   |  |
|  +--------------+---------------+  |  +--------------+---------------+  |
+-----------------|------------------+-----------------|------------------+
                  |                                    |
                  +========= HTTP / REST JSON =========+
                                    |
                    +---------------v---------------+
                    |     SUPABASE CLOUD (AWS)      |
                    | Managed PostgreSQL 16+        |
                    | (SSL/TLS / pg Pool / pg_trgm) |
                    +-------------------------------+
```

El sistema opera en dos modalidades:
1. **Modo Desarrollo (`pnpm dev`):** Dos procesos paralelos; Vite sirve la interfaz React con recarga rápida (HMR) y levanta la ventana de Electron en el puerto `5173`. En otra terminal, el backend corre mediante `tsx watch` escuchando en el puerto `3000` y conectándose a Supabase mediante la variable `DATABASE_URL`.
2. **Modo Producción Empaquetado (`pnpm dist`):** Electron compila su ejecutable nativo. Al inicializarse la ventana de escritorio, el proceso principal de Electron ([`frontend/electron/main.ts`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/frontend/electron/main.ts)) utiliza la API nativa `utilityProcess.fork()` para spawnear en segundo plano el servidor compilado de Node.js (`dist/server.cjs`) como un subproceso hijo independiente y monitoreado. La ventana de Chromium carga los archivos HTML/JS estáticos compilados en `frontend/dist/index.html` y se comunica de manera transparente con el backend local vía `http://localhost:3000/api`. Al cerrarse la ventana, Electron ejecuta un cierre limpio del proceso Node.

### 2.2 Stack Tecnológico Detallado y Racionales de Selección

| Capa / Subsistema | Tecnología | Versión | Racional Técnico y Ventajas |
|---|---|---|---|
| **Contenedor Desktop** | **Electron** | 42.0.0 | Permite distribuir una aplicación nativa para Windows con acceso seguro al sistema de archivos local, configuración de ventanas, menús de sistema y control del ciclo de vida del backend empaquetado. |
| **Framework Frontend** | **React** | 19.0.0 | Renderizado reactivo de alto rendimiento, concurrencia de UI, Server Components listos y ecosistema maduro de hooks para gestión de interfaces de mostrador. |
| **Herramienta de Build** | **Vite** | 6.2.0 | Bundler ultrarrápido basado en Rollup y esbuild. Tiempos de arranque en milisegundos y HMR (Hot Module Replacement) instantáneo. |
| **Lenguaje de Programación** | **TypeScript** | 5.8.0 | Tipado estático estricto en frontend y backend, reduciendo en un 90% los errores en tiempo de ejecución (`null/undefined`) e incrementando la mantenibilidad. |
| **Servidor y API REST** | **Express** | 5.0.0 | Estándar de la industria en Node.js, ahora con soporte nativo de promesas en enrutadores y middlewares, bajo overhead y excelente rendimiento en operaciones I/O concurrentes. |
| **Persistencia en la Nube** | **Supabase (PostgreSQL 16+)** | Cloud Managed | Base de datos relacional PostgreSQL 16+ administrada en la nube. Proporciona copias de seguridad continuas, alta disponibilidad, conexión cifrada SSL obligatoria y cero sobrecarga de mantenimiento de contenedores Docker en el cliente. |
| **Driver de Base de Datos** | **pg (node-postgres)** | 8.13.0 | Driver oficial de bajo nivel con Connection Pooling nativo (`Pool`), eliminando la sobrecarga innecesaria de ORMs pesados y permitiendo optimizaciones SQL milimétricas. |
| **Criptografía y Tokens** | **bcryptjs + jsonwebtoken** | 2.4.3 / 9.0.2 | Hashing seguro de contraseñas mediante función unidireccional con 10 rondas de salt y emisión de tokens JWT firmados con HMAC SHA-256 para autenticación stateless. |
| **Seguridad HTTP** | **Helmet + express-rate-limit** | 8.0.0 / 7.5.0 | Protección contra vulnerabilidades web conocidas (XSS, MIME sniffing, clickjacking) y limitación de peticiones por IP en endpoints sensibles como `/api/login`. |
| **Compilación de Backend** | **esbuild** | 0.25.0 | Bundler de altísima velocidad que empaqueta todo el backend TypeScript y sus dependencias de servidor en un único archivo CJS independiente (`dist/server.cjs`). |
| **Gestor de Paquetes** | **pnpm** | 10.5.0+ | Gestión eficiente de monorepos mediante enlaces duros y simbólicos, garantizando instalaciones reproducibles (`pnpm-lock.yaml`) y mínimo consumo de disco. |

### 2.3 Estructura Jerárquica del Repositorio (Carpetas y Archivos)

```
BikeSystem/
├── package.json                    # Configuración de scripts raíz del monorepo
├── pnpm-workspace.yaml             # Definición de paquetes incluidos (frontend, backend)
├── pnpm-lock.yaml                  # Árbol de dependencias inmutable y determinista
├── .gitattributes                  # Normalización obligatoria de saltos de línea LF
├── .gitignore                      # Exclusiones de Git (node_modules, dist, .env)
├── AGENTS.md                       # Especificación de roles y agentes de desarrollo
├── detalles.txt                    # Guía técnica de instalación y puesta en marcha
│
├── database/                       # Capa de persistencia SQL
│   ├── bikesystem.sql              # Script DDL maestro ejecutado en Supabase (14 tablas, triggers e índices)
│   └── migration_genero_bicinueva.sql # Script de migración incremental de atributos
│
├── docs/                           # Documentación técnica y diagramas para defensa de tesis
│   ├── DOCUMENTACION_TECNICA.md    # Este documento maestro
│   └── diagramas/                  # Fuentes Mermaid (.mmd) e imágenes generadas (.png)
│       ├── 01_contexto.mmd
│       ├── 02_casos_de_uso.mmd
│       ├── 03_diagrama_clases.mmd
│       ├── 04_entidad_relacion.mmd
│       ├── 05_estados_taller.mmd
│       ├── 06_secuencia_venta.mmd
│       ├── 07_secuencia_repuestos.mmd
│       └── imagenes/               # Renders PNG listos para insertar en Word / Tesis
│
├── backend/                        # API REST en Node.js / Express / TypeScript
│   ├── package.json                # Dependencias y scripts de backend (dev, build, start)
│   ├── tsconfig.json               # Configuración del compilador TypeScript (ESNext/Node)
│   ├── .env                        # Variables de entorno (DATABASE_URL Supabase, JWT_SECRET)
│   ├── dist/                       # Artefacto compilado de producción (server.cjs)
│   └── src/                        # Código fuente del backend
│       ├── index.ts                # Punto de entrada HTTP, Express, CORS, Helmet, Graceful Shutdown
│       ├── crear_admin.ts          # Script utilitario de inicialización de Superadmin
│       ├── config/
│       │   └── db.ts               # Pool de conexiones PostgreSQL (detección SSL para Supabase)
│       ├── controllers/            # Controladores HTTP: extracción de req, delegación y respuesta
│       ├── services/               # Lógica pura del negocio y transacciones SQL ACID
│       ├── routes/                 # Definición y enrutamiento con middlewares de seguridad
│       ├── middlewares/            # Filtros de petición (JWT, roles, rate limit, error handler)
│       └── utils/                  # Clases de error, paginación, respuesta y validaciones
│
└── frontend/                       # Aplicación de escritorio React 19 + Electron 42
    ├── package.json                # Dependencias, scripts (dev, build, dist, dist:dir)
    ├── vite.config.ts              # Integración de Vite con vite-plugin-electron
    ├── tsconfig.json               # Configuración TypeScript para React DOM
    ├── electron/                   # Código nativo del proceso principal de escritorio
    │   ├── main.ts                 # Creación de ventana BrowserWindow, subproceso backend
    │   └── preload.ts              # Puente IPC seguro entre Electron y el DOM
    └── src/                        # Código fuente React
        ├── main.tsx                # Bootstrap de React (createRoot)
        ├── App.tsx                 # Enrutamiento de vistas, layout principal y sidebar
        ├── index.css               # Estilos globales y paleta de variables CSS
        ├── contexts/               # Proveedor de estado global de sesión (AuthContext)
        ├── services/api.ts         # Cliente HTTP centralizado (fetch con Bearer JWT)
        └── views/                  # Vistas de negocio (Pantallas del sistema)
```

### 2.4 Patrones de Diseño de Software Implementados
1. **Layered Architecture (Arquitectura en Capas):**
   - **Capa de Enrutamiento ([`backend/src/routes/`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/backend/src/routes)):** Define endpoints, métodos HTTP y asigna middlewares de autorización.
   - **Capa de Controladores ([`backend/src/controllers/`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/backend/src/controllers)):** Extrae y sanea parámetros del request, invoca a los servicios de negocio y retorna respuestas estructuradas.
   - **Capa de Servicios ([`backend/src/services/`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/backend/src/services)):** Contiene el 100% de la lógica de negocio, validaciones de dominio, orquestación transaccional y llamadas directas a PostgreSQL.
   - **Capa de Persistencia ([`backend/src/config/db.ts`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/backend/src/config/db.ts)):** Centraliza el pool de conexiones y transacciones.
2. **Pessimistic Concurrency Control (Bloqueo Pesimista de Filas):**
   - Implementado mediante `SELECT ... FOR UPDATE` en operaciones de venta y descuento de stock, previniendo condiciones de carrera cuando dos terminales intentan comercializar el último ítem de inventario simultáneamente.
3. **Deadlock Prevention Pattern (Prevención Activa de Interbloqueos):**
   - Antes de iniciar transacciones multi-artículo (como una venta con múltiples productos), los identificadores de productos se ordenan de forma determinista de menor a mayor (`item.id_producto ASC`). De este modo, todas las transacciones concurrentes adquieren los bloqueos en el mismo orden físico, eliminando el riesgo de interbloqueos circulares en PostgreSQL.
4. **Fail-Fast Configuration Pattern:**
   - Al levantar el backend ([`backend/src/index.ts`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/backend/src/index.ts)), el sistema valida inmediatamente la presencia de variables de entorno indispensables (`DATABASE_URL`, `JWT_SECRET`). Si alguna falta, aborta la ejecución de forma inmediata con un código de error fatal explicativo.
5. **Graceful Shutdown Pattern:**
   - Se interceptan las señales del sistema operativo (`SIGINT`, `SIGTERM`). El servidor deja de aceptar nuevas conexiones HTTP, espera la culminación de peticiones en vuelo y libera ordenadamente el pool de PostgreSQL (`pool.end()`).
6. **Compound View / Custom Hook Pattern (Frontend):**
   - Cada vista de React se divide limpiamente en una carpeta autónoma con su componente raíz (`*View.tsx`), subcomponentes modulares de interfaz (`components/`), tipos específicos (`types.ts`) y un custom hook encapsulado (`hooks/use*.ts`) que gestiona el estado local, las llamadas a la API y el manejo de errores.

### 2.5 Modelo de Seguridad, Concurrencia e Integridad Transaccional
- **Transacciones ACID:** Todas las operaciones compuestas (crear venta, agregar repuesto a reparación, anular venta) se encapsulan entre `BEGIN` y `COMMIT`. Cualquier error lanza una excepción capturada que ejecuta un `ROLLBACK` total, impidiendo estados huérfanos o corrupciones de saldo e inventario.
- **Parametrización Absoluta de Consultas:** Cero uso de interpolación directa de cadenas en SQL. Todas las consultas utilizan marcadores posicionales (`$1, $2, ...`) proporcionados por `pg`, bloqueando cualquier vector de inyección SQL.
- **Control de Acceso Basado en Roles (RBAC):** Jerarquía estricta de 3 niveles:
  - `EMPLEADO`: Operaciones habituales de mostrador (ventas, taller, clientes, consulta de stock y dashboard básico).
  - `ADMIN`: Acceso adicional a reportes financieros, anulación de comprobantes, gestión de proveedores, bajas lógicas de productos y ajuste de inventario.
  - `SUPERADMIN`: Control total, incluyendo alta/baja/modificación de usuarios, reseteo de claves y visualización de la bitácora inmutable de auditoría.

### 2.6 Persistencia Cloud: Arquitectura de Conexión con Supabase
A diferencia de arquitecturas tradicionales que requieren levantar contenedores Docker en cada estación de trabajo, BikeSystem conecta directamente con una base de datos PostgreSQL 16+ gestionada en **Supabase**:
- **Detección Automática de SSL en [`backend/src/config/db.ts`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/backend/src/config/db.ts):**
  ```typescript
  const esRemota = Boolean(
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes('localhost') &&
      !process.env.DATABASE_URL.includes('127.0.0.1')
  );

  export const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: esRemota ? { rejectUnauthorized: false } : false,
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
  });
  ```
- **Ventajas de Supabase para el Negocio Real:**
  1. **Sin Docker ni consumo local excesivo:** La aplicación de escritorio no necesita dedicar gigabytes de RAM ni servicios en segundo plano para mantener la base de datos.
  2. **Copias de seguridad continuas y automáticas:** Respaldos gestionados por la infraestructura cloud de Supabase/AWS.
  3. **Conexión Cifrada Obligatoria (TLS/SSL):** Todos los paquetes de datos entre la tienda física y la nube viajan encriptados.
  4. **Multi-terminal inmediata:** Permite que varios puestos de trabajo (caja, mostrador de repuestos, banco del mecánico) operen concurrentemente sobre el mismo repositorio de datos.

---

## 3. DIAGRAMAS UML

### 3.1 Diagrama de Contexto del Sistema (C4 / Nivel 1)

```mermaid
flowchart TD
    subgraph Actores["Usuarios del Negocio"]
        Superadmin["Superadministrador / Dueño<br>(Diego Nagel)"]
        Admin["Administrador de Salón"]
        Empleado["Empleado / Mecánico de Taller"]
    end

    subgraph Sistema["Frontera del Sistema: BikeSystem Desktop"]
        ElectronApp["Aplicación de Escritorio BikeSystem<br>(Electron 42 + React 19 + Express 5)"]
    end

    subgraph InfraestructuraNube["Infraestructura y Persistencia en la Nube"]
        SupabaseDB[("Base de Datos PostgreSQL 16+<br>Alojada en Supabase Cloud<br>(SSL Seguro / Pooler)")]
    end

    subgraph Salidas["Salidas y Periféricos"]
        FileSystem["Sistema de Archivos Local<br>(Exportación de Reportes CSV)"]
        HardwareImp["Impresoras de Sistema<br>(Comprobantes de Venta FAC-XXXXXX)"]
    end

    Superadmin -->|"Administra usuarios, audita bitácora, analiza balances"| ElectronApp
    Admin -->|"Controla proveedores, anula ventas, supervisa stock"| ElectronApp
    Empleado -->|"Registra ventas, actualiza tablero Kanban, recibe bicis"| ElectronApp

    ElectronApp -->|"Conexión TCP cifrada TLS/SSL (DATABASE_URL Supabase)"| SupabaseDB
    ElectronApp -->|"Exporta planillas tabulares CSV"| FileSystem
    ElectronApp -->|"Imprime comprobantes y tickets"| HardwareImp
```

---

### 3.2 Diagrama de Casos de Uso (UML Use Case)

```mermaid
flowchart LR
    %% Actores
    subgraph Actores["Actores del Sistema"]
        direction TB
        ActSuperadmin["Superadministrador"]
        ActAdmin["Administrador"]
        ActEmpleado["Empleado / Mecánico"]
    end

    ActSuperadmin -.->|"hereda permisos"| ActAdmin
    ActAdmin -.->|"hereda permisos"| ActEmpleado

    %% Paquetes de Casos de Uso
    subgraph CU_Auth["Subsistema: Seguridad y Auditoría"]
        CU25["CU25: Iniciar Sesión"]
        CU27["CU27: Validar Credenciales (bcrypt/JWT)"]
        CU23["CU23: Crear Usuario Operador"]
        CU24["CU24: Asignar Roles (RBAC)"]
        CU26["CU26: Modificar / Desactivar Usuario"]
        CU28["CU28: Consultar Bitácora Inmutable"]
    end

    subgraph CU_Clientes["Subsistema: Clientes y Rodados"]
        CU01["CU01: Registrar Nuevo Cliente"]
        CU02["CU02: Modificar Datos de Cliente"]
        CU03["CU03: Dar de Baja Cliente"]
        CU04["CU04: Buscar Cliente en Tiempo Real"]
        CU06["CU06: Registrar Bici de Cliente"]
        CU07["CU07: Modificar Bicicleta"]
        CU08["CU08: Consultar Historia Clínica de Bici"]
    end

    subgraph CU_Ventas["Subsistema: Ventas, Facturación y Garantías"]
        CU09["CU09: Registrar Venta Atómica"]
        CU10["CU10: Consultar Listado de Ventas"]
        CU11["CU11: Emitir Comprobante Imprimible"]
        CU12["CU12: Anular Venta y Restituir Stock"]
        CU32["CU32: Consultar Cobertura de Garantías"]
    end

    subgraph CU_Taller["Subsistema: Taller Mecánico y Kanban"]
        CU13["CU13: Registrar Orden de Reparación"]
        CU14["CU14: Consultar Órdenes de Trabajo"]
        CU15["CU15: Imputar Mano de Obra y Repuestos"]
        CU16["CU16: Modificar / Entregar Reparación"]
        CU33["CU33: Gestionar Taller en Tablero Kanban"]
    end

    subgraph CU_Stock["Subsistema: Inventario y Kardex"]
        CU17["CU17: Registrar Movimiento Manual"]
        CU18["CU18: Consultar Inventario y Alertas"]
        CU19["CU19: Filtrar Catálogo de Artículos"]
    end

    subgraph CU_Proveedores["Subsistema: Proveedores y Egresos"]
        CU29["CU29: Administrar Proveedores"]
        CU30["CU30: Registrar Pago a Proveedor"]
        CU31["CU31: Consultar Flujo de Egresos"]
    end

    subgraph CU_Reportes["Subsistema: Dashboard y Analítica"]
        CU20["CU20: Consultar Dashboard en Vivo"]
        CU21["CU21: Analizar Balances y Top Productos"]
        CU22["CU22: Exportar Reportes a CSV"]
    end

    %% Asociaciones de Actores con Casos de Uso
    ActEmpleado --> CU25
    CU25 -.->|include| CU27
    ActEmpleado --> CU01
    ActEmpleado --> CU02
    ActEmpleado --> CU04
    ActEmpleado --> CU06
    ActEmpleado --> CU07
    ActEmpleado --> CU08
    ActEmpleado --> CU09
    CU09 -.->|include| CU11
    ActEmpleado --> CU10
    ActEmpleado --> CU32
    ActEmpleado --> CU13
    ActEmpleado --> CU14
    ActEmpleado --> CU15
    ActEmpleado --> CU16
    ActEmpleado --> CU33
    ActEmpleado --> CU18
    ActEmpleado --> CU19
    ActEmpleado --> CU20

    ActAdmin --> CU03
    ActAdmin --> CU12
    ActAdmin --> CU17
    ActAdmin --> CU29
    ActAdmin --> CU30
    ActAdmin --> CU31
    ActAdmin --> CU21
    ActAdmin --> CU22

    ActSuperadmin --> CU23
    ActSuperadmin --> CU24
    ActSuperadmin --> CU26
    ActSuperadmin --> CU28
```

---

### 3.3 Diagrama de Clases del Dominio y Servicios (UML Class Diagram)

```mermaid
classDiagram
    %% Controladores
    class AuthController {
        +login(req, res)
        +healthCheck(req, res)
        +dbTest(req, res)
    }

    class VentaController {
        +crearVenta(req, res)
        +obtenerVentas(req, res)
        +obtenerVentaPorId(req, res)
        +anularVenta(req, res)
        +obtenerGarantiasBicicletas(req, res)
        +obtenerMetodosPago(req, res)
    }

    class ReparacionController {
        +crearReparacion(req, res)
        +obtenerReparaciones(req, res)
        +obtenerReparacionPorId(req, res)
        +actualizarEstadoReparacion(req, res)
    }

    class ProductoController {
        +crearProducto(req, res)
        +obtenerProductos(req, res)
        +actualizarProducto(req, res)
        +eliminarProducto(req, res)
        +registrarMovimientoStock(req, res)
        +obtenerMovimientosStock(req, res)
    }

    %% Servicios del Negocio
    class AuthService {
        +autenticarUsuario(nombre_usuario, contrasena) Promise~TokenSession~
        +verificarToken(token) TokenPayload
    }

    class VentaService {
        +crearVenta(datos) Promise~VentaResultado~
        +obtenerVentas(busqueda, paginacion) Promise~VentasPaginadas~
        +obtenerVentaPorId(id) Promise~VentaCompleta~
        +anularVenta(id, motivo, operador) Promise~ResultadoAnulacion~
        +obtenerGarantiasBicicletas(busqueda, paginacion) Promise~ResumenGarantias~
        +obtenerMetodosPago() Promise~MetodoPago[]~
    }

    class ReparacionService {
        +crearReparacion(datos) Promise~Reparacion~
        +obtenerReparaciones(filtros) Promise~ReparacionesPaginadas~
        +obtenerReparacionPorId(id) Promise~ReparacionDetallada~
        +actualizarEstadoReparacion(id, estado, operador) Promise~Reparacion~
    }

    class DetalleReparacionService {
        +agregarRepuesto(datos) Promise~DetalleReparacion~
        +obtenerRepuestosDeReparacion(idReparacion) Promise~DetalleReparacion[]~
        +eliminarRepuesto(idDetalle, operador) Promise~ResultadoEliminacion~
    }

    class ProductoService {
        +crearProducto(datos) Promise~Producto~
        +obtenerProductos(filtros) Promise~ProductosPaginados~
        +actualizarProducto(id, datos) Promise~Producto~
        +eliminarProducto(id, operador) Promise~void~
        +registrarMovimientoManual(datos) Promise~MovimientoStock~
        +obtenerMovimientosKardex(filtros) Promise~MovimientoStock[]~
    }

    %% Entidades de Dominio
    class Usuario {
        +int id_usuario
        +string nombre_usuario
        +string contrasena
        +string rol
        +DateTime created_at
        +DateTime updated_at
        +verificarPassword(plainText) boolean
    }

    class Cliente {
        +int id_cliente
        +string nombre
        +string apellido
        +string dni
        +string telefono
        +string email
        +string direccion
    }

    class Bicicleta {
        +int id_bicicleta
        +int id_cliente
        +string marca
        +string modelo
    }

    class Producto {
        +int id_producto
        +string nombre
        +string marca
        +string modelo
        +string tipo_prod
        +int cantidad
        +decimal precio
        +int stock_minimo
        +boolean activo
    }

    class ProductoBiciNueva {
        +int id_producto
        +string color
        +string rodado
        +string talle
        +string genero
    }

    class Venta {
        +int id_venta
        +int id_cliente
        +int id_usuario
        +int id_metodo_pago
        +Date fecha
        +decimal costo_total
        +string estado
        +string motivo_anulacion
    }

    class DetalleVenta {
        +int id_detalle_venta
        +int id_venta
        +int id_producto
        +int cantidad
        +decimal precio_unitario
        +decimal costo_total
    }

    class Reparacion {
        +int id_reparacion
        +int id_bicicleta
        +int id_usuario
        +Date fecha_ingreso
        +Date fecha_egreso
        +string estado
        +string descripcion
        +decimal costo_mano_obra
        +decimal costo_total
    }

    class DetalleReparacion {
        +int id_detalle_rep
        +int id_reparacion
        +int id_producto
        +int cantidad
        +decimal precio_unitario
        +decimal costo_total
    }

    %% Relaciones
    AuthController ..> AuthService : delega
    VentaController ..> VentaService : delega
    ReparacionController ..> ReparacionService : delega
    ProductoController ..> ProductoService : delega

    VentaService ..> Venta : gestiona
    VentaService ..> DetalleVenta : crea transaccional
    ReparacionService ..> Reparacion : gestiona
    DetalleReparacionService ..> DetalleReparacion : imputa
    ProductoService ..> Producto : administra

    Producto <|-- ProductoBiciNueva : hereda atributos
    Cliente "1" *-- "0..*" Bicicleta : posee
    Venta "1" *-- "1..*" DetalleVenta : contiene
    Reparacion "1" *-- "0..*" DetalleReparacion : insume
    Usuario "1" --> "0..*" Venta : registra
    Usuario "1" --> "0..*" Reparacion : asignado
```

---

### 3.4 Diagrama Entidad-Relación de Base de Datos (E/R Diagram)

```mermaid
erDiagram
    Usuario ||--o{ Venta : "registra"
    Usuario ||--o{ Reparacion : "atiende"
    Usuario ||--o{ Pago_Proveedor : "liquida"
    Usuario ||--o{ Movimiento_Stock : "autoriza"
    Usuario ||--o{ Bitacora_Actividad : "genera"

    Cliente ||--o{ Bicicleta : "posee"
    Cliente ||--o{ Venta : "compra"

    Bicicleta ||--o{ Reparacion : "recibe_servicio"

    Metodo_Pago ||--o{ Venta : "se_cancela_con"
    Metodo_Pago ||--o{ Pago_Proveedor : "medio_de_egreso"

    Venta ||--|{ Detalle_Venta : "contiene"
    Reparacion ||--o{ Detalle_Reparacion : "consume"

    Productos ||--o| Producto_BiciNueva : "especializa_como"
    Productos ||--o{ Detalle_Venta : "se_vende_en"
    Productos ||--o{ Detalle_Reparacion : "se_instala_en"
    Productos ||--o{ Movimiento_Stock : "traza_en"

    Proveedor ||--o{ Pago_Proveedor : "recibe_pago"

    Usuario {
        int id_usuario PK "GENERATED ALWAYS AS IDENTITY"
        varchar nombre_usuario UK "CHECK length >= 3"
        varchar contrasena "Hash bcrypt"
        varchar rol "CHECK in (EMPLEADO, ADMIN, SUPERADMIN)"
        timestamptz created_at
        timestamptz updated_at
    }

    Cliente {
        int id_cliente PK "GENERATED ALWAYS AS IDENTITY"
        varchar nombre "CHECK length >= 2"
        varchar apellido "CHECK length >= 2"
        varchar dni UK "Nullable, length >= 6"
        varchar telefono
        varchar email
        varchar direccion
        timestamptz created_at
        timestamptz updated_at
    }

    Proveedor {
        int id_proveedor PK "GENERATED ALWAYS AS IDENTITY"
        varchar nombre_empresa "CHECK length >= 2"
        varchar cuit UK
        varchar telefono
        varchar email
        varchar direccion
        timestamptz created_at
        timestamptz updated_at
    }

    Productos {
        int id_producto PK "GENERATED ALWAYS AS IDENTITY"
        varchar nombre "CHECK length >= 2"
        varchar marca
        varchar modelo
        varchar tipo_prod "CHECK in (bicicleta, repuesto, accesorio)"
        int cantidad "CHECK >= 0"
        decimal precio "CHECK >= 0"
        int stock_minimo "CHECK >= 0"
        boolean activo "DEFAULT true"
        timestamptz created_at
        timestamptz updated_at
    }

    Producto_BiciNueva {
        int id_producto PK, FK "ON DELETE CASCADE"
        varchar marca
        varchar color
        varchar rodado
        varchar talle
        varchar genero "CHECK in (hombre, mujer, unisex)"
    }

    Metodo_Pago {
        int id_metodo_pago PK "GENERATED ALWAYS AS IDENTITY"
        varchar nombre UK "Efectivo, Débito, Transferencia, etc."
    }

    Bicicleta {
        int id_bicicleta PK "GENERATED ALWAYS AS IDENTITY"
        int id_cliente FK "ON DELETE RESTRICT"
        varchar marca "CHECK length >= 1"
        varchar modelo
        timestamptz created_at
        timestamptz updated_at
    }

    Venta {
        int id_venta PK "GENERATED ALWAYS AS IDENTITY"
        int id_cliente FK "ON DELETE RESTRICT"
        int id_usuario FK "ON DELETE RESTRICT"
        int id_metodo_pago FK "ON DELETE RESTRICT"
        date fecha "DEFAULT CURRENT_DATE"
        decimal costo_total "CHECK >= 0"
        varchar estado "CHECK in (COMPLETADA, ANULADA)"
        timestamptz fecha_anulacion
        text motivo_anulacion
        timestamptz created_at
        timestamptz updated_at
    }

    Detalle_Venta {
        int id_detalle_venta PK "GENERATED ALWAYS AS IDENTITY"
        int id_venta FK "ON DELETE CASCADE"
        int id_producto FK "ON DELETE RESTRICT"
        int cantidad "CHECK > 0"
        decimal precio_unitario
        decimal costo_total
    }

    Reparacion {
        int id_reparacion PK "GENERATED ALWAYS AS IDENTITY"
        int id_bicicleta FK "ON DELETE RESTRICT"
        int id_usuario FK "ON DELETE RESTRICT"
        date fecha_ingreso "DEFAULT CURRENT_DATE"
        date fecha_egreso
        varchar estado "CHECK in (Recibida, En Reparación, Lista, Entregada)"
        text descripcion
        decimal costo_mano_obra "CHECK >= 0"
        decimal costo_total "CHECK >= 0"
        timestamptz created_at
        timestamptz updated_at
    }

    Detalle_Reparacion {
        int id_detalle_rep PK "GENERATED ALWAYS AS IDENTITY"
        int id_reparacion FK "ON DELETE CASCADE"
        int id_producto FK "ON DELETE RESTRICT"
        int cantidad "CHECK > 0"
        decimal precio_unitario
        decimal costo_total
    }

    Pago_Proveedor {
        int id_pago PK "GENERATED ALWAYS AS IDENTITY"
        int id_proveedor FK "ON DELETE RESTRICT"
        int id_usuario FK "ON DELETE RESTRICT"
        int id_metodo_pago FK "ON DELETE RESTRICT"
        date fecha "DEFAULT CURRENT_DATE"
        decimal monto_total "CHECK > 0"
        text observaciones
        timestamptz created_at
        timestamptz updated_at
    }

    Movimiento_Stock {
        int id_movimiento PK "GENERATED ALWAYS AS IDENTITY"
        int id_producto FK "ON DELETE RESTRICT"
        int id_usuario FK "ON DELETE RESTRICT"
        varchar tipo_movimiento "CHECK in (INGRESO, EGRESO)"
        int cantidad "CHECK > 0"
        varchar motivo
        text observaciones
        timestamptz created_at
    }

    Bitacora_Actividad {
        int id_bitacora PK "GENERATED ALWAYS AS IDENTITY"
        int id_usuario FK "ON DELETE SET NULL"
        varchar nombre_usuario
        varchar modulo
        varchar accion
        text descripcion
        timestamptz created_at
    }
```

---

### 3.5 Diagramas de Estados (UML State Machine)

```mermaid
stateDiagram-v2
    [*] --> Recibida : Recepción de rodado y apertura de orden
    Recibida --> En_Reparación : Mecánico asigna tareas y banco de trabajo
    En_Reparación --> En_Reparación : Imputación o ajuste de repuestos y mano de obra
    En_Reparación --> Lista : Servicio técnico concluido y verificado
    Lista --> Entregada : Retiro del cliente, cobro final y fijación de fecha_egreso
    Entregada --> [*]

    note right of En_Reparación
        Cada repuesto imputado descuenta
        stock en tiempo real en Supabase
        y asienta egreso en Kardex.
    end note

    note right of Entregada
        Estado terminal. La orden queda
        bloqueada para nuevas modificaciones.
    end note
```

---

### 3.6 Diagramas de Secuencia (UML Sequence Diagrams)

#### Secuencia 1: Facturación Atómica de Venta con Bloqueo Pesimista (ACID)

```mermaid
sequenceDiagram
    autonumber
    actor Vendedor as Vendedor / Cajero
    participant React as React UI (ModalNuevaVenta)
    participant API as VentaController (Express)
    participant Service as VentaService
    participant Supabase as PostgreSQL (Supabase Cloud)
    participant Kardex as Movimiento_Stock
    participant Bitacora as Bitacora_Actividad

    Vendedor ->> React: Confirma venta (Cliente, Medio de Pago, Artículos)
    React ->> API: POST /api/ventas (Bearer JWT)
    API ->> Service: crearVenta(datos, operador)
    Service ->> Supabase: Conectar pool e Iniciar Transacción (BEGIN)
    Service ->> Supabase: INSERT INTO Venta (id_cliente, id_usuario, ...) RETURNING id_venta

    loop Por cada artículo (ordenado por id_producto ASC)
        Service ->> Supabase: SELECT ... FROM Productos WHERE id_producto = $1 FOR UPDATE
        Supabase -->> Service: Producto (precio oficial, stock actual)
        alt Stock insuficiente o inactivo
            Service ->> Supabase: ROLLBACK TRANSACTION
            Service -->> API: throw BadRequestError("Stock insuficiente")
            API -->> React: HTTP 400 Bad Request
            React -->> Vendedor: Notificación de error en pantalla
        else Stock disponible
            Service ->> Supabase: INSERT INTO Detalle_Venta (...)
            Service ->> Supabase: UPDATE Productos SET cantidad = cantidad - $cant
            Service ->> Supabase: INSERT INTO Movimiento_Stock (EGRESO, 'Venta Comercial')
            opt Es bicicleta completa
                Service ->> Supabase: INSERT INTO Bicicleta (id_cliente, marca, modelo)
            end
        end
    end

    Service ->> Supabase: UPDATE Venta SET costo_total = $calculado WHERE id_venta = $id
    Service ->> Supabase: INSERT INTO Bitacora_Actividad ('Ventas', 'Registro de Venta')
    Service ->> Supabase: COMMIT TRANSACTION
    Supabase -->> Service: Éxito
    Service -->> API: Venta confirmada y desglosada
    API -->> React: HTTP 201 Created (Comprobante generado)
    React -->> Vendedor: Muestra modal de Comprobante FAC-XXXXXX listo para imprimir
```

#### Secuencia 2: Imputación de Repuesto en Reparación de Taller

```mermaid
sequenceDiagram
    autonumber
    actor Mecanico as Mecánico de Taller
    participant UI as ModalDetalleReparacion
    participant API as DetalleReparacionController
    participant Service as DetalleReparacionService
    participant Supabase as PostgreSQL (Supabase Cloud)

    Mecanico ->> UI: Selecciona repuesto y cantidad a utilizar
    UI ->> API: POST /api/detalle-reparacion {id_reparacion, id_producto, cantidad}
    API ->> Service: agregarRepuesto(datos, operador)
    Service ->> Supabase: BEGIN TRANSACTION
    Service ->> Supabase: SELECT estado FROM Reparacion WHERE id = $id FOR UPDATE
    alt La orden está en estado 'Entregada'
        Service ->> Supabase: ROLLBACK
        Service -->> API: throw BadRequestError("Orden ya entregada")
        API -->> UI: HTTP 400 Bad Request
    else Orden activa
        Service ->> Supabase: SELECT precio, cantidad FROM Productos WHERE id = $id FOR UPDATE
        Service ->> Supabase: INSERT INTO Detalle_Reparacion (...)
        Service ->> Supabase: UPDATE Productos SET cantidad = cantidad - $cant
        Service ->> Supabase: UPDATE Reparacion SET costo_total = costo_mano_obra + repuestos
        Service ->> Supabase: INSERT INTO Movimiento_Stock (EGRESO, 'Taller Mecánico')
        Service ->> Supabase: COMMIT TRANSACTION
        Service -->> API: Repuesto imputado
        API -->> UI: HTTP 201 Created
        UI -->> Mecanico: Actualiza total de la orden en tiempo real
    end
```

---

### 3.7 Catálogo de Archivos Fuente de Diagramas (.mmd) e Imágenes (.png)

Para facilitar la inclusión de los diagramas en la tesis o memoria Word, todos los esquemas han sido compilados y guardados en el proyecto en dos formatos:

| Diagrama | Archivo Fuente Mermaid | Imagen Renderizada de Alta Resolución (PNG) |
|---|---|---|
| **Contexto del Sistema (C4)** | [`docs/diagramas/01_contexto.mmd`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/01_contexto.mmd) | [`docs/diagramas/imagenes/01_contexto.png`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/imagenes/01_contexto.png) |
| **Casos de Uso Completos (33 CU)** | [`docs/diagramas/02_casos_de_uso.mmd`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/02_casos_de_uso.mmd) | [`docs/diagramas/imagenes/02_casos_de_uso.png`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/imagenes/02_casos_de_uso.png) |
| **Diagrama de Clases (Backend / Dominio)** | [`docs/diagramas/03_diagrama_clases.mmd`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/03_diagrama_clases.mmd) | [`docs/diagramas/imagenes/03_diagrama_clases.png`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/imagenes/03_diagrama_clases.png) |
| **Entidad-Relación (14 tablas en Supabase)** | [`docs/diagramas/04_entidad_relacion.mmd`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/04_entidad_relacion.mmd) | [`docs/diagramas/imagenes/04_entidad_relacion.png`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/imagenes/04_entidad_relacion.png) |
| **Estados del Taller Mecánico** | [`docs/diagramas/05_estados_taller.mmd`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/05_estados_taller.mmd) | [`docs/diagramas/imagenes/05_estados_taller.png`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/imagenes/05_estados_taller.png) |
| **Secuencia: Venta Atómica ACID** | [`docs/diagramas/06_secuencia_venta.mmd`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/06_secuencia_venta.mmd) | [`docs/diagramas/imagenes/06_secuencia_venta.png`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/imagenes/06_secuencia_venta.png) |
| **Secuencia: Repuestos en Taller** | [`docs/diagramas/07_secuencia_repuestos.mmd`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/07_secuencia_repuestos.mmd) | [`docs/diagramas/imagenes/07_secuencia_repuestos.png`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/docs/diagramas/imagenes/07_secuencia_repuestos.png) |

---

## 4. DESCRIPCIÓN TÉCNICA DE FUNCIONALIDADES IMPLEMENTADAS

### 4.1 Módulo 1: Seguridad, Autenticación y Control de Accesos (RBAC)
- **Qué hace:**
  Garantiza el acceso restringido a la plataforma únicamente a personal autorizado. Controla la expiración de sesiones y delimita las acciones que cada operador puede realizar según su rol jerárquico.
- **Cómo lo hace (Arquitectura Técnica):**
  - **Hashing Criptográfico:** Las contraseñas nunca se guardan en texto plano. Se procesan con `bcrypt` (10 rondas de salteo) en el momento del alta o cambio de clave.
  - **Autenticación Stateless:** El endpoint `POST /api/login` verifica usuario y coteja la contraseña mediante `bcrypt.compare`. Al superar la prueba, emite un token JWT firmado con el secreto de servidor (`JWT_SECRET`) conteniendo el `id_usuario`, `nombre_usuario` y `rol`.
  - **Filtro de Peticiones ([`backend/src/middlewares/auth.middleware.ts`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/backend/src/middlewares/auth.middleware.ts)):** Extrae el encabezado `Authorization: Bearer <token>`, valida su firma criptográfica y expiración. Si es válido, inyecta la identidad del usuario en `req.usuario`.
  - **Control de Roles ([`backend/src/middlewares/roles.middleware.ts`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/backend/src/middlewares/roles.middleware.ts)):** Funciona como middleware de orden superior (`autorizarRoles('ADMIN', 'SUPERADMIN')`). Compara el rol del token con los roles permitidos; si no posee nivel suficiente, responde con `HTTP 403 Forbidden`.
  - **Rate Limiting ([`backend/src/middlewares/rateLimit.middleware.ts`](file:///C:/Users/exeri/Desktop/Itec/ITEC2026/Practicas%20Profesionalizantes%20II/Tesis/BikeSystem/backend/src/middlewares/rateLimit.middleware.ts)):** Aplica una ventana de tiempo de 15 minutos con un límite máximo de 5 intentos fallidos consecutivos de login por IP para prevenir ataques de fuerza bruta.
- **Componentes y Hooks Frontend:**
  - `LoginView.tsx`: Formulario reactivo con campos de usuario y contraseña, animaciones de carga y manejo de errores.
  - `AuthContext.tsx`: Contexto global de React que persiste el token en memoria/localStorage, maneja el cierre de sesión y provee la función `useAuth()` para proteger componentes visuales y botones administrativos.
- **Endpoints Expuestos:**
  - `POST /api/login` — Autenticación y entrega de token JWT.
  - `GET /api/health` — Verificación de disponibilidad del servicio.
  - `GET /api/db-test` — Diagnóstico de conexión activa con PostgreSQL en Supabase.

---

### 4.2 Módulo 2: Padrón Central de Clientes
- **Qué hace:**
  Centraliza el registro de clientes del negocio, tanto compradores de salón como usuarios que ingresan rodados a reparación.
- **Cómo lo hace:**
  - Valida unicidad de DNI en base de datos.
  - Soporta búsquedas instantáneas con índices trigram (`pg_trgm`) por nombre, apellido, DNI o teléfono, permitiendo coincidencias parciales con alta tolerancia a errores de tipeo.
  - **Protección Referencial:** Bloquea el borrado de clientes (`ON DELETE RESTRICT`) si tienen registros dependientes en ventas o bicicletas en el taller, impidiendo la pérdida de comprobantes históricos.
- **Componentes y Hooks Frontend:**
  - `ClientesView.tsx`, `ClientesTabla.tsx`, `ModalClienteForm.tsx`.
  - `useClientes.ts`: Hook que administra la paginación, debounce en la barra de búsqueda y sincronización con el servidor.
- **Endpoints Expuestos:**
  - `GET /api/clientes` — Listado paginado con búsqueda por nombre, apellido o DNI.
  - `GET /api/clientes/:id` — Ficha completa de un cliente.
  - `POST /api/clientes` — Alta de nuevo cliente con validación regex de campos.
  - `PUT /api/clientes/:id` — Modificación de información de contacto.
  - `DELETE /api/clientes/:id` — Eliminación segura con control referencial.

---

### 4.3 Módulo 3: Bicicletas de Clientes e Historia Clínica de Taller
- **Qué hace:**
  Permite asociar rodados a los clientes del padrón para canalizar las órdenes de servicio del taller mecánico. Almacena la historia clínica completa de cada bicicleta (todas las reparaciones y repuestos consumidos en el tiempo).
- **Decisión de Diseño Crítica (Alcance Real):**
  A diferencia de esquemas teóricos obsoletos que exigían obligatoriamente el número de serie grabado en el cuadro (dato que con frecuencia se encuentra borrado, repintado o es ilegible en bicicletas de uso diario), el sistema se adaptó a la dinámica real de "DN Bikes": el rodado se identifica con agilidad por **Marca**, **Modelo** y **Cliente Propietario**.
- **Cómo lo hace:**
  - Cuando se vende una bicicleta 0km desde el módulo de ventas, el sistema automáticamente genera e inserta el registro del rodado en la tabla `Bicicleta` asignado a nombre del cliente comprador.
  - Permite consultar el historial acumulado mediante un `JOIN` entre `Bicicleta`, `Reparacion` y `Detalle_Reparacion`.
- **Componentes y Hooks Frontend:**
  - `BicicletasView.tsx`, `BicicletasTabla.tsx`, `ModalAltaBicicleta.tsx`, `ModalHistorialBicicleta.tsx`.
  - `useBicicletas.ts`.
- **Endpoints Expuestos:**
  - `GET /api/bicicletas` — Listado con filtros y cliente titular.
  - `GET /api/bicicletas/:id/historial` — Ficha técnica cronológica de todas las intervenciones de taller.
  - `POST /api/bicicletas` — Vinculación de un rodado a un cliente existente.
  - `PUT /api/bicicletas/:id` — Modificación de marca/modelo.
  - `DELETE /api/bicicletas/:id` — Baja de bicicleta (restringida si posee órdenes en curso).

---

### 4.4 Módulo 4: Catálogo de Productos, Inventario y Kardex de Movimientos
- **Qué hace:**
  Administra el catálogo integral de artículos: repuestos mecánicos, accesorios de ciclismo y bicicletas nuevas para la venta. Controla el nivel de stock en tiempo real, genera alertas visuales de stock mínimo y registra una auditoría completa (Kardex) de cada entrada o salida física.
- **Cómo lo hace:**
  - **Especialización de Bicicletas 0km:** Las bicicletas nuevas heredan de la tabla maestra `Productos` y extienden sus características en `Producto_BiciNueva` (color, rodado 26/29, talle S/M/L/XL, género hombre/mujer/unisex).
  - **Baja Lógica (Soft Delete):** Los productos no se eliminan físicamente de la base de datos para no corromper reportes de ventas históricas; se desactivan (`activo = false`) y pueden reactivarse en cualquier momento (`PATCH /api/productos/:id/reactivar`).
  - **Kardex Automático:** Cualquier operación que altere el inventario (venta, anulación, taller o ajuste manual) inserta una fila en `Movimiento_Stock` detallando el tipo (`INGRESO`/`EGRESO`), cantidad, motivo y el usuario responsable.
- **Componentes y Hooks Frontend:**
  - `StockView.tsx`, `StockTabla.tsx`, `StockFiltros.tsx`, `ModalProductoForm.tsx`, `ModalAjusteStock.tsx`, `ModalHistorialMovimientos.tsx`.
  - `useStock.ts`, `useMovimientosStock.ts`.
- **Endpoints Expuestos:**
  - `GET /api/productos` — Catálogo paginado con filtros por categoría (`bicicleta`, `repuesto`, `accesorio`) y búsqueda trigram.
  - `POST /api/productos` — Alta de producto nuevo (y subtipo bicicleta si aplica).
  - `PUT /api/productos/:id` — Actualización de precio, stock y stock mínimo.
  - `DELETE /api/productos/:id` — Baja lógica del artículo en inventario.
  - `POST /api/productos/:id/movimiento` — Ajuste manual de stock asentado en Kardex.
  - `GET /api/productos/movimientos` — Historial de auditoría de movimientos de almacén.

---

### 4.5 Módulo 5: Ventas, Facturación Atómica y Comprobantes
- **Qué hace:**
  Constituye el Punto de Venta (TPV) del salón. Permite seleccionar un cliente, agregar múltiples artículos al carrito, seleccionar la modalidad de pago y procesar la transacción de forma indivisible. Además, emite el comprobante comercial formal (`FAC-XXXXXX`) con membrete e instrucciones de garantía, y permite la anulación controlada de ventas erróneas.
- **Cómo lo hace (Garantía Transaccional ACID):**
  - Abre una transacción `BEGIN` en PostgreSQL (Supabase).
  - Ordena los artículos seleccionados por `id_producto ASC` y ejecuta un bloqueo `FOR UPDATE` en cada registro de la tabla `Productos`. Esto asegura que el stock no varíe durante la liquidación y previene deadlocks con ventas concurrentes.
  - **Blindaje de Precio:** El backend rechaza cualquier precio enviado desde el cliente web; el valor unitario se consulta directamente desde la base de datos oficial.
  - Descuenta el stock de cada producto, registra el movimiento Kardex de egreso e inserta el detalle de venta.
  - Si el producto vendido es de tipo `bicicleta`, genera automáticamente el alta del rodado a nombre del cliente comprador en la tabla `Bicicleta`.
  - Cierra con `COMMIT` y audita el evento en `Bitacora_Actividad`.
  - **Anulación Segura (`POST /api/ventas/:id/anular`):** Exige motivo obligatorio de al menos 5 caracteres. Reintegra el stock exacto al almacén, asienta el movimiento Kardex de ingreso, actualiza el estado a `ANULADA` y desvincula las bicicletas del cliente si no registraron reparaciones en taller.
- **Componentes y Hooks Frontend:**
  - `VentasView.tsx`, `TabVentasListado.tsx`, `ModalNuevaVenta.tsx`, `ModalDetalleVenta.tsx`, `VentasHeader.tsx`.
  - `useCarritoVenta.ts`: Maneja el estado local del carrito (cálculo de subtotales, prevención de cantidades negativas y verificación visual de stock disponible).
  - `useVentas.ts`: Paginación y acciones de anulación.
- **Endpoints Expuestos:**
  - `GET /api/ventas` — Listado de ventas con datos de cliente, vendedor y medio de pago.
  - `GET /api/ventas/:id` — Comprobante detallado con desglose de ítems para impresión.
  - `POST /api/ventas` — Creación atómica de venta comercial.
  - `PUT /api/ventas/:id/anular` / `PATCH /api/ventas/:id/anular` — Anulación y restitución de stock.
  - `GET /api/ventas/metodos-pago/lista` — Medios de cobro disponibles (Efectivo, Débito, Crédito, Transferencia, etc.).

---

### 4.6 Módulo 6: Garantías Postventa de Rodados Nuevos
- **Qué hace:**
  Ofrece un panel de seguimiento para controlar el período legal de garantía postventa (30 días corridos) otorgado en la compra de bicicletas nuevas 0km.
- **Cómo lo hace:**
  - Ejecuta una consulta analítica sobre `Detalle_Venta` filtrando por productos de tipo `bicicleta` en ventas no anuladas.
  - Calcula mediante aritmética de fechas de PostgreSQL:
    - Fecha de vencimiento: `(fecha_venta::DATE + 30)`.
    - Días restantes: `((fecha_venta::DATE + 30) - CURRENT_DATE)::INT`.
    - Estado de cobertura: `vigente` (más de 5 días), `por_vencer` (entre 1 y 5 días) o `vencida`.
- **Componentes Frontend:**
  - `TabGarantiasListado.tsx` (dentro de `VentasView.tsx`): Tabla interactiva con badges visuales de color según el estado del plazo (verde, amarillo, rojo).
- **Endpoints Expuestos:**
  - `GET /api/ventas/garantias/listado` — Listado consolidado con filtros y contadores de estado.

---

### 4.7 Módulo 7: Taller Mecánico, Órdenes de Servicio y Tablero Kanban
- **Qué hace:**
  Gestiona el flujo completo de servicio técnico en el taller mecánico. Permite abrir órdenes de trabajo para una bicicleta de cliente, asignar tareas mecánicas, agregar repuestos consumidos con descuento automático de stock, presupuestar mano de obra y cambiar de estado las órdenes de forma ágil mediante un **Tablero Kanban visual**.
- **Cómo lo hace:**
  - Las órdenes transitan por 4 estados: `Recibida`, `En Reparación`, `Lista` y `Entregada`.
  - El costo total de la reparación se computa dinámicamente como:  
    $$\text{Costo Total} = \text{Costo Mano de Obra} + \sum (\text{Cantidad Repuesto} \times \text{Precio Unitario})$$
  - Al agregar un repuesto (`POST /api/detalle-reparacion`), se descuenta de inmediato del inventario de almacén y se crea un registro de egreso en el Kardex.
  - Si la orden pasa a `Entregada`, el sistema registra automáticamente la `fecha_egreso` y bloquea la orden contra futuras adiciones de repuestos.
- **Componentes y Hooks Frontend:**
  - `ReparacionesView.tsx`, `ReparacionesKanban.tsx`, `ReparacionesHistorialTabla.tsx`, `ModalAltaReparacion.tsx`, `ModalDetalleReparacion.tsx`, `ModalEditarReparacion.tsx`.
  - `useReparaciones.ts`: Maneja el filtrado por estados y el drag/drop entre columnas del tablero Kanban.
- **Endpoints Expuestos:**
  - `GET /api/reparaciones` — Listado con métricas de taller (órdenes activas, en curso, concluidas).
  - `GET /api/reparaciones/:id` — Ficha de la orden con repuestos y totales.
  - `POST /api/reparaciones` — Apertura de orden de taller.
  - `PUT /api/reparaciones/:id` — Modificación de mano de obra y diagnóstico.
  - `POST /api/detalle-reparacion` — Asignación de repuesto con descuento de inventario.
  - `DELETE /api/detalle-reparacion/:id` — Remoción de repuesto con reintegro al stock.

---

### 4.8 Módulo 8: Proveedores y Liquidación de Pagos/Egresos
- **Qué hace:**
  Mantiene el directorio de distribuidores mayoristas de partes y rodados, y permite registrar los egresos de dinero realizados para abonarles mercadería o facturas comerciales.
- **Cómo lo hace:**
  - Registra nombre de la empresa, CUIT único, teléfono, correo y domicilio del proveedor.
  - Cada pago asienta la fecha, el proveedor beneficiario, el método de pago empleado, el monto y las observaciones contables.
  - Estos datos alimentan directamente el cálculo del egreso global en el módulo de reportes.
- **Componentes y Hooks Frontend:**
  - `PagoProveedoresView.tsx`, `PagoProveedoresTabla.tsx`, `ModalAltaPagoProveedor.tsx`, `PagoProveedoresHeader.tsx`.
  - `usePagoProveedores.ts`.
- **Endpoints Expuestos:**
  - `GET /api/proveedores` — Directorio de proveedores mayoristas.
  - `POST /api/proveedores` — Registro de proveedor.
  - `GET /api/pagos-proveedores` — Historial paginado de pagos emitidos.
  - `POST /api/pagos-proveedores` — Liquidación de un pago con imputación contable.

---

### 4.9 Módulo 9: Analítica Financiera, Dashboard y Reportes Consolidados
- **Qué hace:**
  Proporciona a la gerencia un panel de inteligencia comercial en tiempo real. Consolida la recaudación del salón de ventas, los cobros por servicios de taller y los egresos a proveedores, computando el balance financiero neto real del negocio.
- **Cómo lo hace:**
  - **Dashboard de Inicio (`InicioView.tsx`):**
    Ejecuta consultas concurrentes en PostgreSQL mediante `Promise.all` para obtener en menos de 50 ms:
    - Total de ventas del mes en curso.
    - Total facturado por reparaciones entregadas del mes.
    - Total egresado a proveedores del mes.
    - Balance neto: $(\text{Ventas} + \text{Taller}) - \text{Egresos Proveedores}$.
    - Conteo de órdenes activas de taller por estado.
    - Lista de los 5 artículos con stock crítico por debajo del mínimo.
  - **Vistas Especializadas (`ReportesView.tsx`):**
    - Pestaña de Ventas: desglose por fechas, clientes y vendedores.
    - Pestaña de Taller: tiempos de entrega y recaudación técnica.
    - Pestaña de Balance Consolidado: resumen financiero del período.
    - Pestaña Top Productos: ranking de los 10 productos más vendidos y recaudación acumulada.
    - Función de Exportación (`exportarCSV.ts`): Descarga de planillas estructuradas en formato `.csv` compatible con Excel.
- **Endpoints Expuestos:**
  - `GET /api/reportes/dashboard` — Métricas del mes actual para la pantalla principal.
  - `GET /api/reportes/ventas` — Reporte parametrizado por fecha desde/hasta.
  - `GET /api/reportes/taller` — Reporte de facturación y mano de obra del taller.
  - `GET /api/reportes/balance-consolidado` — Balance neto entre ingresos y egresos.
  - `GET /api/reportes/top-productos` — Ranking de artículos más demandados.

---

### 4.10 Módulo 10: Bitácora Inmutable de Auditoría y Resguardo de Datos
- **Qué hace:**
  Garantiza el no repudio y la fiscalización total de las operaciones. Asienta de manera inmutable qué operador ejecutó qué acción, en qué fecha/hora y sobre qué módulo del sistema.
- **Cómo lo hace:**
  - Inserciones independientes en la tabla `Bitacora_Actividad` ante altas, modificaciones, anulaciones y ventas.
  - Si un usuario es eliminado en el futuro, la restricción foránea `ON DELETE SET NULL` preserva intactos el registro histórico y el `nombre_usuario` textual en la bitácora.
  - Visor administrativo con filtros por módulo, rango de fechas y usuario operador.
  - **Resguardo Cloud:** Copias de seguridad automáticas y recuperación continua provistas por la plataforma Supabase.
- **Componentes y Hooks Frontend:**
  - `AuditoriaView.tsx`, `AuditoriaTabla.tsx`, `AuditoriaFiltros.tsx`.
  - `useAuditoria.ts`.
- **Endpoints Expuestos:**
  - `GET /api/bitacora` — Consulta paginada de registros de auditoría (exclusivo Superadministrador).

---

## 5. INFRAESTRUCTURA, DESPLIEGUE Y REQUISITOS TÉCNICOS

### 5.1 Pipeline de Compilación y Empaquetado

El monorepo cuenta con un flujo de construcción estandarizado para generar el instalador de producción en Windows:

```bash
# 1. Compilación del Backend (Genera dist/server.cjs con esbuild)
cd backend
pnpm build

# 2. Compilación del Frontend y Empaquetado Desktop con Electron Builder
cd ../frontend
pnpm build
pnpm dist
```

El proceso genera los siguientes artefactos finales en `frontend/release/`:
- `BikeSystem Setup 1.0.0.exe`: Instalador ejecutable estándar de Windows con asistente guiado.
- `win-unpacked/`: Versión portable de la aplicación de ejecución directa sin instalación previa.

### 5.2 Variables de Entorno y Configuración
El archivo `backend/.env` debe configurarse en la raíz del backend con los siguientes parámetros obligatorios:

```ini
# Puerto de escucha del servidor Express (por defecto: 3000)
PORT=3000

# Cadena de conexión PostgreSQL alojada en Supabase Cloud (con Transaction/Session Pooler)
# Formato: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxx:password_secreta@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

# Secreto criptográfico para firma y verificación de tokens JWT (mínimo 32 caracteres)
JWT_SECRET=c1a8f9b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0
```

### 5.3 Requisitos de Hardware y Software

#### Requisitos Mínimos de la Estación de Trabajo (Cliente Desktop):
- **Sistema Operativo:** Microsoft Windows 10 (64 bits) o Windows 11.
- **Procesador:** Intel Core i3 / AMD Ryzen 3 o superior (arquitectura x64).
- **Memoria RAM:** 4 GB mínimo (8 GB recomendados para manejo fluido de la interfaz).
- **Espacio en Disco:** 300 MB libres para la aplicación empaquetada.
- **Conectividad:** Conexión a Internet de banda ancha (para sincronización con Supabase Cloud).
- **Resolución de Pantalla:** 1366 x 768 píxeles (Óptimo: 1920 x 1080 Full HD).

#### Infraestructura Cloud (Supabase):
- **Motor:** PostgreSQL 16.x administrado.
- **Extensiones Habilitadas:** `pg_trgm` (para indexación y búsquedas por similitud).
- **Cifrado:** Conexión forzada SSL/TLS.

---
*Fin del Documento de Documentación Técnica — BikeSystem 2026*
