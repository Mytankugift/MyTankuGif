import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SOCIAL_MODULE } from "../../../../../modules/social";
import SocialModuleService from "../../../../../modules/social/service";
import { Modules } from "@medusajs/framework/utils";
import { PERSONAL_INFORMATION_MODULE } from "../../../../../modules/personal_information";
import PersonalInformationService from "../../../../../modules/personal_information/service";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { user_id } = req.params;
    if (!user_id) {
      return res.status(400).json({ error: "user_id es requerido" });
    }

    const socialModuleService: SocialModuleService = req.scope.resolve(SOCIAL_MODULE);
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const personalInfoService: PersonalInformationService = req.scope.resolve(PERSONAL_INFORMATION_MODULE);

    // 1. Obtener amigos directos del usuario
    const directFriends = await socialModuleService.listFriends({ customer_id: user_id as string });
    
    if (directFriends.length === 0) {
      // Si no hay amigos, no hay sugerencias basadas en amigos de amigos
      return res.status(200).json({ success: true, suggestions: [] });
    }

    // 2. Obtener IDs de amigos directos (para filtrar)
    const directFriendIds = new Set(directFriends.map(f => f.friend_customer_id));
    directFriendIds.add(user_id as string); // Excluir también al usuario actual

    // 3. Para cada amigo, obtener sus amigos (amigos de amigos)
    const friendsOfFriendsMap = new Map<string, number>(); // Map<friend_id, frequency>
    
    for (const friend of directFriends) {
      const friendId = friend.friend_customer_id;
      // Obtener amigos de este amigo
      const friendsOfFriend = await socialModuleService.listFriends({ customer_id: friendId });
      
      // Contar frecuencias (cuántos amigos en común tienen)
      for (const fof of friendsOfFriend) {
        const fofId = fof.friend_customer_id;
        // Excluir amigos directos y el usuario actual
        if (!directFriendIds.has(fofId)) {
          const currentCount = friendsOfFriendsMap.get(fofId) || 0;
          friendsOfFriendsMap.set(fofId, currentCount + 1);
        }
      }
    }

    if (friendsOfFriendsMap.size === 0) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    // 4. Ordenar por frecuencia (mayor = más recomendado) y limitar a 12
    const sortedSuggestions = Array.from(friendsOfFriendsMap.entries())
      .sort((a, b) => b[1] - a[1]) // Ordenar por frecuencia descendente
      .slice(0, 12); // Limitar a 12

    // 5. Obtener datos completos de cada usuario sugerido
    const detailedSuggestions = await Promise.all(
      sortedSuggestions.map(async ([suggestedUserId, mutualFriendsCount]) => {
        try {
          const customer = await customerModuleService.retrieveCustomer(suggestedUserId);
          const personalInfo = await personalInfoService.listPersonalInformations({ 
            customer_id: suggestedUserId 
          });

          const social = personalInfo?.[0] && (personalInfo[0] as any).social_url 
            ? (personalInfo[0] as any).social_url 
            : null;
          const alias = social?.public_alias || social?.alias || "";

          return {
            id: suggestedUserId,
            first_name: customer.first_name || "",
            last_name: customer.last_name || "",
            email: customer.email || "",
            avatar_url: personalInfo?.[0]?.avatar_url || null,
            alias: alias,
            mutual_friends_count: mutualFriendsCount,
          };
        } catch (error) {
          console.error(`Error al obtener datos del usuario ${suggestedUserId}:`, error);
          return null;
        }
      })
    );

    // Filtrar usuarios nulos (si hubo errores)
    const validSuggestions = detailedSuggestions.filter(s => s !== null);

    return res.status(200).json({ 
      success: true, 
      suggestions: validSuggestions 
    });

  } catch (error: any) {
    console.error("Error al obtener sugerencias de amigos:", error);
    return res.status(500).json({ 
      error: "Error interno del servidor",
      details: error.message 
    });
  }
}

