import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>
  }
}

export const authPlugin = fp(async (server: FastifyInstance) => {
  server.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' })
    }
  })
})
