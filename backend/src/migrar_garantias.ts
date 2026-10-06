import 'dotenv/config';
import { pool } from './config/db.js';

/** Aplica las columnas necesarias para el seguimiento del primer service de garantías. */
export async function migrarGarantiasService() {
  console.log('Aplicando migración de columnas para 1° Service en Detalle_Venta...');
  try {
    await pool.query(`
      ALTER TABLE Detalle_Venta
      ADD COLUMN IF NOT EXISTS primer_service_realizado BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS fecha_primer_service DATE NULL,
      ADD COLUMN IF NOT EXISTS observaciones_service TEXT NULL,
      ADD COLUMN IF NOT EXISTS id_usuario_service INT NULL REFERENCES Usuario(id_usuario) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS service_excepcion BOOLEAN NOT NULL DEFAULT false;
    `);

    console.log('Migración completada exitosamente.');
  } catch (error) {
    console.error('Error al aplicar migración de garantías:', error);
    throw error;
  }
}

if (process.argv[1]?.includes('migrar_garantias')) {
  migrarGarantiasService()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
