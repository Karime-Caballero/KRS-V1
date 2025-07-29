import { Request, Response } from 'express';
import { ObjectId, Document, UpdateFilter, Filter } from 'mongodb';
import { getDb } from '../mongo';
import xss from 'xss';

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

interface PreferenciasAlimenticias {
    // 1. Dietas y restricciones principales
    dietas: string[]; // Ej: ["vegetariana", "keto"]
    restriccionesReligiosas: string[]; // Ej: ["halal", "kosher"]
    alergias: string[]; // Ej: ["maní", "mariscos"]
    intolerancias: string[]; // Ej: ["lactosa", "gluten"]

    // 2. Preferencias de ingredientes
    ingredientes_evitados: string[]; // Ej: ["azúcar refinado", "colorantes"]
    ingredientes_preferidos: string[]; // Ej: ["orgánicos", "locales"]
    sustitutos_preferidos: { original: string; sustituto: string }[]; // Ej: { original: "leche", sustituto: "almendra" }

    // 3. Hábitos y horarios
    tiempo_max_preparacion: number; // En minutos
    horarios_comida: {
        desayuno: string;
        almuerzo: string;
        cena: string;
        snacks: string[];
    };
    frecuencia_comidas: number; // Veces al día

    // 4. Nutrición específica
    objetivosNutricionales: {
        calorias_diarias?: number;
        macros?: {
            proteinas: number; // %
            carbohidratos: number; // %
            grasas: number; // %
        };
        bajo_en?: string[]; // Ej: ["sodio", "grasas saturadas"]
    };

    // 5. Métodos de preparación
    metodos_preparacion_preferidos: string[]; // Ej: ["al vapor", "horneado"]
    metodos_preparacion_evitados: string[]; // Ej: ["frito", "crudo"]

    // 6. Otras preferencias
    nivelPicante: 'bajo' | 'medio' | 'alto' | 'ninguno';
    preferenciaTexturas: string[]; // Ej: ["crujiente", "cremoso"]
    utensilios_disponibles: string[]; // Ej: ["licuadora", "horno"]
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
    preferencias: PreferenciasAlimenticias;
    inventario: InventarioItem[];
    historial_recetas: HistorialReceta[];
    recomendaciones_pendientes: RecomendacionPendiente[];
    fecha_creacion: Date;
    fecha_actualizacion: Date;
}

