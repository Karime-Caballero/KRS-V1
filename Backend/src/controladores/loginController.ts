import { Request, Response } from 'express';
import { getDb } from '../mongo';
import { ObjectId, Document } from 'mongodb';
import xss from 'xss';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import securityConfig from '../config/config';
import { AuthenticatedRequest } from '../Middleware/authMiddleware';

interface InventarioItem {
    ingrediente_id: ObjectId;
    nombre: string;
    categoria: string;
    cantidad: number;
    unidad: string;
    almacenamiento: string;
    fecha_actualizacion: Date;
}

interface HistorialReceta {
    receta_id: ObjectId;
    nombre: string;
    etiquetas: string[];
    fecha_preparacion: Date;
}

interface RecomendacionPendiente {
    receta_id: ObjectId;
    nombre: string;
    fecha_sugerencia: Date;
}

interface PreferenciasUsuario {
    dietas: string[];
    alergias: string[];
    ingredientes_evitados: string[];
    tiempo_max_preparacion: number;
}

interface Usuario extends Document {
    _id: ObjectId;
    nombre: string;
    email: string;
    contrasena: string;
    contrasena_enc: string;
    rol: string;
    estatus: string | boolean;
    refreshTokens: string[];
    preferencias: PreferenciasUsuario;
    inventario: InventarioItem[];
    historial_recetas: HistorialReceta[];
    recomendaciones_pendientes: RecomendacionPendiente[];
    fecha_creacion: Date;
    fecha_actualizacion: Date;
}

class LoginController {
    constructor() {
        this.create = this.create.bind(this);
    }

