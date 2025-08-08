import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../mongo';
import axios from 'axios';
import dotenv from 'dotenv';
import { Usuario, InventarioItem } from './usuariosController';
import NodeCache from 'node-cache';

dotenv.config();

// Configuración de caché (TTL de 24 horas, revisión cada hora)
const recipeCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

interface RecetaDetalle {
    id: number;
    title: string;
    image: string;
    readyInMinutes?: number;
    servings?: number;
    sourceUrl?: string;
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    dairyFree?: boolean;
    extendedIngredients: {
        name: string;
        amount: number;
        unit: string;
    }[];
    instructions?: string;
    analyzedInstructions?: {
        name: string;
        steps: {
            number: number;
            step: string;
            ingredients: {
                id: number;
                name: string;
                localizedName: string;
                image: string;
            }[];
            equipment: {
                id: number;
                name: string;
                localizedName: string;
                image: string;
            }[];
        }[];
    }[];
    [key: string]: any;
}

interface PlanSemanal {
    _id: ObjectId;
    usuario_id: ObjectId;
    semana: {
        fecha_inicio: Date;
        fecha_fin: Date;
    };
    estado: 'en_proceso' | 'finalizado' | 'cancelado';
    dias: {
        fecha: Date;
        comidas: {
            tipo: string;
            receta_id_spoonacular: number;
            nombre_receta: string;
            ingredientes_faltantes: {
                nombre: string;
                cantidad: number;
                unidad: string;
            }[];
        }[];
    }[];
    lista_compras: {
        nombre: string;
        cantidad: number;
        unidad: string;
        categoria: string;
        comprado: boolean;
    }[];
    fecha_creacion: Date;
    fecha_actualizacion: Date;
}

const RECIPE_CACHE_TTL = 86400; // 24 horas en segundos
const recipeDetailCache = new NodeCache({ stdTTL: RECIPE_CACHE_TTL });

class PlansController {
    private SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY_PLANES!;
    private SPOONACULAR_BASE_URL = 'https://api.spoonacular.com/recipes';
    private DAILY_POINT_LIMIT = 150;
    private pointsUsedToday = 0;
    private lastResetTime = new Date();
    private MAX_POINTS_PER_PLAN = 30;
    private REQUIRED_API_RECIPES = 21; // 3 comidas x 7 días (ahora incluye breakfast)

    constructor() {
        this.processPlanInBackground = this.processPlanInBackground.bind(this);
        this.generatePlan = this.generatePlan.bind(this);
        this.resetDailyPoints();
    }

    private resetDailyPoints() {
        const now = new Date();
        const timeSinceLastReset = now.getTime() - this.lastResetTime.getTime();

        if (timeSinceLastReset > 86400000) {
            this.pointsUsedToday = 0;
            this.lastResetTime = now;
            console.log('Contador de puntos diarios reiniciado');
        }
    }

    private async trackApiCall(points: number): Promise<boolean> {
        this.resetDailyPoints();

        if (this.pointsUsedToday + points > this.DAILY_POINT_LIMIT) {
            console.warn(`Límite de puntos alcanzado: ${this.pointsUsedToday}/${this.DAILY_POINT_LIMIT}`);
            return false;
        }

        this.pointsUsedToday += points;
        console.log(`Puntos usados: ${this.pointsUsedToday}/${this.DAILY_POINT_LIMIT}`);
        return true;
    }

