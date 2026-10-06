import 'dotenv/config';
import { pool } from './config/db.js';

/** Asegura la existencia del cliente genérico 'Consumidor Final' para ventas rápidas de mostrador. */
export async function asegurarConsumidorFinal() {
  try {
    const resExistente = await pool.query(`
      SELECT id_cliente, nombre, apellido, dni, direccion 
      FROM Cliente 
      WHERE (LOWER(TRIM(nombre)) = 'consumidor' AND LOWER(TRIM(apellido)) = 'final')
         OR (LOWER(TRIM(nombre)) = 'final' AND LOWER(TRIM(apellido)) = 'consumidor')
      LIMIT 1;
    `);

    if (resExistente.rowCount && resExistente.rowCount > 0) {
      console.log('Cliente Consumidor Final existente. ID:', resExistente.rows[0].id_cliente);
      return resExistente.rows[0];
    }

    const resInsert = await pool.query(`
      INSERT INTO Cliente (nombre, apellido, dni, telefono, email, direccion)
      VALUES ('Consumidor', 'Final', NULL, NULL, NULL, 'Venta Mostrador')
      RETURNING id_cliente, nombre, apellido, dni, direccion;
    `);

    console.log('Cliente Consumidor Final creado con éxito. ID:', resInsert.rows[0].id_cliente);
    return resInsert.rows[0];
  } catch (err) {
    console.error('Error al asegurar Consumidor Final:', err);
    throw err;
  }
}

if (process.argv[1]?.includes('crear_consumidor_final')) {
  asegurarConsumidorFinal()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
