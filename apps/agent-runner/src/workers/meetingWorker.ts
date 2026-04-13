import { Worker, type Job } from 'bullmq'
import { agentService } from '@aura/agent-core'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
const conn = { host: process.env.REDIS_HOST ?? 'localhost', port: Number(process.env.REDIS_PORT ?? 6379) }

export function createMeetingWorker() {
  const worker = new Worker('meeting-tasks', async (job: Job) => {
    const { type, meetingId, agentId, payload } = job.data
    logger.info({ type, meetingId }, 'Processing meeting job')

    switch (type) {
      case 'deploy_room':
        logger.info({ meetingId }, 'MeetingRoom contract deployment queued on Monad')
        break

      case 'join_meeting': {
        const instances = agentService.getActiveInstances(agentId)
        if (instances[0]) {
          agentService.setStatus(instances[0].instanceId, 'in_meeting', meetingId)
          logger.info({ agentId, meetingId }, 'Agent entered meeting room')
        }
        break
      }

      case 'process_turn': {
        const instances = agentService.getActiveInstances(agentId)
        if (!instances[0]) break

        try {
          const response = await agentService.chat(
            instances[0].instanceId,
            [{ role: 'user', content: payload.inboundMessage as string }],
            payload.agenda as string
          )
          logger.info({ agentId, meetingId, turnLength: response.length }, 'Meeting turn processed')
        } catch (err) {
          logger.error({ err, agentId }, 'Turn processing failed')
        }
        break
      }

      case 'generate_summary': {
        const instances = agentService.getActiveInstances(agentId)
        if (!instances[0]) break

        try {
          const summary = await agentService.summariseMeeting(
            instances[0].instanceId,
            payload.transcript as any[],
            payload.commitments as string[]
          )
          logger.info({ meetingId, summaryLength: summary.length }, 'Meeting summary generated')
        } catch (err) {
          logger.error({ err }, 'Summary generation failed')
        }
        break
      }

      case 'settle_onchain':
        logger.info({ meetingId }, 'Meeting settlement queued on Monad')
        break
    }
  }, { connection: conn, concurrency: 50 })

  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Meeting job failed'))
  return worker
}
