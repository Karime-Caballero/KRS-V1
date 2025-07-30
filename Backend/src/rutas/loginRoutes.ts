import { Router } from "express";
import loginController from '../controladores/loginController';
import { authenticateJWT } from "../Middleware/authMiddleware";

class LoginRoutes {
    public router: Router = Router();

    constructor() {
        this.config();
    }
    
    config(): void {
        this.router.post('/signup', loginController.create);
        this.router.post('/login', loginController.login);
        this.router.post('/refresh', loginController.refreshToken);
        this.router.post('/logout', authenticateJWT, loginController.logout);
    }
}

const loginRoutes = new LoginRoutes();
export default loginRoutes.router;
