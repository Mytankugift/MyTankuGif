import { Module } from "@medusajs/framework/utils";
import SocketModuleService from "./service";
import socketServerLoader from "./loaders/socket-server";

export const SOCKET_MODULE = "socket";

export default Module(SOCKET_MODULE, {
  service: SocketModuleService,
  loaders: [socketServerLoader],
});
