export const AURA_REPUTATION_ABI = [
  {
    name: 'getReputation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'walletAddress', type: 'address' }],
    outputs: [
      { name: 'overallScore', type: 'uint256' },
      { name: 'commitmentRate', type: 'uint256' },
      { name: 'meetingQuality', type: 'uint256' },
      { name: 'networkingScore', type: 'uint256' },
      { name: 'totalInteractions', type: 'uint256' },
      { name: 'lastUpdated', type: 'uint256' },
    ],
  },
  {
    name: 'recordInteraction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'walletAddress', type: 'address' },
      { name: 'interactionType', type: 'uint8' },
      { name: 'score', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'ReputationUpdated',
    type: 'event',
    inputs: [
      { name: 'walletAddress', type: 'address', indexed: true },
      { name: 'newScore', type: 'uint256', indexed: false },
    ],
  },
] as const
