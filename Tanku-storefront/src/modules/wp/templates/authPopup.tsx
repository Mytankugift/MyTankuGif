"use client";

import { useEffect, useState } from "react";
import { LoginWPTemplate } from "@modules/account/templates/loginwp-template";

type WordpressAuthPopupProps = {
  token: string;
};

export function WordpressAuthPopup({ token }: WordpressAuthPopupProps) {
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const [popupClosed, setPopupClosed] = useState(false);
  const [showHiddenTemplate, setShowHiddenTemplate] = useState(false);

  // Función para abrir la ventana emergente
  const openPopupWindow = () => {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.focus();
      return popupWindow;
    }

    try {
      // Configuración de la ventana flotante
      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;

      // Abrir la ventana flotante
      const popup = window.open(
        "", // URL vacía, el contenido se inyectará
        "wordpress-auth-popup",
        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
      );

      if (!popup || popup.closed) {
        console.error('No se pudo abrir la ventana emergente. Puede que el navegador la haya bloqueado.');
        setPopupClosed(true);
        return null;
      }

      // Inyectar el contenido HTML básico en la ventana flotante
      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Autenticación con WordPress</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f5f5f5;
                overflow-x: hidden;
              }
              #root {
                width: 100%;
                height: 100%;
              }
            </style>
          </head>
          <body>
            <div id="root">
              <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
                <p>Cargando...</p>
              </div>
            </div>
            <script>
              // Notificar a la ventana principal que estamos listos
              window.opener.postMessage({ type: 'WP_AUTH_POPUP_READY', token: '${token}' }, '*');
            </script>
          </body>
        </html>
      `);
      popup.document.close();

      return popup;
    } catch (error) {
      console.error('Error al abrir la ventana emergente:', error);
      setPopupClosed(true);
      return null;
    }
  };

  // En lugar de abrir automáticamente, esperamos a que el usuario haga clic en el botón
  // Este enfoque es más compatible con las políticas de bloqueo de popups de los navegadores
  useEffect(() => {
    // Solo verificamos si ya hay una ventana abierta
    if (popupWindow) {
      // Verificar si la ventana se cierra
      const checkIfClosed = setInterval(() => {
        if (popupWindow.closed) {
          clearInterval(checkIfClosed);
          setPopupClosed(true);
          setPopupWindow(null);
        }
      }, 500);

      // Configurar la ventana emergente
      setTimeout(() => {
        if (popupWindow && !popupWindow.closed) {
          try {
            // Crear un contenedor para el componente LoginWPTemplate
            const rootElement = popupWindow.document.getElementById('root');
            if (rootElement) {
              rootElement.innerHTML = '';
              
              // Crear un div para contener el componente
              const container = popupWindow.document.createElement('div');
              container.style.padding = '20px';
              container.style.maxWidth = '500px';
              container.style.margin = '0 auto';
              container.style.backgroundColor = 'white';
              container.style.borderRadius = '8px';
              container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
              container.style.marginTop = '20px';
              
              // Crear un encabezado
              const header = popupWindow.document.createElement('div');
              header.style.textAlign = 'center';
              header.style.marginBottom = '20px';
              
              const title = popupWindow.document.createElement('h2');
              title.textContent = 'Iniciar sesión con WordPress';
              header.appendChild(title);
              
              // Contenedor para el componente LoginWPTemplate
              const loginContainer = popupWindow.document.createElement('div');
              loginContainer.id = 'wp-login-container';
              
              // Agregar elementos al DOM
              container.appendChild(header);
              container.appendChild(loginContainer);
              rootElement.appendChild(container);
              
              // Renderizar el componente LoginWPTemplate
              setShowHiddenTemplate(true);
            }
          } catch (error) {
            console.error('Error al configurar la ventana emergente:', error);
          }
        }
      }, 500);

      // Limpiar al desmontar
      return () => {
        clearInterval(checkIfClosed);
        if (popupWindow && !popupWindow.closed) {
          popupWindow.close();
        }
      };
    }
  }, [token]);

  // Efecto para capturar el HTML del componente LoginWPTemplate cuando se muestra
  useEffect(() => {
    if (showHiddenTemplate && popupWindow && !popupWindow.closed) {
      // Usar setTimeout para asegurar que el componente se haya renderizado
      setTimeout(() => {
        try {
          // Obtener el HTML del componente renderizado
          const templateElement = document.getElementById('hidden-wp-template');
          if (templateElement && popupWindow) {
            const templateHTML = templateElement.innerHTML;
            
            // Encontrar el contenedor en la ventana emergente
            const container = popupWindow.document.getElementById('wp-login-container');
            if (container) {
              // Insertar el HTML del componente
              container.innerHTML = templateHTML;
              
              // Agregar script para manejar eventos del formulario
              const script = popupWindow.document.createElement('script');
              script.textContent = `
                // Interceptar envíos de formulario
                document.addEventListener('submit', function(e) {
                  e.preventDefault();
                  window.opener.postMessage({ type: 'WP_AUTH_COMPLETED' }, '*');
                  setTimeout(() => window.close(), 1000);
                });
                
                // Agregar manejadores de eventos a los botones
                const buttons = document.querySelectorAll('button');
                buttons.forEach(button => {
                  button.addEventListener('click', function(e) {
                    // Prevenir comportamiento por defecto para botones de tipo submit
                    if (button.type === 'submit') {
                      e.preventDefault();
                      window.opener.postMessage({ type: 'WP_AUTH_COMPLETED' }, '*');
                      setTimeout(() => window.close(), 1000);
                    }
                  });
                });
              `;
              popupWindow.document.body.appendChild(script);
            }
          }
          
          // Ocultar el componente después de capturar su HTML
          setShowHiddenTemplate(false);
        } catch (error) {
          console.error('Error al capturar HTML del componente:', error);
          setShowHiddenTemplate(false);
        }
      }, 100);
    }
  }, [showHiddenTemplate, popupWindow]);

  // Manejar mensajes de la ventana emergente
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'WP_AUTH_COMPLETED') {
        // Manejar la autenticación completada
        window.location.href = '/account'; // Redirigir a la página de cuenta
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px]">
      {/* Componente oculto para capturar su HTML */}
      {showHiddenTemplate && (
        <div id="hidden-wp-template" style={{ display: 'none' }}>
          <LoginWPTemplate token={token} />
        </div>
      )}
      
      {popupWindow ? (
        // Si la ventana está abierta, mostramos este mensaje
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Procesando autenticación con WordPress</h2>
          <p className="text-gray-600 mb-4">Se ha abierto una ventana de autenticación. Por favor, completa el proceso allí.</p>
          <p className="text-gray-500 text-sm mb-4">Si no puedes ver la ventana, puede que esté minimizada o detrás de esta ventana.</p>
          <button 
            onClick={() => {
              if (popupWindow && !popupWindow.closed) {
                popupWindow.focus();
              } else {
                setPopupWindow(null);
                setPopupClosed(true);
              }
            }} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Enfocar ventana
          </button>
        </div>
      ) : popupClosed ? (
        // Si la ventana fue cerrada, mostramos opción para reintentar
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Ventana de autenticación cerrada</h2>
          <p className="text-gray-600 mb-4">La ventana de autenticación fue cerrada. ¿Deseas intentarlo nuevamente?</p>
          <button 
            onClick={() => {
              setPopupClosed(false);
              const popup = openPopupWindow();
              if (popup) {
                setPopupWindow(popup);
                
                // Configurar la ventana emergente
                setTimeout(() => {
                  if (!popup.closed) {
                    try {
                      // Crear un contenedor para el componente LoginWPTemplate
                      const rootElement = popup.document.getElementById('root');
                      if (rootElement) {
                        rootElement.innerHTML = '';
                        
                        // Crear un div para contener el componente
                        const container = popup.document.createElement('div');
                        container.style.padding = '20px';
                        container.style.maxWidth = '500px';
                        container.style.margin = '0 auto';
                        container.style.backgroundColor = 'white';
                        container.style.borderRadius = '8px';
                        container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                        container.style.marginTop = '20px';
                        
                        // Crear un encabezado
                        const header = popup.document.createElement('div');
                        header.style.textAlign = 'center';
                        header.style.marginBottom = '20px';
                        
                        const title = popup.document.createElement('h2');
                        title.textContent = 'Iniciar sesión con WordPress';
                        header.appendChild(title);
                        
                        // Contenedor para el componente LoginWPTemplate
                        const loginContainer = popup.document.createElement('div');
                        loginContainer.id = 'wp-login-container';
                        
                        // Agregar elementos al DOM
                        container.appendChild(header);
                        container.appendChild(loginContainer);
                        rootElement.appendChild(container);
                        
                        // Renderizar el componente LoginWPTemplate
                        setShowHiddenTemplate(true);
                      }
                    } catch (error) {
                      console.error('Error al configurar la ventana emergente:', error);
                    }
                  }
                }, 500);
              }
            }} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : (
        // Estado inicial - Botón para abrir la ventana
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Autenticación con WordPress</h2>
          <p className="text-gray-600 mb-4">Para continuar con la autenticación, haz clic en el botón de abajo para abrir la ventana de inicio de sesión.</p>
          <button 
            onClick={() => {
              const popup = openPopupWindow();
              if (popup) {
                setPopupWindow(popup);
                
                // Configurar la ventana emergente
                setTimeout(() => {
                  if (!popup.closed) {
                    try {
                      // Crear un contenedor para el componente LoginWPTemplate
                      const rootElement = popup.document.getElementById('root');
                      if (rootElement) {
                        rootElement.innerHTML = '';
                        
                        // Crear un div para contener el componente
                        const container = popup.document.createElement('div');
                        container.style.padding = '20px';
                        container.style.maxWidth = '500px';
                        container.style.margin = '0 auto';
                        container.style.backgroundColor = 'white';
                        container.style.borderRadius = '8px';
                        container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                        container.style.marginTop = '20px';
                        
                        // Crear un encabezado
                        const header = popup.document.createElement('div');
                        header.style.textAlign = 'center';
                        header.style.marginBottom = '20px';
                        
                        const title = popup.document.createElement('h2');
                        title.textContent = 'Iniciar sesión con WordPress';
                        header.appendChild(title);
                        
                        // Contenedor para el componente LoginWPTemplate
                        const loginContainer = popup.document.createElement('div');
                        loginContainer.id = 'wp-login-container';
                        
                        // Agregar elementos al DOM
                        container.appendChild(header);
                        container.appendChild(loginContainer);
                        rootElement.appendChild(container);
                        
                        // Renderizar el componente LoginWPTemplate
                        setShowHiddenTemplate(true);
                      }
                    } catch (error) {
                      console.error('Error al configurar la ventana emergente:', error);
                    }
                  }
                }, 500);
              }
            }} 
            className="bg-blue-600 text-white px-6 py-3 text-lg rounded-lg hover:bg-blue-700 transition-colors"
          >
            Abrir ventana de autenticación
          </button>
        </div>
      )}
    </div>
  );
}