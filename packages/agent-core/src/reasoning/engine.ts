import Anthropic from '@anthropic-ai/sdk'
import type {
  AgentProfile,
  AgentDecisionContext,
  AgentDecision,
  AgentMemoryEntry,
} from '../types/index.js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const AGENT_SYSTEM_PROMPT = (profile: AgentProfile, memories: AgentMemoryEntry[]) => `
You are an AI agent representing ${profile.name}. You act on their behalf with full authority within your permission boundaries.

## Your Owner's Profile
- Communication style: ${profile.personalityProfile.communicationStyle}
- Risk tolerance: ${profile.personalityProfile.riskTolerance}
- Language: ${profile.personalityProfile.language}
${profile.personalityProfile.customInstructions ? `- Special instructions: ${profile.personalityProfile.customInstructions}` : ''}

## Your Permission Boundaries
### Meetings
- You CAN commit to: ${profile.permissions.meetings.canCommitTo.join(', ')}
- You CANNOT commit to: ${profile.permissions.meetings.cannotCommitTo.join(', ')}
- ALWAYS escalate to human if: ${profile.permissions.meetings.escalateIf.join(', ')}

## Relevant Memory
${memories.map(m => `- [${m.type}] ${m.content}`).join('\n')}

## Core Rules
1. Always act as if you ARE your owner — speak in first person as them
2. Never exceed your permission boundaries — if uncertain, escalate
3. Be concise, decisive, and professional
4. Log every commitment you make — these are binding
5. If you must escalate, clearly state WHY
`.trim()

export class AgentReasoningEngine {
  constructor(private profile: AgentProfile) {}

  /**
   * Generate a response for a meeting or conversation turn
   */
  async generateResponse(
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    memories: AgentMemoryEntry[] = []
  ): Promise<string> {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: AGENT_SYSTEM_PROMPT(this.profile, memories),
      messages: conversationHistory,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from LLM')
    }

    return textBlock.text
  }

  /**
   * Make a structured decision given a context
   */
  async makeDecision(
    context: AgentDecisionContext,
    memories: AgentMemoryEntry[] = []
  ): Promise<AgentDecision> {
    const prompt = `
Given this situation, make a decision and respond ONLY as valid JSON matching this schema:
{
  "action": "string — what you will do",
  "reasoning": "string — why",
  "withinPermissions": boolean,
  "requiresHumanApproval": boolean,
  "confidence": number between 0 and 1,
  "escalationReason": "string — only if requiresHumanApproval is true"
}

Situation: ${context.situation}
Stakes: ${context.stakes}
${context.timeConstraint ? `Time constraint: ${context.timeConstraint}` : ''}
${context.counterparty ? `Counterparty reputation: ${context.counterparty.reputationScore}/100` : ''}
`.trim()

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: AGENT_SYSTEM_PROMPT(this.profile, memories),
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from LLM')
    }

    return JSON.parse(textBlock.text) as AgentDecision
  }

  /**
   * Generate a meeting summary
   */
  async generateMeetingSummary(
    transcript: Array<{ agentId: string; message: string; timestamp: string }>,
    commitments: string[]
  ): Promise<string> {
    const transcriptText = transcript
      .map(t => `[${t.timestamp}] ${t.agentId}: ${t.message}`)
      .join('\n')

    const prompt = `
Summarise this meeting transcript on behalf of your owner. Include:
1. Key discussion points
2. Decisions made
3. Commitments logged (these are binding)
4. Recommended next steps

Commitments made: ${commitments.join(', ')}

Transcript:
${transcriptText}
`.trim()

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: AGENT_SYSTEM_PROMPT(this.profile, []),
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from LLM')
    }

    return textBlock.text
  }
}
