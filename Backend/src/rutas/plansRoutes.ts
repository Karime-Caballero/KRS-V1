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
    }
}

const plansRoutes = new PlansRoutes();
export default plansRoutes.router;