y General 
Updated on Feb 9, 2026
Published on Oct 30, 2025
 1 minute(s) read
LV
Documentation
ePayco Pagos
Smart Checkout
General
¿Qué es ePayco Smart Checkout?
ePayco Smart Checkout es una herramienta diseñada para integrar fácilmente la experiencia de pago de ePayco, una solución integral que incluye la más completa variedad de herramientas para recibir pagos electrónicos. La información sensible se procesa de forma segura en nuestros servidores certificados PCI DSS Nivel 1, evitando que tu aplicación interactúe directamente con datos sensibles. Smart Checkout te permite personalizar completamente el diseño según las necesidades de tu comercio, incorporando tu logo y marca para que los clientes perciban una experiencia de pago uniforme, ya sea en tu propio sitio web o en nuestro entorno seguro.



Métodos de pago soportados
ePayco Smart Checkout soporta más de 22 métodos de pago completamente configurables para diferentes países y regiones.



Tipos de checkout
ePayco Smart Checkout ofrece múltiples opciones de integración para adaptarse a las necesidades específicas de tu negocio. Puedes elegir entre diferentes experiencias de Smart Checkout que se ajusten perfectamente a tu sitio web y proporcionen la mejor experiencia de usuario.

Componente embebido (onpage): Integra el Smart Checkout directamente en tu sitio web manteniendo a los usuarios en tu dominio

Checkout en entorno seguro (standard): Redirige a los usuarios a nuestra plataforma segura y optimizada para completar el pago

Checkout optimizado para móviles: Experiencia de pago específicamente diseñada para dispositivos móviles con interfaz responsiva

Cómo funciona
ePayco Smart Checkout simplifica el proceso de integración de pagos mediante un flujo optimizado que garantiza seguridad y facilidad de uso. El sistema maneja automáticamente la validación de datos sensibles y el procesamiento seguro de transacciones.

Ciclo de vida del checkout
1. Inicialización: Tu aplicación crea una nueva sesión de Smart Checkout cuando el cliente está listo para realizar la compra

2. Renderizado: El componente de Smart Checkout se monta en tu sitio web mostrando ePayco Smart Checkout

3. Procesamiento: El cliente ingresa sus datos de pago y completa la transacción de forma segura

4. Confirmación: Después de la transacción, se activa el webhook correspondiente para procesar la orden y completar el flujo y el usuario es re dirigido al resultado de la transacción



Was this article helpful? Implementación 
Updated on Feb 24, 2026
Published on Oct 30, 2025
 8 minute(s) read
LV
Documentation
ePayco Pagos
Smart Checkout
Implementación
La implementación de ePayco Smart Checkout se realiza mediante una integración JavaScript simple y directa que te permite desplegar el checkout con cualquier evento en tu aplicación web.

Uso
Creación de la sesión desde el backend
El primer paso para implementar ePayco Smart Checkout es crear una sesión de checkout cuando el cliente esté listo para realizar la compra. Esta sesión debe ser creada desde tu backend favorito mediante una petición a nuestras APIs, la cual generará un ID de sesión único que posteriormente utilizarás para inicializar el componente de ePayco Smart Checkout en el frontend y garantizar que la sesión esté correctamente vinculada con tu sistema de gestión de órdenes.

Autenticación con Apify
Antes de crear la sesión de ePayco Smart Checkout, debes autenticarte con los servicios de Apify de ePayco para obtener un token de acceso. Este proceso requiere que seas un usuario registrado en ePayco y utiliza autenticación Basic enviando tu PUBLIC_KEY y PRIVATE_KEY (las cuales puedes obtener en tu dashboard de ePayco en la sección de Configuración → Personalizaciones → Llaves secretas. en los headers de la petición. El token que obtendrás de este endpoint te permitirá firmar las solicitudes posteriores necesarias para crear la sesión de ePayco Smart Checkout de forma segura.

Solicitud
Custom
curl --location --request POST 'https://apify.epayco.co/login' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic <PUBLIC_KEY:PRIVATE_KEY en base64>'
BashCopy
Respuesta exitosa
Custom
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGlmeWVQYXljb0pXVCIsInN1YiI6MTU1NTk3MywiaWF0IjoxNzYwNDkyNzMyLCJleHAiOjE3NjA0OTM5MzIsInJhbmQiOiI5YzU1NjhlYTEyZjI3MWM0OWUzMTIzYWRhMmE3M2VmODcwMTciLCJyZXMiOmZhbHNlLCJpbmEiOmZhbHNlLCJndWkiOjExNTI2NDYsInV1aWQiOiIzZjYwOGY0ZS00YWM4LTQ4NDYtYmRjZS0xMmViZjJmZTkyZDMiLCJzY29wZSI6Im1hc3RlciJ9.SSI-6nPQDwN2bS0yK-K2-U-1gOgC7pZB0BFN3_amqh8"
}
JSONCopy
Autenticación con Apify
Una vez obtenido el token de autenticación, el siguiente paso es crear la sesión de Smart Checkout que generará el sessionId necesario para inicializar el componente en el frontend. Esta petición debe incluir la información de la transacción como el nombre del producto, descripción, monto, moneda, etc. El sessionId retornado será utilizado para abrir el Smart Checkout de pago en tu sitio web.

