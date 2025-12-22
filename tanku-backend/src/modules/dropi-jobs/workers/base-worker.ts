import { DropiJobsService } from '../dropi-jobs.service';
import { DropiJobType } from '@prisma/client';

/**
 * Worker base abstracto
 * Cada worker implementa el método processJob
 */
export abstract class BaseWorker {
  protected dropiJobsService: DropiJobsService;
  protected workerId: string;
  protected type: DropiJobType;

  constructor(type: DropiJobType) {
    this.dropiJobsService = new DropiJobsService();
    this.workerId = `${type}_worker_${process.pid}_${Date.now()}`;
    this.type = type;
  }

  /**
   * Loop principal del worker
   */
  async start(): Promise<void> {
    console.log(`🚀 [WORKER ${this.type}] Iniciando worker ${this.workerId}`);

    while (true) {
      try {
        const job = await this.dropiJobsService.takeNextJob(this.type, this.workerId);

        if (!job) {
          // No hay jobs pendientes, esperar 5 segundos
          await this.sleep(5000);
          continue;
        }

        console.log(`📦 [WORKER ${this.type}] Procesando job ${job.id} (intento ${job.attempts})`);

        try {
          await this.processJob(job.id);
          await this.dropiJobsService.markJobDone(job.id);
          console.log(`✅ [WORKER ${this.type}] Job ${job.id} completado`);
        } catch (error: any) {
          console.error(`❌ [WORKER ${this.type}] Error procesando job ${job.id}:`, error?.message);
          await this.dropiJobsService.markJobFailed(job.id, error?.message || 'Error desconocido');
        }
      } catch (error: any) {
        console.error(`❌ [WORKER ${this.type}] Error en loop:`, error?.message);
        await this.sleep(5000); // Esperar antes de reintentar
      }
    }
  }

  /**
   * Método abstracto que cada worker debe implementar
   */
  protected abstract processJob(jobId: string): Promise<void>;

  /**
   * Helper para sleep
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Actualizar progreso del job
   */
  protected async updateProgress(jobId: string, progress: number): Promise<void> {
    await this.dropiJobsService.updateProgress(jobId, progress);
  }
}
