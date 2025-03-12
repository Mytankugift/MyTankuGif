import {
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import express from "express";
import { ConfigModule } from "@medusajs/framework/types";
import { parseCorsOrigins } from "@medusajs/framework/utils";
import cors from "cors";
import multer from "multer";
import path from "path";

// const storage = multer.diskStorage({
//   destination: "uploads/documents/seller-request",
//   filename: (req, file, cb) => {
//     const uniqueFilename = `${Date.now()}-${Math.round(
//       Math.random() * 1e9
//     )}${path.extname(file.originalname)}`;
//     cb(null, uniqueFilename);
//   },
// });

const upload = multer({ storage: multer.memoryStorage() });

export default defineMiddlewares({
  routes: [
    {
      matcher: "/seller*",
      middlewares: [
        // Middleware CORS para rutas de vendedor
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          const configModule: ConfigModule = req.scope.resolve("configModule");
          return cors({
            origin: parseCorsOrigins(configModule.projectConfig.http.storeCors),
            credentials: true,
          })(req, res, next);
        },
        // Otro middleware para rutas de vendedor (si es necesario)
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          console.log("Ruta de vendedor accedida");
          next();
        },
      ],
    },
    {
      method: ["POST"],
      matcher: "/seller/request",
      middlewares: [
        // Middleware de carga de archivos
        upload.array("files"),
      ],
    },
    // Puedes agregar más objetos de ruta aquí si es necesario
  ],
});
