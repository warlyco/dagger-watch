"use strict";
import "dotenv/config";

import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import checkHealth from "../monitoring/health-check.js";

const fastify = Fastify({
  logger: true,
});

// Register plugins
fastify.register(cors, {
  origin: "*",
});

// Define the /node-check endpoint
fastify.get(
  "/node-check",
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const healthStatus = await checkHealth();
      return reply.code(200).send({
        status: "success",
        data: healthStatus,
        isActive: healthStatus.isActive,
      });
    } catch (error) {
      return reply.code(500).send({
        status: "error",
        message: "Failed to perform node health check",
        error: (error as { message: string })?.message,
      });
    }
  }
);

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3005, host: "0.0.0.0" });
    console.log(`Server listening on port 3005`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
