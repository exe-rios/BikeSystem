# Manual de Usuario Oficial — BikeSystem (DN Bike)

> **Guía integral y didáctica para la operación de taller mecánico, control de stock, gestión de ventas, administración de clientes y toma de decisiones financieras.**  
> **Desarrolladores:** German Domingues • Exequiel Rios  
> **Versión:** 1.0 • Año 2026  
> **Institución:** ITEC - Tecnicatura Superior en Desarrollo de Software

---

## Índice General de Contenidos

1. [Capítulo 1: Introducción y Primeros Pasos](#capítulo-1-introducción-y-primeros-pasos)
2. [Capítulo 2: Navegación e Interfaz Principal](#capítulo-2-navegación-e-interfaz-principal)
3. [Capítulo 3: Panel de Inicio (Dashboard)](#capítulo-3-panel-de-inicio-dashboard)
4. [Capítulo 4: Gestión de Stock e Inventario](#capítulo-4-gestión-de-stock-e-inventario)
5. [Capítulo 5: Punto de Venta (Mostrador y Facturación)](#capítulo-5-punto-de-venta-mostrador-y-facturación)
6. [Capítulo 6: Taller Mecánico y Reparaciones](#capítulo-6-taller-mecánico-y-reparaciones)
7. [Capítulo 7: Bicicletas de Clientes](#capítulo-7-bicicletas-de-clientes)
8. [Capítulo 8: Padrón de Clientes](#capítulo-8-padrón-de-clientes)
9. [Capítulo 9: Pagos a Proveedores (Administración)](#capítulo-9-pagos-a-proveedores-administración)
10. [Capítulo 10: Reportes y Métricas del Negocio](#capítulo-10-reportes-y-métricas-del-negocio)
11. [Capítulo 11: Usuarios y Seguridad](#capítulo-11-usuarios-y-seguridad)
12. [Capítulo 12: Auditoría del Sistema](#capítulo-12-auditoría-del-sistema)
13. [Capítulo 13: Preguntas Frecuentes (FAQ)](#capítulo-13-preguntas-frecuentes-faq)
14. [Capítulo 14: Buenas Prácticas y Glosario](#capítulo-14-buenas-prácticas-y-glosario)

---

## Capítulo 1: Introducción y Primeros Pasos

Bienvenido al Manual de Uso de **BikeSystem (DN Bike)**. Esta aplicación de escritorio fue diseñada para simplificar y optimizar todas las actividades que se desarrollan en una bicicletería moderna: desde el registro y control de piezas de repuesto en el mostrador, hasta el seguimiento minucioso de cada bicicleta ingresada al taller mecánico para service o reparación.

### 1.1 Requisitos Mínimos del Equipo
Para operar la aplicación con total fluidez, tu computadora de trabajo debe contar con:
- **Sistema Operativo:** Windows 10 o Windows 11, macOS o distribución Linux moderna.
- **Memoria RAM:** 4 GB mínimo (8 GB recomendado).
- **Resolución de Pantalla:** 1280 x 720 píxeles o superior para visualizar cómodamente el tablero de taller.

### 1.2 Acceso al Sistema (Pantalla de Login)
Al abrir la aplicación, te recibirá la pantalla de autenticación. Cada integrante del equipo posee sus propias credenciales de acceso para garantizar la seguridad y trazabilidad de las operaciones.

1. **Ingresá tu Usuario:** Completá la casilla "Nombre de usuario" con el identificador asignado por la administración (por ejemplo, `mecanico1` o `admin`).
2. **Ingresá tu Contraseña:** Escribí tu clave en la casilla correspondiente (los caracteres se ocultarán automáticamente por seguridad).
3. **Hacé clic en "Iniciar Sesión":** El sistema validará tus credenciales y te dará acceso al entorno de trabajo correspondiente a tu perfil de permisos.

![Pantalla de Login](manual/imagenes/cap01_login.png)
*Figura 1.1: Pantalla de acceso al sistema con autenticación de usuarios y validación de credenciales.*

### 1.3 Perfiles de Usuario y Permisos
El sistema adapta sus opciones y botones según el rol que tengas asignado:

| Rol | Perfil Destinado | Módulos Visibles y Acciones Habilitadas |
|---|---|---|
| **EMPLEADO** | Mecánicos de taller y vendedores de mostrador. | Inicio, Punto de Venta, Taller de Reparaciones (Kanban), Catálogo de Stock (consulta y solicitud de ajustes), Padrón de Clientes y Bicicletas. |
| **ADMINISTRADOR / SUPERADMIN** | Dueños, encargados de sucursal y contadores. | Acceso total: todo lo de Empleado más Registro de Pagos a Proveedores, Reportes y Métricas Financieras, Gestión de Cuentas de Usuarios y Bitácora de Auditoría. |

> ℹ **Seguridad al finalizar el turno:** Al terminar tu jornada o retirarte de la máquina, hacé clic en el botón "Cerrar Sesión" ubicado al final de la barra lateral izquierda. Esto impide que otra persona realice cobros o modificaciones bajo tu nombre.

---

## Capítulo 2: Navegación e Interfaz Principal

La aplicación ofrece un diseño limpio, moderno e intuitivo, pensado para que encuentres cualquier función en un par de clics sin necesidad de cursos complejos.

### 2.1 Partes de la Pantalla
- 📌 **1. Barra Lateral (Menú Izquierdo):** Contiene el logo de DN Bike y la lista de todos los módulos disponibles. El módulo en el que estás trabajando se resalta en color azul oscuro.
- 👤 **2. Ficha de Usuario Activo:** Ubicada al pie del menú lateral. Muestra tus iniciales, tu nombre de usuario, tu rol actual y el botón rojo para Cerrar Sesión de forma segura.
- 🖥 **3. Área Central de Trabajo:** Espacio amplio donde se despliegan las tablas, tableros Kanban, formularios y gráficos del módulo seleccionado.
- 🔍 **4. Buscadores y Filtros en Tiempo Real:** Cada pantalla cuenta con su propio buscador instantáneo: basta con escribir las primeras letras para ver los resultados al instante.

![Interfaz General](manual/imagenes/cap02_interfaz_general.png)
*Figura 2.1: Vista panorámica del sistema destacando la barra de navegación lateral, el perfil activo y el área central.*

### 2.2 Código de Colores del Sistema
Para facilitar la lectura rápida de un solo vistazo, el sistema emplea colores estandarizados:
- **VERDE (Completado / Saludable):** Ventas concretadas, reparaciones entregadas, stock en niveles óptimos y garantías vigentes.
- **AMARILLO / ÁMBAR (Atención / En Proceso):** Reparaciones en banco de trabajo, stock próximo al mínimo sugerido o garantías prontas a vencer.
- **ROJO (Crítico / Alerta):** Productos sin stock (0 unidades), reparaciones con demoras, garantías vencidas o ventas anuladas.

---

## Capítulo 3: Panel de Inicio (Dashboard)

El Panel de Inicio es el centro de mando que te recibe al abrir la aplicación. Te brinda una radiografía exacta del estado del taller y del mostrador en tiempo real.

### 3.1 Acciones Rápidas
En la parte superior encontrarás botones destacados para las operaciones más frecuentes:
- **+ Nueva Venta:** Abre instantáneamente la ventana de cobro de mostrador y carrito.
- **+ Ingresar Bicicleta / Gestionar Taller:** Conduce al taller mecánico para registrar una orden de servicio o supervisar el banco de trabajo.
- **+ Nuevo Producto:** Abre el formulario para ingresar un artículo o bicicleta al catálogo.

### 3.2 Bloques Informativos del Dashboard
- ⚠ **Alertas de Stock Mínimo:** Detecta automáticamente los repuestos y artículos con pocas unidades. Al presionar sobre la alerta, el sistema te redirige a la ficha del producto para ordenar su reposición.
- 🔧 **Resumen de Taller y Finanzas:** Informa la cantidad de bicicletas en reparación activa, cuántas ya están terminadas listas para entrega, y el volumen de recaudación de la jornada (restringido a administradores).

### 3.3 Últimos Movimientos Registrados
En la zona inferior se actualiza en vivo una lista con las ventas más recientes y las últimas reparaciones que entraron o salieron del taller, permitiendo verificar qué se estuvo operando en el mostrador durante el día.

![Dashboard de Inicio](manual/imagenes/cap03_dashboard_completo.png)
*Figura 3.1: Panel de Inicio con acceso directo a ventas, alertas de stock mínimo, resumen de taller y tabla de movimientos en vivo.*

---

## Capítulo 4: Gestión de Stock e Inventario

El módulo de Stock garantiza que nunca te quedes sin repuestos indispensables (cámaras, cubiertas, cables, cadenas) y te permite controlar con precisión cuántas bicicletas nuevas tenés en el salón de ventas.

### 4.1 Tipos de Artículos en Catálogo

| Tipo | Descripción | Datos Específicos Requeridos |
|---|---|---|
| **Bicicleta Nueva** | Unidades 0 km destinadas a la venta en salón. | Marca, Modelo, Color, Rodado (ej. 29, 26, 20) y Talle de cuadro (ej. S, M, L, XL). |
| **Repuesto** | Piezas mecánicas utilizadas tanto para venta directa como para reparaciones de taller. | Nombre de la pieza, Marca, Modelo de compatibilidad, Precio unitario, Cantidad y Stock Mínimo. |
| **Accesorio** | Cascos, luces LED, caramañolas, infladores, candados, indumentaria, etc. | Nombre del accesorio, Marca, Precio al público y Cantidad en depósito. |

![Catálogo de Stock](manual/imagenes/cap04_stock_catalogo.png)
*Figura 4.1: Catálogo General de Inventario y Stock con filtros por tipo, disponibilidad y buscador instantáneo.*

### 4.2 Cómo Dar de Alta un Producto Nuevo (Paso a Paso)
1. **Abrí el Formulario:** Hacé clic en el botón azul "+ Nuevo Producto" ubicado arriba a la derecha.
2. **Elegí el Tipo de Artículo:** Seleccioná en la lista desplegable si es Bicicleta, Repuesto o Accesorio. Si elegís Bicicleta, se habilitarán los campos de rodado, talle y color.
3. **Completá los Datos Comerciales:** Ingresá el Nombre (ej. "Cámara Chaoyang 29×2.10 Válvula Auto"), Marca, Precio de Venta al Público, Cantidad Inicial física en depósito y Stock Mínimo sugerido (ej. 5 unidades).
4. **Guardar en el Sistema:** Hacé clic en "Guardar Producto". El artículo ya estará disponible inmediatamente para vender o usar en taller.

![Modal Nuevo Producto](manual/imagenes/cap04_stock_modal_nuevo.png)  
*Figura 4.2: Formulario de alta para nuevos repuestos y bicicletas con campos específicos por tipo y alerta de stock mínimo.*

### 4.3 Ajuste Manual de Stock (Entradas y Salidas)
Si recibiste un pedido de mercadería o descubriste una pieza defectuosa, utilizá la herramienta de Ajuste de Stock para dejar registro formal:
- **Búsqueda Rápida de Productos:** Cuenta con una barra de búsqueda predictiva en tiempo real (*search-as-you-type*). En lugar de recorrer extensas listas desplegables, podés tipear directamente el nombre, código ID (ej. `#151`), marca o modelo para seleccionar el producto al instante con teclado o mouse.
- **INGRESO:** Suma unidades al stock. Ideal para recepción de compras o devoluciones de clientes.
- **EGRESO:** Resta unidades. Útil ante roturas, mercadería fallada de fábrica o mermas de inventario.
- **Motivo y Observaciones:** El sistema exige indicar el motivo (ej. "Compra / Reposición a Proveedor").

![Modal Ajuste de Stock](manual/imagenes/cap04_stock_modal_ajuste.png)  
*Figura 4.3: Ventana de Ajuste Manual de Stock (Ingresos y Egresos) con selector predictivo de producto y motivo contable.*

---

## Capítulo 5: Punto de Venta (Mostrador y Facturación)

El módulo de Ventas está optimizado para cobrar en el mostrador de forma rápida, evitando filas y manteniendo el inventario actualizado al segundo.

### 5.1 Guía para Concretar una Venta Paso a Paso
1. **Iniciar la Operación:** Hacé clic en el botón "+ Nueva Venta". Se abrirá la ventana de caja.
2. **Identificar al Cliente (Consumidor Final o Padrón):** Por defecto se preselecciona **Consumidor Final (S/DNI - Venta Mostrador)** para agilizar las ventas menores de mostrador, permitiendo consignar opcionalmente Nombre, Apellido y DNI en el ticket sin sobrecargar la base de datos de clientes. Si se trata de un cliente habitual registrado, podés elegirlo directamente en la lista.
3. **Seleccionar Método de Pago:** Elegí entre Efectivo, Transferencia Bancaria, Mercado Pago o Cheque.
4. **Buscar y Agregar Artículos al Carrito:** Buscá el artículo por nombre o categoría. Indicá la cantidad y presioná "Añadir". El sistema alertará de inmediato si se supera el stock disponible.
5. **Verificar Totales y Finalizar:** Revisá el subtotal y el total general. Hacé clic en "Finalizar Venta". Se descontará el stock al instante y quedará registrado el ticket de cobro.

![Punto de Venta Mostrador](manual/imagenes/cap05_ventas_mostrador.png)  
*Figura 5.1: Modal de Punto de Venta (POS) en mostrador: selección de cliente con soporte para Consumidor Final, medios de cobro y carrito interactivo.*

### 5.2 Anulación de Ventas Erróneas
1. Buscá la venta en la pestaña "Ventas de Mostrador" (Historial de Comprobantes).
2. Hacé clic en "Ver Detalle" para inspeccionar los artículos del ticket.
3. Presioná el botón rojo "Anular Venta".
4. Escribí obligatoriamente el motivo de la anulación.
5. Al confirmar, todos los productos del ticket volverán a sumarse automáticamente al stock.

![Historial de Ventas](manual/imagenes/cap05_ventas_historial.png)  
*Figura 5.2: Pestaña de Ventas de Mostrador con filtros de comprobante, cliente y botones de visualización y anulación.*

### 5.3 Pestaña de Control de Garantías y 1° Service Bonificado
El sistema genera automáticamente el control de garantías para bicicletas y artículos vendidos:
- **VIGENTE:** El producto o rodado está dentro del período de cobertura legal (6 meses para bicicletas).
- **1° SERVICE PENDIENTE:** Bicicletas vendidas con service bonificado a los 30 días de la compra. Al presionar **"Registrar Service"**, el rodado ingresa automáticamente a taller sin costo para calibración y asentamiento.
- **POR VENCER:** Faltan menos de 30 días para expirar el plazo de cobertura.
- **CADUCADA:** Cobertura concluida o plazo vencido.

![Control de Garantías](manual/imagenes/cap05_ventas_garantias.png)  
*Figura 5.3: Monitoreo de garantías clasificadas según su vigencia temporal, alertas preventivas y control del 1° Service bonificado.*

---

## Capítulo 6: Taller Mecánico y Reparaciones

El módulo de Reparaciones es la herramienta central para el taller. Organiza el trabajo mediante un **Tablero Kanban** visual con 4 etapas de servicio.

### 6.1 Las 4 Columnas del Tablero Kanban

| Columna | Estado del Servicio | ¿Qué significa en la práctica? |
|---|---|---|
| **1. RECIBIDA** | Ingreso reciente al taller | La bicicleta fue recibida en el local, se anotó la falla relatada y espera turno en el banco de trabajo. |
| **2. EN REPARACIÓN** | Trabajo activo | El mecánico tiene la bicicleta en el potro, desmontando piezas, limpiando o calibrando. |
| **3. LISTA** | Service concluido | La reparación finalizó, la bicicleta fue probada y se encuentra limpia esperando retiro. |
| **4. ENTREGADA** | Retiro y cobro | El cliente retiró el rodado, abonó mano de obra y repuestos. Pasa al historial del taller. |

![Tablero Kanban de Taller](manual/imagenes/cap06_reparaciones_kanban.png)
*Figura 6.1: Tablero Kanban de Taller Mecánico con flujo de tarjetas por estado y conteo de bicicletas en servicio.*

### 6.2 Flujo de Reparación Paso a Paso
1. **Ingresar la Orden de Servicio:** Hacé clic en "Registrar Nueva Reparación". Seleccioná la bicicleta del cliente, detallá los problemas y el costo inicial de mano de obra.
2. **Iniciar el Trabajo en el Taller:** Cuando el mecánico tome la bicicleta, arrastrá la tarjeta a "En Reparación".
3. **Cargar los Repuestos Utilizados:** Hacé clic en "Agregar Repuestos" / "Editar". Seleccioná las piezas del inventario colocadas en la bicicleta.
4. **Marcar como Lista y Notificar:** Al finalizar la calibración, mové la tarjeta a "Lista".
5. **Entrega y Liquidación:** Al retirar el cliente, se presiona "Entregar Orden" y se liquida el cobro.

![Modal Nueva Reparación](manual/imagenes/cap06_reparaciones_modal_nueva.png)  
*Figura 6.2: Registro de ingreso de orden de trabajo al taller con detalle de desperfectos y presupuesto inicial.*

![Modal Repuestos en Reparación](manual/imagenes/cap06_reparaciones_modal_repuestos.png)  
*Figura 6.3: Carga de repuestos utilizados, liquidación de costos y generación de talón de retiro.*

---

## Capítulo 7: Bicicletas de Clientes

Permite registrar las bicicletas de tus clientes para conservar su historial mecánico para siempre.

### 7.1 Cómo Registrar una Bicicleta
1. Ingresá a "Bicicletas Clientes" y presioná "Registrar Bicicleta".
2. Seleccioná al Cliente Propietario en la lista.
3. Indicá la Marca y el Modelo.
4. Presioná "Guardar".

![Listado de Bicicletas](manual/imagenes/cap07_bicicletas_listado.png)  
*Figura 7.1: Padrón de bicicletas asociadas a clientes con acceso a ficha técnica y edición.*

![Modal Registrar Bicicleta](manual/imagenes/cap07_bicicletas_modal_nueva.png)  
*Figura 7.2: Formulario para dar de alta una nueva bicicleta vinculada a un cliente.*

### 7.2 Ficha Técnica e Historial Clínico
Al presionar el botón "Historial" de cualquier bicicleta, el sistema te muestra la ficha técnica completa: todas las reparaciones históricas, repuestos sustituidos, fallas previas y costos acumulados.

![Modal Historial Clínico](manual/imagenes/cap07_bicicletas_historial.png)  
*Figura 7.3: Ficha técnica e historial histórico de servicios técnicos del rodado.*

---

## Capítulo 8: Padrón de Clientes

Centraliza la libreta de contactos de tu comercio en un solo lugar seguro y ordenado.

### 8.1 Registro de Clientes
Haciendo clic en "Registrar Cliente" podés registrar a una persona completando:
- **Nombre y Apellido:** Identificación oficial del cliente.
- **DNI:** Documento nacional (el sistema valida que no esté repetido para evitar duplicados).
- **Teléfono de Contacto:** Fundamental para avisos de entrega.
- **Correo Electrónico y Dirección:** Datos para comprobantes o promociones.

![Listado de Clientes](manual/imagenes/cap08_clientes_listado.png)
*Figura 8.1: Padrón integral de clientes con buscador instantáneo, datos de contacto y acciones.*

![Modal Registrar Cliente](manual/imagenes/cap08_clientes_modal_nuevo.png)
*Figura 8.2: Formulario para incorporar nuevos clientes con validación automática de documento.*

---

## Capítulo 9: Pagos a Proveedores (Administración)

*Disponible únicamente para usuarios con rol de Administrador o Superadmin.*  
Permite registrar todas las salidas de dinero destinadas a la compra de repuestos, accesorios e insumos con distribuidores mayoristas de ciclismo.

### 9.1 Cómo Cargar un Pago
1. Ingresá a "Pagos a Proveedores" y presioná "Registrar Pago".
2. Escribí o seleccioná el Nombre de la Empresa Proveedora.
3. Elegí el Método de Pago (Transferencia, Cheque, Efectivo).
4. Ingresá el Monto Total abonado.
5. Completá las Observaciones con el número de factura o remito.
6. Hacé clic en "Registrar Pago".

![Listado de Pagos a Proveedores](manual/imagenes/cap09_proveedores_listado.png)
*Figura 9.1: Historial consolidado de egresos por compras a distribuidores e insumos comerciales.*

![Modal Registrar Pago](manual/imagenes/cap09_proveedores_modal_nuevo.png)
*Figura 9.2: Formulario de egreso de caja para pago a proveedores con medio de pago y observaciones.*

---

## Capítulo 10: Reportes y Métricas del Negocio

Módulo exclusivo de nivel gerencial para evaluar la rentabilidad del negocio en tiempo real.

### 10.1 Indicadores Clave (KPIs)
- 💰 **Facturación en Mostrador:** Suma total ingresada por ventas directas.
- 🔧 **Recaudación por Taller:** Ingresos generados por servicios mecánicos y repuestos en reparaciones.
- 📉 **Egresos a Proveedores:** Total destinado a reabastecer inventario y pagar facturas mayoristas.
- 📈 **Utilidad Operativa Neta:** Balance real: (Ingresos Ventas + Ingresos Taller) menos Egresos a Proveedores.

![Reporte de Balance](manual/imagenes/cap10_reportes_balance.png)
*Figura 10.1: Pestaña de Balance Financiero con cálculo de margen operativo, ticket promedio y rentabilidad.*

### 10.2 Pestañas de Análisis
- **Balance:** Comportamiento comparativo mes a mes de ingresos frente a gastos.
- **Ventas:** Días de mayor facturación y medios de cobro elegidos.
- **Taller:** Promedio de cobro por orden, tiempo medio de reparación y rodados entregados.
- **Top Productos:** Ranking de artículos más vendidos y márgenes.

![Reporte de Ventas](manual/imagenes/cap10_reportes_ventas.png)  
*Figura 10.2: Análisis estadístico de ventas en mostrador con medios de pago y evolución temporal.*

![Reporte de Taller](manual/imagenes/cap10_reportes_taller.png)  
*Figura 10.3: Rendimiento y liquidaciones de taller mecánico por período y tipo de servicio.*

![Reporte Top Productos](manual/imagenes/cap10_reportes_top_productos.png)  
*Figura 10.4: Ranking de productos y repuestos más comercializados.*

---

## Capítulo 11: Usuarios y Seguridad

*Disponible únicamente para administradores.* Permite administrar las cuentas del personal.

### 11.1 Alta y Edición de Cuentas
- **Crear Usuario:** Asigná un nombre de usuario (mínimo 3 caracteres), contraseña segura y rol (EMPLEADO o ADMIN).
- **Cambiar Contraseña:** Asignación inmediata de nueva clave ante olvido del colaborador.
- **Dar de Baja:** Inhabilitación de cuentas de exempleados preservando el historial de operaciones realizadas.

![Listado de Usuarios](manual/imagenes/cap11_usuarios_listado.png)  
*Figura 11.1: Tabla de gestión de empleados y cuentas activas con diferenciación de roles y estados.*

![Modal Nuevo Usuario](manual/imagenes/cap11_usuarios_modal_nuevo.png)  
*Figura 11.2: Formulario de alta para nuevos colaboradores con asignación de usuario, contraseña y rol.*

---

## Capítulo 12: Auditoría del Sistema y Respaldos

*Módulo de máxima transparencia, seguridad y control interno.* La Bitácora registra de forma automática e inalterable cada acción importante en la aplicación:

| Dato Registrado | Descripción | Ejemplo Real |
|---|---|---|
| **Fecha y Hora** | Momento exacto del evento | 05/10/2026 19:44 hs |
| **Usuario** | Responsable de la acción | `superadmin` / `admin` |
| **Módulo** | Pantalla donde ocurrió la operación | VENTAS / STOCK / USUARIOS / SEGURIDAD |
| **Acción y Detalle** | Explicación puntual del cambio | "Registro de Venta #16", "Alta de Producto #151", o "GENERAR_RESPALDO" |

![Bitácora de Auditoría](manual/imagenes/cap12_auditoria_bitacora.png)  
*Figura 12.1: Registro inalterable de auditoría con trazabilidad por módulo, usuario responsable y botón de descarga de Respaldo SQL.*

### 12.1 Copias de Seguridad y Respaldo SQL
Para prevenir pérdidas imprevistas de información ante fallas de hardware o renovación de equipos, la pantalla de Auditoría incluye el botón **"Descargar Respaldo SQL"**. Al accionarlo, se descarga al instante un volcado íntegro de la base de datos PostgreSQL y se asienta el evento `GENERAR_RESPALDO` en la bitácora institucional.

---

## Capítulo 13: Preguntas Frecuentes (FAQ)

- ❓ **¿Qué hago si el sistema me dice "Stock insuficiente" al agregar un producto?**  
  Significa que el almacén tiene 0 unidades registradas o que la cantidad solicitada supera las existencias físicas. Primero andá a **Stock → Ajustar Stock**, registrá el **INGRESO** de las unidades y luego continuá con la venta.
- ❓ **Me equivoqué al cobrar y puse "Efectivo" en vez de "Transferencia". ¿Cómo lo arreglo?**  
  Andá a **Ventas → Historial de Ventas**, abrí el detalle de la venta equivocada y hacé clic en **Anular Venta** indicando el motivo. El stock regresará automáticamente. Luego creá una **Nueva Venta** con el método de pago correcto.
- ❓ **Un cliente trajo la bicicleta y no la encuentro en la lista de reparaciones.**  
  Las órdenes requieren que la bicicleta esté previamente cargada. Primero registrá al cliente en **Clientes**, luego cargá su rodado en **Bicicletas Clientes** y finalmente abrí la orden en **Reparaciones**.
- ❓ **¿Por qué un empleado no puede ver los botones de Reportes o Pagos a Proveedores?**  
  Por confidencialidad comercial, la facturación general, compras a proveedores, balances y auditoría están reservados para usuarios con rol **ADMINISTRADOR**.
- ❓ **Si elimino un producto que ya no vendo, ¿se pierden las ventas viejas?**  
  No. BikeSystem implementa **"bajas lógicas"**. El producto se oculta para nuevas operaciones, pero los tickets históricos y balances se conservan intactos.

---

## Capítulo 14: Buenas Prácticas y Glosario

### 14.1 Protocolo Recomendado para el Taller y Mostrador
- **A. Apertura del Día:** Abrir la aplicación, verificar las Alertas de Stock en Inicio y revisar el tablero Kanban para planificar los turnos.
- **B. Operación Diaria:** Cargar de inmediato cada repuesto colocado en una bicicleta para evitar olvidos al cobrar.
- **C. Cierre de Turno:** Asegurar que las bicicletas entregadas estén marcadas correspondientemente, cuadrar caja y presionar **Cerrar Sesión**.

### 14.2 Glosario de Términos del Sistema

| Término | Significado Práctico en BikeSystem |
|---|---|
| **Tablero Kanban** | Método visual de tarjetas en columnas (Recibida, En Reparación, Lista, Entregada) para seguir el avance del taller. |
| **Stock Mínimo** | Cantidad de reserva para disparar alertas preventivas de compra antes de que se agote una pieza. |
| **Mano de Obra** | Costo del trabajo técnico mecánico, independiente del precio de repuestos. |
| **Trazabilidad** | Capacidad de reconstruir la historia completa de un producto o bicicleta. |
| **Baja Lógica** | Ocultar un registro del catálogo activo sin borrarlo de la base de datos, protegiendo balances pasados. |
| **Bitácora** | Registro inalterable de auditoría sobre cada movimiento realizado por usuarios. |

---

**BikeSystem • DN Bike** — Sistema de Gestión Integral para Bicicleterías y Talleres Mecánicos.  
Desarrollado por **German Domingues & Exequiel Rios** • Todos los derechos reservados • 2026.
