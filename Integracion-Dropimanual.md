INTEGRATIONS: CORE DROPI 
Para consumir los servicios de Integraciones en primera instancia se debe hacer una solicitud al 
equipo directivo de TI, relacionando el Domino de la plataforma a integrar, la IP desde donde 
serán consumidos los servicios, los datos personales para creación de la cuenta de pruebas 
(Nombre Completo, Documento de Identificación y correo Electrónico) y deberá informarse la 
proyección de uso de las diferentes API’s con el fin de garantizar el abastecimiento de recursos 
tecnológicos para su operación. 
Si aplica para integración con nuestra plataforma, su domino e IP serán anexados a nuestra lista 
de plataformas habilitadas para consumo de la Integración. 
Al momento de consumir los servicios de Integración deberá enviarse un encabezado con la Key 
dropi-integration-key. 
Este Key puede generarse de dos formas: 
• Si tu plataforma es publica, es decir es para uso y control de usuarios de nuestra 
plataforma, el usuario deberá generar el Token en el Apartado de Integraciones, y 
relacionarlo posteriormente en su plataforma. 
• Si tu plataforma es de uso Privado, deberá consumir las API de Autenticación para 
generar el token de consumo. 
** Bajo ninguna circunstancia en una plataforma externa a Dropi se deberá solicitar a 
nuestros usuarios las credenciales de acceso. Esta práctica incurrirá en el bloqueo inmediato 
y definitivo del acceso al API de integraciones. 
Para consumir los servicios del ambiente de pruebas deberá utilizarse la siguiente URL como 
base 
https://test-api.dropi.co/integrations 
Para el caso de producción deberá apuntarse a la siguiente URL 
https://api.dropi.co/integrations 
Tener presente que todas las pruebas deberán realizarse sobre el ambiente test. El ambiente de 
Test esta aprovisionado con recursos limitados, por lo cual no deberá realizar pruebas con 
grandes volúmenes de datos. Por otra parte, test no está integrado con el sistema de 
transportadoras, por temas de seguridad y control del proceso. Si llegase a requerir pruebas sobre 
este, se tiene una simulación de proceso, para lo cual deberán realizarse las pruebas en conjunto 
con el acompañamiento de Soporte, lo cual deberá agendarse previamente. 
Los EndPoint expuestos para consumo a través de Integrations son:
 • Listar Ciudades 
• Consultar Transportadoras 
• Cotizador de Flete 
• Obtener guía en PDF 
• Consultar Productos 
• Nueva Orden (Crear Orden) 
• Consultar mis Ordenes 
• Consultar Orden por ID 
• Consultar Orden por Guía. 
• Consultar Mi Historial de Cartera 
AUTENTICACION 
Complemento Url: /login 
• Método: POST 
• Body: 
{ 
"email": "CorreoCuenta@dropi.com", 
"password": "Acceso.password","white_brand_id": "Token_Plataforma", 
} 
El valor del parámetro white_brand_id debe ser: 
df3e6b0bb66ceaadca4f84cbc371fd66e04d20fe51fc414da8d1b84d31d178de 
RESPONSE 
{ 
} 
"isSuccess": true, 
"message": "Ha ingresado al sistema correctamente", 
"status": 200, 
"token": "adgtlkdmkajfd165498.6584268jkddhsfbadb.qwe35789assf45", 
**Este token es temporal y tiene una duración de 24 horas. Solo será utilizado para consumir el 
servicio de Tokenizacion y generar el Token de Integración (API-KEY). 
GENERAR TOKEN INTEGRACION 
• Complemento Url: /shops/store 
• Método: POST 
• Authorization: Bearer Token (Token Retornado en el Login) 
• Headers: Content-Type: application/json 
• Body: 
{ 
    "name":"Nombre Tienda", 
    "shop_type":{ 
        "shop_type":"Name_In" //Identificador de Integración Entregado por TI 
    } 
} 
RESPONSE EXITOSO 
{ 
    "isSuccess": true, 
    "message": "El item ha sido creado con éxito!", 
    "status": 200, 
    "objects": { 
        "name": "Nombre Tienda", 
        "type": "Name Intregration", 
        "type_id": 6, 
        "user_id": 2893, 
        "url": null, 
        "webhook": null, 
        "token": "Token_Integrations.eyJ0eXAiOiJ.wRgkDmmvBpDKT8R0h", 
        "created_at": "2024-07-06 13:31:04", 
    } 
} 
 
