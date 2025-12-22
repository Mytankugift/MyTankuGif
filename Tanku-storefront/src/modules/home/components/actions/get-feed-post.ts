export const fetchFeedPosts = async (customerId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      const url = `${backendUrl}/social/posters/get-feed-poster?customer_id=${customerId}`;
      
      console.log(`📱 [POSTS] Obteniendo feed de posts para usuario: ${customerId}`);
      
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
          "Content-Type": "application/json",
        },
      });

      console.log(`📱 [POSTS] Response status: ${response.status}`);

      if (!response.ok) {
        // Si es 404, el endpoint no existe aún (normal en desarrollo)
        if (response.status === 404) {
          console.log(`ℹ️ [POSTS] Endpoint no encontrado (404), devolviendo array vacío`);
          return [];
        }
        // Para otros errores, loggear pero no fallar
        const errorText = await response.text().catch(() => 'No se pudo leer el error');
        console.warn(`⚠️ [POSTS] Error ${response.status}: ${errorText}`);
        return [];
      }

      const result = await response.json();
      
      const posts = result.posterFeed || [];
      console.log(`✅ [POSTS] Feed obtenido: ${posts.length} posts`);
      
      return posts;
    } catch (error: any) {
      // No loggear errores completos para no saturar, solo el mensaje
      const errorMessage = error?.message || 'Error desconocido';
      if (errorMessage !== 'Error desconocido' && !errorMessage.includes('Failed to fetch')) {
        console.warn(`⚠️ [POSTS] Error obteniendo posts: ${errorMessage}`);
      }
      // Siempre devolver array vacío para que el frontend no falle
      return [];
    }
  }