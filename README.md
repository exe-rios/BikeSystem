# BikeSystem - Sistema de Gestión Integral

¡Bienvenido al repositorio de **BikeSystem**! Este proyecto es una aplicación de escritorio diseñada para la gestión de stock, ventas y reparaciones en talleres de bicicletas.

El proyecto está construido bajo una arquitectura de **Monorepo**, separando el Frontend (Escritorio con Electron) y el Backend (API con Express).



---

## Tecnologías utilizadas

### Frontend

- **Framework:** React + Vite
- **Lenguaje:** TypeScript
- **Contenedor de Escritorio:** Electron

### Backend

- **Entorno:** Node.js
- **Framework:** Express
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL (PostgreSQL + pg)

### Herramientas

- **Gestor de Paquetes:** pnpm (Versión 10+)



---

##  Equipo de Desarrollo

Este proyecto fue desarrollado y mantenido por:

- **Domingues German**
- **Rios Exequiel**



---

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado lo siguiente en tu máquina:

- **Node.js** (Versión recomendada: v24 o superior).
- **pnpm**: Puedes instalarlo globalmente ejecutando en tu terminal:

    ```bash
    npm install -g pnpm
    ```




---

## Instalación y Configuración

Sigue estos pasos para dejar el entorno de desarrollo listo en tu máquina local.

### 1. Clonar el repositorio

```bash
git clone https://github.com/exe-rios/BikeSystem.git
cd BIKESYSTEM
```

### 2. Configuración del Frontend (Electron + React)

Entra a la carpeta del frontend e instala las dependencias.

> ** Nota para usuarios de pnpm 10+:** Debido a políticas de seguridad, debemos aprobar manualmente los scripts de Electron.

```bash
cd frontend
pnpm install

# Aprobar la ejecución de scripts para Electron
pnpm approve-builds
# Seleccionar 'electron' con espacio y dar Enter

# Descargar los binarios del motor de Electron
pnpm rebuild electron
```

### 3. Configuración del Backend (API)

Abre otra terminal (o vuelve a la raíz) y configura el servidor:

```bash
cd backend
pnpm install

# Aprobar la ejecución de scripts para esbuild (necesario por pnpm 10+ y tsx)
pnpm approve-builds
# Seleccionar 'esbuild' con espacio y dar Enter
```

> ** Base de Datos:** Configura tus variables de entorno para PostgreSQL. Crea un archivo `.env` en la carpeta `backend/` basándote en un posible `.env.example` o solicita las credenciales al equipo.



---

## Ejecución en Desarrollo

Para trabajar en el proyecto, debes tener ambos servicios corriendo simultáneamente en terminales separadas.

**Terminal 1: Ejecutar Frontend (La ventana de escritorio)**

```bash
cd frontend
pnpm dev
```

**Terminal 2: Ejecutar Backend (El servidor de datos)**

```bash
cd backend
pnpm dev
```



---

## Estructura del Proyecto

```text
BIKESYSTEM/
├── frontend/             # Aplicación de React + Vite + Electron
│   ├── electron/         # Configuración nativa de la ventana
│   ├── src/              # Componentes, vistas y lógica de React
│   ├── package.json      # Dependencias y entry point
│   └── vite.config.ts    # Configuración del plugin de Electron
├── backend/              # API REST con Express y TS
│   ├── src/              # Controladores, modelos y rutas
│   └── package.json      # Dependencias del servidor
├── docs/                 # Documentación y archivos extras
├── BikeSystem.pdf        # Documento principal del proyecto
└── .gitattributes        # Normalización de saltos de línea (Windows/Mac/Linux)
```



---

## Notas Importantes para Colaboradores

1. **Compatibilidad (Windows / Mac / Linux):** El proyecto está configurado para normalizar los saltos de línea a LF. No cambies la configuración de tu editor a CRLF si estás en Windows.
2. **Archivos Lock (`pnpm-lock.yaml`):** Nunca subas las carpetas `node_modules` al repositorio. Para garantizar que todos tengamos exactamente las mismas versiones y evitar inconsistencias, asegúrate de **SIEMPRE subir el archivo pnpm-lock.yaml** cada vez que instales o actualices una dependencia.
3. **Descarga de Cambios:** Luego de descargar los cambios recientes desde GitHub (`git pull`), ejecuta siempre `pnpm install` en ambas carpetas. Esto leerá el archivo lock e instalará los paquetes idénticos en tu máquina.
