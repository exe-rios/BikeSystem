# BikeSystem - Sistema de Gestión Integral

¡Bienvenido al repositorio de **BikeSystem**! Este proyecto es una aplicación de escritorio diseñada para la gestión integral de bicicleterías y talleres mecánicos: control de stock e inventario, facturación y punto de venta, seguimiento de reparaciones en taller (tablero Kanban), administración de clientes y bicicletas, pagos a proveedores, métricas financieras y auditoría.

El proyecto está construido bajo una arquitectura de **Monorepo**, separando el **Frontend** (Aplicación de escritorio con Electron y React) y el **Backend** (API REST con Express y PostgreSQL).

---

## Tecnologías Utilizadas

### Frontend
- **Framework:** React 19 + Vite
- **Lenguaje:** TypeScript
- **Contenedor de Escritorio:** Electron (v42)
- **Empaquetado:** electron-builder

### Backend
- **Entorno:** Node.js (v24 o superior)
- **Framework:** Express 5
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL 16 (driver nativo `pg` con pool de conexiones y soporte SSL)
- **Seguridad:** JWT (`jsonwebtoken`), bcrypt (`bcryptjs`), helmet, compresión gzip/deflate, cors y rate limiting

### Herramientas
- **Gestor de Paquetes:** pnpm (v10 / v11+)
- **Testing:** Vitest + Supertest (suite de 67 pruebas unitarias y de integración)
- **Compilador Backend:** esbuild (bundle CJS para producción)

---

## Equipo de Desarrollo

Proyecto desarrollado y mantenido por:
- **Domingues German**
- **Rios Exequiel**

---

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu máquina:
- **Node.js** (Versión recomendada: v20 o v24+).
- **PostgreSQL 16** (Instalación local o base de datos remota como Supabase / Neon).
- **pnpm**: Gestor de paquetes oficial del proyecto. Puedes instalarlo globalmente ejecutando:
  ```bash
  npm install -g pnpm
  ```

---

## Instalación y Configuración

Sigue estos pasos en orden para dejar el entorno listo para desarrollar:

### 1. Clonar el Repositorio
```bash
git clone https://github.com/exe-rios/BikeSystem.git
cd BIKESYSTEM
```

### 2. Configurar la Base de Datos (PostgreSQL)
1. Crea una base de datos en PostgreSQL (por ejemplo, `bikesystem_db`).
2. Ejecuta el script SQL con la estructura e índices iniciales:
   ```bash
   # Desde psql o tu cliente gráfico (DBeaver, pgAdmin):
   psql -U postgres -d bikesystem_db -f database/bikesystem.sql
   ```

### 3. Configuración del Backend (API)
Entra a la carpeta del backend y configura dependencias y variables de entorno:
```bash
cd backend
pnpm install

# Aprobar la ejecución de scripts para esbuild (requerido por pnpm 10+):
pnpm approve-builds
# (Selecciona 'esbuild' con espacio y presiona Enter)
```

Crea tu archivo `.env` en la carpeta `backend/` basándote en `.env.example`:
```env
PORT=3000
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/bikesystem_db
JWT_SECRET=tu_clave_secreta_super_segura_aqui
```

### 4. Inicializar Usuarios del Sistema (Seed)
Una vez configurada la base de datos, inicializa los perfiles de usuario mediante los scripts provistos:
```bash
# Dentro de la carpeta backend/:
pnpm seed:admin        # Inicializa o actualiza el usuario administrador
pnpm seed:superadmin   # Inicializa el perfil de superadministrador (desarrollo)
```

> **Nota:** Puedes pasar parámetros opcionales por línea de comandos para personalizar el nombre de usuario y la contraseña deseada:
> ```bash
> pnpm seed:admin <nombre_usuario> <contraseña>
> ```

### 5. Configuración del Frontend (Electron + React)
Abre otra terminal y configura la interfaz de escritorio:
```bash
cd frontend
pnpm install

# Aprobar la ejecución de scripts para Electron (requerido por pnpm 10+):
pnpm approve-builds
# (Selecciona 'electron' con espacio y presiona Enter)

# Descargar binarios nativos del motor de Electron:
pnpm rebuild electron
```

---

## Inicio de Sesión en el Programa

Al ejecutar la aplicación, te recibirá la pantalla de **Inicio de Sesión (Login)** con el logo oficial de **DN Bike / BikeSystem**. Cada miembro del personal debe autenticarse para acceder al panel con sus respectivos permisos de trabajo.

### Roles y Permisos en el Sistema

El acceso a las distintas funciones está regulado por control de acceso basado en roles (RBAC):

