# Assets de correos transaccionales (Tanku)

Estas rutas sirven archivos **públicos** en producción como  
`https://www.mytanku.com/email/<nombre>.png`.

El backend arma las URLs usando `FRONTEND_URL/email` por defecto, o **`EMAIL_ASSET_BASE_URL`** en el servidor si queréis otro origen (CDN distinto).

## Archivos de la plantilla `gift-received`

| Archivo | Uso |
| --- | --- |
| `tanku-email-mark.png` | Marca circular en cabecera (en el maquetado original venía como `6 (1).png`; si el logo final es otro PNG, reemplazá este archivo conservando el nombre). |
| `tanku-email-gift-badge.png` | Ícono de regalo junto al avatar |
| `tanku-email-icon-lock.png` | Footer “Seguro” |
| `tanku-email-icon-heart-hand.png` | Footer “Confiable” |
| `tanku-email-icon-home.png` | Footer “Especial” |
| `tanku-email-icon-unique.png` | Footer “Único” (mismo arte que badge si no tenéis otro PNG) |
| `tanku-email-icon-user.png` | Avatar del remitente cuando no hay foto en perfil (y demo en ERP) |
| `tanku-email-product-fallback.png` | _(Opcional)_ Si el producto no tiene imagen en CDN |

Demo producto en ERP: `tennis.png` (opcional).

La plantilla HTML vive en `tanku-backend/src/email/templates/gift-received.template.js`.

## ERP — prueba de plantilla regalo

**Tanku Admin → Ajustes → Email de prueba** usa por defecto URLs HTTPS públicas configurable con `NEXT_PUBLIC_PUBLIC_SITE_URL` y `NEXT_PUBLIC_EMAIL_PUBLIC_ASSETS_BASE` en **tanku-admin** (fallback: `https://www.mytanku.com`).

En la misma pantalla, **«Vista previa en navegador»** llama a `POST /api/v1/admin/system/email/gift-preview/render` y abre el HTML en una pestaña (sin enviar correo); útil para revisar maquetación con URLs locales o públicas.

**Importante:** Gmail y otros clientes descargan las imágenes **desde los servidores del proveedor**, no desde tu navegador. Cualquier `<img src="http://localhost:...">` fallará. Debéis publicar primero los archivos de `public/email` en el front en producción y usar esa base en el correo.
