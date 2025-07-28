import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import keys from './keys';

// Variables para la conexión
let client: MongoClient | null = null;
let db: Db | null = null;

// Opciones de seguridad para la conexión
const mongoOptions: MongoClientOptions = {
    maxPoolSize: 50,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    retryReads: true,
    serverSelectionTimeoutMS: 5000,
    appName: 'app-recetas',
    ignoreUndefined: true
};

export async function connectToMongo(): Promise<void> {
    try {
        if (client && db) {
            return;
        }
        
        client = new MongoClient(keys.mongo.uri, mongoOptions);
        await client.connect();
        
        // Verificamos la conexión con un ping
        await client.db().command({ ping: 1 });
        
        db = client.db(keys.mongo.dbName);
        console.log('Conexión exitosa a MongoDB');
        
    } catch (error) {
        console.error('Error al conectar a MongoDB:', error);
        throw error;
    }
}

export function getDb(): Db {
    if (!db) {
        throw new Error('No se ha establecido conexión con MongoDB');
    }
    return db;
}

export async function closeConnection(): Promise<void> {
    try {
        if (client) {
            console.log('🔌 Cerrando conexión a MongoDB...');
            await client.close();
            console.log('Conexión a MongoDB cerrada');
        }
    } catch (error) {
        console.error('Error al cerrar conexión:', error);
        throw error;
    } finally {
        client = null;
        db = null;
    }
}

// Manejo de cierre de la aplicación
process.on('SIGINT', async () => {
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeConnection();
    process.exit(0);
});

// Función para verificar el estado de la conexión
export async function checkConnection(): Promise<boolean> {
    try {
        if (!client) return false;
        
        // Alternativa a isConnected (que está deprecado)
        await client.db().command({ ping: 1 });
        return true;
    } catch {
        return false;
    }
}