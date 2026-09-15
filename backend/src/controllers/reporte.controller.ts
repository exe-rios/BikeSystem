import type { Request, Response, NextFunction } from 'express';
import { ReporteService } from '../services/reporte.service.js';
import { responderOk } from '../utils/response.js';

/** Endpoint GET /api/reportes/dashboard: Retorna métricas en tiempo real para el panel de inicio. */
export const obtenerDashboard = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resultado = await ReporteService.obtenerDashboard();
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/reportes/estadisticas: Retorna KPIs financieros y operativos en un rango temporal. */
export const obtenerEstadisticas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta } = req.query as { fechaDesde?: string; fechaHasta?: string };
    const resultado = await ReporteService.obtenerEstadisticas({ fechaDesde, fechaHasta });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/reportes/ventas: Retorna reporte paginado de ventas con filtros avanzados. */
export const obtenerVentasReporte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta, busqueda, limite, pagina } = req.query as { 
      fechaDesde?: string; 
      fechaHasta?: string; 
      busqueda?: string;
      limite?: string;
      pagina?: string;
    };
    const resultado = await ReporteService.obtenerVentasReporte({ fechaDesde, fechaHasta, busqueda, limite, pagina });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/reportes/reparaciones: Retorna reporte paginado de reparaciones y mano de obra. */
export const obtenerReparacionesReporte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta, busqueda, limite, pagina } = req.query as { 
      fechaDesde?: string; 
      fechaHasta?: string; 
      busqueda?: string;
      limite?: string;
      pagina?: string;
    };
    const resultado = await ReporteService.obtenerReparacionesReporte({ fechaDesde, fechaHasta, busqueda, limite, pagina });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/reportes/egresos: Retorna reporte paginado de pagos a proveedores. */
export const obtenerEgresosReporte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta, busqueda, limite, pagina } = req.query as { 
      fechaDesde?: string; 
      fechaHasta?: string; 
      busqueda?: string;
      limite?: string;
      pagina?: string;
    };
    const resultado = await ReporteService.obtenerEgresosReporte({ fechaDesde, fechaHasta, busqueda, limite, pagina });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/reportes/top-productos: Retorna los 20 artículos con mayor demanda y facturación. */
export const obtenerRankingProductos = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resultado = await ReporteService.obtenerRankingProductos();
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};