'use client';

import React, { useState } from 'react';

/**
 * Componente para la autenticación con WordPress
 */
export default function WordPressAuthPage() {
  // Estado para almacenar la respuesta o el error
  const [response, setResponse] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);
  
  // Estado para controlar la carga
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Función para obtener el token de autenticación
   */
  const getAuthToken = async () => {
    setIsLoading(true);
    setResponse(null);
    
    try {
      // Realizar la petición al endpoint de WordPress
      const response = await fetch('https://mytanku.com/wp-json/custom-auth/v1/get-token', {
        method: 'GET',
        credentials: 'include', // Importante para que envíe cookies de sesión
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.token) {
        // Si se recibe un token válido
        setResponse({
          success: true,
          message: 'Token recibido correctamente',
          data: data
        });
        console.log('Token recibido:', data.token);
      } else {
        // Si no se recibe un token válido
        setResponse({
          success: false,
          message: data.error || 'No se recibió un token válido',
          data: data
        });
      }
    } catch (error) {
      // Manejar errores
      console.error('Error obteniendo el token:', error);
      setResponse({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido al obtener el token',
        data: error
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="md:flex">
          <div className="p-8 w-full">
            <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
              Autenticación WordPress
            </div>
            <h1 className="block mt-1 text-2xl leading-tight font-bold text-black">
              Obtener Token de Autenticación
            </h1>
            <p className="mt-2 text-gray-500">
              Haz clic en el botón para verificar tu sesión de WordPress y obtener un token de autenticación.
            </p>
            
            <div className="mt-6">
              <button
                onClick={getAuthToken}
                disabled={isLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${isLoading ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'} 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </span>
                ) : 'Verificar Sesión WordPress'}
              </button>
            </div>
            
            {response && (
              <div className={`mt-6 p-4 rounded-md ${response.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {response.success ? (
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${response.success ? 'text-green-800' : 'text-red-800'}`}>
                      {response.success ? 'Éxito' : 'Error'}
                    </h3>
                    <div className={`mt-2 text-sm ${response.success ? 'text-green-700' : 'text-red-700'}`}>
                      <p>{response.message}</p>
                    </div>
                    
                    {response.success && response.data && (
                      <div className="mt-4">
                        <details className="bg-gray-100 rounded-md p-2">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700">
                            Ver detalles del usuario
                          </summary>
                          <div className="mt-2 text-xs text-gray-600 overflow-auto max-h-60">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(response.data.user, null, 2)}
                            </pre>
                          </div>
                        </details>
                        
                        <details className="bg-gray-100 rounded-md p-2 mt-2">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700">
                            Ver token (encriptado)
                          </summary>
                          <div className="mt-2 text-xs text-gray-600 overflow-auto max-h-60">
                            <div className="break-all">
                              {response.data.token}
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}