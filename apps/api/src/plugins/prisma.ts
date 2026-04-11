import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

export const prismaPlugin = fp(async (server: FastifyInstance) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

  await prisma.$connect()
  server.decorate('prisma', prisma)

  server.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})

// Standalone export for services that need prisma outside Fastify context
export const prisma = new PrismaClient()