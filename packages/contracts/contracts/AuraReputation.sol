// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuraReputation
 * @notice Immutable reputation ledger for Aura Protocol agents.
 *         Scores are written by the protocol — cannot be gamed by users.
 */
contract AuraReputation is Ownable {

    enum InteractionType {
        MEETING_COMPLETED,      // 0
        COMMITMENT_FULFILLED,   // 1
        COMMITMENT_BROKEN,      // 2
        CONNECTION_MADE,        // 3
        MEETING_NO_SHOW         // 4
    }

    struct ReputationRecord {
        uint256 overallScore;       // 0–100
        uint256 commitmentRate;     // 0–100 (% commitments fulfilled)
        uint256 meetingQuality;     // 0–100
        uint256 networkingScore;    // 0–100
        uint256 totalInteractions;
        uint256 lastUpdated;
    }

    mapping(address => ReputationRecord) private _reputation;

    // Authorised writers (Aura Protocol settlement contracts)
    mapping(address => bool) public authorisedWriters;

    event ReputationUpdated(address indexed wallet, uint256 newOverallScore);
    event InteractionRecorded(address indexed wallet, InteractionType iType, uint256 delta);
    event WriterAuthorised(address indexed writer);

    constructor() Ownable(msg.sender) {}

    modifier onlyWriter() {
        require(authorisedWriters[msg.sender] || msg.sender == owner(), "AuraReputation: not authorised");
        _;
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    function recordInteraction(
        address wallet,
        InteractionType iType,
        uint256 score
    ) external onlyWriter {
        ReputationRecord storage rep = _reputation[wallet];
        rep.totalInteractions++;
        rep.lastUpdated = block.timestamp;

        if (iType == InteractionType.MEETING_COMPLETED) {
            rep.meetingQuality = _weightedAvg(rep.meetingQuality, score, rep.totalInteractions);
        } else if (iType == InteractionType.COMMITMENT_FULFILLED) {
            rep.commitmentRate = _weightedAvg(rep.commitmentRate, 100, rep.totalInteractions);
        } else if (iType == InteractionType.COMMITMENT_BROKEN) {
            rep.commitmentRate = _weightedAvg(rep.commitmentRate, 0, rep.totalInteractions);
        } else if (iType == InteractionType.CONNECTION_MADE) {
            rep.networkingScore = _min(rep.networkingScore + 1, 100);
        } else if (iType == InteractionType.MEETING_NO_SHOW) {
            rep.meetingQuality = _weightedAvg(rep.meetingQuality, 0, rep.totalInteractions);
        }

        // Recalculate overall as weighted average of components
        rep.overallScore = (
            rep.commitmentRate * 40 +
            rep.meetingQuality  * 40 +
            rep.networkingScore * 20
        ) / 100;

        emit InteractionRecorded(wallet, iType, score);
        emit ReputationUpdated(wallet, rep.overallScore);
    }

    // ── View ──────────────────────────────────────────────────────────────────

    function getReputation(address wallet)
        external
        view
        returns (ReputationRecord memory)
    {
        return _reputation[wallet];
    }

    function getOverallScore(address wallet) external view returns (uint256) {
        return _reputation[wallet].overallScore;
    }

    // ── Access Control ────────────────────────────────────────────────────────

    function authoriseWriter(address writer) external onlyOwner {
        authorisedWriters[writer] = true;
        emit WriterAuthorised(writer);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _weightedAvg(uint256 current, uint256 newVal, uint256 n) internal pure returns (uint256) {
        if (n == 0) return newVal;
        return (current * (n - 1) + newVal) / n;
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
