import {
  authenticate,
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
      matcher: "/account*",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          const configModule: ConfigModule = req.scope.resolve("configModule");
          return cors({
            origin: parseCorsOrigins(configModule.projectConfig.http.storeCors),
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "Accept"],
          })(req, res, next);
        },
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
        
          next();
        },
      ],
    },
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
    {
      method: ["POST"],
      matcher: "/social/stories/create-story",
      middlewares: [
        multerMiddleware(upload.array("files")),
      ],
    },
    {
      method: ["POST"],
      matcher: "/social/posters/create-poster",
      middlewares: [
        multerMiddleware(upload.array("files")),
      ],
    },
    {
      method: ["POST"],
      matcher: "/personal-info/update-avatar",
      middlewares: [
        multerMiddleware(upload.single("avatar")),
      ],
    },
    {
      method: ["POST"],
      matcher: "/personal-info/update-banner",
      middlewares: [
        multerMiddleware(upload.single("banner")),
      ],
    },
    {
      method: ["POST"],
      matcher: "/social/groups/create",
      middlewares: [
        multerMiddleware(upload.single("image")),
      ],
    },
    {
      method: ["PUT"],
      matcher: "/social/groups/update",
      middlewares: [
        multerMiddleware(upload.single("image")),
      ],
    },
    {
      matcher: "/social*",
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
      matcher: "/chat*",
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
      matcher: "/socket.io*",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          const configModule: ConfigModule = req.scope.resolve("configModule");
          return cors({
            origin: parseCorsOrigins(configModule.projectConfig.http.storeCors),
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "Accept"],
          })(req, res, next);
        },
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          // Middleware específico para Socket.IO
          res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
          res.header("Access-Control-Allow-Credentials", "true");
          res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
          res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
          next();
        },
      ],
    },
    {
      matcher: "/auth*",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          const configModule: ConfigModule = req.scope.resolve("configModule");
          return cors({
            origin: parseCorsOrigins(configModule.projectConfig.http.storeCors),
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "Accept"],
          })(req, res, next);
        },
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          // Permitir acceso sin publishable API key para rutas de autenticación
          next();
        },
      ],
    },
  ],
});