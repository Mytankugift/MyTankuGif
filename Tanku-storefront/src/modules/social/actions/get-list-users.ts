
export const getListUsers = async () => {
    try {
        console.log("envia al punto final")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/friends/get-list-users`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
          },
        }
      )
      console.log("response", response)
      const data = await response.json()
      console.log("data", data)
      return data.users
    } catch (error) {
      console.log("Error al obtener las listas de usuarios:", error)
      throw error
    }
  }