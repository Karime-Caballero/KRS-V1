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

    public async getPantry(req: Request, res: Response): Promise<void> {
        try {
            const { _id } = req.params;

            // Validar el ID del usuario
            if (!_id || !ObjectId.isValid(_id)) {
                res.status(400).json({
                    success: false,
                    message: 'Se requiere un _id válido del usuario'
                });
                return;
            }

            const db = getDb();
            const usuariosCollection = db.collection<Usuario>('usuarios');

            // Buscar el usuario y proyectar solo el inventario
            const usuario = await usuariosCollection.findOne(
                { _id: new ObjectId(_id) },
                { projection: { inventario: 1 } } // Solo devolver el campo inventario
            );

            if (!usuario) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
                return;
            }

            // Ordenar el inventario por fecha de actualización (más reciente primero)
            const inventarioOrdenado = usuario.inventario?.sort((a, b) =>
                new Date(b.fecha_actualizacion).getTime() - new Date(a.fecha_actualizacion).getTime()
            ) || [];

            res.status(200).json({
                success: true,
                data: {
                    pantry: inventarioOrdenado,
                    count: inventarioOrdenado.length
                }
            });

        } catch (error) {
            console.error('Error al obtener el inventario del usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el inventario',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    public async addIngredienteInventario(req: Request, res: Response): Promise<void> {
        try {
            const { _id } = req.params;
            if (!_id || !ObjectId.isValid(_id)) {
                res.status(400).json({
                    success: false,
                    message: 'Se requiere un _id válido del usuario'
                });
                return;
            }

            // Sanitización con tipo seguro
            const sanitizeInput = (input: any): Partial<InventarioItem> => {
                if (!input) return {};

                const sanitized: Partial<InventarioItem> = {};
                const validKeys: Array<keyof InventarioItem> = [
                    'ingrediente_id',
                    'nombre',
                    'categoria',
                    'cantidad',
                    'unidad',
                    'almacenamiento',
                    'fecha_actualizacion'
                ];

                validKeys.forEach(key => {
                    if (input[key] !== undefined) {
                        sanitized[key] = typeof input[key] === 'string'
                            ? xss(input[key])
                            : input[key];
                    }
                });

                return sanitized;
            };

            // Determinar si es un array o un solo ingrediente
            const inputData = req.body;
            const isArray = Array.isArray(inputData);
            const ingredientesToAdd = isArray ? inputData : [inputData];

            // Validar y preparar los ingredientes
            const nuevosIngredientes: InventarioItem[] = [];
            const errors: string[] = [];

            for (const [index, item] of ingredientesToAdd.entries()) {
                const ingredienteData: InventarioItem = {
                    ingrediente_id: new ObjectId(item.ingrediente_id || new ObjectId().toString()),
                    ...sanitizeInput(item),
                    fecha_actualizacion: new Date(item.fecha_actualizacion) || new Date()
                } as InventarioItem;

                // Validación básica
                if (!ingredienteData.nombre) {
                    errors.push(`Ingrediente en posición ${index + 1} no tiene nombre`);
                    continue;
                }

                if (!ingredienteData.categoria) {
                    errors.push(`Ingrediente '${ingredienteData.nombre}' no tiene categoría`);
                    continue;
                }

                nuevosIngredientes.push(ingredienteData);
            }

            if (errors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: 'Errores en los datos de ingredientes',
                    errors
                });
                return;
            }

            if (nuevosIngredientes.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No hay ingredientes válidos para agregar'
                });
                return;
            }

            const db = getDb();
            const usuariosCollection = db.collection<Usuario>('usuarios');

            // Obtener usuario
            const usuario = await usuariosCollection.findOne({ _id: new ObjectId(_id) });
            if (!usuario) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
                return;
            }

            // Agregar los nuevos ingredientes
            const inventarioActual = usuario.inventario || [];
            const nuevoInventario = [...inventarioActual, ...nuevosIngredientes];

            const result = await usuariosCollection.updateOne(
                { _id: new ObjectId(_id) },
                {
                    $set: {
                        inventario: nuevoInventario,
                        fecha_actualizacion: new Date()
                    }
                }
            );

            res.status(200).json({
                success: true,
                message: isArray
                    ? `${nuevosIngredientes.length} ingredientes agregados al inventario`
                    : 'Ingrediente agregado al inventario',
                data: {
                    ingredientes: nuevosIngredientes,
                    totalIngredientes: nuevoInventario.length,
                    addedCount: nuevosIngredientes.length
                }
            });
        } catch (error) {
            console.error('Error al agregar ingrediente(s):', error);
            res.status(500).json({
                success: false,
                message: 'Error al agregar ingrediente(s)',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    public async updateInventarioItem(req: Request, res: Response): Promise<void> {
        try {
            const { _id, itemId } = req.params;

            if (!_id || !ObjectId.isValid(_id) || !itemId || !ObjectId.isValid(itemId)) {
                res.status(400).json({
                    success: false,
                    message: 'Se requieren IDs válidos'
                });
                return;
            }

            const db = getDb();

            // 1. Verificar existencia del usuario
            const usuario = await db.collection<Usuario>('usuarios').findOne({
                _id: new ObjectId(_id)
            });

            if (!usuario) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
                return;
            }

            // 2. Encontrar el índice del item en el array inventario
            const itemIndex = usuario.inventario.findIndex(
                item => item.ingrediente_id.toString() === itemId
            );

            if (itemIndex === -1) {
                res.status(404).json({
                    success: false,
                    message: 'Ítem no encontrado en el inventario'
                });
                return;
            }

            // 3. Validar el cuerpo de la solicitud
            const camposPermitidos = ['nombre', 'categoria', 'cantidad', 'unidad', 'almacenamiento'];
            const updates = req.body;

            const camposActualizacion = Object.keys(updates).filter(key =>
                camposPermitidos.includes(key) && updates[key] !== undefined
            );

            if (camposActualizacion.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar al menos un campo válido para actualizar',
                    camposPermitidos
                });
                return;
            }

            // 4. Preparar actualización
            const setUpdate: Record<string, any> = {};
            camposActualizacion.forEach(key => {
                setUpdate[`inventario.${itemIndex}.${key}`] = updates[key];
            });
            setUpdate[`inventario.${itemIndex}.fecha_actualizacion`] = new Date();
            setUpdate['fecha_actualizacion'] = new Date();

            // 5. Ejecutar actualización
            const result = await db.collection<Usuario>('usuarios').updateOne(
                { _id: new ObjectId(_id) },
                { $set: setUpdate }
            );

            // 6. Respuesta
            res.status(200).json({
                success: true,
                data: {
                    modifiedCount: result.modifiedCount
                }
            });

        } catch (error) {
            console.error('Error en updateInventarioItem:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    public async removeIngredienteInventario(req: Request, res: Response): Promise<void> {
        try {
            const { _id, ingredienteId } = req.params;
            if (!_id || !ObjectId.isValid(_id) || !ingredienteId || !ObjectId.isValid(ingredienteId)) {
                res.status(400).json({
                    success: false,
                    message: 'Se requieren _id válidos de usuario e ingrediente'
                });
                return;
            }

            const db = getDb();

            // Primero obtenemos el usuario para encontrar el índice del ingrediente
            const usuario = await db.collection<Usuario>('usuarios').findOne({
                _id: new ObjectId(_id)
            });

            if (!usuario) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
                return;
            }

            // Buscamos el índice del ingrediente en el array inventario
            const ingredienteIndex = usuario.inventario.findIndex(
                item => item.ingrediente_id.toString() === ingredienteId
            );

            if (ingredienteIndex === -1) {
                res.status(404).json({
                    success: false,
                    message: 'Ingrediente no encontrado en el inventario'
                });
                return;
            }

            // Usamos $pull para eliminar el elemento del array
            const result = await db.collection<Usuario>('usuarios').updateOne(
                { _id: new ObjectId(_id) },
                {
                    $pull: {
                        inventario: {
                            ingrediente_id: new ObjectId(ingredienteId)
                        } as any // Usamos 'as any' para evitar problemas de tipo
                    },
                    $set: {
                        fecha_actualizacion: new Date()
                    }
                }
            );

            res.status(200).json({
                success: true,
                message: 'Ingrediente eliminado del inventario',
                data: {
                    modifiedCount: result.modifiedCount
                }
            });
        } catch (error) {
            console.error('Error al eliminar ingrediente:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar ingrediente',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
}

const usuariosController = new UsuariosController();
export default usuariosController;