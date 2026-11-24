import { pool } from '../config/db.js';
import { BitacoraService } from './bitacora.service.js';

const PG_DATE_OID = 1082;
const REDACTED_SUPERADMIN_HASH = '$2b$10$REDACTED_SUPERADMIN_RESTORE_REQUIRED_0000000000000000000';

/**
 * Servicio de Respaldo y Recuperación de Base de Datos (RNF3).
 * Implementación 100% nativa en TypeScript sin dependencias de Docker ni comandos del sistema operativo.
 */
export class BackupService {
  /**
   * Genera un volcado SQL completo y estructurado de todas las tablas de BikeSystem.
   * Incluye datos maestros, catálogos, operaciones comerciales, taller, pagos pendientes y auditoría.
   */
  static async generarRespaldoSQL(usuario?: { id_usuario?: number; nombre_usuario?: string; rol?: string }): Promise<{
    contenidoSQL: string;
    nombreArchivo: string;
    estadisticas: Record<string, number>;
  }> {
    const ahora = new Date();
    const formatoFecha = (d: Date) => {
      const anio = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      const horas = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return { fechaStr: `${anio}-${mes}-${dia}`, timestampStr: `${anio}-${mes}-${dia}_${horas}-${mins}` };
    };

    const { fechaStr, timestampStr } = formatoFecha(ahora);
    const nombreArchivo = `Backup_BikeSystem_${timestampStr}.sql`;
    const esSuperadmin = (usuario?.rol || '').toUpperCase() === 'SUPERADMIN';

    // Orden topológico estricto para evitar violaciones de integridad referencial
    const tablasOrdenadas: Array<{ nombre: string; colPk?: string; tieneIdentidad: boolean }> = [
      { nombre: 'metodo_pago', colPk: 'id_metodo_pago', tieneIdentidad: true },
      { nombre: 'usuario', colPk: 'id_usuario', tieneIdentidad: true },
      { nombre: 'configuracion_sistema', colPk: 'clave', tieneIdentidad: false },
      { nombre: 'proveedor', colPk: 'id_proveedor', tieneIdentidad: true },
      { nombre: 'cliente', colPk: 'id_cliente', tieneIdentidad: true },
      { nombre: 'productos', colPk: 'id_producto', tieneIdentidad: true },
      { nombre: 'producto_bicinueva', colPk: 'id_producto', tieneIdentidad: false },
      { nombre: 'bicicleta', colPk: 'id_bicicleta', tieneIdentidad: true },
      { nombre: 'movimiento_stock', colPk: 'id_movimiento', tieneIdentidad: true },
      { nombre: 'venta', colPk: 'id_venta', tieneIdentidad: true },
      { nombre: 'detalle_venta', colPk: 'id_detalle_venta', tieneIdentidad: true },
      { nombre: 'reparacion', colPk: 'id_reparacion', tieneIdentidad: true },
      { nombre: 'detalle_reparacion', colPk: 'id_detalle_rep', tieneIdentidad: true },
      { nombre: 'pago_proveedor', colPk: 'id_pago', tieneIdentidad: true },
      { nombre: 'pago_proveedor_pendiente', colPk: 'id_pendiente', tieneIdentidad: true },
      { nombre: 'bitacora_actividad', colPk: 'id_bitacora', tieneIdentidad: true }
    ];

    const estadisticas: Record<string, number> = {};
    const bloquesSQL: string[] = [];

    // 1. Encabezado formal del script
    bloquesSQL.push(`-- ====================================================================`);
    bloquesSQL.push(`-- BIKESYSTEM - COPIA DE SEGURIDAD INTEGRAL DE BASE DE DATOS (RNF3)`);
    bloquesSQL.push(`-- Generado el: ${ahora.toISOString()} (${fechaStr})`);
    bloquesSQL.push(`-- Generado por: ${usuario?.nombre_usuario || 'Administrador del Sistema'}`);
    bloquesSQL.push(`-- Motor: PostgreSQL (Supabase / Nativo)`);
    bloquesSQL.push(`-- ====================================================================\n`);
    bloquesSQL.push(`BEGIN;`);
    bloquesSQL.push(`-- Limpieza previa segura en orden inverso para restauración sin colisiones ni comandos privilegiados`);
    bloquesSQL.push(
      `TRUNCATE TABLE ${[...tablasOrdenadas].reverse().map(t => t.nombre).join(', ')} RESTART IDENTITY CASCADE;\n`
    );

    const client = await pool.connect();

    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');

      // Detectar cuentas SUPERADMIN para mantener aislamiento respecto a respaldos generados por ADMIN
      const superadminIds = new Set<number>();
      const referencedSuperadminIds = new Set<number>();

      if (!esSuperadmin) {
        const resSuper = await client.query(
          `SELECT id_usuario FROM usuario WHERE rol = 'SUPERADMIN' OR LOWER(nombre_usuario) = 'superadmin'`
        );
        for (const row of resSuper.rows || []) {
          const id = Number(row.id_usuario);
          if (Number.isInteger(id)) {
            superadminIds.add(id);
          }
        }

        if (superadminIds.size > 0) {
          const idsArray = Array.from(superadminIds);
          const resRefs = await client.query(
            `SELECT DISTINCT id_u FROM (
              SELECT id_usuario AS id_u FROM venta WHERE id_usuario = ANY($1::int[])
              UNION ALL
              SELECT id_usuario AS id_u FROM reparacion WHERE id_usuario = ANY($1::int[])
              UNION ALL
              SELECT id_usuario AS id_u FROM movimiento_stock WHERE id_usuario = ANY($1::int[])
              UNION ALL
              SELECT id_usuario AS id_u FROM pago_proveedor WHERE id_usuario = ANY($1::int[])
              UNION ALL
              SELECT id_usuario AS id_u FROM pago_proveedor_pendiente WHERE id_usuario = ANY($1::int[])
            ) refs`,
            [idsArray]
          );
          for (const row of resRefs.rows || []) {
            const id = Number(row.id_u);
            if (Number.isInteger(id)) {
              referencedSuperadminIds.add(id);
            }
          }
        }
      }

      // 2. Extraer datos tabla por tabla dentro del snapshot consistente
      for (const { nombre, colPk, tieneIdentidad } of tablasOrdenadas) {
        const resultado = await client.query(`SELECT * FROM ${nombre}`);
        const dateColumns = new Set<string>(
          (resultado.fields || [])
            .filter((f) => f.dataTypeID === PG_DATE_OID)
            .map((f) => f.name)
        );

        let filas = (resultado.rows || []) as Array<Record<string, unknown>>;

        if (!esSuperadmin) {
          if (nombre === 'usuario' && superadminIds.size > 0) {
            filas = filas
              .filter((f) => {
                const id = Number(f.id_usuario);
                return !superadminIds.has(id) || referencedSuperadminIds.has(id);
              })
              .map((f) => {
                const id = Number(f.id_usuario);
                if (superadminIds.has(id)) {
                  return { ...f, contrasena: REDACTED_SUPERADMIN_HASH };
                }
                return f;
              });
          } else if (nombre === 'bitacora_actividad') {
            filas = filas.filter((f) => {
              const id = Number(f.id_usuario);
              const nombreUser = String(f.nombre_usuario || '').trim().toLowerCase();
              return !superadminIds.has(id) && nombreUser !== 'superadmin';
            });
          } else if (nombre === 'configuracion_sistema' && superadminIds.size > 0) {
            filas = filas.map((f) => {
              const updatedBy = Number(f.updated_by);
              return f.updated_by != null && superadminIds.has(updatedBy)
                ? { ...f, updated_by: null }
                : f;
            });
          } else if (nombre === 'detalle_venta' && superadminIds.size > 0) {
            filas = filas.map((f) => {
              const idServ = Number(f.id_usuario_service);
              return f.id_usuario_service != null && superadminIds.has(idServ)
                ? { ...f, id_usuario_service: null }
                : f;
            });
          }
        }

        estadisticas[nombre] = filas.length;

        bloquesSQL.push(`-- --------------------------------------------------------------------`);
        bloquesSQL.push(`-- Tabla: ${nombre} (${filas.length} registros)`);
        bloquesSQL.push(`-- --------------------------------------------------------------------`);

        if (filas.length === 0) {
          bloquesSQL.push(`-- Sin registros para exportar en esta tabla.\n`);
          continue;
        }

        // Obtener nombres de columnas a partir de la primera fila
        const columnas = Object.keys(filas[0]!);
        const columnasStr = columnas.map(c => `"${c}"`).join(', ');

        // Agrupar inserciones en bloques de hasta 100 filas
        const chunkSize = 100;
        for (let i = 0; i < filas.length; i += chunkSize) {
          const chunk = filas.slice(i, i + chunkSize);
          const valoresFilas = chunk.map(fila => {
            const campos = columnas.map(col => {
              const val = fila[col];
              if (val === null || val === undefined) {
                return 'NULL';
              }
              if (typeof val === 'boolean') {
                return val ? 'true' : 'false';
              }
              if (typeof val === 'number') {
                return Number.isFinite(val) ? String(val) : 'NULL';
              }
              if (val instanceof Date) {
                if (dateColumns.has(col)) {
                  const y = val.getFullYear();
                  const m = String(val.getMonth() + 1).padStart(2, '0');
                  const d = String(val.getDate()).padStart(2, '0');
                  return `'${y}-${m}-${d}'`;
                }
                return `'${val.toISOString()}'`;
              }
              if (typeof val === 'object') {
                const jsonStr = JSON.stringify(val).replace(/'/g, "''");
                return `'${jsonStr}'`;
              }
              // Escapar comillas simples para strings
              const strVal = String(val).replace(/'/g, "''");
              return `'${strVal}'`;
            });
            return `  (${campos.join(', ')})`;
          });

          const overrideClausula = tieneIdentidad ? ' OVERRIDING SYSTEM VALUE' : '';
          bloquesSQL.push(`INSERT INTO ${nombre} (${columnasStr})${overrideClausula} VALUES`);
          bloquesSQL.push(valoresFilas.join(',\n') + ';');
        }

        // Actualizar secuencia de identidad para que los futuros INSERT no colisionen
        if (tieneIdentidad && colPk) {
          bloquesSQL.push(
            `SELECT setval(pg_get_serial_sequence('${nombre}', '${colPk}'), COALESCE((SELECT MAX("${colPk}") FROM ${nombre}), 1), (SELECT COUNT(*) > 0 FROM ${nombre}));\n`
          );
        } else {
          bloquesSQL.push('');
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }

    // 3. Cierre de transacción del script generado
    bloquesSQL.push(`COMMIT;`);
    bloquesSQL.push(`-- ====================================================================`);
    bloquesSQL.push(`-- FIN DEL RESPALDO BIKESYSTEM`);
    bloquesSQL.push(`-- ====================================================================`);

    const contenidoSQL = bloquesSQL.join('\n');

    // 4. Auditoría de seguridad obligatoria
    if (usuario?.id_usuario) {
      await BitacoraService.registrar({
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario || 'admin',
        accion: 'GENERAR_RESPALDO',
        modulo: 'SEGURIDAD',
        descripcion: `Se genero y descargo exitosamente el archivo de respaldo: ${nombreArchivo} (${contenidoSQL.length} bytes)`
      });
    }

    return {
      contenidoSQL,
      nombreArchivo,
      estadisticas
    };
  }
}
