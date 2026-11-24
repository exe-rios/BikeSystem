import type { Request, NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { escribirLog } from '../utils/logger.js';

/** Extensión de Request de Express para adjuntar los datos del token JWT. */
export interface PeticionConUsuario extends Request {
    usuarioToken?: { id: number; rol: string; nombre_usuario?: string; iat?: number };
}

/** Registro en memoria de usuarios cuyos tokens previos deben considerarse revocados (id_usuario -> timestamp ms). */
const usuariosRevocados = new Map<number, number>();

/** Invalida todos los JWT emitidos antes o en este instante para el usuario indicado. */
export const revocarTokensUsuario = (idUsuario: number): void => {
    if (Number.isInteger(idUsuario) && idUsuario > 0) {
        usuariosRevocados.set(idUsuario, Date.now());
    }
};

/** Limpia la lista en memoria de tokens revocados (útil para suites de prueba). */
export const limpiarTokensRevocados = (): void => {
    usuariosRevocados.clear();
};

/** Valida el token Bearer JWT en los encabezados y propaga los datos de sesión. */
export const verificarToken = (req: PeticionConUsuario, res: Response, next: NextFunction): void => {
    const tokenHeader = req.headers['authorization'];

    if (!tokenHeader) {
        res.status(403).json({ error: 'Tenés que iniciar sesión primero.' });
        return;
    }

    const token = tokenHeader.split(' ')[1];

    if (!token) {
        res.status(403).json({ error: 'Tu sesión no es válida. Volvé a iniciar sesión.' });
        return;
    }

    try {
        // Verificar que la clave JWT_SECRET esté configurada
        const secreto = process.env.JWT_SECRET;
        if (!secreto) {
            console.error('[AUTH]: JWT_SECRET no está configurado en variables de entorno');
            escribirLog('ERROR', 'AUTH', 'JWT_SECRET no está configurado en variables de entorno');
            res.status(500).json({ error: 'Error de configuración del servidor. Contacte al administrador.' });
            return;
        }

        const datosDecodificados = jwt.verify(token, secreto) as unknown as { id: number; rol: string; nombre_usuario?: string; iat?: number };

        const revocadoDesde = usuariosRevocados.get(datosDecodificados.id);
        if (revocadoDesde !== undefined && ((datosDecodificados.iat ?? 0) * 1000) <= revocadoDesde) {
            res.status(401).json({ error: 'Tu sesión fue revocada. Volvé a iniciar sesión.' });
            return;
        }

        req.usuarioToken = datosDecodificados;
        next(); // Si todo está bien, continúa a la ruta
    } catch {
        res.status(401).json({ error: 'Tu sesión expiró. Volvé a iniciar sesión.' });
    }
};