    private sanitizeObject(obj: any): any {
        if (!obj || typeof obj !== 'object') return obj;

        const sanitized: any = {};
        for (const key in obj) {
            if (!obj.hasOwnProperty(key)) continue;
            const value = obj[key];
            if (typeof value === 'string') {
                sanitized[key] = xss(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    private generateAccessToken(user: Usuario): string {
        const payload = {
            userId: user._id.toString(),
            email: user.email,
            rol: user.rol
        };

        return jwt.sign(
            payload,
            securityConfig.jwt.secret,
            {
                algorithm: securityConfig.jwt.algorithm,
                expiresIn: securityConfig.jwt.expiresInSeconds,
                issuer: securityConfig.jwt.issuer
            }
        );
    }

    private generateRefreshToken(user: Usuario): string {
        const payload = {
            userId: user._id.toString(),
            tokenVersion: Date.now()
        };

        return jwt.sign(
            payload,
            securityConfig.jwt.secret,
            {
                algorithm: securityConfig.jwt.algorithm,
                expiresIn: 604800, // 7 days in seconds
                issuer: securityConfig.jwt.issuer
            }
        );
    }

    private validateAndCreateObjectId(id: string): ObjectId | null {
        if (!ObjectId.isValid(id)) {
            return null;
        }
        try {
            return new ObjectId(id);
        } catch {
            return null;
        }
    }

    public async create(req: Request, res: Response): Promise<void> {
        try {
            const sanitizedBody = this.sanitizeObject(req.body);
            const { nombre, email, contrasena } = sanitizedBody;

            if (!email || !contrasena) {
                res.status(400).json({
                    success: false,
                    message: 'Email y contraseña son requeridos'
                });
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                res.status(400).json({
                    success: false,
                    message: 'El formato del email no es válido'
                });
                return;
            }

            if (contrasena.length < 8) {
                res.status(400).json({
                    success: false,
                    message: 'La contraseña debe tener al menos 8 caracteres'
                });
                return;
            }

            const db = getDb();
            const usuariosCollection = db.collection<Usuario>('usuarios');

            const usuarioExistente = await usuariosCollection.findOne({
                email: this.sanitizeObject(email)
            });

            if (usuarioExistente) {
                res.status(409).json({
                    success: false,
                    message: 'El usuario ya existe'
                });
                return;
            }

            const saltRounds = 10;
            const contrasenaEnc = await bcrypt.hash(contrasena, saltRounds);

            const nuevoUsuario: Usuario = {
                _id: new ObjectId(),
                nombre: nombre ? this.sanitizeObject(nombre) : '',
                email: this.sanitizeObject(email),
                contrasena: this.sanitizeObject(contrasena),
                contrasena_enc: contrasenaEnc,
                rol: 'usuario',
                estatus: true,
                refreshTokens: [],
                preferencias: {
                    dietas: [],
                    alergias: [],
                    ingredientes_evitados: [],
                    tiempo_max_preparacion: 0
                },
                inventario: [],
                historial_recetas: [],
                recomendaciones_pendientes: [],
                fecha_creacion: new Date(),
                fecha_actualizacion: new Date()
            };

            const result = await usuariosCollection.insertOne(nuevoUsuario);

            res.status(201).json({
                success: true,
                data: {
                    _id: result.insertedId,
                    nombre: nuevoUsuario.nombre,
                    email: nuevoUsuario.email,
                    rol: nuevoUsuario.rol,
                    estatus: nuevoUsuario.estatus,
                    fecha_creacion: nuevoUsuario.fecha_creacion
                },
                message: 'Usuario creado exitosamente'
            });
        } catch (error) {
            console.error('Error al crear usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error al registrar el usuario',
                error: error instanceof Error ? this.sanitizeObject(error.message) : 'Error desconocido'
            });
        }
    }

    public async login(req: Request, res: Response): Promise<void> {
        try {
            const email = xss(req.body.email);
            const contrasena = xss(req.body.contrasena);

            const db = getDb();
            const usersCollection = db.collection<Usuario>('usuarios');

            const user = await usersCollection.findOne({ email });

            if (!user) {
                res.status(401).json({ success: false, message: "Credenciales incorrectas" });
                return;
            }

            const passwordMatch = await bcrypt.compare(contrasena, user.contrasena_enc);
            if (!passwordMatch) {
                res.status(401).json({ success: false, message: "Credenciales incorrectas" });
                return;
            }

            if (user.estatus !== true && user.estatus !== "Activa") {
                res.status(403).json({ success: false, message: "Cuenta deshabilitada" });
                return;
            }

            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);

            await usersCollection.updateOne(
                { _id: user._id },
                { $addToSet: { refreshTokens: refreshToken } }
            );

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            res.json({
                success: true,
                message: "Inicio de sesión exitoso",
                data: {
                    accessToken,
                    refreshToken,
                    user: {
                        _id: user._id,
                        nombre: user.nombre,
                        email: user.email,
                        rol: user.rol
                    }
                }
            });
        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({
                success: false,
                message: "Error interno del servidor",
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    public async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
            if (!refreshToken) {
                res.status(400).json({ success: false, message: "Token de refresco no proporcionado" });
                return;
            }

            const decoded = jwt.verify(refreshToken, securityConfig.jwt.secret) as JwtPayload;
            const userId = this.validateAndCreateObjectId(decoded.userId);
            
            if (!userId) {
                res.status(400).json({ success: false, message: "ID de usuario inválido" });
                return;
            }

            const db = getDb();
            const usersCollection = db.collection<Usuario>('usuarios');

            await usersCollection.updateOne(
                { _id: userId },
                { $pull: { refreshTokens: refreshToken } }
            );

            res.clearCookie('refreshToken');
            res.json({ success: true, message: "Sesión cerrada correctamente" });
        } catch (error) {
            console.error('Error en logout:', error);
            res.status(500).json({
                success: false,
                message: "Error interno del servidor",
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    public async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
            if (!refreshToken) {
                res.status(401).json({ success: false, message: "Token de refresco no proporcionado" });
                return;
            }

            const decoded = jwt.verify(refreshToken, securityConfig.jwt.secret) as JwtPayload;
            const userId = this.validateAndCreateObjectId(decoded.userId);
            
            if (!userId) {
                res.status(400).json({ success: false, message: "ID de usuario inválido" });
                return;
            }

            const db = getDb();
            const usersCollection = db.collection<Usuario>('usuarios');

            const user = await usersCollection.findOne({
                _id: userId,
                refreshTokens: refreshToken
            });

            if (!user) {
                res.status(403).json({ success: false, message: "Token de refresco inválido" });
                return;
            }

            const newAccessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);

            await usersCollection.updateOne(
                { _id: userId },
                {
                    $pull: { refreshTokens: refreshToken },
                    $addToSet: { refreshTokens: newRefreshToken }
                }
            );

            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            res.json({
                success: true,
                message: "Token actualizado correctamente",
                data: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken
                }
            });
        } catch (error) {
            console.error('Error al refrescar token:', error);
            if (error instanceof jwt.TokenExpiredError) {
                res.status(401).json({ success: false, message: "Token de refresco expirado" });
            } else if (error instanceof jwt.JsonWebTokenError) {
                res.status(403).json({ success: false, message: "Token de refresco inválido" });
            } else {
                res.status(500).json({
                    success: false,
                    message: "Error interno del servidor",
                    error: error instanceof Error ? error.message : 'Error desconocido'
                });
            }
        }
    }
}

const loginController = new LoginController();
export default loginController;