**Este token es permanente, no tiene vencimiento, por lo que deberá se almacenado en su 
plataforma para consumir los servicios de Integrations. 
 
Para obtener el shop_type debes informar al equipo de Tecnología la IP y Dominio desde donde 
se realizará el consumo de servicio, con el fin de que se haga el registro en la White List de 
integración. Importante informar en este paso el nombre de la Aplicación/Integración pues será 
el nombre que verán los usuarios en el apartado de Integraciones, y será este el shop_type 
(Ej: Shopify) 
  
PRODUCTOS 
Listar Categorías 
• Complemento Url: /categories 
• Método: GET 
Obtener Productos 
• Complemento Url: /products/index 
• Método: POST 
• Headers: dropi-integracion-key = “Token:_Integracion” 
• Body: raw 
➢ pageSize:  
o tipo: int 
o Descripción: Cantidad de resultados que se quiere obtener. 
o Requerido: SI 
o Ejemplo: 50 
➢ startData:  
o tipo: int 
o Descripción: Indica la fila en la que se quiere obtener los resultados. 
o Requerido: NO 
o Ejemplo: 0, El 0 indica que traerá los datos desde el primer producto.  
➢ no_count:  
o tipo: Boolean 
o Descripción: Indica si cuenta la totalidad de productos encontrados para la 
consulta enviada. Por defecto debe llegar en true. 
En false solo debe ser utilizado en false para sistemas que exijan el dato para 
paginar. 
La recomendación es enviarlo en true para obtener una respuesta más rápida 
y no manejar una paginación total sino un “Scroll infinito” 
o Requerido: SI 
➢ Order_by:  
o tipo: string 
o Descripción: Ordena la data según el valor enviado. Los valores validos son: 
id o created_at, este ultimo ordena los datos según la fecha de creación del 
producto. 
o Requerido: NO 
o Ejemplo: id 
➢ Order_type:  
o tipo: string 
o Descripción: Aplica solo si se solicita la data ordenada e indica el tipo de 
ordenamiento. ASC o DESC. 
o Requerido: NO 
o Ejemplo: asc 
➢ keywords:  
o tipo: string 
o Descripción: Texto a buscar, que coincida o este contenido en el nombre del 
producto a buscar.  
Este parámetro hace que el tiempo de respuesta incremente notablemente. 
o Requerido: NO 
➢ category:  
o tipo: array 
o Descripción: Recibe el Id de la(s) categoría(s) que se desea listar. Si no se 
desea este filtro no debe ser enviado, enviarlo vacío implica una respuesta 
nula. 
Este parámetro hace que el tiempo de respuesta incremente notablemente. 
o Requerido: NO 
o Ejemplo: [“1247”,”1248”] 
➢ favorite:  
o tipo: Boolean 
o Descripción: Enviar true si se desea obtener únicamente los productos 
marcados como favoritos por el usuario logeado. 
o Requerido: NO 
➢ Privated_product:  
o tipo: Boolean 
o Descripción: Enviar true si se desea obtener únicamente los productos 
privatizados para el usuario logeado. 
o Requerido: NO 
EJEMPLO REQUEST 
{ 
} 
"pageSize": 1, 
"startData": 1, 
"no_count":true, 
"order_by":"id",  
"order_type":"asc", 
"keywords": "", 
"category":["1247","1249"], 
"favorite":false, 
"privated_product": false 
RESPONSE EXITOSO 
{ 
    "isSuccess": true, 
    "status": 200, 
    "objects": [ 
        { 
            "id": 0, 
            "name": "", 
            "type": "SIMPLE", 
            "sale_price": "", 
            "suggested_price": "", 
            "privated_product": false, 
            "sku": "", 
            "user": {}, 
            "variations": [], 
            "gallery": [ 
                { 
                    "url": "", 
                    "main": true, 
                    "urlS3":”” 
                } 
            ], 
            "categories": [ 
            ], 
            "private_product_inventories": [], 
            "add_stock_in_return": null, 
            "import_list": [], 
            "warehouse_product": [ 
                { 
                    "id": 0, 
                    "warehouse_id": 0, 
                    "product_id": 0, 
                    "created_at": "Date", 
                    "updated_at": "Date", 
                    "stock": 10000 
                } 
            ] 
        } 
    ], 
    "count": 0 
} 
  
