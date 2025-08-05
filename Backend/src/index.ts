import express, { Application } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { connectToMongo, getDb, closeConnection } from './mongo';
import loginRoutes from './rutas/loginRoutes';
import usuariosRoutes from './rutas/usuariosRoutes';
import recetasExternasRoutes from './rutas/recetasExternasRoutes';
import plansRoutes from './rutas/plansRoutes';
import bodyParser from 'body-parser';

class Server {
    public app: Application;

    constructor() {
        this.app = express();
        this.config();
        this.database();
        this.routes();
    }

    config(): void {
        this.app.set('port', process.env.PORT || 4000);
        this.app.use(morgan('dev'));
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
    }

    async database(): Promise<void> {
        try {
            await connectToMongo();
        } catch (error) {
            const err = error as Error;
            console.error('Database connection error:', err.message);
            process.exit(1);
        }
    }

    routes(): void {
        // Health check endpoint
        this.app.get('/health', async (req, res) => {
            try {
                const mongoDb = getDb();
                await mongoDb.command({ ping: 1 });
                res.status(200).json({ 
                    status: 'OK',
                    database: 'MongoDB connected'
                });
            } catch (error) {
                const err = error as Error;
                res.status(500).json({ 
                    status: 'ERROR',
                    error: err.message 
                });
            }
        });

        this.app.use('/auth', loginRoutes);
        this.app.use('/users', usuariosRoutes);
        this.app.use('/recipes', recetasExternasRoutes);
        this.app.use('/plans', plansRoutes);
    }

    start(): void {
        this.app.listen(this.app.get('port'), () => {
            console.log(`Servidor corriendo en http://localhost:${this.app.get('port')}`);
        });
    }
}

const server = new Server();
server.start();

// Manejo de cierre limpio
process.on('SIGINT', async () => {
    await closeConnection();
    process.exit(0);
});