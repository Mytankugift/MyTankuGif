# 🚀 Tanku Admin - Dashboard de Procesos Dropi

Panel de administración para monitorear y ejecutar los procesos de sincronización de Dropi.

## 📋 Características

- ✅ **Monitoreo en tiempo real** de jobs de Dropi
- ✅ **Ejecución manual** de los 4 procesos principales:
  - Sincronizar RAW (JSON crudo)
  - Normalizar productos
  - Enriquecer con descripciones e imágenes
  - Sincronizar al backend
- ✅ **Historial completo** de jobs ejecutados
- ✅ **Cancelación de jobs** activos
- ✅ **Configuración flexible** para local o producción

## 🚀 Instalación

1. **Instalar dependencias:**
   ```bash
   cd tanku-admin
   npm install
   ```

2. **Configurar entorno:**
   
   Edita el archivo `.env.local` (o créalo si no existe):
   ```env
   # Para desarrollo local:
   NEXT_PUBLIC_API_URL=http://localhost:3000
   
   # Para producción:
   # NEXT_PUBLIC_API_URL=https://tu-backend-produccion.com
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

   La aplicación estará disponible en: `http://localhost:3001`

## 📦 Scripts Disponibles

- `npm run dev` - Ejecuta en modo desarrollo (puerto 3001)
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Ejecuta la versión de producción
- `npm run lint` - Ejecuta el linter

## 🎯 Uso

### Ejecutar un Proceso

1. En el dashboard, encontrarás 4 tarjetas correspondientes a cada proceso
2. Haz clic en el botón **"Ejecutar"** de la tarjeta del proceso que deseas iniciar
3. El proceso se ejecutará y podrás ver su progreso en tiempo real

### Monitorear Jobs

- El dashboard actualiza automáticamente cada 5 segundos
- Los jobs activos se actualizan cada 2 segundos
- Puedes ver el progreso, estado y tiempos de inicio/fin de cada job

### Cancelar un Job

- Si un job está en estado **PENDIENTE** o **EJECUTANDO**, puedes cancelarlo haciendo clic en el botón **"Cancelar"**

## 🔧 Configuración

### Cambiar entre Local y Producción

Simplemente modifica la variable `NEXT_PUBLIC_API_URL` en `.env.local`:

```env
# Local
NEXT_PUBLIC_API_URL=http://localhost:3000

# Producción
NEXT_PUBLIC_API_URL=https://tu-backend-produccion.com
```

## 📊 Estados de Jobs

- **PENDIENTE** (Amarillo): Job creado, esperando ejecución
- **EJECUTANDO** (Azul): Job en proceso
- **COMPLETADO** (Verde): Job finalizado exitosamente
- **FALLIDO** (Rojo): Job terminó con error

## 🔮 Futuro

Este dashboard será expandido para incluir:
- Gestión de productos
- Gestión de categorías
- Otras funcionalidades administrativas

## 📝 Notas

- La aplicación corre en el puerto **3001** para no conflictuar con el frontend principal (puerto 3000)
- Asegúrate de que el backend esté corriendo y accesible desde la URL configurada
- Los jobs pueden tardar varios minutos dependiendo del volumen de datos

