import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import rateLimit from '@fastify/rate-limit'
import { agentRoutes } from './routes/agents'
import { meetingRoutes } from './routes/meetings'
import { roomRoutes } from './routes/rooms'
import { identityRoutes } from './routes/identity'
import { healthRoutes } from './routes/health'

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
  },
})

async function bootstrap() {
  // Plugins
  await server.register(cors, {
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true,
  })

  await server.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  })

  await server.register(websocket)

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // Routes
  await server.register(healthRoutes)
  await server.register(agentRoutes, { prefix: '/api/v1/agents' })
  await server.register(meetingRoutes, { prefix: '/api/v1/meetings' })
  await server.register(roomRoutes, { prefix: '/api/v1/rooms' })
  await server.register(identityRoutes, { prefix: '/api/v1/identity' })

  // Start
  const port = Number(process.env.PORT ?? 3001)
  const host = process.env.HOST ?? '0.0.0.0'

  await server.listen({ port, host })
  server.log.info(`Aura Protocol API running on http://${host}:${port}`)
}

bootstrap().catch(err => {
  console.error(err)
  process.exit(1)
})
