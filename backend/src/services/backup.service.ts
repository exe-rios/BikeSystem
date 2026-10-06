import { pool } from '../config/db.js';
import { BitacoraService } from './bitacora.service.js';

/**
 * Servicio de Respaldo y Recuperación de Base de Datos (RNF3).
 * Implementación 100% nativa en TypeScript sin dependencias de Docker ni comandos del sistema operativo.
 */
export class BackupService {
  /**
   * Genera un volcado SQL completo y estructurado de todas las tablas de BikeSystem.
   * Incluye datos maestros, catálogos, operaciones comerciales, taller y auditoría.
   */
  static async generarRespaldoSQL(usuario?: { id_usuario?: number; nombre_usuario?: string }): Promise<{
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

    // Orden topológico estricto para evitar violaciones de integridad referencial
    const tablasOrdenadas: Array<{ nombre: string; colPk?: string; tieneIdentidad: boolean }> = [
      { nombre: 'metodo_pago', colPk: 'id_metodo_pago', tieneIdentidad: true },
      { nombre: 'usuario', colPk: 'id_usuario', tieneIdentidad: true },
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
    bloquesSQL.push(`-- Deshabilitar disparadores y restricciones temporalmente durante la carga`);
    bloquesSQL.push(`SET session_replication_role = 'replica';\n`);

    // 2. Extraer datos tabla por tabla
    for (const { nombre, colPk, tieneIdentidad } of tablasOrdenadas) {
      try {
        const resultado = await pool.query(`SELECT * FROM ${nombre}`);
        const filas = resultado.rows;
        estadisticas[nombre] = filas.length;

        bloquesSQL.push(`-- --------------------------------------------------------------------`);
        bloquesSQL.push(`-- Tabla: ${nombre} (${filas.length} registros)`);
        bloquesSQL.push(`-- --------------------------------------------------------------------`);

        if (filas.length === 0) {
          bloquesSQL.push(`-- Sin registros para exportar en esta tabla.\n`);
          continue;
        }

        // Obtener nombres de columnas a partir de la primera fila
        const columnas = Object.keys(filas[0]);
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
          bloquesSQL.push(`SELECT setval(pg_get_serial_sequence('${nombre}', '${colPk}'), COALESCE((SELECT MAX("${colPk}") FROM ${nombre}), 1));\n`);
        } else {
          bloquesSQL.push('');
        }
      } catch (err: unknown) {
        // Si una tabla opcional no existe o no tiene datos, registrar advertencia
        const mensaje = err instanceof Error ? err.message : String(err);
        bloquesSQL.push(`-- Advertencia: No se pudo exportar la tabla ${nombre}: ${mensaje}\n`);
      }
    }

    // 3. Cierre y reanudación de roles de replicación
    bloquesSQL.push(`-- Reanudar comportamiento normal de restricciones y triggers`);
    bloquesSQL.push(`SET session_replication_role = 'origin';`);
    bloquesSQL.push(`COMMIT;`);
    bloquesSQL.push(`-- ====================================================================`);
    bloquesSQL.push(`-- FIN DEL RESPALDO BIKESYSTEM`);
    bloquesSQL.push(`-- ====================================================================`);

    const contenidoSQL = bloquesSQL.join('\n');

    // 4. Auditoría de seguridad obligatoria
    if (usuario?.id_usuario) {
      await BitacoraService.registrar({
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario || 'superadmin',
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