import { Router } from "express";
import loginController from '../controladores/loginController';

class LoginRoutes {
    public router: Router = Router();

    constructor() {
        this.config();
    }
    
    config(): void {
        this.router.post('/signup', loginController.create);
    }
}

const loginRoutes = new LoginRoutes();
export default loginRoutes.router;
