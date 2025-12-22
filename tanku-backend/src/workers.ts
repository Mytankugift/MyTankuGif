/**
 * Punto de entrada para ejecutar workers en producción
 * Ejecutar: node dist/workers.js
 * 
 * Este archivo se compila a dist/workers.js y puede ejecutarse
 * como un servicio separado en Railway
 */

import './modules/dropi-jobs/workers/start-workers';
