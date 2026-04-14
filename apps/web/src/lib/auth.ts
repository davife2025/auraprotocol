import type { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import { Keypair, StrKey } from '@stellar/stellar-sdk'

export function verifyStellarSignature(params: {
  publicKey: string
  message:   string
  signature: string
}): boolean {
  try {
    if (!StrKey.isValidEd25519PublicKey(params.publicKey)) return false
    const keypair  = Keypair.fromPublicKey(params.publicKey)
    const msgBytes = Buffer.from(params.message)
    const sigBytes = Buffer.from(params.signature, 'base64')
    return keypair.verify(msgBytes, sigBytes)
  } catch {
    return false
  }
}

export const authOptions: NextAuthOptions = {
  adapter:  PrismaAdapter(prisma),
  session:  { strategy: 'jwt' },
  pages:    { signIn: '/login', error: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Stellar Wallet',
      credentials: {
        publicKey: { label: 'Stellar Public Key', type: 'text' },
        signature: { label: 'Signature',          type: 'text' },
        message:   { label: 'Message',            type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.publicKey || !credentials?.signature || !credentials?.message) return null

        const isDev   = process.env.NODE_ENV === 'development' && credentials.message === 'dev'
        const isValid = isDev || verifyStellarSignature(credentials as any)
        if (!isValid) return null

        const user = await prisma.user.upsert({
          where:  { walletAddress: credentials.publicKey },
          update: { lastLoginAt: new Date() },
          create: { walletAddress: credentials.publicKey, lastLoginAt: new Date() },
        })

        return { id: user.id, walletAddress: user.walletAddress }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId        = user.id
        token.walletAddress = (user as any).walletAddress
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id            = token.userId as string
        session.user.walletAddress = token.walletAddress as string
      }
      return session
    },
  },
}
