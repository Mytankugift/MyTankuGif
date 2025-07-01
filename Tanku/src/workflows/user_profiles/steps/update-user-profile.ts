import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { USER_PROFILE_MODULE } from "../../../modules/user-profiles";
import UserProfileModuleService from "../../../modules/user-profiles/service";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
const updateUserProfileStep = createStep(
  "update-user-profile-step",
  async (
   _, 
    { container }
  ) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const userProfileService: UserProfileModuleService = container.resolve(
      USER_PROFILE_MODULE
    );

    // 1. Obtener todos los registros de comportamiento
    const userBehaviors = await userProfileService.listUserBehaviors();

    // 2. Tabla de puntuaciones por tipo de acción
    const pointsTable: Record<string, number> = {
      view_product: 1,
      add_to_cart: 2,
      purchase: 3,
      wishlist: 2,
      search: 1,
      navigation: 1,
    };

    // 3. Mapa para acumular puntos por palabra y usuario
    const wordPoints: Record<string, Record<string, number>> = {};

    for (const behavior of userBehaviors) {
      const { userId, actionType, keywords } = behavior as {
        userId: string;
        actionType: keyof typeof pointsTable;
        keywords: string[];
      };

      const pts = pointsTable[actionType] ?? 1;
      if (!wordPoints[userId]) {
        wordPoints[userId] = {};
      }

      for (const word of keywords) {
        wordPoints[userId][word] = (wordPoints[userId][word] || 0) + pts;
      }
    }

    // 4. Calcular media y filtrar palabras > media-1
    const filtered = Object.entries(wordPoints).map(([userId, wordsMap]) => {
      const pointsArr = Object.values(wordsMap);
      const mean = pointsArr.reduce((a, b) => a + b, 0) / pointsArr.length;
      const threshold = mean - 1;
      const words = Object.entries(wordsMap)
        .filter(([_, pts]) => pts > threshold)
        .map(([word]) => word);
      return { userId, words };
    });

    console.log("filtered",filtered)
    
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: [
        "*", // todos los campos de customer
        "user_profile_link.user_profile.*", // todos los campos de user_profile enlazado
      ],

      // Puedes agregar filtros si lo necesitas
    });

    console.log("customers",customers, customers[2].user_profile_link)

    // Mapa rápido customer_id -> id de perfil
    const createdLinks: {
      customer: { customer_id: string };
      userProfileModule: { user_profile_id: string };
    }[] = [];

    const profileMap: Record<string, {id: string, user_profile_id: string}> = {};
    for (const p of customers) {
      if(p?.user_profile_link){
        profileMap[p.id] = {id: p.id, user_profile_id: p.user_profile_link.user_profile_id};
      }
    }

    for (const user of filtered) {
      const { userId, words } = user;
      const profileId = profileMap[userId]; 

      if (profileId) {
        // Existe perfil, actualizamos
        console.log("profileId",profileId)
        await userProfileService.updateUserProfiles({
          id: profileId.user_profile_id,
          profiles: words,
        });
      } else {
        // No existe, lo creamos
       const userProfileCreated = await userProfileService.createUserProfiles({
          profiles: words,
        });
         const link = {
                [Modules.CUSTOMER]: {
                  customer_id: userId,
                },
                [USER_PROFILE_MODULE]: {
                  user_profile_id: userProfileCreated.id,
                },
              };
              
              createdLinks.push(link)
      }
    }

 console.log("createdLinks",createdLinks)

    return new StepResponse(createdLinks, "");
  },
);

export default updateUserProfileStep;
