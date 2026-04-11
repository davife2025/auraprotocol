import type { AgentMemoryEntry } from '../types/index.js'

export class AgentMemoryManager {
  private memories: AgentMemoryEntry[] = []

  constructor(private agentId: string) {}

  /**
   * Add a memory entry
   */
  async remember(
    type: AgentMemoryEntry['type'],
    content: string,
    importance: number = 0.5
  ): Promise<AgentMemoryEntry> {
    const entry: AgentMemoryEntry = {
      id: crypto.randomUUID(),
      agentId: this.agentId,
      type,
      content,
      importance,
      createdAt: new Date(),
    }
    this.memories.push(entry)
    // TODO: session 3 — persist to Pinecone vector store
    return entry
  }

  /**
   * Retrieve relevant memories for a given context
   * TODO: session 3 — semantic search via Pinecone
   */
  async recall(context: string, limit: number = 5): Promise<AgentMemoryEntry[]> {
    // Naive keyword match for now — replaced with vector search in session 3
    const contextWords = context.toLowerCase().split(' ')
    const scored = this.memories
      .map(m => {
        const matches = contextWords.filter(w => m.content.toLowerCase().includes(w)).length
        return { memory: m, score: matches * m.importance }
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.memory)

    return scored
  }

  /**
   * Record a commitment made by the agent
   */
  async recordCommitment(commitment: string): Promise<AgentMemoryEntry> {
    return this.remember('commitment', commitment, 1.0)
  }

  /**
   * Get all commitments made — used for meeting settlement
   */
  getCommitments(): AgentMemoryEntry[] {
    return this.memories.filter(m => m.type === 'commitment')
  }

  /**
   * Clear expired memories
   */
  pruneExpired(): void {
    const now = new Date()
    this.memories = this.memories.filter(m => !m.expiresAt || m.expiresAt > now)
  }
}
