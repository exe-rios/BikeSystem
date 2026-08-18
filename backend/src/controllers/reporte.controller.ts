import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

export const obtenerDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
        // 1. Calcular las ganancias del mes actual (Ventas + Taller)
        const queryGanancias = `
            SELECT 
                (SELECT COALESCE(SUM(costo_total), 0) FROM Venta WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)) AS ventas_mes,
                (SELECT COALESCE(SUM(costo_total), 0) FROM Reparacion WHERE estado = 'Entregada' AND EXTRACT(MONTH FROM fecha_egreso) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha_egreso) = EXTRACT(YEAR FROM CURRENT_DATE)) AS taller_mes
        `;
        const resultGanancias = await pool.query(queryGanancias);
        
        const ventasMes = Number(resultGanancias.rows[0].ventas_mes);
        const tallerMes = Number(resultGanancias.rows[0].taller_mes);
        const recaudacionTotalMes = ventasMes + tallerMes;

        // 2. Resumen del estado actual del taller
        const queryTaller = `
            SELECT estado, COUNT(*) as cantidad 
            FROM Reparacion 
            WHERE estado != 'Entregada' 
            GROUP BY estado;
        `;
        const resultTaller = await pool.query(queryTaller);

        // 3. Alertas de inventario (Top 5 productos activos que urgen comprar)
        const queryStock = `
            SELECT id_producto, nombre, marca, cantidad, stock_minimo 
            FROM Productos 
            WHERE activo = true AND cantidad <= stock_minimo 
            ORDER BY cantidad ASC 
            LIMIT 5;
        `;
        const resultStock = await pool.query(queryStock);

        // Enviamos todo empaquetado en un solo JSON para que React arme los gráficos
        res.status(200).json({
            finanzas: {
                ventas_mostrador: ventasMes,
                ingresos_taller: tallerMes,
                total_mes: recaudacionTotalMes
            },
            taller_activo: resultTaller.rows,
            alertas_stock: resultStock.rows
        });

    } catch (error) {
        console.error('[Reportes Error]:', error);
        res.status(500).json({ error: 'Error al generar las estadísticas del sistema' });
    }
};