import type { FastifyInstance } from 'fastify'

export async function healthRoutes(server: FastifyInstance) {
  server.get('/health', async () => ({
    status: 'ok',
    service: 'aura-protocol-api',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.0.1',
  }))
}
