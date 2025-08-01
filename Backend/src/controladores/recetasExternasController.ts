import { Request, Response } from 'express';
import xss from 'xss';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import axios from 'axios';

dotenv.config();

// Configuración de caché
const SEARCH_CACHE_TTL = 3600; // 1 hora en segundos
const DETAIL_CACHE_TTL = 86400; // 24 horas en segundos
const searchCache = new NodeCache({ stdTTL: SEARCH_CACHE_TTL });
const detailCache = new NodeCache({ stdTTL: DETAIL_CACHE_TTL });

class RecetasExternasController {
    private SPOONACULAR_BASE_URL: string;

    constructor() {
        this.buscarRecetas = this.buscarRecetas.bind(this);
        this.obtenerDetalleReceta = this.obtenerDetalleReceta.bind(this);
        this.buscarPorIngredientes = this.buscarPorIngredientes.bind(this);
        
        this.SPOONACULAR_BASE_URL = process.env.SPOONACULAR_BASE_URL || 'https://api.spoonacular.com/recipes';
    }

    private sanitizeQuery(query: any): any {
        const sanitized: any = {};
        for (const key in query) {
            if (typeof query[key] === 'string') {
                sanitized[key] = xss(query[key]);
            } else {
                sanitized[key] = query[key];
            }
        }
        return sanitized;
    }

    private getApiKey(): string {
        const apiKeys = [
            process.env.SPOONACULAR_API_KEY_1,
            process.env.SPOONACULAR_API_KEY_2,
            process.env.SPOONACULAR_API_KEY_3
        ].filter(Boolean);
        
        return apiKeys[Math.floor(Math.random() * apiKeys.length)] || '';
    }

    private async fetchFromSpoonacular(endpoint: string, params: Record<string, any>, isDetail: boolean = false): Promise<any> {
        const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
        
        // Verificar caché primero
        const cachedData = isDetail ? detailCache.get(cacheKey) : searchCache.get(cacheKey);
        if (cachedData) {
            console.log(`[CACHE] Recuperando de caché: ${cacheKey}`);
            return cachedData;
        }

        // Rotar API Key
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('No hay API keys disponibles para Spoonacular');
        }

        // Configurar URL
        const url = new URL(`${this.SPOONACULAR_BASE_URL}${endpoint}`);
        params.apiKey = apiKey;

        // Añadir parámetros
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.append(key, String(value));
            }
        }

        // Hacer la petición
        try {
            const response = await axios.get(url.toString(), {
                timeout: 5000
            });

            // Almacenar en caché
            if (isDetail) {
                detailCache.set(cacheKey, response.data);
            } else {
                searchCache.set(cacheKey, response.data);
            }

            return response.data;
        } catch (error: any) {
            console.error(`Error en API Spoonacular (${endpoint}):`, error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Error al consultar Spoonacular');
        }
    }

    public async buscarRecetas(req: Request, res: Response): Promise<void> {
        try {
            const sanitizedQuery = this.sanitizeQuery(req.query);
            const {
                query,
                diet,
                intolerances,
                type,
                maxReadyTime,
                number = 10,
            } = sanitizedQuery;

            const data = await this.fetchFromSpoonacular('/recipes/complexSearch', {
                query: query as string,
                diet,
                intolerances,
                type,
                maxReadyTime,
                number
            });

            res.status(200).json({
                success: true,
                data,
                meta: {
                    query: query || null,
                }
            });
        } catch (error) {
            console.error('Error al buscar recetas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al consultar recetas externas',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    public async obtenerDetalleReceta(req: Request, res: Response): Promise<void> {
        try {
            const { recetaId } = req.params;
            const { lang = 'es' } = req.query;

            if (!recetaId || isNaN(parseInt(recetaId))) {
                res.status(400).json({ success: false, message: 'ID de receta no válido' });
                return;
            }

            const data = await this.fetchFromSpoonacular(
                `/recipes/${recetaId}/information`,
                { includeNutrition: false },
                true // Es un detalle, usar caché de larga duración
            );

            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Error al obtener detalle de receta:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener información de receta',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    public async buscarPorIngredientes(req: Request, res: Response): Promise<void> {
        try {
            const { ingredientes, lang = 'es' } = req.query;

            if (!ingredientes || typeof ingredientes !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar una lista de ingredientes separados por comas'
                });
                return;
            }

            const data = await this.fetchFromSpoonacular(
                '/recipes/findByIngredients',
                {
                    ingredients: ingredientes as string,
                    number: 10
                }
            );

            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Error al buscar por ingredientes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al buscar recetas por ingredientes',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
}

const recetasExternasController = new RecetasExternasController();
export default recetasExternasController;