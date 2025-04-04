import {
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ConfigModule } from "@medusajs/framework/types";
import { parseCorsOrigins } from "@medusajs/framework/utils";
import cors from "cors";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

// Adaptador para convertir middleware de multer a formato compatible con Medusa
const multerMiddleware = (multerHandler) => {
  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    return multerHandler(req, res, (err) => {
      if (err) {
        return next(err);
      }
      return next();
    });
  };
};

export default defineMiddlewares({
  routes: [
    {
      matcher: "/seller*",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          const configModule: ConfigModule = req.scope.resolve("configModule");
          return cors({
            origin: parseCorsOrigins(configModule.projectConfig.http.storeCors),
            credentials: true,
          })(req, res, next);
        },
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          next();
        },
      ],
    },
    {
      method: ["POST"],
      matcher: "/seller/request",
      middlewares: [
        multerMiddleware(upload.array("files")),
      ],
    },
    {
      method: ["POST"],
      matcher: "/seller/product",
      middlewares: [
        multerMiddleware(upload.array("images")),
      ],
    },
  ],
});