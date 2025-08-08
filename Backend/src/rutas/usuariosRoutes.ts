import { Router } from "express";
import usuariosController from '../controladores/usuariosController';

class UsuariosRoutes {
    public router: Router = Router();

    constructor() {
        this.config();
    }

    config(): void {
        // Rutas CRUD básicas
        this.router.get('/', usuariosController.list);
        this.router.get('/:_id', usuariosController.getOne);
        this.router.put('/:_id', usuariosController.update);
        this.router.delete('/:_id', usuariosController.delete);

        // Rutas para preferencias
        this.router.get('/:_id/preferencias', usuariosController.obtenerPreferenciasAlimentarias);
        this.router.put('/:_id/profile', usuariosController.guardarPreferenciasAlimentarias);

        // Rutas para el inventario
        this.router.get('/:_id/pantry', usuariosController.getPantry);
        this.router.post('/:_id/pantry', usuariosController.addIngredienteInventario);
        this.router.patch('/:_id/pantry/:itemId', usuariosController.updateInventarioItem);
        this.router.delete('/:_id/pantry/:ingredienteId', usuariosController.removeIngredienteInventario);
    }
}

const usuariosRoutes = new UsuariosRoutes();
export default usuariosRoutes.router;