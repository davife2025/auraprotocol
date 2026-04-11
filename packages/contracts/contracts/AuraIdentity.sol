// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AuraIdentity
 * @notice Soulbound (non-transferable) identity NFT for Aura Protocol agents.
 *         Each wallet can hold exactly one identity token.
 *         Tokens cannot be transferred — they are permanently bound to the minting wallet.
 */
contract AuraIdentity is Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    struct Identity {
        uint256 tokenId;
        string  auraId;
        string  metadataUri;
        bytes32 permissionsHash;
        uint256 mintedAt;
        bool    isRevoked;
    }

    // wallet => Identity
    mapping(address => Identity) private _identities;
    // tokenId => wallet
    mapping(uint256 => address)  private _tokenOwners;

    // Authorised minters (Aura Protocol API)
    mapping(address => bool) public authorisedMinters;

    // ── Events ────────────────────────────────────────────────────────────────

    event IdentityMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string  auraId
    );

    event IdentityRevoked(
        uint256 indexed tokenId,
        address indexed owner
    );

    event MetadataUpdated(
        uint256 indexed tokenId,
        string  newUri
    );

    event PermissionsUpdated(
        uint256 indexed tokenId,
        bytes32 newHash
    );

    event MinterAuthorised(address indexed minter);
    event MinterRevoked(address indexed minter);

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyMinter() {
        require(authorisedMinters[msg.sender] || msg.sender == owner(), "AuraIdentity: not authorised minter");
        _;
    }

    modifier hasNoIdentity(address wallet) {
        require(_identities[wallet].mintedAt == 0, "AuraIdentity: identity already exists");
        _;
    }

    modifier hasIdentity(address wallet) {
        require(_identities[wallet].mintedAt != 0, "AuraIdentity: no identity found");
        _;
    }

    modifier notRevoked(address wallet) {
        require(!_identities[wallet].isRevoked, "AuraIdentity: identity is revoked");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Minting ───────────────────────────────────────────────────────────────

    /**
     * @notice Mint a soulbound identity for a wallet.
     * @param to              Wallet address to mint to
     * @param auraId          Unique Aura Protocol identifier
     * @param metadataUri     IPFS URI for agent metadata
     * @param permissionsHash Keccak256 hash of the agent's permission schema
     */
    function mint(
        address to,
        string  calldata auraId,
        string  calldata metadataUri,
        bytes32 permissionsHash
    )
        external
        onlyMinter
        hasNoIdentity(to)
        returns (uint256 tokenId)
    {
        _tokenIdCounter.increment();
        tokenId = _tokenIdCounter.current();

        _identities[to] = Identity({
            tokenId:         tokenId,
            auraId:          auraId,
            metadataUri:     metadataUri,
            permissionsHash: permissionsHash,
            mintedAt:        block.timestamp,
            isRevoked:       false
        });

        _tokenOwners[tokenId] = to;

        emit IdentityMinted(tokenId, to, auraId);
    }

    // ── Revocation ────────────────────────────────────────────────────────────

    /**
     * @notice Revoke an identity (owner emergency kill switch or user self-revoke).
     */
    function revoke(address wallet)
        external
        hasIdentity(wallet)
        notRevoked(wallet)
    {
        require(
            msg.sender == wallet || msg.sender == owner(),
            "AuraIdentity: not authorised to revoke"
        );

        _identities[wallet].isRevoked = true;
        emit IdentityRevoked(_identities[wallet].tokenId, wallet);
    }

    // ── Updates ───────────────────────────────────────────────────────────────

    function updateMetadata(address wallet, string calldata newUri)
        external
        onlyMinter
        hasIdentity(wallet)
        notRevoked(wallet)
    {
        _identities[wallet].metadataUri = newUri;
        emit MetadataUpdated(_identities[wallet].tokenId, newUri);
    }

    function updatePermissionsHash(address wallet, bytes32 newHash)
        external
        onlyMinter
        hasIdentity(wallet)
        notRevoked(wallet)
    {
        _identities[wallet].permissionsHash = newHash;
        emit PermissionsUpdated(_identities[wallet].tokenId, newHash);
    }

    // ── View ──────────────────────────────────────────────────────────────────

    function getIdentity(address wallet)
        external
        view
        returns (Identity memory)
    {
        return _identities[wallet];
    }

    function ownerOfToken(uint256 tokenId) external view returns (address) {
        return _tokenOwners[tokenId];
    }

    function hasValidIdentity(address wallet) external view returns (bool) {
        return _identities[wallet].mintedAt != 0 && !_identities[wallet].isRevoked;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    // ── Access Control ────────────────────────────────────────────────────────

    function authoriseMinter(address minter) external onlyOwner {
        authorisedMinters[minter] = true;
        emit MinterAuthorised(minter);
    }

    function revokeMinter(address minter) external onlyOwner {
        authorisedMinters[minter] = false;
        emit MinterRevoked(minter);
    }

    // ── Soulbound: Block transfers ─────────────────────────────────────────────

    // No transfer functions exist. Soulbound by design.
    // Attempting to implement ERC721 transfer would revert — we deliberately
    // do not inherit ERC721 to prevent any transfer mechanism.
}
