// AuraIdentity.sol ABI — populated after Session 2 contract deployment
// This is the soulbound identity NFT contract on Monad

export const AURA_IDENTITY_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'metadataUri', type: 'string' },
      { name: 'permissionsHash', type: 'bytes32' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  {
    name: 'revoke',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getIdentity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'walletAddress', type: 'address' }],
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'auraId', type: 'string' },
      { name: 'metadataUri', type: 'string' },
      { name: 'mintedAt', type: 'uint256' },
      { name: 'isRevoked', type: 'bool' },
    ],
  },
  {
    name: 'IdentityMinted',
    type: 'event',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'auraId', type: 'string', indexed: false },
    ],
  },
  {
    name: 'IdentityRevoked',
    type: 'event',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
    ],
  },
] as const
