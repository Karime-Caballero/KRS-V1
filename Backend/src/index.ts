import express, { Application } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { connectToMongo, getDb, closeConnection } from './mongo';
import loginRoutes from './rutas/loginRoutes';
import usuariosRoutes from './rutas/usuariosRoutes';
import recetasExternasRoutes from './rutas/recetasExternasRoutes';
import plansRoutes from './rutas/plansRoutes';
import bodyParser from 'body-parser';

import dotenv from 'dotenv';
dotenv.config();

class Server {
    public app: Application;
    private dbConnected: boolean = false;

    constructor() {
        this.app = express();
        this.config();
        this.routes(); // Las rutas pueden definirse sincrónicamente
    }

    private config(): void {
        this.app.set('port', process.env.PORT || 4000);
        this.app.use(morgan('dev'));
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
    }

    public async connectDatabase(): Promise<void> {
        try {
            await connectToMongo();
            this.dbConnected = true;
            console.log('Conexión a MongoDB establecida');
        } catch (error) {
            console.error('Error al conectar a MongoDB:', error);
            throw error; // Permite manejar el error externamente
        }
    }

    private routes(): void {
        // Health check mejorado que verifica la conexión a DB
        this.app.get('/health', async (req, res) => {
            if (!this.dbConnected) {
                return res.status(500).json({ 
                    status: 'ERROR', 
                    message: 'Database not connected' 
                });
            }

            try {
                const mongoDb = getDb();
                await mongoDb.command({ ping: 1 });
                res.status(200).json({ 
                    status: 'OK',
                    database: 'MongoDB connected'
                });
            } catch (error) {
                res.status(500).json({ 
                    status: 'ERROR',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        this.app.use('/auth', loginRoutes);
        this.app.use('/users', usuariosRoutes);
        this.app.use('/recipes', recetasExternasRoutes);
        this.app.use('/plans', plansRoutes);
    }

    public start(): void {
        if (!this.dbConnected) {
            console.error('Error: La base de datos no está conectada');
            process.exit(1);
        }

        this.app.listen(this.app.get('port'), () => {
            console.log(`Servidor corriendo en Atlas, en el puerto http://localhost:${this.app.get('port')}`);
        });
    }
}

// Uso modificado pero similar al original
(async () => {
    const server = new Server();
    
    try {
        await server.connectDatabase();
        server.start();
        
        // Manejo de cierre limpio
        process.on('SIGINT', async () => {
            console.log('\nCerrando conexiones...');
            await closeConnection();
            process.exit(0);
        });

    } catch (error) {
        console.error('No se pudo iniciar el servidor:', error);
        process.exit(1);
    }
})();