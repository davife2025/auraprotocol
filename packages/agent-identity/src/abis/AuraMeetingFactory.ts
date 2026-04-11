export const AURA_MEETING_FACTORY_ABI = [
  {
    name: 'createMeeting',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'meetingId', type: 'string' },
      { name: 'participants', type: 'address[]' },
    ],
    outputs: [{ name: 'roomAddress', type: 'address' }],
  },
  {
    name: 'settleWithReputation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'meetingId', type: 'string' },
      { name: 'outcomeHash', type: 'bytes32' },
      { name: 'participants', type: 'address[]' },
      { name: 'scores', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    name: 'getMeetingRoom',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'meetingId', type: 'string' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'totalMeetings',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'recordCommitmentFulfilled',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentWallet', type: 'address' }],
    outputs: [],
  },
  {
    name: 'MeetingCreated',
    type: 'event',
    inputs: [
      { name: 'meetingId', type: 'string', indexed: true },
      { name: 'roomAddress', type: 'address', indexed: false },
      { name: 'creator', type: 'address', indexed: false },
    ],
  },
] as const
