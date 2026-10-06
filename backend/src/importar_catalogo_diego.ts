import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

interface BiciCatalogo {
  fila_excel: number;
  nombre: string;
  marca: string;
  modelo: string;
  proveedor: string;
  precio_costo: number;
  precio_venta: number;
  precio_lista: number;
  rodado: string;
  color: string;
  talle: string;
  genero: 'hombre' | 'mujer' | 'unisex';
  stock: number;
  stock_minimo: number;
  es_usada: boolean;
  observaciones: string | null;
}

async function importarCatalogo() {
  const client = await pool.connect();
  try {
    console.log('--- INICIANDO IMPORTACION DE CATALOGO REAL DE DIEGO ---');
    await client.query('BEGIN');

    // 1. Desactivar y anular stock de productos de prueba ficticios para no distorsionar finanzas
    console.log('1. Desactivando registros ficticios de prueba (IDs: 17, 8, 5, 3)...');
    await client.query(`
      UPDATE Productos 
      SET activo = false, cantidad = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id_producto IN (17, 8, 5, 3);
    `);

    // 2. Leer archivo JSON generado del Excel
    const jsonPath = path.resolve(__dirname, 'catalogo_diego.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`No se encontro el archivo ${jsonPath}`);
    }

    const contenido = fs.readFileSync(jsonPath, 'utf8');
    const bicis: BiciCatalogo[] = JSON.parse(contenido);
    console.log(`2. Procesando ${bicis.length} modelos de bicicletas desde ListBicis-2.xlsx...`);

    let insertados = 0;
    let actualizados = 0;

    for (const b of bicis) {
      const nombreSeguro = (b.nombre || 'Bicicleta').substring(0, 100).trim();
      const marcaSegura = (b.marca || 'Generica').substring(0, 50).trim();
      const modeloSeguro = (b.modelo || b.nombre || '').substring(0, 50).trim();
      const colorSeguro = (b.color || 'Negro').substring(0, 30).trim();
      const rodadoSeguro = (b.rodado || '29').substring(0, 20).trim();
      const talleSeguro = (b.talle || 'M').substring(0, 20).trim();
      const generoSeguro = ['hombre', 'mujer', 'unisex'].includes(b.genero) ? b.genero : 'unisex';

      // Verificar si ya existe por nombre
      const resExistente = await client.query(
        `SELECT id_producto FROM Productos WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) AND LOWER(tipo_prod) = 'bicicleta' LIMIT 1`,
        [nombreSeguro]
      );

      let idProducto: number;

      if (resExistente.rows.length > 0) {
        idProducto = resExistente.rows[0].id_producto;
        await client.query(
          `UPDATE Productos
           SET marca = $1, modelo = $2, precio = $3, cantidad = $4, stock_minimo = $5, activo = true, updated_at = CURRENT_TIMESTAMP
           WHERE id_producto = $6`,
          [marcaSegura, modeloSeguro, b.precio_venta, b.stock, b.stock_minimo, idProducto]
        );
        actualizados++;
      } else {
        const resInsert = await client.query(
          `INSERT INTO Productos (nombre, marca, modelo, tipo_prod, cantidad, precio, stock_minimo, activo)
           VALUES ($1, $2, $3, 'bicicleta', $4, $5, $6, true)
           RETURNING id_producto`,
          [nombreSeguro, marcaSegura, modeloSeguro, b.stock, b.precio_venta, b.stock_minimo]
        );
        idProducto = resInsert.rows[0].id_producto;
        insertados++;
      }

      // Detalle de Producto_BiciNueva
      await client.query(
        `INSERT INTO Producto_BiciNueva (id_producto, marca, color, rodado, talle, genero)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id_producto) DO UPDATE
         SET marca = EXCLUDED.marca,
             color = EXCLUDED.color,
             rodado = EXCLUDED.rodado,
             talle = EXCLUDED.talle,
             genero = EXCLUDED.genero`,
        [idProducto, marcaSegura, colorSeguro, rodadoSeguro, talleSeguro, generoSeguro]
      );
    }

    await client.query('COMMIT');
    console.log(`\nImportacion completada con exito:`);
    console.log(`  - Nuevos modelos insertados: ${insertados}`);
    console.log(`  - Modelos existentes actualizados: ${actualizados}`);

    // Estadísticas de verificación en DB
    const resVerificacion = await client.query(`
      SELECT 
        COUNT(*)::INT as total_modelos,
        SUM(cantidad)::INT as total_unidades,
        SUM(precio * cantidad)::NUMERIC as total_capital,
        MIN(precio)::NUMERIC as precio_min,
        MAX(precio)::NUMERIC as precio_max,
        ROUND(AVG(precio), 2)::NUMERIC as precio_promedio
      FROM Productos
      WHERE activo = true AND LOWER(tipo_prod) = 'bicicleta' AND cantidad > 0;
    `);

    const stats = resVerificacion.rows[0];
    console.log('\n--- METRICAS REALES POST-IMPORTACION ---');
    console.log(`  - Modelos de bicicletas activos con stock: ${stats.total_modelos}`);
    console.log(`  - Unidades fisicas totales: ${stats.total_unidades}`);
    console.log(`  - Capital total inmovilizado en bicicletas: $${Number(stats.total_capital).toLocaleString('es-AR')}`);
    console.log(`  - Rango de precios: $${Number(stats.precio_min).toLocaleString('es-AR')} a $${Number(stats.precio_max).toLocaleString('es-AR')}`);
    console.log(`  - Precio promedio: $${Number(stats.precio_promedio).toLocaleString('es-AR')}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error durante la importacion del catalogo:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

importarCatalogo().catch(err => {
  console.error(err);
  process.exit(1);
});
