export interface AgentProfile {
  id: string
  userId: string
  name: string
  walletAddress: string
  onchainIdentityTokenId?: string
  personalityProfile: PersonalityProfile
  permissions: AgentPermissions
  reputationScore: number
  createdAt: Date
  updatedAt: Date
}

export interface PersonalityProfile {
  communicationStyle: 'formal' | 'casual' | 'professional'
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  timezone: string
  language: string
  customInstructions?: string
}

export interface AgentPermissions {
  meetings: MeetingPermissions
  shopping?: ShoppingPermissions
  networking?: NetworkingPermissions
}

export interface MeetingPermissions {
  canCommitTo: string[]
  cannotCommitTo: string[]
  escalateIf: string[]
  maxMeetingDurationMins: number
  requireHumanApprovalForBindingCommitments: boolean
}

export interface ShoppingPermissions {
  dailyBudgetCapUsd: number
  preferredCategories: string[]
  neverBuy: string[]
  requireApprovalAboveUsd: number
}

export interface NetworkingPermissions {
  autoAcceptResonanceFrom: string[]
  canInitiateContact: boolean
  maxConnectionsPerDay: number
}

export interface AgentMemoryEntry {
  id: string
  agentId: string
  type: 'preference' | 'interaction' | 'commitment' | 'relationship' | 'instruction'
  content: string
  embedding?: number[]
  importance: number // 0–1
  createdAt: Date
  expiresAt?: Date
}

export interface AgentDecisionContext {
  situation: string
  stakes: 'low' | 'medium' | 'high'
  timeConstraint?: string
  counterparty?: {
    auraId: string
    reputationScore: number
    relationshipHistory?: string
  }
  relevantMemories?: AgentMemoryEntry[]
}

export interface AgentDecision {
  action: string
  reasoning: string
  withinPermissions: boolean
  requiresHumanApproval: boolean
  confidence: number // 0–1
  escalationReason?: string
}

export type AgentStatus = 'idle' | 'active' | 'in_meeting' | 'in_room' | 'paused' | 'error'

export interface AgentInstance {
  instanceId: string
  agentId: string
  status: AgentStatus
  currentTask?: string
  spawnedAt: Date
}
