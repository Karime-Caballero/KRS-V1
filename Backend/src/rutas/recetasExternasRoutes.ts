import { Router } from "express";
import recetasExternasController from "../controladores/recetasExternasController";

class RecetasExternasRoutes {
    public router: Router = Router();

    constructor() {
        this.config();
    }

    config(): void {
        // Buscar recetas por texto, tipo, dieta, etc.
        this.router.get('/buscar', recetasExternasController.buscarRecetas);

        // Obtener detalles de una receta por ID
        this.router.get('/detalle/:recetaId', recetasExternasController.obtenerDetalleReceta);

        // Buscar recetas por ingredientes disponibles
        this.router.get('/ingredientes', recetasExternasController.buscarPorIngredientes);
    }
}

const recetasExternasRoutes = new RecetasExternasRoutes();
export default recetasExternasRoutes.router;