Solicitud
Custom
curl --location 'https://apify.epayco.co/payment/session/create' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{APIFY_TOKEN}}' \
--data '{
    "checkout_version": "2",
    "name": "Shops Online S.A.S",
    "currency": "COP",
    "amount": 200000
}'
BashCopy
Todas las propiedades disponibles que describen más abajo.

Respuesta exitosa
Custom
{
    "success": true,
    "titleResponse": "Session created successfully",
    "textResponse": "Session created successfully",
    "lastAction": "create session",
    "data": {
        "sessionId": "68eefce71d65f1d39c0f6dad",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZWVmY2U3MWQ2NWYxZDM5YzBmNmRhZCIsImNyZWF0ZWRfYXQiOiIyMDI1LTEwLTE1VDAxOjQ2OjE1LjU1NFoiLCJpYXQiOjE3NjA0OTI3NzUsImV4cCI6MTc2MDU3OTE3NX0.BYGWqDyUxe1JDfYc2F_EhwHET0Uv-umvAJdQtf6wd9k"
    }
}
JSONCopy
Propiedades
A continuación se describen todas las propiedades que puedes utilizar al crear una sesión de ePayco Smart Checkout. Las propiedades están organizadas en requeridas y opcionales, incluyendo objetos anidados para configuraciones avanzadas como división de pagos, campos personalizados y datos de facturación.

Propiedad

Tipo

Descripción

checkout_version

string

Versión del checkout de ePayco. Valor: "2"

name

string

Nombre del comercio o tienda

currency

string

Código de la moneda (ej: "COP", "USD")

amount

number

Monto total de la transacción

Ejemplo Completo
A continuación se muestra un objeto JSON completo con todas las propiedades disponibles para crear una sesión de ePayco Smart Checkout:

Custom
{
  // ==================== REQUERIDOS ====================
  "checkout_version": "2",
  "name": "Shops Online S.A. S",
  "currency": "COP",
  "amount": 20000.00, // Total a pagar
  
  // ==================== OPCIONALES ====================
  "description": "Buzo con capucha color negro unisex",
  "lang": "ES", // ES | EN
  "invoice": "2341233", // numero de factura
  "country": "CO", // Código alpha-2
  "taxBase": 16806.72,
  "tax": 3193.28,
  "taxIco": 0,
  "response": "https://mysite.com",
  "confirmation": "https://webhook.site/8b4bb363-099e-42e8-afe7-0bf11c59eeb1",
  
  // ==================== CONFIGURACIÓN (OPCIONAL) ====================
  "methodsDisable": [],
  "method": "POST", // GET | POST
  "dues": 1,
  
  // ==================== SPLIT PAYMENT (OPCIONAL) ====================
  "splitPayment": {
    "type": "percentage",
    "receivers": [
      {
        "merchantId": 9898,
        "amount": 15000.00,
        "taxBase": 12605.04,
        "tax": 2394.96,
        "fee": 1
      },
      {
        "merchantId": 1485968,
        "amount": 5000,
        "taxBase": 4201.68,
        "tax": 798.32,
        "fee":  1
      }
    ]
  },
  
  // ==================== PSE MULTICREDITO (OPCIONAL) ====================
  "PSEMultiCredit": {
    "serviceCode": "SERV-01",
    "credits": [
      {
        "code": "77700102",
        "amount": 12000.00,
        "companyIdentification": "8001234567"
      },
      {
        "code": "77700103",
        "amount": 8000.00,
        "companyIdentification": "8009876543"
      }
    ]
  },
  
  // ==================== EXTRAS (OPCIONAL) ====================
  "extras": {
    "extra1": "extra1",
    "extra2": "extra2",
    "extra3": "extra3",
    "extra4": "extra4",
    "extra5": "extra5",
    "extra6": "extra6",
    "extra7":  "extra7",
    "extra8": "extra8",
    "extra9": "extra9",
    "extra10": "extra10",
    "extra11": "extra11"
  },
  
  // ==================== BILLING (OPCIONAL) ====================
  "billing": {
    "email": "cliente@gmail.com",
    "name":  "CLiente Martinez",
    "address": "AV 18 # 18 - 17",
    "typeDoc": "CC",
    "numberDoc": "103242123",
    "callingCode": "+57",
    "mobilePhone": "312456654"
  }
}
JSONCopy
Nota: Este ejemplo incluye todas las propiedades disponibles. Solo las propiedades requeridas checkout_version, name, currency, amount) son obligatorias. El resto son opcionales y puedes incluirlas según las necesidades de tu implementación.

