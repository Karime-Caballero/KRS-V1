import { PlansController } from '../controladores/plansController';
import { getDb } from '../mongo';
import NodeCache from 'node-cache';
import { ObjectId } from 'mongodb'; 

class MealPlanWorker {
    private plansController = new PlansController();
    private CHECK_INTERVAL = 30 * 60 * 1000; // Revisar cada 30 minutos
    private MAX_PLANS_PER_RUN = 3; // Procesar máximo 3 planes por ejecución
    private cache = new NodeCache({ stdTTL: 3600 }); // Cache para almacenar planes en proceso

    public async processPendingPlans(): Promise<void> {
        try {
            console.log('Buscando planes pendientes de procesar...');
            const db = getDb();
            
            // Obtener planes pendientes que no estén siendo procesados
            const pendingPlans = await db.collection('planes_semanales').find({
                estado: 'en_proceso',
                _id: { $nin: Array.from(this.cache.keys()).map(id => new ObjectId(id)) }
            }).limit(this.MAX_PLANS_PER_RUN).toArray();

            console.log(`Encontrados ${pendingPlans.length} planes pendientes`);
            
            for (const plan of pendingPlans) {
                try {
                    // Marcar como en proceso en caché
                    this.cache.set(plan._id.toString(), true);
                    
                    console.log(`Procesando plan ${plan._id}`);
                    await this.plansController.processPlanInBackground(plan._id);
                    console.log(`Plan ${plan._id} procesado correctamente`);
                } catch (error) {
                    console.error(`Error procesando plan ${plan._id}:`, error);
                } finally {
                    // Eliminar de caché cuando termine (éxito o error)
                    this.cache.del(plan._id.toString());
                }
            }
        } catch (error) {
            console.error('Error en el worker al buscar planes pendientes:', error);
        }
    }

    public start(): void {
        // Ejecutar inmediatamente al iniciar
        this.processPendingPlans();
        
        // Programar ejecución periódica
        setInterval(() => {
            this.processPendingPlans();
        }, this.CHECK_INTERVAL);
        
        console.log('Worker de planes de comida iniciado');
    }
}

// Iniciar el worker si este es el archivo principal
if (require.main === module) {
    const worker = new MealPlanWorker();
    worker.start();
}

export default MealPlanWorker;