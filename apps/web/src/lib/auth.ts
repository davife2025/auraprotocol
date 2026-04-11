import type { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import { verifyWalletSignature } from './wallet'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Wallet',
      credentials: {
        address: { label: 'Wallet Address', type: 'text' },
        signature: { label: 'Signature', type: 'text' },
        message: { label: 'Message', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.address || !credentials?.signature || !credentials?.message) {
          return null
        }
        const isValid = await verifyWalletSignature({
          address: credentials.address,
          signature: credentials.signature,
          message: credentials.message,
        })
        if (!isValid) return null

        const user = await prisma.user.upsert({
          where: { walletAddress: credentials.address },
          update: { lastLoginAt: new Date() },
          create: {
            walletAddress: credentials.address,
            lastLoginAt: new Date(),
          },
        })
        return { id: user.id, walletAddress: user.walletAddress }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.walletAddress = (user as any).walletAddress
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.user.walletAddress = token.walletAddress as string
      }
      return session
    },
  },
}