Implementación en el frontend
Una vez que hayas obtenido el sessionId desde tu backend, el último paso es inicializar y mostrar el componente de ePayco Smart Checkout en tu sitio web. Primero debes incluir la librería JavaScript de ePayco en tu página, luego configurar el Smart Checkout con el sessionId obtenido y finalmente abrirlo con el evento de tu preferencia.

1. Incluir la librería de ePayco
Agrega el siguiente script en tu página HTML:

Custom
<script src="https://checkout.epayco.co/checkout-v2.js"></script>
HTML, XMLCopy
2. Configurar y abrir el checkout
Custom
const checkout = ePayco.checkout.configure({
      sessionId: sessionId,
      type: "onpage", // "onpage" | "standard"
      test: true // Test: true | false
});

// Abrir el checkout
checkout.open();
JavaScriptCopy
3. Event handlers (opcionales)
ePayco Smart Checkout proporciona un sistema de eventos que permite responder a diferentes etapas del flujo de pago. Estos eventos están disponibles para los tipos de implementación onpage.

Custom
checkout.onCreated(() => {
    console.log("Evento cuando se crea transacción:");
    // Guardar marcación de apertura.
});

checkout.onErrors((errors) => {
    console.error("Evento que notifica un error");
    console.error(errors); 
    // Mostrar mensaje de errores procedentes de la creación de la transacción.
});

checkout.onClosed(() => {
    console.log("Evento cuando se cierra el Smart Checkout");
    // Limpiar estado, verificar estado de transacción, redirigir de manera custom.
});
JavaScriptCopy
Descripción de cada evento:
- onCreated(callback) Se dispara cuando se crea abre exitosamente el Smart Checkout.

- onErrors(callback) Se activa cuando ocurre un error durante el proceso de obtener la transacción en el Smart Checkout. Permite manejar errores de forma personalizada y mostrar mensajes apropiados al usuario.

- onClosed(callback) Se dispara cuando el usuario cierra el Smart Checkout, ya sea después de completar el pago o cancelar el proceso. Ideal para limpiar el estado de la aplicación o redirigir al usuario.

Ejemplo de implementación completa con eventos:
Custom
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Checkout ePayco</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body class="bg-light">

    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6">

                <div class="text-center">
                    <h2 class="mb-4">💳 Smart Checkout ePayco</h2>
                    <p class="text-muted mb-4">Demo funcional del sistema de pagos</p>

                    <button id="payBtn" class="btn btn-success btn-lg px-5 py-3">
                        💳 Pagar $100.000 COP
                    </button>
                </div>

            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://checkout.epayco.co/checkout-v2.js"></script>
    <script>
        // Función que se ejecuta al hacer clic
        async function handlePayment() {
            console.log("🔄 Iniciando proceso de pago...");
            
            // 1. Obtener sessionId del backend
            const response = await fetch('/api/create-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 10000, currency: 'COP' })
            });

            const { sessionId } = await response.json();
            console.log("✅ SessionId obtenido:", sessionId);

            // 2. Configurar checkout
            const checkout = ePayco.checkout.configure({
                sessionId,
                type: "onpage",
                test: true
            });

            // 3. Eventos
            checkout.onCreated(() => console.log("✅ Checkout creado"));
            checkout.onErrors(e => console.error("❌ Error:", e));
            checkout.onClosed(() => console.log("🔒 Checkout cerrado"));

            // 4. Abrir checkout
            checkout.open();
        }

        // Asignar evento al botón
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById("payBtn").onclick = handlePayment;
        });
    </script>
</body>

</html>
HTML, XMLCopy


 Páginas de Respuesta y Confirmación 
