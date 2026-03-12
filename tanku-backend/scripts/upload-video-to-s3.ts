/**
 * Script para subir un video a S3
 * 
 * Uso:
 *   tsx scripts/upload-video-to-s3.ts <ruta-al-video>
 *   tsx scripts/upload-video-to-s3.ts ./video.mp4
 *   tsx scripts/upload-video-to-s3.ts C:\Users\david\Downloads\video.mp4
 */

import { S3Service } from '../src/shared/services/s3.service';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';

async function uploadVideoToS3() {
  try {
    // Obtener ruta del archivo desde argumentos
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('❌ Error: Debes proporcionar la ruta al archivo de video');
      console.log('\nUso: tsx scripts/upload-video-to-s3.ts <ruta-al-video>');
      console.log('Ejemplo: tsx scripts/upload-video-to-s3.ts ./video.mp4');
      process.exit(1);
    }

    const videoPath = args[0];
    console.log(`📹 Leyendo video desde: ${videoPath}\n`);

    // Leer el archivo
    let videoBuffer: Buffer;
    try {
      videoBuffer = readFileSync(videoPath);
    } catch (error) {
      console.error(`❌ Error: No se pudo leer el archivo: ${videoPath}`);
      console.error(`   ${error instanceof Error ? error.message : 'Error desconocido'}`);
      process.exit(1);
    }

    // Obtener información del archivo
    const fileName = basename(videoPath);
    const fileExtension = extname(fileName);
    const fileSize = videoBuffer.length;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

    console.log(`📊 Información del archivo:`);
    console.log(`   Nombre: ${fileName}`);
    console.log(`   Tamaño: ${fileSizeMB} MB`);
    console.log(`   Extensión: ${fileExtension}\n`);

    // Determinar el tipo MIME basado en la extensión
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
    };

    const mimeType = mimeTypes[fileExtension.toLowerCase()] || 'video/mp4';
    console.log(`🎬 Tipo MIME: ${mimeType}\n`);

    // Crear un objeto que simule Express.Multer.File
    const multerFile: Express.Multer.File = {
      fieldname: 'video',
      originalname: fileName,
      encoding: '7bit',
      mimetype: mimeType,
      size: fileSize,
      buffer: videoBuffer,
      destination: '',
      filename: fileName,
      path: videoPath,
      stream: {} as any,
    };

    // Inicializar servicio S3
    const s3Service = new S3Service();
    console.log('☁️  Subiendo video a S3...\n');

    // Subir el archivo (usando la carpeta 'videos' para organizarlo)
    const videoUrl = await s3Service.uploadFile(multerFile, 'videos');

    console.log('✅ ¡Video subido exitosamente!\n');
    console.log('🔗 URL del video:');
    console.log(`   ${videoUrl}\n`);
    console.log('📋 Copia esta URL y úsala en tu código:\n');
    console.log(`   videoUrl="${videoUrl}"\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al subir el video:');
    console.error(error instanceof Error ? error.message : 'Error desconocido');
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar el script
uploadVideoToS3();

