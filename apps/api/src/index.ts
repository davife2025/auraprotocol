import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'
import { agentRoutes } from './routes/agents.js'
import { meetingRoutes } from './routes/meetings.js'
import { roomRoutes } from './routes/rooms.js'
import { identityRoutes } from './routes/identity.js'
import { authRoutes } from './routes/auth.js'
import { healthRoutes } from './routes/health.js'
import { prismaPlugin } from './plugins/prisma.js'
import { authPlugin } from './middleware/auth.js'
import { roomService } from './services/roomService.js'

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  },
})

async function bootstrap() {
  await server.register(cors, { origin: process.env.APP_URL ?? 'http://localhost:3000', credentials: true })
  await server.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production' })
  await server.register(websocket)
  await server.register(rateLimit, { max: 200, timeWindow: '1 minute' })
  await server.register(prismaPlugin)
  await server.register(fp(authPlugin))

  await server.register(healthRoutes)
  await server.register(authRoutes,     { prefix: '/api/v1/auth' })
  await server.register(agentRoutes,    { prefix: '/api/v1/agents' })
  await server.register(meetingRoutes,  { prefix: '/api/v1/meetings' })
  await server.register(roomRoutes,     { prefix: '/api/v1/rooms' })
  await server.register(identityRoutes, { prefix: '/api/v1/identity' })

  try { await roomService.seedDefaultRooms() } catch { /* non-blocking */ }

  const port = Number(process.env.PORT ?? 3001)
  await server.listen({ port, host: process.env.HOST ?? '0.0.0.0' })
  server.log.info(`Aura Protocol API running on port ${port}`)
}

bootstrap().catch(err => { console.error(err); process.exit(1) })
