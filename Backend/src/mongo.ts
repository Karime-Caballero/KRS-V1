import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGO_URI || '';

if (!mongoUri) {
    throw new Error('La variable de entorno MONGO_URI no está definida');
}

let client: MongoClient | null = null;
let db: Db | null = null;

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
        console.log('Mongo URI que se está usando:', mongoUri);

        if (client && db) {
            return;
        }

        client = new MongoClient(mongoUri, mongoOptions);
        await client.connect();

        await client.db().command({ ping: 1 });

        // Aquí extraemos el nombre de la DB de la URI, si quieres hardcodear usa otra variable
        // Por ejemplo, puedes definirla en env MONGO_DB_NAME, pero si no:
        db = client.db(); // db por defecto de la URI
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

export async function checkConnection(): Promise<boolean> {
    try {
        if (!client) return false;

        await client.db().command({ ping: 1 });
        return true;
    } catch {
        return false;
    }
}
