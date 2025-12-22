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
   * Subir archivo a S3
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads'
  ): Promise<string> {
    try {
      // Generar nombre único para el archivo
      const fileExtension = path.extname(file.originalname);
      const fileName = `${folder}/${randomUUID()}${fileExtension}`;

      const params: AWS.S3.PutObjectRequest = {
        Bucket: env.S3_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Hacer el archivo público
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
   * Eliminar archivo de S3
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extraer la key del archivo de la URL
      const url = new URL(fileUrl);
      const key = url.pathname.substring(1); // Remover el primer /

      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: env.S3_BUCKET,
        Key: key,
      };

      await this.s3.deleteObject(params).promise();
    } catch (error) {
      console.error('Error eliminando archivo de S3:', error);
      // No lanzar error, solo loguear (el archivo puede no existir)
    }
  }
}