Updated on Oct 30, 2025
Published on Oct 30, 2025
 6 minute(s) read
Documentation
ePayco Pagos
Smart Checkout
Páginas de Respuesta y Confirmación
ePayco proporciona dos mecanismos para notificar el resultado de una transacción: la página de respuesta y la URL de confirmación (webhook). Es importante entender la diferencia entre ambas y cómo implementarlas correctamente.

Página de Respuesta (response )
La página de respuesta es la URL a la que se redirige al usuario después de completar el proceso de pago en ePayco Smart Checkout. Esta redirección ocurre en el navegador del cliente y contiene información básica sobre la transacción en los parámetros de la URL.

Características:
- ✅ Redirección visible para el usuario

- ✅ Permite mostrar una página de respuesta personalizada

- ✅ Incluye el parámetro ref_payco en la URL para consultar datos de la transacción

- ⚠️ NO es confiable para validar el estado final de la transacción (el usuario puede cerrar el navegador o perder conexión)

- ⚠️ Los parámetros pueden ser manipulados por el usuario

Comportamiento de redirección:
1. Con URL personalizada: Si se configura una URL de respuesta personalizada, el usuario será redirigido a esa URL con el parámetro ref_payco que permite consultar los datos de la transacción.

2. Sin URL personalizada: Si no se configura una URL de respuesta, ePayco redirige a una página predeterminada que permite al usuario imprimir y reenviar el comprobante de la transacción.

Ejemplo de URL de redirección:

Custom
https://mitienda.com/resultado-pago?ref_payco=68fb83729d094878e015be00
Plain textCopy
Para obtener los atributos que se envían en la página de respuesta dinámica deberás hacer un llamado mediante el siguiente endpoint:

Custom
curl --location --request GET 'https://secure.epayco.co/validation/v1/reference/68fb83729d094878e015be00' \
--header 'Content-Type: application/json'
BashCopy
URL de Confirmación (confirmation ) - Webhook
La URL de confirmación es un webhook que ePayco invoca en tu servidor backend cuando el estado de una transacción cambia. Esta es la forma confiable y segura de validar el resultado final de una transacción.

Características:

- ✅ Confiable: Comunicación servidor a servidor

- ✅ Invocado automáticamente por ePayco

- ✅ Puede reintentar en caso de fallo

- ✅ Incluye firma de seguridad para validar autenticidad

- ⚠️ Debe responder con código HTTP 200 para confirmar recepción

Parámetros recibidos:
Parámetros recibidos (método GET o POST):

