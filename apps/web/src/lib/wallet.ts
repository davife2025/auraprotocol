import { verifyMessage } from 'viem'

interface VerifyParams {
  address: string
  signature: string
  message: string
}

export async function verifyWalletSignature({ address, signature, message }: VerifyParams): Promise<boolean> {
  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })
    return valid
  } catch {
    return false
  }
}

export function buildSignInMessage(address: string, nonce: string): string {
  return [
    'Sign in to Aura Protocol',
    '',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n')
}
