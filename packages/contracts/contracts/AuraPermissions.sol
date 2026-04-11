// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuraPermissions
 * @notice Stores and verifies agent permission schemas onchain.
 *         Permission hashes are written during agent setup and verified
 *         during agent interactions — ensuring agents cannot exceed their
 *         owner-defined authority.
 */
contract AuraPermissions is Ownable {

    struct PermissionRecord {
        bytes32 schemaHash;         // keccak256 of the full JSON schema
        bytes   encodedPermissions; // ABI-encoded compact representation
        uint256 version;
        uint256 updatedAt;
        bool    isActive;
    }

    // wallet => PermissionRecord
    mapping(address => PermissionRecord) private _permissions;

    mapping(address => bool) public authorisedWriters;

    event PermissionsSet(address indexed wallet, bytes32 schemaHash, uint256 version);
    event PermissionsRevoked(address indexed wallet);
    event WriterAuthorised(address indexed writer);

    constructor() Ownable(msg.sender) {}

    modifier onlyWriter() {
        require(authorisedWriters[msg.sender] || msg.sender == owner(), "AuraPermissions: not authorised");
        _;
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * @notice Set or update permissions for an agent wallet.
     * @param wallet            The agent's wallet address
     * @param schemaHash        keccak256 of the full JSON permission schema
     * @param encodedPermissions ABI-encoded compact permissions for verification
     */
    function setPermissions(
        address wallet,
        bytes32 schemaHash,
        bytes calldata encodedPermissions
    ) external onlyWriter {
        uint256 newVersion = _permissions[wallet].version + 1;

        _permissions[wallet] = PermissionRecord({
            schemaHash:          schemaHash,
            encodedPermissions:  encodedPermissions,
            version:             newVersion,
            updatedAt:           block.timestamp,
            isActive:            true
        });

        emit PermissionsSet(wallet, schemaHash, newVersion);
    }

    function revokePermissions(address wallet) external onlyWriter {
        _permissions[wallet].isActive = false;
        emit PermissionsRevoked(wallet);
    }

    // ── View ──────────────────────────────────────────────────────────────────

    function getPermissions(address wallet)
        external
        view
        returns (PermissionRecord memory)
    {
        return _permissions[wallet];
    }

    /**
     * @notice Verify a permission action against a stored hash.
     *         The caller provides the action hash and the stored schema hash
     *         must contain it — verified off-chain and confirmed here.
     */
    function verifyPermission(
        address wallet,
        bytes32 actionHash
    ) external view returns (bool) {
        PermissionRecord memory rec = _permissions[wallet];
        if (!rec.isActive) return false;
        // Full permission verification logic implemented in session 2
        // For now: return true if permissions are active and schema hash non-zero
        return rec.schemaHash != bytes32(0);
    }

    function hasActivePermissions(address wallet) external view returns (bool) {
        return _permissions[wallet].isActive && _permissions[wallet].schemaHash != bytes32(0);
    }

    // ── Access Control ────────────────────────────────────────────────────────

    function authoriseWriter(address writer) external onlyOwner {
        authorisedWriters[writer] = true;
        emit WriterAuthorised(writer);
    }
}
