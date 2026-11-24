import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupService } from '../src/services/backup.service.js';
import { BitacoraService } from '../src/services/bitacora.service.js';
import { pool } from '../src/config/db.js';

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock('../src/config/db.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(() => Promise.resolve(mockClient)),
    on: vi.fn(),
  },
}));

vi.mock('../src/services/bitacora.service.js', () => ({
  BitacoraService: {
    registrar: vi.fn().mockResolvedValue(undefined),
  },
}));

const TABLAS_ESPERADAS = [
  'metodo_pago',
  'usuario',
  'configuracion_sistema',
  'proveedor',
  'cliente',
  'productos',
  'producto_bicinueva',
  'bicicleta',
  'movimiento_stock',
  'venta',
  'detalle_venta',
  'reparacion',
  'detalle_reparacion',
  'pago_proveedor',
  'pago_proveedor_pendiente',
  'bitacora_actividad',
];

describe('BackupService — Respaldo SQL seguro y consistente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    (pool.connect as any).mockResolvedValue(mockClient);
  });

  it('usa transacción REPEATABLE READ READ ONLY, incluye las 16 tablas, TRUNCATE y omite session_replication_role', async () => {
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('BEGIN') || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('FROM usuario WHERE rol =')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT * FROM configuracion_sistema')) {
        return {
          rows: [{ clave: 'cotizacion_dolar', valor: '1250.00', updated_by: 1 }],
          fields: [{ name: 'clave', dataTypeID: 1043 }, { name: 'valor', dataTypeID: 1043 }],
        };
      }
      if (sql.includes('SELECT * FROM pago_proveedor_pendiente')) {
        return {
          rows: [{
            id_pendiente: 7,
            id_proveedor: 2,
            id_usuario: 1,
            monto_factura_total: 1000,
            monto_pagado: 200,
            saldo_pendiente: 800,
            moneda: 'USD',
            fecha_proximo_pago: new Date(2026, 4, 15, 0, 0, 0), // 2026-05-15 medianoche local
            estado: 'PENDIENTE',
          }],
          fields: [
            { name: 'id_pendiente', dataTypeID: 23 },
            { name: 'fecha_proximo_pago', dataTypeID: 1082 },
          ],
        };
      }
      return { rows: [], fields: [] };
    });

    const res = await BackupService.generarRespaldoSQL({
      id_usuario: 1,
      nombre_usuario: 'admin',
      rol: 'ADMIN',
    });

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalledTimes(1);

    expect(res.contenidoSQL).not.toContain('session_replication_role');
    expect(res.contenidoSQL).toContain('TRUNCATE TABLE');
    expect(res.contenidoSQL).toContain('RESTART IDENTITY CASCADE');

    for (const tabla of TABLAS_ESPERADAS) {
      expect(res.estadisticas).toHaveProperty(tabla);
      expect(res.contenidoSQL).toContain(`-- Tabla: ${tabla}`);
    }

    // Columna DATE (OID 1082) serializada como YYYY-MM-DD sin corrimiento UTC
    expect(res.contenidoSQL).toContain("'2026-05-15'");
    expect(res.contenidoSQL).not.toContain('2026-05-15T');

    // Bitácora registrada
    expect(BitacoraService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        id_usuario: 1,
        nombre_usuario: 'admin',
        modulo: 'SEGURIDAD',
        accion: 'GENERAR_RESPALDO',
      })
    );
  });

  it('cuando rol === ADMIN excluye SUPERADMIN no referenciado y su actividad de bitácora', async () => {
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('BEGIN') || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('FROM usuario WHERE rol =')) {
        return { rows: [{ id_usuario: 99 }] };
      }
      if (sql.includes('SELECT DISTINCT id_u FROM')) {
        return { rows: [] }; // superadmin 99 sin FKs operacionales
      }
      if (sql.includes('SELECT * FROM usuario')) {
        return {
          rows: [
            { id_usuario: 1, nombre_usuario: 'admin', contrasena: 'hash_admin_real', rol: 'ADMIN' },
            { id_usuario: 99, nombre_usuario: 'superadmin', contrasena: 'hash_super_secreto', rol: 'SUPERADMIN' },
          ],
          fields: [],
        };
      }
      if (sql.includes('SELECT * FROM bitacora_actividad')) {
        return {
          rows: [
            { id_bitacora: 1, id_usuario: 1, nombre_usuario: 'admin', modulo: 'Ventas', accion: 'CREAR', descripcion: 'Ok' },
            { id_bitacora: 2, id_usuario: 99, nombre_usuario: 'superadmin', modulo: 'SEGURIDAD', accion: 'SECRETO', descripcion: 'Oculto' },
          ],
          fields: [],
        };
      }
      return { rows: [], fields: [] };
    });

    const res = await BackupService.generarRespaldoSQL({
      id_usuario: 1,
      nombre_usuario: 'admin',
      rol: 'ADMIN',
    });

    expect(res.contenidoSQL).toContain('hash_admin_real');
    expect(res.contenidoSQL).not.toContain('hash_super_secreto');
    expect(res.contenidoSQL).not.toContain('SECRETO');
    expect(res.estadisticas['usuario']).toBe(1);
    expect(res.estadisticas['bitacora_actividad']).toBe(1);
  });

  it('cuando rol === SUPERADMIN incluye al usuario SUPERADMIN y su bitácora completa', async () => {
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('BEGIN') || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('SELECT * FROM usuario')) {
        return {
          rows: [
            { id_usuario: 1, nombre_usuario: 'admin', contrasena: 'hash_admin_real', rol: 'ADMIN' },
            { id_usuario: 99, nombre_usuario: 'superadmin', contrasena: 'hash_super_secreto', rol: 'SUPERADMIN' },
          ],
          fields: [],
        };
      }
      if (sql.includes('SELECT * FROM bitacora_actividad')) {
        return {
          rows: [
            { id_bitacora: 2, id_usuario: 99, nombre_usuario: 'superadmin', modulo: 'SEGURIDAD', accion: 'SECRETO', descripcion: 'Visible para superadmin' },
          ],
          fields: [],
        };
      }
      return { rows: [], fields: [] };
    });

    const res = await BackupService.generarRespaldoSQL({
      id_usuario: 99,
      nombre_usuario: 'superadmin',
      rol: 'SUPERADMIN',
    });

    expect(res.contenidoSQL).toContain('hash_super_secreto');
    expect(res.contenidoSQL).toContain('Visible para superadmin');
    expect(res.estadisticas['usuario']).toBe(2);
    expect(res.estadisticas['bitacora_actividad']).toBe(1);
  });

  it('propaga error, ejecuta ROLLBACK y libera el cliente si falla la exportación de una tabla', async () => {
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('BEGIN') || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('FROM usuario WHERE rol =')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT * FROM venta')) {
        throw new Error('Fallo de conexión simulado en venta');
      }
      return { rows: [], fields: [] };
    });

    await expect(
      BackupService.generarRespaldoSQL({ id_usuario: 1, nombre_usuario: 'admin', rol: 'ADMIN' })
    ).rejects.toThrow('Fallo de conexión simulado en venta');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
    expect(BitacoraService.registrar).not.toHaveBeenCalled();
  });
});
