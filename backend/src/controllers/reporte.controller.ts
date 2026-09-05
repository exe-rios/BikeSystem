import type { Request, Response, NextFunction } from 'express';
import { ReporteService } from '../services/reporte.service.js';

export const obtenerDashboard = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resultado = await ReporteService.obtenerDashboard();
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerEstadisticas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta } = req.query as { fechaDesde?: string; fechaHasta?: string };
    const resultado = await ReporteService.obtenerEstadisticas({ fechaDesde, fechaHasta });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerVentasReporte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta, busqueda } = req.query as { fechaDesde?: string; fechaHasta?: string; busqueda?: string };
    const resultado = await ReporteService.obtenerVentasReporte({ fechaDesde, fechaHasta, busqueda });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerReparacionesReporte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta, busqueda } = req.query as { fechaDesde?: string; fechaHasta?: string; busqueda?: string };
    const resultado = await ReporteService.obtenerReparacionesReporte({ fechaDesde, fechaHasta, busqueda });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerEgresosReporte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta, busqueda } = req.query as { fechaDesde?: string; fechaHasta?: string; busqueda?: string };
    const resultado = await ReporteService.obtenerEgresosReporte({ fechaDesde, fechaHasta, busqueda });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerRankingProductos = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resultado = await ReporteService.obtenerRankingProductos();
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};