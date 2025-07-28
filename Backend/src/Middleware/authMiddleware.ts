import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import securityConfig from '../config/config';
import { getDb } from '../mongo';
import { ObjectId } from 'mongodb';

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        email: string;
        rol: string;
    };
}

export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, securityConfig.jwt.secret, {
            algorithms: [securityConfig.jwt.algorithm],
            issuer: securityConfig.jwt.issuer
        }) as JwtPayload;

        // Verificar si el usuario existe y está activo
        const db = getDb();
        const usersCollection = db.collection('usuarios');
        const user = await usersCollection.findOne({ 
            _id: new ObjectId(decoded.userId),
            estatus: { $in: [true, "Activa"] }
        });

        if (!user) {
            return res.status(403).json({ message: 'Usuario no encontrado o cuenta desactivada' });
        }

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            rol: decoded.rol
        };
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: 'Token expirado' });
        } else if (error instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        return res.status(500).json({ message: 'Error al verificar el token' });
    }
};

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