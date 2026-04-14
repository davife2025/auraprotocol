import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { verifyMessage } from 'viem'
import { supabase } from '../plugins/supabase.js'

const SignInSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature:     z.string(),
  message:       z.string(),
})

export async function authRoutes(server: FastifyInstance) {
  // GET /auth/nonce — get a sign-in nonce
  server.get('/nonce', async (request) => {
    const { address } = request.query as { address: string }
    const nonce   = crypto.randomUUID()
    const message = [
      'Sign in to Aura Protocol',
      '',
      `Address: ${address}`,
      `Nonce: ${nonce}`,
      `Issued: ${new Date().toISOString()}`,
    ].join('\n')
    return { nonce, message }
  })

  // POST /auth/signin — verify signature and return JWT
  server.post('/signin', async (request, reply) => {
    const { walletAddress, signature, message } = SignInSchema.parse(request.body)

    const isValid = await verifyMessage({
      address:   walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    }).catch(() => false)

    if (!isValid) return reply.status(401).send({ error: 'Invalid signature' })

    // Upsert user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('wallet_address', walletAddress)
      .maybeSingle()

    let userId: string

    if (existingUser) {
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', existingUser.id)
      userId = existingUser.id
    } else {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({ wallet_address: walletAddress, last_login_at: new Date().toISOString() })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      userId = newUser.id
    }

    const token = server.jwt.sign(
      { userId, walletAddress },
      { expiresIn: '7d' }
    )

    return { token, user: { id: userId, walletAddress } }
  })

  // GET /auth/me — get current user
  server.get('/me', { preHandler: [server.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        agents(id, name, status, reputation_score),
        subscriptions(plan, status)
      `)
      .eq('id', userId)
      .single()

    if (error) throw new Error(error.message)
    return user
  })
}