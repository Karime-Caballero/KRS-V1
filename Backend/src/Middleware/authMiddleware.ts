import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import securityConfig from '../config/config';
import { getDb } from '../mongo';
import { ObjectId } from 'mongodb';

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: ObjectId; // Cambiado a ObjectId en lugar de string
        email: string;
        rol: string;
    };
}

// Función de validación mejorada
const safeObjectId = (value: string): ObjectId | null => {
    try {
        return ObjectId.isValid(value) ? new ObjectId(value) : null;
    } catch {
        return null;
    }
};

export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, securityConfig.jwt.secret, {
            algorithms: [securityConfig.jwt.algorithm],
            issuer: securityConfig.jwt.issuer
        }) as JwtPayload;

        // Validación reforzada
        if (!decoded?.userId || typeof decoded.userId !== 'string') {
            return res.status(400).json({ message: 'Estructura de token inválida' });
        }

        const userId = safeObjectId(decoded.userId);
        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }

        const db = getDb();
        const user = await db.collection('usuarios').findOne({
            _id: userId,
            estatus: { $in: [true, "Activa"] }
        }, {
            projection: { _id: 1, email: 1, rol: 1 }
        });

        if (!user) {
            return res.status(403).json({ message: 'Usuario no encontrado o cuenta desactivada' });
        }

        req.user = {
            userId: userId,
            email: decoded.email,
            rol: decoded.rol
        };
        
        next();
    } catch (error) {
        // Manejo de errores mejorado
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: 'Token expirado' });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        console.error('Authentication error:', error);
        return res.status(500).json({ message: 'Error de autenticación' });
    }
};

// checkRole permanece igual
export const checkRole = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ message: 'No autorizado' });
        }
        next();
    };
};