import Stripe from 'stripe'
import { supabase } from '../plugins/supabase.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' })

export const PLANS = {
  FREE:     { priceId: null,                                name: 'Free',     agents: 1, meetingsPerMonth: 3  },
  PRO:      { priceId: process.env.STRIPE_PRO_PRICE_ID,     name: 'Pro',      agents: 1, meetingsPerMonth: -1 },
  BUSINESS: { priceId: process.env.STRIPE_BUSINESS_PRICE_ID,name: 'Business', agents: 5, meetingsPerMonth: -1 },
}

export class BillingService {
  async createCheckoutSession(userId: string, plan: 'PRO' | 'BUSINESS', successUrl: string, cancelUrl: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    if (error) throw new Error(error.message)

    const planConfig = PLANS[plan]

    const session = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items:           [{ price: planConfig.priceId!, quantity: 1 }],
      success_url:          successUrl,
      cancel_url:           cancelUrl,
      customer_email:       user.email ?? undefined,
      metadata:             { userId, plan },
    })

    return session
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object as any
      const { userId, plan } = sub.metadata ?? {}

      if (userId && plan) {
        const existing = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        const payload = {
          user_id:                userId,
          plan:                   plan,
          status:                 sub.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
          stripe_customer_id:     sub.customer,
          stripe_subscription_id: sub.id,
          current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
        }

        if (existing.data) {
          await supabase.from('subscriptions').update(payload).eq('user_id', userId)
        } else {
          await supabase.from('subscriptions').insert(payload)
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as any
      await supabase
        .from('subscriptions')
        .update({ status: 'CANCELLED' })
        .eq('stripe_subscription_id', sub.id)
    }

    return { received: true }
  }

  async getSubscription(userId: string) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }

  async checkPlanLimits(userId: string, feature: 'meetings' | 'agents') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .maybeSingle()

    const plan   = (sub?.plan ?? 'FREE') as keyof typeof PLANS
    const limits = PLANS[plan]

    if (feature === 'agents') {
      const { count } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      return (count ?? 0) < limits.agents
    }

    if (feature === 'meetings') {
      if (limits.meetingsPerMonth === -1) return true

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('meetings')
        .select('*, meeting_participants!inner(agents!inner(user_id))', { count: 'exact', head: true })
        .eq('meeting_participants.agents.user_id', userId)
        .gte('created_at', startOfMonth.toISOString())

      return (count ?? 0) < limits.meetingsPerMonth
    }

    return true
  }
}

export const billingService = new BillingService()