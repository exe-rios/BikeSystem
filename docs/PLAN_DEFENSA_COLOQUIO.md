# PLAN INTEGRAL DE DEFENSA Y COLOQUIO FINAL (15 MINUTOS) — BIKESYSTEM

**PROYECTO:** BikeSystem — Sistema Integral de Gestión Comercial y Taller Mecánico
**EMPRESA BENEFICIARIA:** DN Bikes — Esperanza, Santa Fe (Titular: Diego Nagel)
**INSTITUCIÓN:** Instituto Tecnológico El Molino (ITEC) — Tecnicatura Superior en Desarrollo de Software
**UNIDAD CURRICULAR:** Prácticas Profesionalizantes II (Prof. Nicolás Kappes)
**EQUIPO EXPOSITOR:** German Domingues • Exequiel Rios
**DURACIÓN OBJETIVO:** 15 Minutos Exactos (Exposición + Demostración en Vivo Unificada)

---

## 1. ESTRUCTURA CRONOMETRADA Y DIVISIÓN DE ORADORES (15 MINUTOS)

Para aprovechar al máximo los **15 minutos**, la defensa integra las diapositivas con una única demostración continua en vivo (**Problema Real en DN Bikes $rightarrow$ Decisión de Ingeniería $rightarrow$ Demostración en Vivo**), evitando repetir pantallas.

| Bloque | Cronómetro | Duración | Orador | Diapositiva / Pantalla en Vivo |
|---|---|---|---|---|
| 1. Apertura, Diagnóstico y Arquitectura | 00:00 - 02:30 | 2.5 min | Exequiel (Contexto) + German (Arquitectura) | Slides 1–3: Problemática en DN Bikes (cuadernos, Excel aislado y garantías en papel) y Arquitectura Monorepo (pnpm, Electron 42 con utilityProcess.fork, React 19, Express 5 y PostgreSQL). |
| 2. Búsqueda Instantánea con Trigramas (pg_trgm) | 02:30 - 04:30 | 2.0 min | German (BD) + Exequiel (Demo Stock) | Slide 4 + App (Stock): Por qué el índice B-Tree falla con ILIKE '%...%' y cómo 6 índices GIN (pg_trgm) + parser semántico resuelven "scott r29" en < 5 ms. |
| 3. Punto de Venta (POS), ACID y Anti-Deadlocks | 04:30 - 08:00 | 3.5 min | Exequiel (Demo POS) + German (Código ACID) | App (POS) + Slide 5 / VS Code: Venta en vivo (1 Bicicleta + 1 Repuesto) + PDF. Explicación del .sort() anti-deadlock, SELECT ... FOR UPDATE y los 5 impactos atómicos en venta.service.ts. |
| 4. Regla de Negocio de Garantías (30 / 180 días) | 08:00 - 10:30 | 2.5 min | Exequiel | Slide 6 + App (Garantías): Garantía de 180 días desde la compra sujeta al 1° Service obligatorio dentro de los primeros 30 días. Semáforo de estados, caso Caducada sin Service y Excepción por rol Admin. |
| 5. Taller Kanban, Kardex e Historial Clínico | 10:30 - 13:30 | 3.0 min | German (Kanban/Kardex) + Exequiel (Historial) | Slide 7 + App (Taller y Bicicletas): Drag & Drop entre columnas, imputación atómica de repuestos con egreso en Kardex, sellado al entregar y consulta del Historial Clínico con CTE json_agg. |
| 6. DER, QA (67 Tests), Documentación y Cierre | 13:30 - 15:00 | 1.5 min | Ambos | Slides 8–9: Modelo de datos relacional (11 tablas), suite de 67 tests automatizados en Vitest, Manual de Usuario ilustrado y cierre para preguntas del tribunal. |

---

## 2. GUION SINTÉTICO POR BLOQUE (QUÉ DECIR EN CADA MINUTO)

### BLOQUE 1: Apertura, Problema en DN Bikes y Arquitectura (`00:00 - 02:30` | 2.5 min)

