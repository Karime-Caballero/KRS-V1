import { Router } from "express";
import plansController from '../controladores/plansController';

class PlansRoutes {
    public router: Router = Router();

    constructor() {
        this.config();
    }

    config(): void {
        // Generar nuevo plan (POST)
        this.router.post('/:_id/generate', plansController.generatePlan);
        
        // Obtener plan específico (GET)
        this.router.get('/:plan_id', plansController.getPlan);

        // Obtener lista de compras de un plan (GET)
        this.router.get('/:plan_id/lista-compras', plansController.getShoppingList);

        // Actualizar ítem de lista de compras (PATCH)
        this.router.patch('/:plan_id/lista-compras', plansController.updateShoppingListItems);
    }
}

const plansRoutes = new PlansRoutes();
export default plansRoutes.router;