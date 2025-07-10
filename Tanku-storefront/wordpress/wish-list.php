<?php
function enviar_email_por_get() {
    $usuario = wp_get_current_user();

    if (!$usuario || !$usuario->exists()) {
        error_log("❌ Usuario no logueado.");
        return array();
    }

    $email = urlencode($usuario->user_email);
    $url = "https://tanku-production-014d.up.railway.app/wordpress/wish-list/" . $email;

    $response = wp_remote_get($url, array(
        'timeout' => 30
    ));

    if (is_wp_error($response)) {
        error_log("🚨 Error en GET: " . $response->get_error_message());
        return array();
    } else {
        $body = wp_remote_retrieve_body($response);
        error_log("✅ Email enviado por GET: {$email}");
        error_log("📥 Respuesta: " . $body);
        $json_response = json_decode($body, true);
        return isset($json_response['data']) ? $json_response['data'] : array();
    }
}

add_shortcode('menu_funcionalidades', 'mostrar_menu_funcionalidades_completo');

function mostrar_menu_funcionalidades_completo() {
    if (!is_user_logged_in()) {
        return '<div class="aviso-funcionalidades">Inicia sesión para acceder. <a href="' . wp_login_url(get_permalink()) . '">Ingresar</a></div>';
    }

    // Obtener las listas de deseos al cargar
    $wishlists = enviar_email_por_get();

    wp_enqueue_script('jquery');

    // CSS para todos los elementos
    $output = '<style>
        /* Contenedores */
        .contenedor-funcionalidades { 
            margin-bottom: 20px; 
            position: relative;
        }
        
        /* Botones principales */
        .boton-principal {
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin-right: 10px;
            transition: all 0.3s;
        }
        
        .boton-funcionalidades {
            background-color: #6c757d;
            color: white;
        }
        
        .boton-funcionalidades:hover {
            background-color: #5a6268;
        }
        
        /* Lista de deseos existentes */
        .wishlists-container {
            margin: 20px 0;
        }
        
        .wishlist-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
            margin-bottom: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .wishlist-title {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        
        .wishlist-meta {
            font-size: 12px;
            color: #666;
        }
        
        /* Menú desplegable */
        .menu-desplegable {
            display: none;
            position: absolute;
            z-index: 1000;
            margin-top: 5px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            width: 200px;
        }
        
        .opcion-menu {
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 3px;
            margin-bottom: 4px;
            font-size: 14px;
        }
        
        .opcion-menu:hover {
            background-color: #e9ecef;
        }
        
        .opcion-menu.activa {
            background-color: #dee2e6;
            font-weight: 600;
        }
        
        /* Formulario lista deseos */
        .formulario-lista-deseos {
            display: none;
            margin-top: 15px;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 6px;
            box-shadow: 0 1px 5px rgba(0,0,0,0.1);
            max-width: 350px;
        }
        
        .formulario-lista-deseos label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .formulario-lista-deseos input[type="text"] {
            width: 100%;
            padding: 8px;
            margin-bottom: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .boton-lista-deseos {
            background-color: #4CAF50;
            color: white;
        }
        
        .boton-lista-deseos:hover {
            background-color: #3e8e41;
        }
        
        .boton-enviar-lista {
            background-color: #2196F3;
            color: white;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
        }
        
        /* Switch */
        .switch-container {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            gap: 8px;
        }
        
        .switch-text {
            font-weight: 500;
            color: #555;
            font-size: 14px;
        }
        
        .switch-compact {
            position: relative;
            display: inline-block;
            width: 42px;
            height: 24px;
        }
        
        .switch-compact input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .slider-compact {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .2s;
            border-radius: 24px;
        }
        
        .slider-compact:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .2s;
            border-radius: 50%;
        }
        
        input:checked + .slider-compact {
            background-color: #2196F3;
        }
        
        input:checked + .slider-compact:before {
            transform: translateX(18px);
        }
        
        /* Mensajes */
        .mensaje-exito {
            margin-top: 10px;
            padding: 10px;
            background: #d4edda;
            color: #155724;
            border-radius: 4px;
        }
        
        .mensaje-error {
            margin-top: 10px;
            padding: 10px;
            background: #f8d7da;
            color: #721c24;
            border-radius: 4px;
        }
    </style>';

    // HTML del menú y listas existentes
    $output .= '<div class="contenedor-funcionalidades">';
    
    // Mostrar listas existentes
    if (!empty($wishlists)) {
        $output .= '<div class="wishlists-container"><h3>Tus listas de deseos</h3>';
        foreach ($wishlists as $list) {
            $fecha = new DateTime($list['created_at']);
            $fecha_formateada = $fecha->format('d/m/Y H:i');
            
            $estado = ($list['state_id'] === 'PUBLIC_ID') ? 'Pública' : 'Privada';
            $output .= '<div class="wishlist-item">';
            $output .= '<div class="wishlist-title">' . esc_html($list['title']) . '</div>';
            $output .= '<div class="wishlist-meta">';
            $output .= '<span>Creada el ' . esc_html($fecha_formateada) . '</span>';
            $output .= '<span class="wishlist-status ' . strtolower($estado) . '"> • ' . $estado . '</span>';
            $output .= '</div>';
            $output .= '</div>';
        }
        $output .= '</div>';
    }
    
    // Botón y menú para crear nueva lista
    $output .= '<button class="boton-principal boton-funcionalidades">Crear nueva lista</button>
        
        <div class="menu-desplegable">
            <div class="opcion-menu" data-funcionalidad="lista">Lista de deseos</div>
            <div class="opcion-menu" data-funcionalidad="evento">Evento</div>
            <div class="opcion-menu" data-funcionalidad="regalos">Regalos</div>
            <div class="opcion-menu" data-funcionalidad="otros">Otros</div>
        </div>
        
        <div class="contenedor-formularios"></div>
    </div>';

    // JavaScript
    $output .= '<script>
    jQuery(document).ready(function($) {
        // Mostrar/ocultar menú
        $(".boton-funcionalidades").click(function(e) {
            e.stopPropagation();
            $(".menu-desplegable").toggle();
        });
        
        // Cerrar menú al hacer clic fuera
        $(document).click(function() {
            $(".menu-desplegable").hide();
        });
        
        // Manejar clic en opciones
        $(".opcion-menu").click(function(e) {
            e.stopPropagation();
            $(".opcion-menu").removeClass("activa");
            $(this).addClass("activa");
            
            var funcionalidad = $(this).data("funcionalidad");
            
            if(funcionalidad === "lista") {
                $(".contenedor-formularios").html(`<div class="funcionalidad-activa">
                    <button class="boton-principal boton-lista-deseos">+ Nueva Lista</button>
                    <div class="formulario-lista-deseos">
                        <form id="form-lista-deseos" method="post">
                            <label for="nombre-lista">Nombre de la lista:</label>
                            <input type="text" id="nombre-lista" name="nombre-lista" required>
                            
                            <div class="switch-container">
                                <span class="switch-text">¿Privado?</span>
                                <label class="switch-compact">
                                    <input type="checkbox" id="visibilidad" name="visibilidad" value="privada">
                                    <span class="slider-compact"></span>
                                </label>
                            </div>
                            
                            <input type="hidden" name="action" value="guardar_lista_deseos">
                            <button type="submit" class="boton-enviar-lista">Guardar</button>
                        </form>
                    </div>
                </div>`);
                
                // Manejar el botón de nueva lista
                $(".boton-lista-deseos").click(function(e) {
                    e.preventDefault();
                    $(".formulario-lista-deseos").slideToggle(200);
                });
                
                // Manejar el envío del formulario
                $("#form-lista-deseos").submit(function(e) {
                    e.preventDefault();
                    var formData = $(this).serialize();
                    
                    $.ajax({
                        type: "POST",
                        url: "'.admin_url('admin-ajax.php').'",
                        data: formData + "&action=guardar_lista_deseos",
                        success: function(response) {
                            $(".contenedor-formularios").append(`<div class="mensaje-exito">${response}</div>`);
                            setTimeout(function() {
                                $(".mensaje-exito").fadeOut();
                            }, 3000);
                            // Recargar la página para mostrar la nueva lista
                            location.reload();
                        },
                        error: function() {
                            $(".contenedor-formularios").append(`<div class="mensaje-error">Error al guardar</div>`);
                        }
                    });
                });
            } else {
                $(".contenedor-formularios").html(`<div class="mensaje-info">Funcionalidad en desarrollo: ${$(this).text()}</div>`);
            }
            
            $(".menu-desplegable").hide();
        });
    });
    </script>';

    return $output;
}

// Manejar el AJAX para guardar listas
add_action('wp_ajax_guardar_lista_deseos', 'guardar_lista_deseos_ajax');
add_action('wp_ajax_nopriv_guardar_lista_deseos', 'guardar_lista_deseos_ajax');

function crear_wishlist($email, $title, $is_public) {
    $url = "https://tanku-production-014d.up.railway.app/wordpress/wish-list/add";
    
    $body = array(
        'email' => $email,
        'title' => $title,
        'publico' => $is_public
    );

    $response = wp_remote_post($url, array(
        'timeout' => 30,
        'headers' => array('Content-Type' => 'application/json'),
        'body' => json_encode($body)
    ));

    if (is_wp_error($response)) {
        error_log("🚨 Error en POST: " . $response->get_error_message());
        return false;
    } else {
        $body = wp_remote_retrieve_body($response);
        error_log("✅ WishList creada para: {$email}");
        error_log("📥 Respuesta: " . $body);
        return true;
    }
}

function guardar_lista_deseos_ajax() {
    if (!is_user_logged_in()) {
        wp_send_json_error('Debes iniciar sesión');
        wp_die();
    }

    if (!isset($_POST['nombre-lista'])) {
        wp_send_json_error('Nombre de lista requerido');
        wp_die();
    }

    $usuario = wp_get_current_user();
    $email = $usuario->user_email;
    $nombre_lista = sanitize_text_field($_POST['nombre-lista']);
    $is_public = !isset($_POST['visibilidad']);

    $resultado = crear_wishlist($email, $nombre_lista, $is_public);

    if ($resultado) {
        $mensaje = 'Lista "'.esc_html($nombre_lista).'" creada ('.($is_public ? 'Pública' : 'Privada').')';
        wp_send_json_success($mensaje);
    } else {
        wp_send_json_error('Error al crear la lista de deseos');
    }
    wp_die();
}