Ejemplo de implementación:
Custom
const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.post('api/webhook/epayco/confirmation', async (req, res) => {
  try {
    const {
      ref_payco,
      x_ref_payco,
      x_transaction_id,
      x_response,
      x_response_reason_text,
      x_amount,
      x_currency_code,
      x_franchise,
      x_signature,
      x_test_request,
      x_approval_code,
      x_transaction_date,
      x_transaction_state,
      x_customer_email,
      x_customer_name,
      x_extra1,
      x_extra2
    } = req.body;
    // 1. Validar firma de seguridad
    const p_cust_id_cliente = process.env.EPAYCO_CUSTOMER_ID;
    const p_key = process.env.EPAYCO_P_KEY;
    const signature = crypto
      .createHash('sha256')
      .update(`${p_cust_id_cliente}^${p_key}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`)
      .digest('hex');
    if (signature !== x_signature) {
      console.error('Firma inválida - posible intento de fraude');
      return res.status(400).send('Invalid signature');
    }
    // 2. Validar que no sea transacción duplicada
    const existingTransaction = await checkTransactionExists(x_transaction_id);
    if (existingTransaction) {
      console.log('Transacción ya procesada:', x_transaction_id);
      return res.status(200).send('OK');
    }
    // 3. Procesar según el estado de la transacción
    switch (x_response) {
      case 'Aceptada':
        await processApprovedTransaction({
          refPayco: ref_payco,
          transactionId: x_transaction_id,
          amount: x_amount,
          currency: x_currency_code,
          customerEmail: x_customer_email,
          customerName: x_customer_name,
          franchise: x_franchise,
          approvalCode: x_approval_code,
          transactionDate: x_transaction_date
        });
        break;
      case 'Rechazada':
        await processRejectedTransaction({
          refPayco: ref_payco,
          transactionId: x_transaction_id,
          reason: x_response_reason_text
        });
        break;
      case 'Pendiente':
        await processPendingTransaction({
          refPayco: ref_payco,
          transactionId: x_transaction_id
        });
        break;
      case 'Fallida':
        await processFailedTransaction({
          refPayco: ref_payco,
          transactionId: x_transaction_id,
          reason: x_response_reason_text
        });
        break;
    }
    // 4. Responder con 200 OK para confirmar recepción
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});
// Funciones auxiliares
async function checkTransactionExists(transactionId) {
  // Implementar consulta a tu base de datos
  return false;
}
async function processApprovedTransaction(data) {
  // Actualizar orden como pagada
  // Enviar email de confirmación
  // Activar servicios/productos
  console.log('Transacción aprobada:', data);
}
async function processRejectedTransaction(data) {
  // Actualizar orden como rechazada
  // Notificar al usuario
  console.log('Transacción rechazada:', data);
}
async function processPendingTransaction(data) {
  // Marcar orden como pendiente
  // Programar verificación posterior
  console.log('Transacción pendiente:', data);
}
async function processFailedTransaction(data) {
  // Manejar transacción fallida
  console.log('Transacción fallida:', data);
}
app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
JavaScript
Validación de Firma de Seguridad
La firma de seguridad x_signature permite verificar que la petición proviene realmente de ePayco y no ha sido manipulada.

Fórmula para calcular la firma:
Parámetros necesarios:

- p_cust_id_cliente: Tu Customer ID de ePayco (obtenido del dashboard)

- p_key: Tu P_KEY de ePayco (obtenido del dashboard)

- ^: Carácter separador literal

Custom
SHA256(p_cust_id_cliente^p_key^x_ref_payco^x_transaction_id^x_amount^x_currency_code)
BashCopy
Ejemplo en diferentes lenguajes:
Custom
const crypto = require('crypto');
function validateSignature(data, customerID, pKey) {
  const signature = crypto
    .createHash('sha256')
    .update(`${customerID}^${pKey}^${data.x_ref_payco}^${data.x_transaction_id}^${data.x_amount}^${data.x_currency_code}`)
    .digest('hex');
  return signature === data.x_signature;
}
JavaScript
Mejores Prácticas
1. Siempre valida en el webhook: Nunca confíes únicamente en la página de respuesta para confirmar pagos.

2. Implementa idempotencia: ePayco puede reintentar el webhook múltiples veces. Verifica que no proceses la misma transacción dos veces.

3. Responde rápidamente: El webhook debe responder con HTTP 200 en menos de 30 segundos. Para procesos largos, usa colas de trabajos.

4. Valida la firma: Siempre verifica la firma de seguridad x_signature para prevenir fraudes.

5. Registra todo: Guarda todos los webhooks recibidos para auditoría y debugging.

6. Maneja reintentos: Si tu servidor está caído, ePayco reintentará enviar el webhook. Asegúrate de manejar esto correctamente.

7. Usa HTTPS: La URL de confirmación debe usar HTTPS para seguridad.

8. No redirijas: El endpoint del webhook no debe hacer redirecciones (301/302).

Ejemplo de Configuración
Al crear la sesión de checkout, configura ambas URLs:

Custom
const sessionData = {
  checkout_version: "2",
  name: "Mi Tienda",
  description: "Producto ejemplo",
  currency: "COP",
  amount: 50000,
  lang: "ES",
  // URL donde se redirige al usuario (visible)
  response: "https://mitienda.com/resultado-pago",
  // URL del webhook (servidor a servidor)
  confirmation: "https://mitienda.com/api/webhook/epayco/confirmation"
};
JavaScriptCopy
Importante: Ambas URLs deben ser accesibles públicamente. Para desarrollo local, puedes usar herramientas como ngrok o localtunnel para exponer tu servidor local.

Tablas de datos 
Updated on Dec 19, 2025
Published on Oct 30, 2025
 2 minute(s) read
LV
Documentation
ePayco Pagos
Smart Checkout
Tablas de datos
Medios de pago y franquicias
A continuación se muestran los códigos de medios de pagos y franquicias en ePayco.

Categoría

Medio de pago

Franquicia

Tarjeta de crédito y/o débito (TDC)

Tarjeta de crédito (TDCN)

Tarjeta de crédito 3Ds (3DS)

One click payment (OCP)

Visa (VS)

Mastercard (MC)

Diners Club (DC)

American Express (AM)

Codensa (COD)

EPM (EPM)

Tuya (TY)

Cuentas de ahorro y/o corriente (ACH)

PSE (PSE)

Cuentas de ahorro (CAH)

Botón Bancolombia (BBC)

Efectivo (CASH)

Efectivo (CASH)

Efecty (EF)

Gana (GA)

Punto Red (PR)

Red Servi (RS)

Sured (SR)

Billeteras Digitales (WLL)

Daviplata (DP)

Puntos / Bonos redimibles (PBR)

Davipuntos (MPD)

Puntos Colombia (PCO)

Métodos internacionales (MI)

PayPal (PP)

SafetyPay (SP)

Productos Davivienda (PDD)

Davipuntos (MPD)

Daviplata (DP)

Estados
Estados de transacciones en ePayco

Estado

Respuesta

Aceptada

La transacción fue aprobada

Rechazada

Con el detalle del motivo, para PSE están las opciones el usuario no aceptó o rechazó la transacción en el banco o el usuario cerró el navegador, en Tarjeta de crédito las opciones son: fondos insuficientes, tarjeta no válida, rechazada por la red de procesamiento.

Pendiente

La transacción se encuentra pendiente por aprobación, para PSE las transacciones quedan pendientes y pueden tardar hasta 20 minutos en que retornen el final de la transacción ya sea con estado aprobado o rechazado, para pagos en efectivo las transacciones quedan inicialmente como pendientes hasta que el usuario no realice el pago en un punto físico.

Fallida

No se culmina el flujo de creación de la transacción de manera exitosa

Reversada

Reintegro del dinero al cliente pagador, es de aclarar que solo se pueden revertir transacciones por tarjeta de crédito, esta acción se puede gestionar directamente desde el Dashboard si la transacción fue realizada el mismo día hasta las 9 pm, pasado este tiempo debe solicitarse ante la red de procesamiento.

Iniciada

Estado interno para iniciar una transacción

Expirada

Transacción caducada, este estado solo se da en el medio de pago en efectivo y SafetyPay debido a que el usuario no realiza el pago en el punto físico en un tiempo determinado (este tiempo de vencimiento lo define el comercio que va desde 12 horas hasta 8 días)

Abandonada

El usuario por algún motivo cerró el navegador y no culminó el proceso de diligenciamiento de la información.

Cancelada

El usuario no culmino el proceso final pero diligencio la información

Tipos de documentos
Tipos de documento de usuario pagador dentro de ePayco

IDENTIFICACIÓN

Tipo de documento

Formato

Longitud

NIT

Número de identificación tributaria

Numérico

mínimo 7 dígitos y máximo 10 dígitos

C.C.

Cédula de ciudadanía

Numérico

mínimo 5 y máximo 15 dígitos

CE

Cédula de extranjería

Numérico

mínimo 4 dígitos y máximo 8 dígitos

TI

Tarjeta de identidad

Numérico

mínimo 4 dígitos y máximo 20 dígitos

PPN

Pasaporte

Alfanumérico

mínimo 4 dígitos y máximo 12 dígitos

SSN

Número de seguridad social

Numérico

mínimo 9 dígitos y máximo 9 dígitos

LIC

Licencia de conducción

Numérico

mínimo 1 dígitos y máximo 20 dígitos

DNI

documento nacional de identificación

Alfanumérico

mínimo 1 dígito y máximo 20 dígitos

RFC

Registro Federal de Contribuyentes

Alfanumérico

mínimo 12 dígitos y máximo 13 dígitos

PEP

Permiso Especial de Permanencia

Numérico

mínimo 7 dígitos y máximo 15 dígitos

PPT

Permiso por Protección Temporal

Numérico

mínimo 7 dígitos y máximo 15 dígitos


-----------------
API Services ePayco Producción
En este documento podrá encontrar toda la información necesaria para consumir los servicios de Apiservices ePayco. Recuerde que debe ser un usuario registrado de ePayco para acceder a este servicio, en caso de no serlo lo invitamos a registrarse

Certificados Digitales (Opcional)
Si decide usar mutual TLS para las peticiones es necesario enviar un certificado digital el cual debe tener las siguientes características:

características
*Certificado Digital 2048 bits RSA

*Se recibe certificado autofirmado: Si.

Variables curl envio de certificado.
CURLOPT_SSLCERT => 'ruta_absoluta.crt'

CURLOPT_SSLKEY => 'ruta_absoluta.key'

CURLOPT_SSLKEYPASSWD => 'clave para abrir el certificado'.

Notas
Si la petición no envía el certificado digital se rechazará inmediatamente solicitando el certificado.

ApiFy ePayco Producción
La Apify de ePayco le brinda la posibilidad de ejecutar una serie de acciones de la plataforma relacionadas con los clientes y sus respectivos saldos, catálagos, transacciones, movimientos, subscripciones. Básicamente, con el uso de estos servicios puede manejar todas las opciones que le brinda la plataforma.

Consideraciones Generales del uso de la Api
Debe tomar en cuenta primeramente que debe estar registrado en la plataforma ya que para la autenticación debe emplear unas llaves públicas y privadas que sólo puede obtener en el dashboard de la plataforma en el apartado integraciones.

Así mismo, hay unos servicios que están disponibles solo para usuarios que tienen un plan adquirido en la plataforma, en cada sección de estos servicios se especifica esta opción.

Errores generales
Nota: Tome en cuenta que todas las solicitudes que realice a los endpoint deben realizarse del lado del servidor, ya que si lo realiza desde el lado del cliente obtendrá el error de solicitud de orígenes cruzados (CORS).

La Api de la plataforma de ePayco tiene una serie de respuestas generales en caso que la solicitud no se esté realizando correctamente, estas respuestas se detallan a continuación:

Si realiza una solicitud a un endpoint que no existe recibirá una respuesta con código HTTP/1.1 404 NOT FOUND.

Si en la solicitud no se envía en la cabecera el token_apify (se genera al realizar el login de forma satisfactoria) obtendrá una respuesta con código HTTP/1.1 401 Unauthorized.

También, existen unos códigos generales de respuestas de los servicios en caso de validación de campos o errores en parámetros enviados que se describen en la siguiente tabla:

View More
Código	Mensaje Respuesta: Descripción
A001	field required: Validación de campos requeridos
A002	field invalid: Validación de campos válidos
A003	field max length: Validación del máximo de caracteres de un campo
A004	code not found: Código no encontrado (Códigos maestros)
A005	email already exist: Correo ya existe en ePayco (creación de cuenta)
A006	restrictive list: Validación de listas restrictivas
A007	error validation: Ocurrió un error en la validación
AL001	URL not send: Validación de campo URL requerido
AL002	URL is required: Validación de campo URL requerido
AL003	The URL structure is wrong: Formato inválido de URL
AED100	La información ingresada no cumple con los parámetros definidos en términos y condiciones. Diligencie el campo de nuevo.
Sólo usuarios registrados pueden establecer una comunicación con la aplicación, en caso de no serlo lo invitamos a registrarse.

Con la API de ePayco puede controlar varias acciones que tenemos disponibles para usted, la cual puede hacer uso con la siguiente url base que deberá reemplazar por la variable url_apify:

Ambiente	API Url
Producción	https://apify.epayco.co
Colección en Postman
Como plataforma poseemos una colección de nuestra API en postman que le permitirá realizar sus intregaciones de la manera mas fácil y simple, la cual puede obtener por medio del botón a continuación:





POST
Crear session v2
https://apify.epayco.co/payment/session/create
AUTHORIZATION
Bearer Token
Token
HEADERS
Content-Type
application/json

Authorization
Bearer

Body
raw (json)
View More
json
{
  // ==================== REQUERIDOS ====================
  "checkout_version": "2",
  "name": "Shops Online S.A. S",
  "currency": "COP",
  "amount": 20000.00, // Total a pagar
  // ==================== OPCIONALES ====================
  "description": "Buzo con capucha color negro unisex",
  "lang": "ES", // ES | EN
  "invoice": "2341233", // numero de factura
  "country": "CO", // Código alpha-2
  "taxBase": 16806.72,
  "tax": 3193.28,
  "taxIco": 0,
  "response": "https://mysite.com",
  "confirmation": "https://webhook.site/8b4bb363-099e-42e8-afe7-0bf11c59eeb1",
  // ==================== CONFIGURACIÓN (OPCIONAL) ====================
  "methodsDisable": [],
  "method": "POST", // GET | POST
  "dues": 1,
  // ==================== SPLIT PAYMENT (OPCIONAL) ====================
  "splitPayment": {
    "type": "percentage",
    "receivers": [
      {
        "merchantId": 9898,
        "amount": 15000.00,
        "taxBase": 12605.04,
        "tax": 2394.96,
        "fee": 1
      },
      {
        "merchantId": 1485968,
        "amount": 5000,
        "taxBase": 4201.68,
        "tax": 798.32,
        "fee":  1
      }
    ]
  },
  // ==================== PSE MULTICREDITO (OPCIONAL) ====================
  "PSEMultiCredit": {
    "serviceCode": "SERV-01",
    "credits": [
      {
        "code": "77700102",
        "amount": 12000.00,
        "companyIdentification": "8001234567"
      },
      {
        "code": "77700103",
        "amount": 8000.00,
        "companyIdentification": "8009876543"
      }
    ]
  },
  // ==================== EXTRAS (OPCIONAL) ====================
  "extras": {
    "extra1": "extra1",
    "extra2": "extra2",
    "extra3": "extra3",
    "extra4": "extra4",
    "extra5": "extra5",
    "extra6": "extra6",
    "extra7":  "extra7",
    "extra8": "extra8",
    "extra9": "extra9",
    "extra10": "extra10",
    "extra11": "extra11"
  },
  // ==================== BILLING (OPCIONAL) ====================
  "billing": {
    "email": "cliente@gmail.com",
    "name":  "CLiente Martinez",
    "address": "AV 18 # 18 - 17",
    "typeDoc": "CC",
    "numberDoc": "103242123",
    "callingCode": "+57",
    "mobilePhone": "312456654"
  }
}
Example Request
Crear session v2
View More
javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("Authorization", "Bearer ");

var raw = "{\n  // ==================== REQUERIDOS ====================\n  \"checkout_version\": \"2\",\n  \"name\": \"Shops Online S.A. S\",\n  \"currency\": \"COP\",\n  \"amount\": 20000.00, // Total a pagar\n  // ==================== OPCIONALES ====================\n  \"description\": \"Buzo con capucha color negro unisex\",\n  \"lang\": \"ES\", // ES | EN\n  \"invoice\": \"2341233\", // numero de factura\n  \"country\": \"CO\", // Código alpha-2\n  \"taxBase\": 16806.72,\n  \"tax\": 3193.28,\n  \"taxIco\": 0,\n  \"response\": \"https://mysite.com\",\n  \"confirmation\": \"https://webhook.site/8b4bb363-099e-42e8-afe7-0bf11c59eeb1\",\n  // ==================== CONFIGURACIÓN (OPCIONAL) ====================\n  \"methodsDisable\": [],\n  \"method\": \"POST\", // GET | POST\n  \"dues\": 1,\n  // ==================== SPLIT PAYMENT (OPCIONAL) ====================\n  \"splitPayment\": {\n    \"type\": \"percentage\",\n    \"receivers\": [\n      {\n        \"merchantId\": 9898,\n        \"amount\": 15000.00,\n        \"taxBase\": 12605.04,\n        \"tax\": 2394.96,\n        \"fee\": 1\n      },\n      {\n        \"merchantId\": 1485968,\n        \"amount\": 5000,\n        \"taxBase\": 4201.68,\n        \"tax\": 798.32,\n        \"fee\":  1\n      }\n    ]\n  },\n  // ==================== PSE MULTICREDITO (OPCIONAL) ====================\n  \"PSEMultiCredit\": {\n    \"serviceCode\": \"SERV-01\",\n    \"credits\": [\n      {\n        \"code\": \"77700102\",\n        \"amount\": 12000.00,\n        \"companyIdentification\": \"8001234567\"\n      },\n      {\n        \"code\": \"77700103\",\n        \"amount\": 8000.00,\n        \"companyIdentification\": \"8009876543\"\n      }\n    ]\n  },\n  // ==================== EXTRAS (OPCIONAL) ====================\n  \"extras\": {\n    \"extra1\": \"extra1\",\n    \"extra2\": \"extra2\",\n    \"extra3\": \"extra3\",\n    \"extra4\": \"extra4\",\n    \"extra5\": \"extra5\",\n    \"extra6\": \"extra6\",\n    \"extra7\":  \"extra7\",\n    \"extra8\": \"extra8\",\n    \"extra9\": \"extra9\",\n    \"extra10\": \"extra10\",\n    \"extra11\": \"extra11\"\n  },\n  // ==================== BILLING (OPCIONAL) ====================\n  \"billing\": {\n    \"email\": \"cliente@gmail.com\",\n    \"name\":  \"CLiente Martinez\",\n    \"address\": \"AV 18 # 18 - 17\",\n    \"typeDoc\": \"CC\",\n    \"numberDoc\": \"103242123\",\n    \"callingCode\": \"+57\",\n    \"mobilePhone\": \"312456654\"\n  }\n}";

var requestOptions = {
  method: 'POST',
  headers: myHeaders,
  body: raw,
  redirect: 'follow'
};

fetch("https://apify.epayco.co/payment/session/create", requestOptions)
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body