| Rol | Acceso y Módulos Habilitados |
|---|---|
| **ADMIN** | Acceso general completo: ventas, taller mecánico, control de stock, clientes, bicicletas, reportes financieros, pagos a proveedores, administración de usuarios y bitácora de auditoría. |
| **SUPERADMIN** | Perfil maestro de desarrollador con privilegios avanzados de mantenimiento y diagnóstico. |
| **EMPLEADO** | Operación diaria de mostrador y taller: Inicio, Ventas, Reparaciones (Kanban), Catálogo de Stock, Clientes y Bicicletas. *(Módulos administrativos restringidos).* |

> **Nota sobre credenciales:** Las credenciales de acceso son administradas de forma interna por el equipo o configuradas localmente durante el paso de inicialización (`seed`).

### Funcionamiento de la Sesión
- **Validación Segura:** La contraseña se verifica contra la base de datos utilizando hashing y salting con **bcrypt**.
- **Token JWT:** Tras validar las credenciales, el servidor emite un token Bearer con 8 horas de vigencia.
- **Persistencia Local:** La sesión se mantiene activa de forma persistente en la aplicación de escritorio.
- **Cerrar Sesión:** Para cambiar de usuario o finalizar la jornada, haz clic en el botón **"Cerrar Sesión"** ubicado en la parte inferior de la barra lateral izquierda.


---

## Ejecución en Desarrollo

Para trabajar en el proyecto, ejecuta ambos servicios en paralelo en dos terminales independientes:

**Terminal 1 — API Backend:**
```bash
cd backend
pnpm dev
```
*(El servidor Express iniciará en `http://localhost:3000` con recarga automática por tsx).*

**Terminal 2 — Ventana de Escritorio (Frontend):**
```bash
cd frontend
pnpm dev
```
*(Vite levantará el servidor de desarrollo y se abrirá la ventana de escritorio de Electron).*

---

## Comandos Principales del Proyecto

| Ubicación | Comando | Descripción |
|---|---|---|
| `backend/` | `pnpm dev` | Inicia la API en modo watch (auto-reload con tsx) |
| `backend/` | `pnpm test` | Ejecuta la suite de 67 pruebas con Vitest |
| `backend/` | `pnpm build` | Compila la API a un bundle CJS único (`dist/server.cjs`) |
| `backend/` | `pnpm seed:admin` | Crea o actualiza el usuario `admin` |
| `backend/` | `pnpm seed:superadmin` | Crea o actualiza el usuario `superadmin` |
| `frontend/` | `pnpm dev` | Inicia Vite y la ventana de Electron en desarrollo |
| `frontend/` | `pnpm build` | Verifica tipos con TypeScript y compila el bundle de producción |
| `frontend/` | `pnpm dist` | Compila Frontend + Backend y genera el instalador Windows (`release/BikeSystem Setup 1.0.0.exe`) |
| `frontend/` | `pnpm dist:dir` | Empaqueta el ejecutable portátil de Windows (`release/win-unpacked/BikeSystem.exe`) |
| `frontend/` | `pnpm lint` | Ejecuta el linter ESLint |

---

## Estructura del Repositorio

```text
BIKESYSTEM/
├── frontend/             # Aplicación de escritorio React 19 + Electron 42
│   ├── electron/         # Proceso principal nativo (main.ts, preload)
│   ├── src/              # Vistas (Login, Ventas, Stock, Taller), componentes y hooks
│   ├── package.json      # Dependencias y scripts del frontend
│   └── vite.config.ts    # Configuración de Vite y plugin de Electron
├── backend/              # API REST con Express 5 y TypeScript
│   ├── src/              # Controladores, rutas, servicios, middlewares y db pool
│   ├── tests/            # Tests unitarios y de integración con Vitest
│   ├── package.json      # Dependencias y scripts del backend
│   └── .env.example      # Plantilla de variables de entorno
├── database/             # Scripts de base de datos
│   └── bikesystem.sql    # Schema DDL completo con tablas, triggers e índices
├── docs/                 # Documentación técnica, manual de usuario y reportes
└── .gitattributes        # Normalización de saltos de línea (LF)
```


---

## Notas Importantes para Colaboradores

1. **Saltos de Línea (LF):** El proyecto normaliza los saltos de línea a LF a través de `.gitattributes`. No modifiques la configuración de tu editor a CRLF en Windows.
2. **Archivos Lock (`pnpm-lock.yaml`):** Nunca subas las carpetas `node_modules`. Para asegurar que todos los desarrolladores utilicen exactamente las mismas versiones de paquetes, sube siempre el archivo `pnpm-lock.yaml` cuando agregues o actualices dependencias.
3. **Descarga de Cambios:** Tras hacer `git pull`, ejecuta siempre `pnpm install` en `frontend/` y `backend/` para sincronizar paquetes.
4. **Seguridad de pnpm 10+:** Recuerda ejecutar `pnpm approve-builds` si instalas librerías que requieran compilación nativa (como `electron` o `esbuild`).
