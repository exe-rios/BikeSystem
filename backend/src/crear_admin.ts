import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from './config/db.js';

async function crearUsuarioAdmin() {
  const nombre_usuario = process.argv[2] || 'admin';
  const contrasenaPlana = process.argv[3] || 'admin123';
  const rol = 'SUPERADMIN';

  console.log(`Conectando a la base de datos para crear/actualizar usuario "${nombre_usuario}"...`);

  try {
    const contrasenaHash = await bcrypt.hash(contrasenaPlana, 10);

    const queryExiste = `SELECT id_usuario, nombre_usuario FROM Usuario WHERE nombre_usuario = $1`;
    const resExiste = await pool.query(queryExiste, [nombre_usuario]);

    if (resExiste.rowCount && resExiste.rowCount > 0) {
      const queryActualizar = `
        UPDATE Usuario 
        SET contrasena = $1, rol = $2
        WHERE nombre_usuario = $3
        RETURNING id_usuario, nombre_usuario, rol;
      `;
      const resUpdate = await pool.query(queryActualizar, [contrasenaHash, rol, nombre_usuario]);
      console.log(`Contraseña del usuario "${nombre_usuario}" actualizada correctamente.`);
      console.log('Datos:', resUpdate.rows[0]);
    } else {
      const queryInsert = `
        INSERT INTO Usuario (nombre_usuario, contrasena, rol)
        VALUES ($1, $2, $3)
        RETURNING id_usuario, nombre_usuario, rol;
      `;
      const resInsert = await pool.query(queryInsert, [nombre_usuario, contrasenaHash, rol]);
      console.log(`Usuario "${nombre_usuario}" creado exitosamente.`);
      console.log('Datos:', resInsert.rows[0]);
    }

    console.log(`\nCredenciales para iniciar sesión:`);
    console.log(`   Usuario:    ${nombre_usuario}`);
    console.log(`   Contraseña: ${contrasenaPlana}\n`);

  } catch (error) {
    console.error('Error al crear usuario admin:', error);
  } finally {
    await pool.end();
  }
}

crearUsuarioAdmin();
