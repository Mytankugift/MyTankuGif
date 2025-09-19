import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SOCKET_MODULE } from "../../../modules/socket";
import SocketModuleService from "../../../modules/socket/service";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { user_ids } = req.query;
    
    if (!user_ids) {
      res.status(400).json({
        success: false,
        error: "user_ids parameter is required",
      });
      return;
    }

    const socketService = req.scope.resolve(SOCKET_MODULE) as SocketModuleService;
    const userIdArray = Array.isArray(user_ids) ? user_ids : [user_ids];
    
    const userStatuses = await Promise.all(
      userIdArray.map(async (userId) => {
        const isOnline = await socketService.isUserOnline(userId as string);
        return {
          user_id: userId,
          is_online: isOnline,
          last_seen: isOnline ? new Date().toISOString() : null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: userStatuses,
    });
    
  } catch (error) {
    console.error("[USER STATUS] Error:", error);
    
    res.status(500).json({
      success: false,
      error: "Failed to get user status",
      message: (error as Error).message,
    });
  }
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const body = req.body as { user_id?: string; status?: string };
    const { user_id, status } = body;
    
    if (!user_id || !status) {
      res.status(400).json({
        success: false,
        error: "user_id and status are required",
      });
      return;
    }

    const socketService = req.scope.resolve(SOCKET_MODULE) as SocketModuleService;
    
    // Emitir cambio de estado a todos los usuarios conectados
    await socketService.emitToAll("user-status-changed", {
      user_id,
      status,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
    });
    
  } catch (error) {
    console.error("[USER STATUS UPDATE] Error:", error);
    
    res.status(500).json({
      success: false,
      error: "Failed to update user status",
      message: (error as Error).message,
    });
  }
}