    public async generatePlan(req: Request, res: Response): Promise<Response> {
        try {
            const { _id } = req.params;
            const { dias = 7, fecha_inicio } = req.body;

            if (!_id || !ObjectId.isValid(_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un _id válido del usuario'
                });
            }

            if (this.pointsUsedToday >= this.DAILY_POINT_LIMIT - this.MAX_POINTS_PER_PLAN) {
                return res.status(429).json({
                    success: false,
                    message: 'No hay suficientes puntos disponibles para generar un nuevo plan hoy.'
                });
            }

            const db = getDb();
            const usuario = await db.collection<Usuario>('usuarios').findOne({ _id: new ObjectId(_id) });

            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            const fechaInicio = fecha_inicio ? new Date(fecha_inicio) : new Date();
            const fechaFin = new Date(fechaInicio);
            fechaFin.setDate(fechaInicio.getDate() + dias - 1);

            const newPlan = {
                usuario_id: new ObjectId(_id),
                semana: {
                    fecha_inicio: fechaInicio,
                    fecha_fin: fechaFin
                },
                estado: 'en_proceso',
                dias: [],
                lista_compras: [],
                fecha_creacion: new Date(),
                fecha_actualizacion: new Date()
            };

            const result = await db.collection('planes_semanales').insertOne(newPlan);
            const planId = result.insertedId;

            setTimeout(() => this.processPlanInBackground(planId), 1000);

            return res.status(202).json({
                success: true,
                data: {
                    plan_id: planId,
                    estado: 'PENDING',
                    puntos_restantes: this.DAILY_POINT_LIMIT - this.pointsUsedToday,
                    puntos_max_por_plan: this.MAX_POINTS_PER_PLAN
                },
                message: 'Plan de comidas en proceso de generación'
            });
        } catch (error: any) {
            console.error('Error al generar plan:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error al generar el plan'
            });
        }
    }

    public async getPlan(req: Request, res: Response): Promise<void> {
        try {
            const { plan_id } = req.params;  // Cambiamos a plan_id en lugar de _id

            if (!plan_id || !ObjectId.isValid(plan_id)) {
                res.status(400).json({
                    success: false,
                    message: 'Se requiere un ID de plan válido'
                });
                return;
            }

            const db = getDb();

            // Busca el plan específico por su ID
            const plan = await db.collection<PlanSemanal>('planes_semanales')
                .findOne({
                    _id: new ObjectId(plan_id),
                    estado: 'finalizado'  // Solo planes finalizados
                });

            if (!plan) {
                res.status(404).json({
                    success: false,
                    message: 'No se encontró el plan o no está finalizado'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: plan
            });
        } catch (error: any) {
            console.error('Error al obtener plan:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el plan'
            });
        }
    }

    public async processPlanInBackground(planId: ObjectId): Promise<void> {
        const db = getDb();
        try {
            const plan = await db.collection<PlanSemanal>('planes_semanales').findOne({ _id: planId });
            if (!plan) return;

            const usuario = await db.collection<Usuario>('usuarios').findOne({ _id: plan.usuario_id });
            if (!usuario) return;

            const result = await this.generateFullWeekWithAPIRecipes(usuario, plan.semana.fecha_inicio, plan.semana.fecha_fin);

            await db.collection('planes_semanales').updateOne(
                { _id: planId },
                {
                    $set: {
                        dias: result.dias,
                        lista_compras: result.lista_compras,
                        estado: 'finalizado',
                        fecha_actualizacion: new Date()
                    }
                }
            );
        } catch (error) {
            console.error('Error procesando plan:', error);
            await db.collection('planes_semanales').updateOne(
                { _id: planId },
                {
                    $set: {
                        estado: 'cancelado',
                        fecha_actualizacion: new Date()
                    }
                }
            );
        }
    }

    private async generateFullWeekWithAPIRecipes(
        usuario: Usuario,
        startDate: Date,
        endDate: Date
    ): Promise<{
        dias: PlanSemanal['dias'];
        lista_compras: PlanSemanal['lista_compras'];
    }> {
        const dias: PlanSemanal['dias'] = [];
        const lista_compras: PlanSemanal['lista_compras'] = [];
        const usedRecipeIds = new Set<number>();
        const inventario = usuario.inventario || [];
        let pointsUsed = 0;

        // 1. Obtener recetas base de la API (con caché de búsqueda)
        const apiRecipes = await this.getFullWeekRecipesFromAPI(usuario);
        pointsUsed += apiRecipes.pointsUsed;

        if (apiRecipes.recipes.length < this.REQUIRED_API_RECIPES) {
            throw new Error(`No se pudieron obtener suficientes recetas (${apiRecipes.recipes.length}/${this.REQUIRED_API_RECIPES})`);
        }

        // 2. Obtener detalles completos de cada receta (con caché individual)
        const recipesWithDetails: RecetaDetalle[] = [];
        for (const recipe of apiRecipes.recipes) {
            try {
                const recipeDetails = await this.getRecipeDetails(recipe.id);
                recipesWithDetails.push(recipeDetails);
                usedRecipeIds.add(recipe.id);
            } catch (error) {
                console.error(`Error procesando receta ${recipe.id}:`, error);
                continue;
            }
        }

        // 3. Distribuir recetas en los días (ahora con breakfast, lunch y dinner)
        let current = new Date(startDate);
        let recipeIndex = 0;

        while (current <= endDate && recipeIndex < recipesWithDetails.length) {
            const comidas = [];
            const mealTypes = ['breakfast', 'lunch', 'dinner']; // Ahora incluye breakfast

            for (const tipo of mealTypes) {
                if (recipeIndex >= recipesWithDetails.length) break;

                const recipe = recipesWithDetails[recipeIndex++];
                const faltantes = this.getMissingIngredients(recipe.extendedIngredients, inventario);

                comidas.push({
                    tipo,
                    receta_id_spoonacular: recipe.id,
                    nombre_receta: recipe.title,
                    ingredientes_faltantes: faltantes,
                });

                this.addToShoppingList(lista_compras, faltantes);
            }

            dias.push({
                fecha: new Date(current),
                comidas,
            });

            current.setDate(current.getDate() + 1);
        }

        console.log(`Plan generado con ${recipesWithDetails.length} recetas (${pointsUsed} puntos usados)`);
        return { dias, lista_compras };
    }

    private async getFullWeekRecipesFromAPI(
        usuario: Usuario
    ): Promise<{ recipes: RecetaDetalle[]; pointsUsed: number }> {
        const cacheKey = `fullweek_${usuario._id}_${new Date().toISOString().split('T')[0]}`;
        const cachedRecipes = recipeCache.get<RecetaDetalle[]>(cacheKey) || [];

        if (cachedRecipes.length >= this.REQUIRED_API_RECIPES) {
            console.log(`Usando ${this.REQUIRED_API_RECIPES} recetas de caché para semana completa`);
            return {
                recipes: cachedRecipes.slice(0, this.REQUIRED_API_RECIPES),
                pointsUsed: 0
            };
        }

        // Primero obtenemos recetas de desayuno (7)
        const breakfastRecipes = await this.getBreakfastRecipes(usuario);
        // Luego obtenemos recetas para lunch y dinner (14)
        const lunchDinnerRecipes = await this.getLunchDinnerRecipes(usuario);

        const allRecipes = [...breakfastRecipes.recipes, ...lunchDinnerRecipes.recipes];
        const totalPoints = breakfastRecipes.pointsUsed + lunchDinnerRecipes.pointsUsed;

        recipeCache.set(cacheKey, allRecipes);

        return {
            recipes: allRecipes,
            pointsUsed: totalPoints
        };
    }

    private async getBreakfastRecipes(
        usuario: Usuario
    ): Promise<{ recipes: RecetaDetalle[]; pointsUsed: number }> {
        const searchParams = this.buildSearchParams(usuario, 'breakfast');
        searchParams.number = 7; // 7 desayunos, uno por día

        const estimatedPoints = 5 + (7 * 0.5);

        if (!await this.trackApiCall(estimatedPoints)) {
            throw new Error('No hay puntos suficientes para obtener recetas de desayuno');
        }

        try {
            console.log(`Obteniendo 7 recetas de desayuno de la API`);
            const res = await axios.get(`${this.SPOONACULAR_BASE_URL}/complexSearch`, {
                params: searchParams
            });

            const recipes: RecetaDetalle[] = res.data.results.map((r: any) => ({
                id: r.id,
                title: r.title,
                image: r.image || '',
                readyInMinutes: r.readyInMinutes,
                servings: r.servings,
                sourceUrl: r.sourceUrl,
                vegetarian: r.vegetarian,
                vegan: r.vegan,
                glutenFree: r.glutenFree,
                dairyFree: r.dairyFree,
                extendedIngredients: r.missedIngredients?.concat(r.usedIngredients)?.map((ing: any) => ({
                    name: ing.name,
                    amount: ing.amount,
                    unit: ing.unit
                })) || [],
                instructions: r.instructions || 'No hay instrucciones disponibles',
                analyzedInstructions: []
            }));

            return {
                recipes,
                pointsUsed: estimatedPoints
            };
        } catch (error: any) {
            console.error('Error obteniendo recetas de desayuno:', error.response?.data || error.message);
            // Fallback a recetas locales
            const fallbackRecipes = Array(7).fill(null).map(() => this.getLocalFallbackRecipe('breakfast'));
            return {
                recipes: fallbackRecipes,
                pointsUsed: 0
            };
        }
    }

    private async getLunchDinnerRecipes(
        usuario: Usuario
    ): Promise<{ recipes: RecetaDetalle[]; pointsUsed: number }> {
        const searchParams = this.buildSearchParams(usuario, 'lunch');
        searchParams.number = 14; // 14 recetas (7 lunch + 7 dinner)

        const estimatedPoints = 5 + (14 * 0.5);

        if (!await this.trackApiCall(estimatedPoints)) {
            throw new Error('No hay puntos suficientes para obtener recetas de almuerzo y cena');
        }

        try {
            console.log(`Obteniendo 14 recetas de almuerzo/cena de la API`);
            const res = await axios.get(`${this.SPOONACULAR_BASE_URL}/complexSearch`, {
                params: searchParams
            });

            const recipes: RecetaDetalle[] = res.data.results.map((r: any) => ({
                id: r.id,
                title: r.title,
                image: r.image || '',
                readyInMinutes: r.readyInMinutes,
                servings: r.servings,
                sourceUrl: r.sourceUrl,
                vegetarian: r.vegetarian,
                vegan: r.vegan,
                glutenFree: r.glutenFree,
                dairyFree: r.dairyFree,
                extendedIngredients: r.missedIngredients?.concat(r.usedIngredients)?.map((ing: any) => ({
                    name: ing.name,
                    amount: ing.amount,
                    unit: ing.unit
                })) || [],
                instructions: r.instructions || 'No hay instrucciones disponibles',
                analyzedInstructions: []
            }));

            return {
                recipes,
                pointsUsed: estimatedPoints
            };
        } catch (error: any) {
            console.error('Error obteniendo recetas de almuerzo/cena:', error.response?.data || error.message);
            // Fallback a recetas locales
            const fallbackRecipes = Array(14).fill(null).map((_, i) =>
                this.getLocalFallbackRecipe(i % 2 === 0 ? 'lunch' : 'dinner')
            );
            return {
                recipes: fallbackRecipes,
                pointsUsed: 0
            };
        }
    }

    private buildSearchParams(usuario: Usuario, mealType?: string): any {
        const params: any = {
            addRecipeInformation: true,
            fillIngredients: true,
            instructionsRequired: true,
            apiKey: this.SPOONACULAR_API_KEY,
            timeout: 5000
        };

        if (mealType) {
            params.type = mealType;
        }

        // Configuraciones específicas para desayunos
        if (mealType === 'breakfast') {
            params.maxReadyTime = Math.min(30, usuario.preferencias_alimentarias?.tiempo_max_preparacion || 30);
            params.tags = 'easy,quick,breakfast';
        }

        // Dietas y alergias
        if (usuario.preferencias_alimentarias?.dietas?.length) {
            params.diet = usuario.preferencias_alimentarias.dietas.join(',');
        }
        if (usuario.preferencias_alimentarias?.alergias?.length) {
            params.intolerances = usuario.preferencias_alimentarias.alergias.join(',');
        }
        if (usuario.preferencias_alimentarias?.intolerancias?.length) {
            params.intolerances = params.intolerances
                ? `${params.intolerances},${usuario.preferencias_alimentarias.intolerancias.join(',')}`
                : usuario.preferencias_alimentarias.intolerancias.join(',');
        }

        // Ingredientes
        if (usuario.preferencias_alimentarias?.ingredientes_preferidos?.length) {
            params.includeIngredients = usuario.preferencias_alimentarias.ingredientes_preferidos.join(',');
        }
        if (usuario.preferencias_alimentarias?.ingredientes_evitados?.length) {
            params.excludeIngredients = usuario.preferencias_alimentarias.ingredientes_evitados.join(',');
        }

        // Tiempo de preparación (solo si no es breakfast)
        if (!mealType && usuario.preferencias_alimentarias?.tiempo_max_preparacion) {
            params.maxReadyTime = usuario.preferencias_alimentarias.tiempo_max_preparacion;
        }

        // Métodos de preparación
        if (usuario.preferencias_alimentarias?.metodos_preparacion_preferidos?.length) {
            const methodTags = usuario.preferencias_alimentarias.metodos_preparacion_preferidos
                .map((m: string) => m.toLowerCase().replace(/\s+/g, '-'));
            params.tags = params.tags ? `${params.tags},${methodTags.join(',')}` : methodTags.join(',');
        }

        // Nutrición
        if (usuario.preferencias_alimentarias?.objetivosNutricionales?.bajo_en?.length) {
            params.requirements = usuario.preferencias_alimentarias.objetivosNutricionales.bajo_en
                .map((r: string) => `low-${r.toLowerCase()}`)
                .join(',');
        }

        // Utensilios disponibles
        if (usuario.preferencias_alimentarias?.utensilios_disponibles?.length) {
            params.equipment = usuario.preferencias_alimentarias.utensilios_disponibles
                .map((u: string) => u.toLowerCase().replace(/\s+/g, '-'))
                .join(',');
        }

        return params;
    }

    private getMissingIngredients(recipeIngredients: any[] = [], userInventory: InventarioItem[] = []) {
        return recipeIngredients
            .filter(ing => {
                const invItem = userInventory.find(i => i.nombre.toLowerCase() === ing.name.toLowerCase());
                return !invItem || invItem.cantidad < ing.amount;
            })
            .map(ing => {
                const invItem = userInventory.find(i => i.nombre.toLowerCase() === ing.name.toLowerCase());
                return {
                    nombre: ing.name,
                    cantidad: parseFloat((ing.amount - (invItem?.cantidad || 0)).toFixed(2)),
                    unidad: ing.unit
                };
            });
    }

    private addToShoppingList(
        lista: PlanSemanal['lista_compras'],
        ingredientes: { nombre: string, cantidad: number, unidad: string }[]
    ) {
        ingredientes.forEach(newIng => {
            const normalizedNombre = newIng.nombre.trim().toLowerCase();
            const existingItem = lista.find(item =>
                item.nombre.trim().toLowerCase() === normalizedNombre &&
                item.unidad === newIng.unidad
            );

            if (existingItem) {
                existingItem.cantidad += newIng.cantidad;
            } else {
                lista.push({
                    nombre: newIng.nombre,
                    cantidad: newIng.cantidad,
                    unidad: newIng.unidad,
                    categoria: this.categorizeIngredient(newIng.nombre),
                    comprado: false
                });
            }
        });
    }

    private async getRecipeDetails(recipeId: number): Promise<RecetaDetalle> {
        const cacheKey = `recipe_${recipeId}`;
        const cached = recipeDetailCache.get<RecetaDetalle>(cacheKey);

        if (cached) {
            console.log(`[CACHE] Receta ${recipeId} recuperada de caché`);
            return cached;
        }

        try {
            if (!await this.trackApiCall(1)) {
                throw new Error('Límite de puntos alcanzado para consultar receta');
            }

            const response = await axios.get(`${this.SPOONACULAR_BASE_URL}/${recipeId}/information`, {
                params: {
                    apiKey: this.SPOONACULAR_API_KEY,
                    includeNutrition: false,
                    timeout: 5000
                }
            });

            const recipeData: RecetaDetalle = {
                id: response.data.id,
                title: response.data.title,
                image: response.data.image,
                readyInMinutes: response.data.readyInMinutes,
                servings: response.data.servings,
                sourceUrl: response.data.sourceUrl,
                vegetarian: response.data.vegetarian,
                vegan: response.data.vegan,
                glutenFree: response.data.glutenFree,
                dairyFree: response.data.dairyFree,
                extendedIngredients: response.data.extendedIngredients.map((ing: any) => ({
                    name: ing.nameClean || ing.name,
                    amount: ing.amount,
                    unit: ing.unit
                })),
                instructions: response.data.instructions || 'No hay instrucciones disponibles',
                analyzedInstructions: response.data.analyzedInstructions?.[0]?.steps ? [{
                    name: response.data.analyzedInstructions[0].name || "",
                    steps: response.data.analyzedInstructions[0].steps.map((step: any) => ({
                        number: step.number,
                        step: step.step,
                        ingredients: step.ingredients?.map((i: any) => ({
                            id: i.id,
                            name: i.name,
                            localizedName: i.localizedName,
                            image: i.image
                        })) || [],
                        equipment: step.equipment?.map((e: any) => ({
                            id: e.id,
                            name: e.name,
                            localizedName: e.localizedName,
                            image: e.image
                        })) || []
                    }))
                }] : []
            };

            recipeDetailCache.set(cacheKey, recipeData);
            console.log(`[API] Receta ${recipeId} almacenada en caché`);
            return recipeData;
        } catch (error: any) {
            console.error(`Error al obtener receta ${recipeId}:`, error.message);
            const mealType = recipeId % 2 === 0 ? 'lunch' : 'dinner';
            const fallbackRecipe = this.getLocalFallbackRecipe(mealType);
            recipeDetailCache.set(cacheKey, fallbackRecipe);
            return fallbackRecipe;
        }
    }

    private categorizeIngredient(nombre: string): string {
        const lower = nombre.toLowerCase();
        if (/leche|queso|yogur/.test(lower)) return 'lácteos';
        if (/carne|pollo|pescado|res|cerdo/.test(lower)) return 'carnes';
        if (/manzana|banana|naranja|uva/.test(lower)) return 'frutas';
        if (/cebolla|zanahoria|papa|tomate/.test(lower)) return 'vegetales';
        if (/arroz|pasta|pan|harina/.test(lower)) return 'granos';
        return 'otros';
    }

    private getLocalFallbackRecipe(tipo: string): RecetaDetalle {
        const fallbackRecipes = {
            breakfast: [
                {
                    id: -3001,
                    title: "Avena con Frutas y Nueces",
                    image: "",
                    readyInMinutes: 10,
                    servings: 2,
                    sourceUrl: "",
                    vegetarian: true,
                    vegan: true,
                    glutenFree: true,
                    dairyFree: true,
                    extendedIngredients: [
                        { name: "avena", amount: 1, unit: "cup" },
                        { name: "leche de almendras", amount: 2, unit: "cups" },
                        { name: "plátano", amount: 1, unit: "medium" },
                        { name: "nueces", amount: 0.25, unit: "cup" },
                        { name: "miel", amount: 2, unit: "tablespoons" }
                    ],
                    analyzedInstructions: [
                        {
                            name: "",
                            steps: [
                                {
                                    number: 1,
                                    step: "Calentar la leche de almendras en una olla pequeña",
                                    ingredients: [
                                        { id: -1, name: "leche de almendras", localizedName: "leche de almendras", image: "almond-milk.png" }
                                    ],
                                    equipment: [
                                        { id: -1, name: "olla pequeña", localizedName: "olla pequeña", image: "sauce-pan.png" }
                                    ]
                                },
                                {
                                    number: 2,
                                    step: "Agregar la avena y cocinar a fuego medio durante 5 minutos",
                                    ingredients: [
                                        { id: -2, name: "avena", localizedName: "avena", image: "oats.png" }
                                    ],
                                    equipment: []
                                }
                            ]
                        }
                    ]
                }
            ],
            lunch: [
                {
                    id: -1001,
                    title: "Ensalada Mediterránea de Quinoa",
                    image: "",
                    readyInMinutes: 25,
                    servings: 2,
                    sourceUrl: "",
                    vegetarian: true,
                    vegan: true,
                    glutenFree: true,
                    dairyFree: true,
                    extendedIngredients: [
                        { name: "quinoa", amount: 1, unit: "cup" },
                        { name: "pepino", amount: 1, unit: "medium" },
                        { name: "tomates cherry", amount: 1, unit: "cup" },
                        { name: "cebolla roja", amount: 0.5, unit: "small" },
                        { name: "aceitunas kalamata", amount: 0.5, unit: "cup" },
                        { name: "aceite de oliva", amount: 3, unit: "tablespoons" },
                        { name: "jugo de limón", amount: 2, unit: "tablespoons" }
                    ],
                    analyzedInstructions: [
                        {
                            name: "",
                            steps: [
                                {
                                    number: 1,
                                    step: "Cocinar quinoa según instrucciones del paquete y dejar enfriar",
                                    ingredients: [
                                        { id: -1, name: "quinoa", localizedName: "quinoa", image: "quinoa.png" }
                                    ],
                                    equipment: [
                                        { id: -1, name: "olla", localizedName: "olla", image: "pot.png" }
                                    ]
                                },
                                {
                                    number: 2,
                                    step: "Picar pepino, tomates y cortar finamente la cebolla roja",
                                    ingredients: [
                                        { id: -2, name: "pepino", localizedName: "pepino", image: "cucumber.png" },
                                        { id: -3, name: "tomates cherry", localizedName: "tomates cherry", image: "cherry-tomatoes.png" },
                                        { id: -4, name: "cebolla roja", localizedName: "cebolla roja", image: "red-onion.png" }
                                    ],
                                    equipment: [
                                        { id: -2, name: "tabla de cortar", localizedName: "tabla de cortar", image: "cutting-board.png" },
                                        { id: -3, name: "cuchillo de chef", localizedName: "cuchillo de chef", image: "chefs-knife.png" }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            dinner: [
                {
                    id: -2001,
                    title: "Salmón con Mantequilla de Ajo y Espárragos",
                    image: "",
                    readyInMinutes: 25,
                    servings: 2,
                    sourceUrl: "",
                    vegetarian: false,
                    vegan: false,
                    glutenFree: true,
                    dairyFree: false,
                    extendedIngredients: [
                        { name: "filetes de salmón", amount: 2, unit: "6 oz cada uno" },
                        { name: "espárragos", amount: 1, unit: "manojo" },
                        { name: "mantequilla", amount: 3, unit: "tablespoons" },
                        { name: "ajo", amount: 4, unit: "dientes" },
                        { name: "limón", amount: 1, unit: "medium" },
                        { name: "aceite de oliva", amount: 1, unit: "tablespoon" }
                    ],
                    analyzedInstructions: [
                        {
                            name: "",
                            steps: [
                                {
                                    number: 1,
                                    step: "Precalentar el horno a 200°C y forrar una bandeja con papel pergamino",
                                    ingredients: [],
                                    equipment: [
                                        { id: -9, name: "horno", localizedName: "horno", image: "oven.png" },
                                        { id: -10, name: "bandeja para hornear", localizedName: "bandeja para hornear", image: "baking-sheet.png" }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const recipes = fallbackRecipes[tipo as keyof typeof fallbackRecipes];
        const randomIndex = Math.floor(Math.random() * recipes.length);
        return recipes[randomIndex];
    }

    public async updateShoppingListItems(req: Request, res: Response): Promise<Response> {
        try {
            const { plan_id } = req.params;
            const { items } = req.body;

            if (!plan_id || !ObjectId.isValid(plan_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un plan_id válido'
                });
            }

            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un array de items en el body con al menos un elemento'
                });
            }

            const db = getDb();

            const plan = await db.collection<PlanSemanal>('planes_semanales').findOne(
                { _id: new ObjectId(plan_id) },
                { projection: { usuario_id: 1, lista_compras: 1 } }
            );

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Plan no encontrado'
                });
            }

            const normalizeName = (name: string) => name.trim().toLowerCase();

            const bulkUpdates = [];
            const itemsParaInventario = [];
            const itemsNoEncontrados = [];

            for (const itemUpdate of items) {
                const nombreNormalizado = normalizeName(itemUpdate.nombre);
                const itemOriginal = plan.lista_compras.find(
                    item => normalizeName(item.nombre) === nombreNormalizado
                );

                if (itemOriginal) {
                    bulkUpdates.push({
                        updateOne: {
                            filter: {
                                _id: new ObjectId(plan_id),
                                'lista_compras.nombre': itemOriginal.nombre
                            },
                            update: {
                                $set: {
                                    'lista_compras.$.comprado': itemUpdate.comprado,
                                    fecha_actualizacion: new Date()
                                }
                            }
                        }
                    });

                    if (itemUpdate.comprado) {
                        itemsParaInventario.push({
                            ingrediente_id: new ObjectId(),
                            nombre: itemOriginal.nombre,
                            cantidad: itemOriginal.cantidad,
                            unidad: itemOriginal.unidad,
                            categoria: itemOriginal.categoria || 'otros',
                            almacenamiento: 'desconocido',
                            fecha_actualizacion: new Date()
                        });
                    }
                } else {
                    itemsNoEncontrados.push(itemUpdate.nombre);
                }
            }

            if (bulkUpdates.length > 0) {
                await db.collection('planes_semanales').bulkWrite(bulkUpdates);
            }

            if (itemsParaInventario.length > 0) {
                try {
                    await db.collection('usuarios').updateOne(
                        { _id: plan.usuario_id },
                        {
                            // @ts-ignore
                            $push: { inventario: { $each: itemsParaInventario } },
                            $set: { fecha_actualizacion: new Date() }
                        }
                    );
                } catch (error) {
                    console.error('Error al actualizar inventario:', error);
                }
            }

            const response: any = {
                success: true,
                message: 'Operación completada',
                data: {
                    items_actualizados: bulkUpdates.length,
                    items_agregados_inventario: itemsParaInventario.length
                }
            };

            if (itemsNoEncontrados.length > 0) {
                response.data.items_no_encontrados = itemsNoEncontrados;
                response.message = 'Operación completada con algunos items no encontrados';
            }

            return res.status(200).json(response);

        } catch (error: any) {
            console.error('Error al actualizar items de compra:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error al actualizar los items'
            });
        }
    }

    public async getShoppingList(req: Request, res: Response): Promise<Response> {
        try {
            const { plan_id } = req.params;

            if (!plan_id || !ObjectId.isValid(plan_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un plan_id válido'
                });
            }

            const db = getDb();

            const plan = await db.collection<PlanSemanal>('planes_semanales').findOne(
                { _id: new ObjectId(plan_id) },
                { projection: { lista_compras: 1, usuario_id: 1 } }
            );

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Plan no encontrado'
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    plan_id,
                    lista_compras: plan.lista_compras || []
                }
            });

        } catch (error: any) {
            console.error('Error al obtener lista de compras:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener la lista de compras'
            });
        }
    }
}

export { PlansController };
const plansController = new PlansController();
export default plansController;