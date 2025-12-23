{
  "build": {
    "builder": "metal",
    "rootDirectory": "/tanku-backend",
    "buildCommand": "npm run build",
    "startCommand": "npm run start:workers"
  },
  "resources": {
    "cpu": 1,
    "memory": 1024
  },
  "env": {
    "DATABASE_URL": "@DATABASE_URL",
    "DROP_API_KEY": "@DROP_API_KEY"
  },
  "restartPolicy": {
    "onFailure": true,
    "maxRetries": 10
  }
}