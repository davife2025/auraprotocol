import type { AgentPermissions, AgentDecision } from '../types/index.js'

export class PermissionEnforcer {
  constructor(private permissions: AgentPermissions) {}

  /**
   * Check if a proposed meeting commitment is allowed
   */
  canCommitToMeeting(commitment: string): { allowed: boolean; reason?: string } {
    const lowerCommitment = commitment.toLowerCase()

    // Hard block — check cannot-commit list first
    for (const blocked of this.permissions.meetings.cannotCommitTo) {
      if (lowerCommitment.includes(blocked.toLowerCase())) {
        return {
          allowed: false,
          reason: `Blocked by permission: cannot commit to "${blocked}"`,
        }
      }
    }

    // Check escalation triggers
    for (const trigger of this.permissions.meetings.escalateIf) {
      if (lowerCommitment.includes(trigger.toLowerCase())) {
        return {
          allowed: false,
          reason: `Requires human approval: escalation trigger "${trigger}" detected`,
        }
      }
    }

    // Check against allowed list
    const isExplicitlyAllowed = this.permissions.meetings.canCommitTo.some(allowed =>
      lowerCommitment.includes(allowed.toLowerCase())
    )

    if (!isExplicitlyAllowed) {
      return {
        allowed: false,
        reason: 'Commitment type not in allowed list — escalating to human',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if a purchase is within shopping permissions
   */
  canMakePurchase(
    amountUsd: number,
    category: string
  ): { allowed: boolean; reason?: string } {
    if (!this.permissions.shopping) {
      return { allowed: false, reason: 'Shopping permissions not enabled' }
    }

    const { dailyBudgetCapUsd, neverBuy, requireApprovalAboveUsd } = this.permissions.shopping

    if (amountUsd > dailyBudgetCapUsd) {
      return { allowed: false, reason: `Exceeds daily budget cap of $${dailyBudgetCapUsd}` }
    }

    if (amountUsd > requireApprovalAboveUsd) {
      return {
        allowed: false,
        reason: `Requires human approval for purchases above $${requireApprovalAboveUsd}`,
      }
    }

    const categoryLower = category.toLowerCase()
    for (const blocked of neverBuy) {
      if (categoryLower.includes(blocked.toLowerCase())) {
        return { allowed: false, reason: `Category "${category}" is blocked` }
      }
    }

    return { allowed: true }
  }

  /**
   * Validate a full agent decision against permissions
   */
  validateDecision(decision: AgentDecision): AgentDecision {
    if (!decision.withinPermissions) {
      return { ...decision, requiresHumanApproval: true }
    }
    return decision
  }

  /**
   * Check if a given escalation trigger applies to a situation
   */
  shouldEscalate(situation: string): boolean {
    const lowerSituation = situation.toLowerCase()
    return this.permissions.meetings.escalateIf.some(trigger =>
      lowerSituation.includes(trigger.toLowerCase())
    )
  }
}
