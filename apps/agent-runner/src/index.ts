import { createAgentWorker } from './workers/agentWorker'
import { createMeetingWorker } from './workers/meetingWorker'
import { createRoomWorker } from './workers/roomWorker'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })

async function bootstrap() {
  logger.info('Starting Aura Protocol Agent Runner...')

  // Spin up workers — each listens to its own BullMQ queue
  const agentWorker = createAgentWorker()
  const meetingWorker = createMeetingWorker()
  const roomWorker = createRoomWorker()

  logger.info('Agent Runner active — workers listening on Redis queues')

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Shutting down Agent Runner...')
    await agentWorker.close()
    await meetingWorker.close()
    await roomWorker.close()
    process.exit(0)
  })
}

bootstrap().catch(err => {
  console.error(err)
  process.exit(1)
})