- **Exequiel (`00:00 - 01:00` — Diagnóstico):**

    > *"Buenas tardes. Presentamos **BikeSystem**, desarrollado para la bicicletería y taller mecánico **DN Bikes** de Esperanza. Detectamos tres problemas críticos en su operatoria diaria: las órdenes de taller se anotaban en cuadernos de papel sin vínculo con el inventario; el stock se llevaba en planillas desconectadas generando desfasajes entre mostrador y taller; y las garantías de bicicletas nuevas carecían de alertas sobre el primer service obligatorio."*

- **German (`01:00 - 02:30` — Arquitectura Desktop y Monorepo):**

    > *"Para resolverlo sin costos de servidores en la nube ni dependencia de internet para operar localmente, diseñamos un **monorepo con `pnpm`** que separa `frontend` (React 19 + Vite + Electron 42), `backend` (Express 5 + TypeScript + driver `pg`) y `database` (PostgreSQL). Al compilar el instalador de Windows (`pnpm dist`), empaquetamos todo el backend con `esbuild` en un único bundle (`server.cjs`). Cuando el usuario abre BikeSystem, el proceso principal de Electron (`main.ts`, línea 48) levanta automáticamente la API en segundo plano mediante `utilityProcess.fork` y la apaga limpiamente al cerrar la ventana, logrando una experiencia 100% nativa y segura (`contextIsolation: true`, `sandbox: true`)."*


---

### BLOQUE 2: Búsqueda con Trigramas `pg_trgm` y Catálogo (`02:30 - 04:30` | 2.0 min)

- **German (`02:30 - 03:20` — Fundamento en Base de Datos):**

    > *"En una bicicletería el vendedor busca por fragmentos intermedios como `'shimano'` o `'r29'`, lo que en SQL ejecuta un `ILIKE '%termino%'`. Un índice tradicional **B-Tree** sólo sirve si se busca desde la primera letra y queda inutilizado con un comodín `%` adelante, forzando una lectura secuencial fila por fila. En `bikesystem.sql` activamos la extensión **`pg_trgm`** y creamos **6 índices GIN** sobre productos, clientes y proveedores, dividiendo el texto en trigramas de 3 caracteres para resolver cualquier búsqueda parcial en menos de 5 milisegundos."*

- **Exequiel (`03:20 - 04:30` — Demo en Vivo en Stock):**

    > *(Muestra pantalla Stock y escribe `"scott r29"`)*: *"Combinamos esos índices GIN con un parser de lenguaje natural (`parsearBusquedaAvanzada`) y `useDebounce` (300ms). Al tipear `'scott r29'`, el sistema separa el atributo estructurado `rodado = 29` y busca `'scott'` por trigramas al instante, mostrando además semáforos visuales de criticidad: Óptimo, Bajo Stock y Sin Stock."*


---

### BLOQUE 3: Punto de Venta (POS), Transacción ACID y Anti-Deadlocks (`04:30 - 08:00` | 3.5 min)

- **Exequiel (`04:30 - 06:00` — Demo en Vivo de Venta y PDF):**

    > *(Va a Ventas $rightarrow$ + Nueva Venta, busca cliente por DNI, agrega 1 Bicicleta + 1 Repuesto y confirma)*: *"Facturamos en vivo una bicicleta nueva junto con un repuesto. Al confirmar, el sistema emite automáticamente el **Comprobante PDF**, que ya incluye al pie el aviso legal de la garantía de 6 meses sujeta al primer service dentro de los 30 días."*

