import Stripe from 'stripe'
import { prisma } from '../plugins/prisma.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' })

export const PLANS = {
  FREE: { priceId: null, name: 'Free', agents: 1, meetingsPerMonth: 3 },
  PRO: { priceId: process.env.STRIPE_PRO_PRICE_ID, name: 'Pro', agents: 1, meetingsPerMonth: -1 },
  BUSINESS: { priceId: process.env.STRIPE_BUSINESS_PRICE_ID, name: 'Business', agents: 5, meetingsPerMonth: -1 },
}

export class BillingService {
  async createCheckoutSession(userId: string, plan: 'PRO' | 'BUSINESS', successUrl: string, cancelUrl: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const planConfig = PLANS[plan]

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: planConfig.priceId!, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email ?? undefined,
      metadata: { userId, plan },
    })

    return session
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object as any
      const { userId, plan } = sub.metadata ?? {}
      if (userId && plan) {
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            plan: plan as any,
            status: sub.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
          create: {
            userId,
            plan: plan as any,
            status: 'ACTIVE',
            stripeCustomerId: sub.customer,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as any
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: 'CANCELLED' },
      })
    }

    return { received: true }
  }

  async getSubscription(userId: string) {
    return prisma.subscription.findFirst({ where: { userId } })
  }

  async checkPlanLimits(userId: string, feature: 'meetings' | 'agents') {
    const sub = await prisma.subscription.findFirst({ where: { userId } })
    const plan = (sub?.plan ?? 'FREE') as keyof typeof PLANS
    const limits = PLANS[plan]

    if (feature === 'agents') {
      const count = await prisma.agent.count({ where: { userId } })
      return count < limits.agents
    }

    if (feature === 'meetings') {
      if (limits.meetingsPerMonth === -1) return true
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
      const count = await prisma.meeting.count({
        where: { participants: { some: { agent: { userId } } }, createdAt: { gte: startOfMonth } },
      })
      return count < limits.meetingsPerMonth
    }

    return true
  }
}

export const billingService = new BillingService()
