import type { Server as HttpServer } from "node:http";
import type { FastifyBaseLogger } from "fastify";
import { Server } from "socket.io";

export const attachSocket = (httpServer: HttpServer, log: FastifyBaseLogger) => {
  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    log.debug({ socketId: socket.id }, "socket connected");
    socket.on("disconnect", (reason) => {
      log.debug({ socketId: socket.id, reason }, "socket disconnected");
    });
  });

  return io;
};
