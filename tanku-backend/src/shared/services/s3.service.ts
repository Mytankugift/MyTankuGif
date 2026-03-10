import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../config/env';
import { randomUUID } from 'crypto';
import path from 'path';

/**
 * Servicio para subir archivos a S3
 * Migrado a AWS SDK v3
 */
export class S3Service {
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true, // Para compatibilidad con S3-compatible storage
    });
  }

  /**
   * Obtener prefijo según el ambiente (dev/prod)
   * Permite separar archivos de desarrollo y producción para facilitar la limpieza
   */
  private getEnvironmentPrefix(): string {
    return env.NODE_ENV === 'production' ? 'prod' : 'dev';
  }

  /**
   * Subir archivo a S3
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads'
  ): Promise<string> {
    try {
      // Generar nombre único para el archivo con prefijo de ambiente
      const fileExtension = path.extname(file.originalname);
      const envPrefix = this.getEnvironmentPrefix();
      const fileName = `${envPrefix}/${folder}/${randomUUID()}${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        // ACL removido - el acceso público se controla mediante la política del bucket
      });

      await this.s3.send(command);

      // Construir URL manualmente (AWS SDK v3 no retorna Location directamente)
      return `${env.S3_FILE_URL}/${fileName}`;
    } catch (error) {
      console.error('Error subiendo archivo a S3:', error);
      throw new Error('Error al subir archivo a S3');
    }
  }

  /**
   * Subir archivo a S3 para productos (sin prefijo de ambiente)
   * Las imágenes de productos son compartidas entre dev y prod
   */
  async uploadFileForProducts(
    file: Express.Multer.File
  ): Promise<string> {
    try {
      const fileExtension = path.extname(file.originalname);
      // Sin prefijo de ambiente, directamente en products/
      const fileName = `products/${randomUUID()}${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3.send(command);

      // Construir URL manualmente (AWS SDK v3 no retorna Location directamente)
      return `${env.S3_FILE_URL}/${fileName}`;
    } catch (error) {
      console.error('Error subiendo archivo a S3:', error);
      throw new Error('Error al subir archivo a S3');
    }
  }

  /**
   * Eliminar archivo de S3
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      let key: string;
      
      // Intentar parsear como URL
      try {
        const url = new URL(fileUrl);
        
        // Obtener el pathname de la URL
        const pathname = url.pathname;
        
        // Remover el primer / del pathname
        let pathWithoutSlash = pathname.startsWith('/') ? pathname.substring(1) : pathname;
        
        // Si el pathname empieza con el nombre del bucket, removerlo
        // Esto puede pasar en URLs como: https://s3.amazonaws.com/bucket/products/uuid.jpg
        if (pathWithoutSlash.startsWith(env.S3_BUCKET + '/')) {
          pathWithoutSlash = pathWithoutSlash.substring(env.S3_BUCKET.length + 1);
        }
        
        key = pathWithoutSlash;
      } catch (urlError) {
        // Si no es una URL válida, asumir que es una key directa
        key = fileUrl;
      }
      
      // Si la key está vacía, no hacer nada
      if (!key || key.trim() === '') {
        console.warn(`[S3Service] Key vacía para URL: ${fileUrl}`);
        return;
      }

      console.log(`[S3Service] Eliminando archivo de S3 - Bucket: ${env.S3_BUCKET}, Key: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
      });

      await this.s3.send(command);
      console.log(`[S3Service] Archivo eliminado exitosamente: ${key}`);
    } catch (error) {
      console.error('Error eliminando archivo de S3:', error);
      // Lanzar error para que el caller pueda manejarlo
      throw new Error(`Error al eliminar archivo de S3: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}
