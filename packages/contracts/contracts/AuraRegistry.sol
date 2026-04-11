// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuraRegistry
 * @notice Central registry mapping Aura IDs to wallet addresses.
 *         Enables agent discovery and onchain lookup.
 */
contract AuraRegistry is Ownable {

    struct AgentRecord {
        string  auraId;
        address walletAddress;
        uint256 registeredAt;
        bool    isActive;
    }

    // auraId => AgentRecord
    mapping(string => AgentRecord) private _records;
    // wallet => auraId
    mapping(address => string) private _walletToAuraId;

    address public identityContract;

    event AgentRegistered(string indexed auraId, address indexed wallet);
    event AgentDeactivated(string indexed auraId);

    constructor(address _identityContract) Ownable(msg.sender) {
        identityContract = _identityContract;
    }

    // ── Registration ──────────────────────────────────────────────────────────

    function register(string calldata auraId, address wallet) external onlyOwner {
        require(_records[auraId].registeredAt == 0, "AuraRegistry: auraId already registered");
        require(bytes(_walletToAuraId[wallet]).length == 0, "AuraRegistry: wallet already registered");

        _records[auraId] = AgentRecord({
            auraId:       auraId,
            walletAddress: wallet,
            registeredAt: block.timestamp,
            isActive:     true
        });
        _walletToAuraId[wallet] = auraId;

        emit AgentRegistered(auraId, wallet);
    }

    function deactivate(string calldata auraId) external onlyOwner {
        require(_records[auraId].registeredAt != 0, "AuraRegistry: not found");
        _records[auraId].isActive = false;
        emit AgentDeactivated(auraId);
    }

    // ── View ──────────────────────────────────────────────────────────────────

    function resolve(string calldata auraId) external view returns (AgentRecord memory) {
        return _records[auraId];
    }

    function resolveWallet(address wallet) external view returns (string memory) {
        return _walletToAuraId[wallet];
    }

    function isActiveAgent(address wallet) external view returns (bool) {
        string memory auraId = _walletToAuraId[wallet];
        if (bytes(auraId).length == 0) return false;
        return _records[auraId].isActive;
    }
}
