"use strict";
import "dotenv/config";

import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import checkHealth from "../monitoring/health-check.js";
import checkForUpdate from "../updates/fetch-and-update-if-needed.js";

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
        ...healthStatus,
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

fastify.get(
  "/update-check",
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const updateStatus = await checkForUpdate();
      return reply.code(200).send({
        status: "success",
        isNewUpdateAvailable: updateStatus.isNewUpdateAvailable,
        message: updateStatus.isNewUpdateAvailable
          ? "An update is available."
          : "Your system is up to date.",
      });
    } catch (error) {
      return reply.code(500).send({
        status: "error",
        message: "Failed to check for updates",
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
