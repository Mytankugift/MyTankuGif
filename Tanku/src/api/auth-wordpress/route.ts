import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {

    try {
        const { token } = req.body as { token: string };
        
        if (!token) {
            return res.status(400).json({ message: "Token es requerido" });
        }
        console.log("Token recibido:", token);

        res.status(222).json({ message: "Token recibido correctamente", token });
        
    } catch (error) {
        console.error("Error al obtener los datos:", error)
        res.status(500).json({
            message: "An error occurred while processing your request",
            error: error.message,
        });
    }

}