class UsuariosController {
    constructor() {
        // Vincular el contexto de this para todos los métodos que lo necesiten
        this.update = this.update.bind(this);
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

    public async list(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const skip = (page - 1) * limit;

            // Opciones de proyección para excluir la contraseña
            const projection = { contrasena: 0 };

            const db = getDb();
            const usuariosCollection = db.collection<Usuario>('usuarios');

            // Ejecutar consulta y conteo en paralelo
            const [usuarios, total] = await Promise.all([
                usuariosCollection.find({}, { projection })
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                usuariosCollection.countDocuments()
            ]);

            res.status(200).json({
                success: true,
                data: usuarios,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Error al listar usuarios:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los usuarios',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    public async getOne(req: Request, res: Response): Promise<void> {
        try {
            const { _id } = req.params;

            if (!_id || !ObjectId.isValid(_id)) {
                res.status(400).json({
                    success: false,
                    message: 'Se requiere un _id válido'
                });
                return;
            }

            const db = getDb();

            const usuario = await db.collection<Usuario>('usuarios').findOne({
                _id: new ObjectId(_id)
            } as Filter<Usuario>);

            if (!usuario) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: usuario
            });
        } catch (error) {
            console.error('Error al obtener usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error al buscar el usuario',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    public async update(req: Request, res: Response): Promise<void> {
        try {
            const { _id } = req.params;

            if (!_id || !ObjectId.isValid(_id)) {
                res.status(400).json({
                    success: false,
                    message: 'Se requiere un _id válido del usuario'
                });
                return;
            }

            // Sanitizar los datos de entrada
            const updateData = this.sanitizeObject(req.body) as Partial<Usuario>;

            // Actualizar la fecha de modificación
            updateData.fecha_actualizacion = new Date();

            // Eliminar campos que no deberían ser actualizables
            delete updateData._id;
            delete updateData.email;
            delete updateData.fecha_creacion;
            delete updateData.contrasena;

            const db = getDb();
            const usuariosCollection = db.collection<Usuario>('usuarios');

            // Verificar si el usuario existe
            const usuarioExistente = await usuariosCollection.findOne({ _id: new ObjectId(_id) } as Filter<Usuario>);

            if (!usuarioExistente) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
                return;
            }

            // Realizar la actualización
            const result = await usuariosCollection.updateOne(
                { _id: new ObjectId(_id) } as Filter<Usuario>,
                { $set: updateData } as UpdateFilter<Usuario>
            );

            if (result.matchedCount === 0) {
                res.status(404).json({
                    success: false,
                    message: 'No se pudo actualizar el usuario'
                });
                return;
            }

            // Obtener el usuario actualizado para devolverlo en la respuesta
            const usuarioActualizado = await usuariosCollection.findOne({ _id: new ObjectId(_id) } as Filter<Usuario>);

            res.status(200).json({
                success: true,
                data: {
                    usuario: usuarioActualizado,
                    modifiedCount: result.modifiedCount
                },
                message: 'Usuario actualizado correctamente'
            });
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar el usuario',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    public async delete(req: Request, res: Response): Promise<void> {
        try {
            const { _id } = req.params;
            if (!_id || !ObjectId.isValid(_id)) {
                res.status(400).json({
                    success: false,
                    message: 'Se requiere un _id válido del usuario'
                });
                return;
            }

            const db = getDb();
            const result = await db.collection<Usuario>('usuarios')
                .deleteOne({ _id: new ObjectId(_id) } as Filter<Usuario>);

            if (result.deletedCount === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    deletedCount: result.deletedCount
                },
                message: 'Usuario eliminado correctamente'
            });
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar el usuario',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    public async guardarPreferenciasAlimentarias(req: Request, res: Response): Promise<void> {
        try {
            const { _id } = req.params;

            // Validación del ID
            if (!_id || !ObjectId.isValid(_id)) {
                res.status(400).json({
                    success: false,
                    message: 'ID de usuario no válido'
                });
                return;
            }

            // Validación de la estructura básica de preferencias
            const {
                dietas,
                alergias,
                intolerancias,
                ingredientes_evitados,
                ingredientes_preferidos,
                tiempo_max_preparacion,
                objetivosNutricionales,
                metodos_preparacion_preferidos,
                metodos_preparacion_evitados,
                nivelPicante,
                restriccionesReligiosas
            } = req.body;

            // Validación de campos requeridos
            if (!Array.isArray(dietas) || !Array.isArray(alergias)) {
                res.status(400).json({
                    success: false,
                    message: 'Estructura de preferencias inválida',
                    detalles: {
                        requerido: {
                            dietas: 'Array de strings',
                            alergias: 'Array de strings'
                        }
                    }
                });
                return;
            }

            // Sanitización de los arrays
            const sanitizeStringArray = (arr: any[] | undefined): string[] => {
                if (!arr) return [];
                return arr.map(item => typeof item === 'string' ? xss(item.trim()) : String(item));
            };

            // Sanitización de objetos nutricionales (versión corregida)
            // Versión corregida de la función sanitizeNutricional
            const sanitizeNutricional = (obj: any): {
                calorias_diarias?: number;
                macros?: {
                    proteinas: number;
                    carbohidratos: number;
                    grasas: number;
                };
                bajo_en?: string[];
            } => {
                if (!obj) return {};

                const sanitized: {
                    calorias_diarias?: number;
                    macros?: {
                        proteinas: number;
                        carbohidratos: number;
                        grasas: number;
                    };
                    bajo_en?: string[];
                } = {};

                if (obj.calorias_diarias !== undefined) {
                    sanitized.calorias_diarias = Math.max(0, Number(obj.calorias_diarias));
                }

                if (obj.macros) {
                    // Extraemos las propiedades del objeto macros correctamente
                    const { proteinas = 0, carbohidratos = 0, grasas = 0 } = obj.macros;

                    sanitized.macros = {
                        proteinas: Math.max(0, Math.min(100, Number(proteinas))),
                        carbohidratos: Math.max(0, Math.min(100, Number(carbohidratos))),
                        grasas: Math.max(0, Math.min(100, Number(grasas)))
                    };
                }

                if (obj.bajo_en) {
                    sanitized.bajo_en = sanitizeStringArray(obj.bajo_en);
                }

                return sanitized;
            };

            // Construcción del objeto de preferencias
            const preferencias = {
                dietas: sanitizeStringArray(dietas),
                alergias: sanitizeStringArray(alergias),
                intolerancias: sanitizeStringArray(intolerancias),
                ingredientes_evitados: sanitizeStringArray(ingredientes_evitados),
                ingredientes_preferidos: sanitizeStringArray(ingredientes_preferidos),
                tiempo_max_preparacion: Math.max(0, Math.min(Number(tiempo_max_preparacion) || 60, 240)),
                objetivosNutricionales: sanitizeNutricional(objetivosNutricionales),
                metodos_preparacion_preferidos: sanitizeStringArray(metodos_preparacion_preferidos),
                metodos_preparacion_evitados: sanitizeStringArray(metodos_preparacion_evitados),
                nivelPicante: ['bajo', 'medio', 'alto', 'ninguno'].includes(nivelPicante) ? nivelPicante : 'ninguno',
                restriccionesReligiosas: sanitizeStringArray(restriccionesReligiosas),
                ultima_actualizacion: new Date()
            };

            const db = getDb();

            // Actualización en colección de usuarios
            const result = await db.collection('usuarios').updateOne(
                { _id: new ObjectId(_id) },
                { $set: { preferencias: preferencias } }
            );

            if (result.matchedCount === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Preferencias alimentarias actualizadas correctamente',
                data: {
                    preferencias: preferencias,
                    actualizado: result.modifiedCount > 0
                }
            });

        } catch (error) {
            console.error('Error al guardar preferencias:', error);
            res.status(500).json({
                success: false,
                message: 'Error al procesar las preferencias',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
}

const usuariosController = new UsuariosController();
export default usuariosController;