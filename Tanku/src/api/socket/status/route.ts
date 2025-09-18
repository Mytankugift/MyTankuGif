import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import SocketModuleService from "../../../modules/socket/service";
import { SOCKET_MODULE } from "../../../modules/socket";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const socketService = req.scope.resolve(SOCKET_MODULE) as SocketModuleService;
    
    // Obtener información del servidor Socket.IO
    const connectionInfo = await socketService.getConnectionInfo();
    const socketServer = socketService.getSocketServer();
    
    const status = {
      socketServerInitialized: !!socketServer,
      connectionInfo,
      timestamp: new Date().toISOString(),
      message: socketServer 
        ? "Socket.IO server is running successfully" 
        : "Socket.IO server is not initialized",
    };

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("[SOCKET STATUS] Error getting socket status:", error);
    
    res.status(500).json({
      success: false,
      error: "Failed to get socket server status",
      message: error.message,
    });
  }
}
