import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './config/db.js';

/** Script CLI para inicializar o actualizar el usuario superadmin exclusivo de desarrollo. */
async function crearUsuarioSuperadmin() {
    const nombre_usuario = process.argv[2] || 'superadmin';
    const contrasenaPlana = process.argv[3] || 'superadmin123';
    const rol = 'SUPERADMIN';

    console.log(`Conectando a la base de datos para inicializar el perfil superadmin "${nombre_usuario}"...`);

    try {
        const contrasenaHash = await bcrypt.hash(contrasenaPlana, 10);

        // 1. Asegurar que cualquier otra cuenta previa con rol SUPERADMIN sea degradada a ADMIN
        await pool.query(
            `UPDATE Usuario SET rol = 'ADMIN' WHERE rol = 'SUPERADMIN' AND LOWER(nombre_usuario) != LOWER($1);`,
            [nombre_usuario]
        );

        // 2. Verificar existencia de superadmin
        const queryExiste = `SELECT id_usuario, nombre_usuario FROM Usuario WHERE LOWER(nombre_usuario) = LOWER($1);`;
        const resExiste = await pool.query(queryExiste, [nombre_usuario]);

        if (resExiste.rowCount && resExiste.rowCount > 0) {
            const queryActualizar = `
                UPDATE Usuario 
                SET contrasena = $1, rol = $2
                WHERE id_usuario = $3
                RETURNING id_usuario, nombre_usuario, rol;
            `;
            const resUpdate = await pool.query(queryActualizar, [contrasenaHash, rol, resExiste.rows[0].id_usuario]);
            console.log(`Perfil superadmin "${nombre_usuario}" actualizado correctamente.`);
            console.log('Datos:', resUpdate.rows[0]);
        } else {
            const queryInsert = `
                INSERT INTO Usuario (nombre_usuario, contrasena, rol)
                VALUES ($1, $2, $3)
                RETURNING id_usuario, nombre_usuario, rol;
            `;
            const resInsert = await pool.query(queryInsert, [nombre_usuario, contrasenaHash, rol]);
            console.log(`Perfil superadmin "${nombre_usuario}" creado exitosamente.`);
            console.log('Datos:', resInsert.rows[0]);
        }

        console.log(`\nCredenciales para desarrollador (Superadmin):`);
        console.log(`   Usuario:    ${nombre_usuario}`);
        console.log(`   Contraseña: ${contrasenaPlana}`);
        console.log(`   Rol:        ${rol}\n`);

    } catch (error) {
        console.error('Error al inicializar usuario superadmin:', error);
    } finally {
        await pool.end();
    }
}

crearUsuarioSuperadmin();
