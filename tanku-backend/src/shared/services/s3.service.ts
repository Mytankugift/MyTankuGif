import AWS from 'aws-sdk';
import { env } from '../../config/env';
import { randomUUID } from 'crypto';
import path from 'path';

/**
 * Servicio para subir archivos a S3
 */
export class S3Service {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      s3ForcePathStyle: true, // Para compatibilidad con S3-compatible storage
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

      const params: AWS.S3.PutObjectRequest = {
        Bucket: env.S3_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        // ACL removido - el acceso público se controla mediante la política del bucket
      };

      const result = await this.s3.upload(params).promise();

      // Retornar la URL completa del archivo
      // Si Location no está disponible, construirla manualmente
      if (result.Location) {
        return result.Location;
      }
      
      // Construir URL manualmente si es necesario
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

      const params: AWS.S3.PutObjectRequest = {
        Bucket: env.S3_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const result = await this.s3.upload(params).promise();

      // Retornar la URL completa del archivo
      if (result.Location) {
        return result.Location;
      }

      // Construir URL manualmente si es necesario
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

      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: env.S3_BUCKET,
        Key: key,
      };

      await this.s3.deleteObject(params).promise();
      console.log(`[S3Service] Archivo eliminado exitosamente: ${key}`);
    } catch (error) {
      console.error('Error eliminando archivo de S3:', error);
      // Lanzar error para que el caller pueda manejarlo
      throw new Error(`Error al eliminar archivo de S3: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}