Obtener Información de un Producto Específico 
• Complemento Url: /products/v2/#IdProducto# 
o **Donde #IdProducto# corresponde al Id del producto que se desea detallar. 
• Método: GET 
• Headers: dropi-integracion-key = “Token:_Integracion” 
 
LOGISTICA 
Listar Departamentos 
• Complemento Url: /department 
• Método: GET 
Listar Ciudades 
• Complemento Url: /trajectory/bycity 
• Método: POST 
• Body: 
o rate_type: Tipo de envio (CON RECAUDO - SIN RECAUDO) 
o department_id 
Cotizador de Flete 
• Complemento Url: /orders/cotizaEnvioTransportadoraV2 
• Método: POST 
• Body: 
➢ EnvioConCobro:  
o tipo: Boolean 
o Descripción: Indica si el envio es contra entrega (con recaudo), o no. Enviar 
true cuando sea contra entrega, enviar false cuando el vaya con pago 
anticipado (sin recaudo). 
o Requerido: SI. 
o Ejemplo: true 
➢ amount:  
o tipo: int 
o Descripción: El valor total de la orden. 
o Requerido: SI. 
o Ejemplo: 75000 
➢ ciudad_destino:  
o tipo: Object 
o Descripción: Este parámetro, es un objeto, con el código dane de la ciudad 
destino. Dentro de este parámetro, debe ir un índice, llamado cod_dane, el 
cual es del tipo string, y debe contener el código dane de la ciudad, el cual 
contiene 7 caracteres 
o Requerido: SI. 
o Ejemplo:  
"ciudad_destino":{"cod_dane":"5001000"} 
• ciudad_remitente:  
o tipo: Object 
o Descripción: Este parámetro, es un objeto, con el código dane de la ciudad del 
remitente, es decir, desde donde va a salir el producto. Dentro de este parámetro, 
debe ir un índice, llamado cod_dane, el cual es del tipo string, y debe contener el 
código dane de la ciudad, el cual contiene 7 caracteres 
o Requerido: SI. 
o Ejemplo:  
"ciudad_remitente":{"cod_dane":" 11001000"} 
Generar Guía 
• Complemento Url: /orders/myorders/#IdOrden# 
• Método: PUT 
• Body: 
➢ status:  
o tipo: string 
o Descripción: Estatus de Guía Generada para generar la guía. 
▪ Ejemplo: GUIA_GENERADA 
o Requerido: SI 
Ejemplo: 
{"status": "GUIA_GENERADA"} 
Generar Guías de Forma Masiva 
• Complemento Url: /orders/myorder/masive 
• Método: POST 
• Body:  Debe ser un arreglo en el que cada índice del arreglo, pertenezca a una orden de 
Dropi especifica. 
➢ id:  
o tipo: integer 
o Descripción: Id de la orden en Dropi. 
o Ejemplo: 2008350 
o Requerido: SI 
➢ status:  
o tipo: string 
o Descripción: Estatus de Guía Generada para generar la guía. 
o Ejemplo: GUIA_GENERADA 
o Requerido: SI 
Ejemplo: 
[ 
] 
{ 
"id": 2008350, 
"status": "GUIA_GENERADA" 
}, 
{ 
"id": 2008280, 
"status": "GUIA_GENERADA" 
} 
RESPONSE EXITOSO 
{ 
} 
"isSuccess": true, 
"message": "Actualizacion masiva lista", 
"objects": [], 
"status": 200 
Obtener PDF de Guías 
• Complemento Url: /guias/nombre_transportadora/VARIABLE-STICKER 
• Método: GET 
La variable sticker, viene en el listado de órdenes, el parámetro llamado “sticker”, el cual 
contiene el nombre del archivo. 
Ojo, para las guias con Servientrega y Envia, el complemento para la url es 
/guias/servientrega/VARIABLE-STICKER 
Para las demás transportadoras, debe ir el nombre de la transportadora. 
ORDENES 
Nueva Orden 
• Complemento Url: /orders/myorders 
• Método: POST 
• Body: 
➢ state:  
o tipo: string 
o Descripción: Departamento al cual será enviada la orden 
o Requerido: SI 
➢ city:  
o tipo: string 
o Descripción: Ciudad al cual será enviada la orden 
o Requerido: SI 
➢ name:  
o tipo: string 
o Descripción: Nombres de cliente 
o Requerido: SI 
➢ surname:  
o tipo: string 
o Descripción: Apellidos de cliente 
o Requerido: SI 
➢ dir:  
o tipo: string 
o Descripción: Dirección 
o Requerido: SI 
➢ client_email:  
o tipo: string 
o Descripción: Email 
o Requerido: NO 
➢ notes:  
o tipo: string 
o Descripción: Nota que se quiera colocar en el rótulo y que se guarde en la 
orden 
o Requerido: NO 
➢ payment_method_id:  
o tipo: int 
o Descripción: Método de pago, siempre con valor: 1 
o Requerido: SI 
➢ phone:  
o tipo: string 
o Descripción: Teléfono celular del destinatario 
o Requerido: SI 
➢ dni:  
o tipo: string 
o Descripción: Cédula o Dni, del cliente 
o Requerido: N 
➢ dni_type:  
o tipo: string 
o Descripción: Tipo de identificación del cliente 
o Requerido: NO 
➢ rate_type:  
o tipo: string 
o Descripción: Tipo de Pago, si va a ser “CON RECAUDO” o “SIN 
RECAUDO” 
o Requerido: SI 
o Ejemplo: CON RECAUDO 
o  
➢ type:  
o tipo: string 
o Descripción: Indica si la orden es una orden de prueba o no, (SIEMPRE 
DEBE IR FINAL_ORDER) 
o Requerido: SI 
o Ejemplo: FINAL_ORDER 
➢ total_order:  
o tipo: int 
o Descripción: Total de la orden, incluyendo el costo del envió (precio de los 
productos x cantidad), sin comas ni puntos. 
o Requerido: SI 
o Ejemplo: 120000 
➢ text_to_show_order_rotulo:  
o tipo: string 
o Descripción: Si este campo es distinto de null y distinto de vacío, entonces se 
mostrará lo que contenga este campo, en el rótulo que se crea en las guias, es 
decir, la informacion de los productos, cantidad, nombre, etc, se reemplazará por 
este texto. 
o Requerido: NO 
o Ejemplo: Texto para mostrar en el rótulo. 
➢ external_warehouse_dir:  
o tipo: string 
o Descripción: Dirección del remitente, en caso de querer modificarlo. Esta 
dirección, aparecerá en la guía como dirección del remitente y desde donde debe 
salir el producto. 
o Requerido: NO 
o Ejemplo: cr 68 #19-65 barrio xxx 
➢ external_warehouse_phone:  
o tipo: string 
o Descripción: Teléfono del remitente, en el caso de querer modificar el remitente. 
o Requerido: NO 
o Ejemplo: 3115668987 
➢ external_warehouse_city:  
o tipo: int 
o Descripción: ID de la ciudad en el caso de querer modificar el remitente. El ID 
debe ser del web service de Dropi de ciudades 
o Requerido: NO 
o Ejemplo: 12 
➢ external_warehouse_contact_name:  
o tipo: string 
o Descripción: Indica el nombre de un contacto de la bodega, en la cual se 
despachará el producto, en caso de modificar los datos del remitente. 
o Requerido: NO 
o Ejemplo: Juan 
➢ external_warehouse_contact_surname:  
o tipo: string 
o Descripción: Indica el nombre de un contacto de la bodega, en la cual se 
despachará el producto, en caso de modificar los datos del remitente. 
o Requerido: SI 
o Ejemplo: Perez 
➢ distributionCompany:  
o tipo: object 
o Descripción: Indica si se quiere crear el pedido, con una transportadora específica. 
Si este parámetro no se envía, entonces tomará el orden de las parametrizaciones 
de transportadoras del usuario. 
o Requerido: NO 
o Índices: 
▪ id:  
➢ shop_order_id:  
o tipo: string 
▪ tipo: int 
▪ Descripción: ID de la transportadora. Para obtener el id de la 
transportadora, se puede consultar el web service de: Obtener 
Transportadoras. 
▪ Requerido: SI 
o Descripción: Indica el identificador de la orden en la plataforma origen. 
o Requerido: SI 
o Ejemplo: A0001 
➢ products:  
o tipo: object 
o Descripción: Objeto del producto o de los productos de la orden. 
o Requerido: SI 
o Índices: 
▪ id:  
▪ tipo: int 
▪ Descripción: ID del producto de Dropi. 
▪ Requerido: SI 
▪ price:  
▪ tipo: int 
▪ Descripción: Precio de una unidad del producto, por ejemplo, si en 
la orden, son 2 unidades, y el total son 100000, entonces aquí debe 
ir 50000, ya que es solo el precio de una unidad. 
▪ Requerido: SI 
▪ quantity:  
▪ tipo: int 
▪ Descripción: Cantidad a vender 
▪ Requerido: SI 
▪ variation_id:  
▪ tipo: int 
▪ Descripción: Id Variación del producto 
▪ Requerido: NO si el producto no es variable. 
El objeto “products”, es un objeto que cada sub índice, tendrá los datos de cada producto. 
Acá un ejemplo del Json que deberá enviarse en el Body de la petición: 
{ 
"calculate_costs_and_shiping":true, 
"state":"CUNDINAMARCA", 
"city": "BOGOTA", 
"client_email": "fernandoga22@gmail.com", 
"name": "fernando", 
"surname": "perez", 
"dir": "cr 3 #2-09", 
"notes": "", 
"payment_method_id": 1, 
"phone":313523645, 
"rate_type": "CON RECAUDO", 
"type": "FINAL_ORDER", 
"total_order": 260000, 
"products": [ 
{ 
"id": 1002, 
"price": 80000, 
"variation_id": null, 
"quantity": 2 
}, 
{ 
"id": 30100, 
"price": 50000, 
"variation_id": null, 
"quantity": 2 
} 
] 
} 
En caso de que falte ingresar un campo requerido se retornara un mensaje como el siguiente: 
Listar Mis Ordenes 
• Complemento Url: /orders/myorders 
• Método: GET 
• Body: 
➢ result_number:  
o tipo: int 
o Descripción: Cantidad de resultados (órdenes) que quieres que te devuelva el 
api 
o Requerido: NO (pero es recomendable hacerlo). 
o Ejemplo: 10 
➢ start:  
o tipo: int 
o Descripción: Valor inicial desde el cual se quiere obtener los resultados. 
o Requerido: NO 
o Ejemplo: 1 
➢ textToSearch:  
o tipo: string 
o Descripción: Texto, el cual buscará si coincide con: estatus, nombre de cliente, 
apellidos del cliente, dirección, departamento, ciudad, nombre de producto. 
o Requerido: NO 
➢ from:  
o tipo: string 
o Descripción: Filtro para filtrar por fecha, este campo es “Desde” la fecha en la 
que se quiere filtrar. El formato es: yyyy-mm-dd 
o Requerido: NO 
o Ejemplo: 2021-12-07 
o untill:  
o tipo: string 
➢ Descripción: Filtro para filtrar por fecha, este campo es “Hasta” la fecha en la 
que se quiere filtrar. El formato es: yyyy-mm-dd 
➢ Requerido: NO 
➢ Ejemplo: 2021-12-08 
➢ radio_downloaded:  
➢ tipo: string 
➢ Descripción: Indica si quiere obtener las guias “IMPRESAS”, “NO 
IMPRESAS”, y las “IMPRESAS Y NO IMPRESAS”. 
➢ Requerido: NO 
➢ Posibles Valores: IMPRESAS Y NO IMPRESAS/ NO 
IMPRESAS/IMPRESAS 
➢ Ejemplo: IMPRESAS Y NO IMPRESAS 
➢ orderBy:  
o tipo: string 
o Descripción: Ordenar Por. Por defecto id 
o Requerido: NO 
o Ejemplo: id 
➢ orderDirection:  
o tipo: string 
o Descripción: Ordenar de manera ascendente o descendente. 
o Requerido: NO 
o Ejemplo: desc 
➢ filter_by:  
o tipo: string 
o Descripción: Filtra por una de las tres siguientes opciones específicas, 
y trae donde coincida con ese valor. Las opciones son: GUIA, ORDEN 
ID, CELULAR. Va acompañado con el siguiente parámetro 
value_filter_by. 
o Requerido: NO 
o Ejemplo: GUIA 
➢ value_filter_by:  
o tipo: string 
o Descripción: Dependiendo de la opción que hayas enviado en el campo 
filter_by, buscará lo que coincida con el valor en ese parámetro. 
Puedes enviar varios resultados a la vez, separándolo por coma “,” o 
salto de línea, ejemplo:  014117806991, 014117806987. 
o Requerido: NO 
o Ejemplo: GUIA 
➢ status:  
o tipo: string 
o Descripción: Para poder filtrar por estatus. 
o Requerido: NO 
o Ejemplo: PENDIENTE, GUIA_GENERADA 
➢ filter_date_by:  
o tipo: string 
o Descripción: Indica, según el rango de fecha ingresado, que valor de 
fecha tomará. Hay tres valores posibles: “FECHA DE CREADO”, 
“FECHA DE PRIMERA IMPRESION”, “FECHA DE CAMBIO DE 
ESTATUS”.   
▪ FECHA DE CREADO: indica que filtrará por las órdenes que 
fueron creadas en ese rango de fechas.  
▪ FECHA DE PRIMERA IMPRESIÓN: indica que filtrará por 
las órdenes que fueron impresas la primera vez, en el rango de 
fecha. 
▪ FECHA DE CAMBIO DE ESTATUS: indica que filtrará por 
las órdenes que cambiaron a cierto estatus seleccionado, en ese 
rango de fechas. 
o Requerido: SI 
o Ejemplo: FECHA DE CREADO 
Obtener Información de una orden específica por Orden ID 
• Complemento Url: /orders/myorders/#IdOrden# 
• Método: GET 
Obtener Información de una Orden Específica por Número de Guía 
• Complemento Url: /orders/myorderbyguide/GUIA 
• Método: GET 
Listar Novedades Pendientes por Solucionar 
• Complemento Url: /orders/myorders 
• Método: GET 
• Body: 
➢ result_number:  
▪ tipo: int 
▪ Descripción: Cantidad de resultados (órdenes) que quieres que te devuelva 
el api. 
▪ Requerido: NO (pero es recomendable hacerlo). 
▪ Ejemplo: 10 
➢ start:  
▪ tipo: int 
▪ Descripción:Descripción: Valor inicial desde el cual se quiere obtener los 
resultados. 
▪ Requerido: NO. 
▪ Ejemplo: 1 
➢ textToSearch:  
▪ tipo: string 
▪ Descripción: Texto, el cual buscará si coincide con: estatus, nombre de 
cliente, apellidos del cliente, dirección, departamento, ciudad, nombre de 
producto. 
▪ Requerido: NO. 
➢ from_date_last_incidence:  
▪ tipo: string 
▪ Descripción: Filtro para filtrar por fecha de la novedad reportada más 
reciente, este campo es “Desde” la fecha en la que se quiere filtrar. El 
formato es: yyyy-mm-dd 
▪ Requerido: NO. 
▪ Ejemplo: 2022-10-07 
➢ until_date_last_incidence:  
▪ tipo: string 
▪ Descripción: Filtro para filtrar por fecha de la novedad reportada más 
reciente, este campo es “Hasta” la fecha en la que se quiere filtrar. El 
formato es: yyyy-mm-dd 
▪ Requerido: NO. 
▪ Ejemplo: 2022-11-07 
➢ status:  
▪ tipo: string 
▪ Descripción:  Para filtrar por estatus. 
▪ Requerido: NO. 
▪ Ejemplo: PENDIENTE, GUIA_GENERADA 
➢ haveIncidenceProcesamiento:  
▪ tipo: Boolean 
▪ Descripción: Enviar en true para recibir las órdenes que están pendiente 
por solucionar, que aun no hayan sido gestionadas, ni por parte del 
usuario, ni por parte de la transportadora. 
▪ Requerido: SI. 
▪ Ejemplo: true 
➢ issue_solved_by_parent_order:  
▪ tipo: Boolean 
▪ Descripción: Enviar en false para recibir las órdenes que están pendiente 
por solucionar, que aún no hayan sido gestionadas por el usuario. 
▪ Requerido: SI. 
▪ Ejemplo: false 
WEB HOOK 
El sistema cuenta con un servicio de notificación de cambios de estado de las ordenes, las cuales 
serán notificadas a un webhook (endpoint, servicio o url) que debe ser entregado al equipo de TI 
para su previo registro. Se aclara que solo son notificados los estados de las ordenes propias, es 
decir, de las ordenes que son creadas a través del API de Integración con el Shop_type 
correspondiente. 
Esta es la estructura de data entregada a dicho Endpoint: 
{ 
"id": 28593481, //Numero de Orden 
"status": "ESTADO DE LA ORDEN", 
"supplier_id": 17214, 
"dir": "Dirección destino", 
"phone": "3123456789", 
"email": null, 
"created_at": "2024-10-02T21:32:10.000000Z", 
"type": "FINAL_ORDER", 
"total_order": "79000.00", 
"notes": null, 
"name": "Prueba", 
"surname": "Prueba", 
"country": "COLOMBIA", 
"state": "AMAZONAS", 
"city": "LETICIA", 
"zip_code": null, 
"rate_type": "CON RECAUDO", 
"shipping_company": "TRANSPORTADORA", 
"shipping_guide": null, 
"sticker": null, 
"seller_id": null, 
"shop_order_id": null, 
"shop_id": 3855, 
"shop_order_number": null, 
"warehouse_id": 2734, 
"dni_type": null, 
"dni": null, 
"colonia": null, 
"external_id": null, 
"shop": { 
"id": 3855, 
"user_id": 17139, 
"name": "Prueba Integracion", 
"email": null, 
"phone": null, 
"type": "INTEGRATIONS", 
"created_at": "2024-09-11 10:22:48", 
"updated_at": "2024-09-11 10:22:48", 
"deleted_at": null, 
"shop_password": null, 
"change_status_pendiente": false, 
"status_pendiente": null, 
"sync_shipping_guide": false, 
"type_id": 15, 
"webhook": null 
}, 
"orderdetails": [ 
{ 
"product_id": 102419, 
"variation_id": null, 
"quantity": "1.00", 
"price": "79000.00", 
"product": { 
"id": 102419, 
"name": "Contorno De Ojos", 
"type": "SIMPLE", 
"sku": "7709284749386" 
}, 
"variation": null 
} 
], 
"warehouse": { 
"id": 2734, 
"name": "Prueba" 
} 
}