- **German (`06:00 - 08:00` — Explicación de Código en `venta.service.ts`):**

    > *(Muestra Slide 5 o pestaña `venta.service.ts`, líneas 55–145)*: *"En el backend (`VentaService.crearVenta`), como el mostrador y el taller descuentan stock al mismo tiempo, aplicamos tres barreras de ingeniería dentro de una transacción `BEGIN...COMMIT`:* *1. **Prevención matemática de Deadlocks (línea 56):** Si dos cajas venden los productos `#20` y `#5` en orden inverso al mismo milisegundo, se produciría un bloqueo mutuo. Por eso ordenamos el carrito en memoria de menor a mayor ID (`.sort((a, b) => a.id_producto - b.id_producto)`) antes de tocar la base de datos: todas las transacciones adquieren los candados en el mismo sentido ascendente, haciendo imposible la espera circular.* *2. **Bloqueo pesimista (`SELECT ... FOR UPDATE`, línea 82) y blindaje de precios:** Bloqueamos cada fila en `Productos`, validamos stock (`CHECK cantidad >= 0`) e ignoramos el precio del frontend tomando siempre el precio oficial de la base.* *3. **Atomicidad en 5 tablas:** Insertamos cabecera y detalle de `Venta`, descontamos `Productos`, asentamos el `'EGRESO'` en el Kardex (`Movimiento_Stock`), registramos la `Bitacora_Actividad` y, como vendimos una bicicleta (`tipo_prod === 'bicicleta'`), el sistema la **empadrona automáticamente en la tabla `Bicicleta`** a nombre del comprador. Si algo falla, se ejecuta `ROLLBACK` completo."*


---

### BLOQUE 4: Regla de Negocio de Garantías 30 / 180 días (`08:00 - 10:30` | 2.5 min)

- **Exequiel (`08:00 - 10:30` — Explicación y Demo en Pestaña Garantías):**

    > *(Cambia a Ventas $rightarrow$ Control de Garantías)*: *"Toda bicicleta nueva tiene **180 días (6 meses) de garantía contados desde la fecha de compra (`v.fecha`)**, pero sujetos a una condición técnica obligatoria: **dentro de los primeros 30 días** (que forman parte de esos 180 días totales), el cliente debe traerla al **1° Service de asentamiento** para reajustar cables y frenos.* *En SQL (`obtenerGarantiasBicicletas`, líneas 351–374) calculamos el estado en tiempo real sobre `v.fecha`:* *- Aquí vemos primera la bicicleta recién vendida en azul como **`1° Service Pendiente (30 d)`**.* *- Si pasan los 30 días y el cliente no vino, la condición se incumple y pasa a rojo: **`Caducada sin Service`**, perdiendo vigencia.* *- Si el cliente llega el día 35, un `EMPLEADO` tiene bloqueado el registro. Sólo un `ADMIN` puede tildar **Excepción Administrativa**, lo que queda auditado en la bitácora.* *- Ahora registramos en vivo el 1° Service de la bicicleta que acabamos de vender: al confirmar, pasa inmediatamente a verde **`Vigente (180 d)`** hasta cumplir los 6 meses desde la compra."*


---

### BLOQUE 5: Taller Kanban, Kardex e Historial Clínico (`10:30 - 13:30` | 3.0 min)

- **German (`10:30 - 12:30` — Demo Kanban Drag & Drop e Imputación en Kardex):**

    > *(Abre Reparaciones — Tablero Kanban)*: *"El taller se gestiona visualmente en 3 columnas operativas (**Recibida**, **En Reparación** y **Lista**) con arrastre nativo HTML5 (*Drag & Drop*). Tomamos la orden del cliente, la arrastramos a **En Reparación** y abrimos **Agregar Repuestos**.* *Al imputar un repuesto (`DetalleReparacionService.agregarRepuesto`), otra transacción ACID bloquea la orden y el producto, **prohíbe cargar una bicicleta entera como repuesto**, descuenta el inventario, recalcula el total (`mano de obra + repuestos`) y graba automáticamente un `'EGRESO'` por `'Uso Interno de Taller'` en el Kardex. Si se quita el repuesto, se revierte el stock con un `'INGRESO'`.* *Finalmente, arrastramos a **Lista** y pulsamos **Entregar a Cliente**: recién en este instante se estampa `fecha_egreso = CURRENT_DATE` y la orden queda sellada contra modificaciones."*

