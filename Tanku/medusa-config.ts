import { loadEnv, defineConfig } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  // admin: {
  //   backendUrl: process.env.MEDUSA_BACKEND_URL,
  //   disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
  // },
  projectConfig: {
    // redisUrl: process.env.REDIS_URL,
    databaseUrl: process.env.DATABASE_URL,
    workerMode: process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server",
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000,https://docs.medusajs.com",
      adminCors: process.env.ADMIN_CORS || "http://localhost:7001,http://localhost:7000",
      authCors: process.env.AUTH_CORS || "http://localhost:8000,http://localhost:7001,http://localhost:7000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    {
      resolve: "@medusajs/auth",
      options: {
        // URL de tu frontend (Next.js)
        client_url: (process.env.MEDUSA_CLIENT_URL && process.env.MEDUSA_CLIENT_URL.trim() !== "") 
          ? process.env.MEDUSA_CLIENT_URL 
          : "http://localhost:8000",
        // La URL de tu API de Medusa
        backend_url: process.env.MEDUSA_BACKEND_URL,
        // Configuración de proveedores de autenticación
        providers: [
          {
            resolve: "@medusajs/auth-emailpass",
            id: "emailpass",
            options: {
              // Configuración para email/password
            },
          },
          {
            resolve: "@medusajs/auth-google",
            id: "google",
            options: {
              // Claves de la aplicación de Google (usar camelCase)
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              // Rutas de redirección
              // clientUrl: URL del frontend donde se redirige después de la autenticación
              clientUrl: (process.env.MEDUSA_CLIENT_URL && process.env.MEDUSA_CLIENT_URL.trim() !== "") 
                ? process.env.MEDUSA_CLIENT_URL 
                : "http://localhost:8000",
              // callbackUrl: URL del backend de Medusa que recibe el código de Google
              // Medusa usa automáticamente /auth/customer/google/callback
              callbackUrl: `${(process.env.MEDUSA_BACKEND_URL && process.env.MEDUSA_BACKEND_URL.trim() !== "") ? process.env.MEDUSA_BACKEND_URL : "http://localhost:9000"}/auth/customer/google/callback`,
              // Ámbitos solicitados
              scope: ["email", "profile"],
              // IMPORTANTE: Especificar que el tipo de actor es "customer"
              // Esto asegura que Medusa cree o vincule un customer correctamente
              type: "customer",
            },
          },
        ],
        // Otras configuraciones del módulo Auth
        jwt_secret: process.env.JWT_SECRET || "supersecret",
      },
    },
    {
      resolve: "./src/modules/user-profiles",
    },
    {
      resolve: "./src/modules/auth-wordpress",
    },
    {
      resolve: "./src/modules/seller_request",
    },
    {
      resolve: "./src/modules/variant_inventory_tanku",
    },
    {
      resolve: "./src/modules/order_tanku",
    },
    {
      resolve: "./src/modules/wish_list",
    },
    {
      resolve: "./src/modules/social",
    },
    {
      resolve: "./src/modules/personal_information",
    },
    {
      resolve: "./src/modules/onboarding",
    },
    {
      resolve: "./src/modules/socket",
    },
    {
      resolve: "./src/modules/stalker_gift",
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              // other options...
            },
          },
        ],

      },
    },
    // {
    //   resolve: "@medusajs/medusa/cache-redis",
    //   options: {
    //     redisUrl: process.env.REDIS_URL,
    //   },
    // },
    // {
    //   resolve: "@medusajs/medusa/event-bus-redis",
    //   options: {
    //     redisUrl: process.env.REDIS_URL,
    //   },
    // },
    // {
    //   resolve: "@medusajs/medusa/workflow-engine-redis",
    //   options: {
    //     redis: {
    //       url: process.env.REDIS_URL,
    //     },
    //   },
    // },
  ],
});
