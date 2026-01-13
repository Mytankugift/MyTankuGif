# Solución para 502 Bad Gateway en Nginx

## Problema
El proxy Nginx recibe el request pero responde 502, lo que indica que no puede comunicarse con Railway.

## Verificación en la VM

### 1. Verificar logs de error de Nginx

```bash
# En la VM (72.61.79.91)
sudo tail -n 100 /var/log/nginx/error.log
```

Busca errores como:
- `upstream timed out`
- `connect() failed`
- `SSL_do_handshake() failed`
- `no valid SSL certificate`

### 2. Probar conectividad desde la VM a Railway

```bash
# Desde la VM, probar si puede alcanzar Railway
curl -v https://mytanku-production.up.railway.app/health

# Si falla, probar sin SSL
curl -v http://mytanku-production.up.railway.app/health
```

### 3. Verificar configuración de Nginx

Asegúrate de que la configuración tenga estas líneas críticas:

```nginx
location /api/v1/webhook/epayco/ {
    proxy_pass https://mytanku-production.up.railway.app/api/v1/webhook/epayco/;
    proxy_http_version 1.1;
    
    # ✅ CRÍTICO: Host debe ser el del backend Railway
    proxy_set_header Host mytanku-production.up.railway.app;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;  # ← Cambiar a https
    proxy_set_header Content-Type application/json;
    
    # ✅ AGREGAR estas líneas para SSL
    proxy_ssl_verify off;
    proxy_ssl_server_name on;
    
    # ✅ Timeouts más largos
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    proxy_buffering off;
}
```

### 4. Verificar sintaxis de Nginx

```bash
sudo nginx -t
```

Si hay errores, corrígelos antes de continuar.

### 5. Recargar Nginx

```bash
sudo systemctl reload nginx
```

## Configuración completa recomendada

```nginx
# /etc/nginx/sites-available/dropi-proxy
server {
    listen 80;
    server_name _;
    client_max_body_size 10m;

    # Webhook de ePayco
    location /api/v1/webhook/epayco/ {
        proxy_pass https://mytanku-production.up.railway.app/api/v1/webhook/epayco/;
        proxy_http_version 1.1;
        
        proxy_set_header Host mytanku-production.up.railway.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Content-Type application/json;
        proxy_set_header X-Proxy-Key "8dc2217350ed5f2d42266c32331f339e6005dd70d4d7e196fcfa86391f652a1f";
        
        # SSL settings
        proxy_ssl_verify off;
        proxy_ssl_server_name on;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_buffering off;
        
        access_log /var/log/nginx/epayco-webhook-access.log;
        error_log /var/log/nginx/epayco-webhook-error.log;
    }

    # Webhook de Dropi
    location /api/v1/webhook/dropi {
        proxy_pass https://mytanku-production.up.railway.app/api/v1/webhook/dropi;
        proxy_http_version 1.1;
        
        proxy_set_header Host mytanku-production.up.railway.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Content-Type application/json;
        proxy_set_header X-Proxy-Key "8dc2217350ed5f2d42266c32331f339e6005dd70d4d7e196fcfa86391f652a1f";
        
        proxy_ssl_verify off;
        proxy_ssl_server_name on;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_buffering off;
        
        access_log /var/log/nginx/dropi-webhook-access.log;
        error_log /var/log/nginx/dropi-webhook-error.log;
    }

    # Endpoint de prueba
    location /api/v1/webhook/test {
        proxy_pass https://mytanku-production.up.railway.app/api/v1/webhook/test;
        proxy_http_version 1.1;
        
        proxy_set_header Host mytanku-production.up.railway.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Content-Type application/json;
        
        proxy_ssl_verify off;
        proxy_ssl_server_name on;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_buffering off;
    }

    # Requests salientes a Dropi (mantener existente)
    location /dropi/ {
        if ($http_x_proxy_key != "8dc2217350ed5f2d42266c32331f339e6005dd70d4d7e196fcfa86391f652a1f") {
            return 403;
        }
        proxy_pass https://test-api.dropi.co/;
        proxy_http_version 1.1;
        proxy_set_header Host test-api.dropi.co;
        proxy_set_header dropi-integration-key $http_dropi_integration_key;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        proxy_buffering off;
    }
}
```

## Comandos para aplicar

```bash
# 1. Editar configuración
sudo nano /etc/nginx/sites-available/dropi-proxy

# 2. Verificar sintaxis
sudo nginx -t

# 3. Si OK, recargar
sudo systemctl reload nginx

# 4. Ver logs en tiempo real
sudo tail -f /var/log/nginx/error.log
```

## Si sigue fallando

Comparte el output de:
```bash
sudo tail -n 100 /var/log/nginx/error.log
```

Y también:
```bash
curl -v https://mytanku-production.up.railway.app/health
```