- **Exequiel (`12:30 - 13:30` — Demo Kardex e Historial Clínico sin N+1 Queries):**

    > *(Muestra Kardex en Stock y luego abre Historial en Bicicletas)*: *"En el **Kardex** vemos trazados ambos egresos recién generados: `'Venta Comercial'` y `'Uso Interno de Taller'`. Y al abrir el **Historial Clínico de la Bicicleta**, consultamos todas sus intervenciones pasadas, mecánicos y repuestos en una sola ventana. En `BicicletaService.obtenerHistorialBicicleta` (líneas 281–315) resolvimos esto con una **CTE (`WITH repuestos_agg`) y `json_agg`**, trayendo todo el árbol de reparaciones y repuestos en **una única consulta SQL** sin caer en el problema de N+1 queries."*


---

### BLOQUE 6: DER, QA Automatizado, Documentación y Cierre (`13:30 - 15:00` | 1.5 min)

- **German (`13:30 - 14:15` — Modelo de Datos y 67 Tests en Vitest):**

    > *(Muestra Slide 8)*: *"Todo este flujo descansa sobre un modelo relacional normalizado en 3FN de **11 tablas en PostgreSQL**, protegido con constraints físicos (`CHECK cantidad >= 0`) y validado mediante una suite automatizada de **67 tests unitarios y de integración en Vitest** que prueban concurrencia en ventas, garantías, taller, stock y roles."*

- **Exequiel (`14:15 - 15:00` — Documentación y Conclusión):**

    > *(Muestra Slide 9)*: *"Acompañamos el software con su Documentación Técnica completa y un Manual de Usuario ilustrado paso a paso con Glosario y Preguntas Frecuentes para el personal de DN Bikes. Muchas gracias y quedamos a disposición para las preguntas del tribunal."*


---

## 3. GUÍA RÁPIDA DE DEMO EN VIVO (6 A 7 MINUTOS INTEGRADOS)

| Minuto | Acción en la Aplicación | Qué destacar en 1 frase |
|---|---|---|
| 03:20 | Stock: Buscar "scott r29" | Respuesta en < 5 ms con índice GIN pg_trgm + parser de rodado/talle y semáforo de stock. |
| 04:30 | POS: Vender 1 Bicicleta + 1 Repuesto y abrir PDF | Ordenamiento .sort() anti-deadlock, FOR UPDATE, descuento en stock, alta de bicicleta y cláusula de garantía en PDF. |
| 08:30 | Garantías: Ver estado Pendiente (30 d) $\rightarrow$ Registrar 1° Service | Pasa a Vigente (180 d) sobre la misma fecha de compra; mostrar fila roja Caducada y check de Excepción Admin. |
| 10:30 | Taller Kanban: Drag & Drop $\rightarrow$ Agregar Repuesto $\rightarrow$ Entregar | Descuento atómico, recálculo de total y sellado definitivo con fecha_egreso = CURRENT_DATE. |
| 12:30 | Kardex + Bicicletas: Ver movimientos y abrir Historial Clínico | Trazabilidad inmutable en Kardex y ficha clínica completa resuelta con CTE + json_agg. |

---

## 4. CHECKLIST PREVIO A ENTRAR AL AULA (PREPARACIÓN EN 2 MINUTOS)

1. **Presentación abierta:**
    - `docs/Presentacion_Defensa_BikeSystem.pptx` (PowerPoint editable), `docs/Presentacion_Defensa_BikeSystem.html` (con cronómetro integrado de 15 min) o `docs/Presentacion_Defensa_BikeSystem.pdf`.
2. **Aplicación BikeSystem corriendo** en la vista inicial (Dashboard) con sesión de Administrador iniciada.
3. **VS Code abierto** con zoom cómodo (`Ctrl + +`) en las 3 pestañas clave por si el tribunal pide profundizar en código:
    - `backend/src/services/venta.service.ts` (Línea 56: `.sort()` anti-deadlock; Línea 82: `FOR UPDATE`; Línea 351: SQL de garantías 30/180 días).
    - `backend/src/services/detalleReparacion.service.ts` (Línea 43: transacción de repuestos en taller y Kardex).
    - `backend/src/services/bicicleta.service.ts` (Línea 281: CTE `WITH repuestos_agg` + `json_agg`).
4. **PDFs de respaldo abiertos:** `docs/Documentacion tecnica.pdf` y `docs/Manual de Usuario.pdf`.