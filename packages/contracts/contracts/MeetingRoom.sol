// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MeetingRoom
 * @notice Deployed per meeting — records participants, commitments, and
 *         settles the outcome hash onchain when the meeting ends.
 *         Created by the MeetingFactory contract.
 */
contract MeetingRoom {

    enum MeetingStatus { PENDING, ACTIVE, ENDED, SETTLED }

    struct Commitment {
        address agentWallet;
        string  commitment;
        string  commitmentType;
        bool    isAcknowledged;
        uint256 timestamp;
    }

    string      public meetingId;
    address     public creator;
    MeetingStatus public status;
    uint256     public createdAt;
    uint256     public startedAt;
    uint256     public endedAt;
    bytes32     public outcomeHash;

    address[]   public participants;
    mapping(address => bool) public isParticipant;
    Commitment[] private _commitments;

    event MeetingStarted(uint256 timestamp);
    event MeetingEnded(uint256 timestamp);
    event MeetingSettled(bytes32 outcomeHash);
    event CommitmentLogged(address indexed agentWallet, string commitment);
    event ParticipantAdded(address indexed agentWallet);

    modifier onlyCreator() {
        require(msg.sender == creator, "MeetingRoom: not creator");
        _;
    }

    modifier onlyParticipant() {
        require(isParticipant[msg.sender], "MeetingRoom: not participant");
        _;
    }

    modifier inStatus(MeetingStatus expected) {
        require(status == expected, "MeetingRoom: wrong status");
        _;
    }

    constructor(string memory _meetingId, address _creator) {
        meetingId  = _meetingId;
        creator    = _creator;
        status     = MeetingStatus.PENDING;
        createdAt  = block.timestamp;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    function addParticipant(address agentWallet)
        external
        onlyCreator
        inStatus(MeetingStatus.PENDING)
    {
        require(!isParticipant[agentWallet], "MeetingRoom: already participant");
        participants.push(agentWallet);
        isParticipant[agentWallet] = true;
        emit ParticipantAdded(agentWallet);
    }

    function start() external onlyCreator inStatus(MeetingStatus.PENDING) {
        status    = MeetingStatus.ACTIVE;
        startedAt = block.timestamp;
        emit MeetingStarted(startedAt);
    }

    function end() external onlyCreator inStatus(MeetingStatus.ACTIVE) {
        status  = MeetingStatus.ENDED;
        endedAt = block.timestamp;
        emit MeetingEnded(endedAt);
    }

    /**
     * @notice Settle the meeting by writing an immutable outcome hash.
     * @param _outcomeHash keccak256 of the full meeting transcript + commitments
     */
    function settle(bytes32 _outcomeHash)
        external
        onlyCreator
        inStatus(MeetingStatus.ENDED)
    {
        outcomeHash = _outcomeHash;
        status      = MeetingStatus.SETTLED;
        emit MeetingSettled(_outcomeHash);
    }

    // ── Commitments ───────────────────────────────────────────────────────────

    function logCommitment(
        address agentWallet,
        string calldata commitment,
        string calldata commitmentType
    ) external onlyCreator inStatus(MeetingStatus.ACTIVE) {
        _commitments.push(Commitment({
            agentWallet:     agentWallet,
            commitment:      commitment,
            commitmentType:  commitmentType,
            isAcknowledged:  false,
            timestamp:       block.timestamp
        }));
        emit CommitmentLogged(agentWallet, commitment);
    }

    function acknowledgeCommitment(uint256 index)
        external
        onlyParticipant
        inStatus(MeetingStatus.ACTIVE)
    {
        require(index < _commitments.length, "MeetingRoom: bad index");
        _commitments[index].isAcknowledged = true;
    }

    // ── View ──────────────────────────────────────────────────────────────────

    function getCommitments() external view returns (Commitment[] memory) {
        return _commitments;
    }

    function getParticipantCount() external view returns (uint256) {
        return participants.length;
    }

    function getSummary() external view returns (
        string memory id,
        MeetingStatus currentStatus,
        uint256 participantCount,
        uint256 commitmentCount,
        bytes32 outcome
    ) {
        return (meetingId, status, participants.length, _commitments.length, outcomeHash);
    }
}
