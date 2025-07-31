import { Request, Response } from 'express';
import xss from 'xss';
import dotenv from 'dotenv';

dotenv.config();

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const SPOONACULAR_BASE_URL = process.env.SPOONACULAR_BASE_URL;

class RecetasExternasController {
    constructor() {
        this.buscarRecetas = this.buscarRecetas.bind(this);
        this.obtenerDetalleReceta = this.obtenerDetalleReceta.bind(this);
        this.buscarPorIngredientes = this.buscarPorIngredientes.bind(this);
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

    private async fetchFromSpoonacular(endpoint: string, params: Record<string, any>): Promise<any> {
        const url = new URL(`${SPOONACULAR_BASE_URL}${endpoint}`);
        params.apiKey = SPOONACULAR_API_KEY;

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.append(key, String(value));
            }
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`Spoonacular error ${response.status}: ${await response.text()}`);
        }

        return await response.json();
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
                { includeNutrition: true }
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