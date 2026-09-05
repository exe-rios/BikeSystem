import type { Request, NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';

// Molde de TypeScript para que Express reconozca el token dentro de la petición
export interface PeticionConUsuario extends Request {
    usuarioToken?: { id: number; rol: string; nombre_usuario?: string };
}

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
            res.status(500).json({ error: 'Error de configuración del servidor. Contacte al administrador.' });
            return;
        }

        const datosDecodificados = jwt.verify(token, secreto) as unknown as { id: number; rol: string; nombre_usuario?: string };
        req.usuarioToken = datosDecodificados;
        next(); // Si todo está bien, continúa a la ruta
    } catch (error) {
        res.status(401).json({ error: 'Tu sesión expiró. Volvé a iniciar sesión.' });
    }
};
