import { Request, Response } from 'express';
import { getDb } from '../mongo';
import { ObjectId, Document } from 'mongodb';
import xss from 'xss';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import securityConfig from '../config/config';

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
                expiresIn: 604800, // 7 días en segundos
                issuer: securityConfig.jwt.issuer
            }
        );
    }

    public async create(req: Request, res: Response): Promise<void> {
        try {
            // Sanitizar todo el cuerpo de la petición
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

            // Sanitizar el email antes de la consulta
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
                contrasena: this.sanitizeObject(contrasena), // Contraseña sin encriptar (sanitizada)
                contrasena_enc: contrasenaEnc, // Contraseña encriptada (no necesita sanitización)
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

            // Sanitizar los datos de respuesta por precaución
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
}

const loginController = new LoginController();
export default loginController;
