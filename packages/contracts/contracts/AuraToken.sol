// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuraToken
 * @notice $AURA — the governance and utility token for Aura Protocol.
 *
 * Utility:
 *  - Pay for premium features at a discount
 *  - Stake to earn protocol fee share
 *  - Vote on protocol upgrades
 *  - Access exclusive Aura Rooms
 *  - Priority meeting execution
 */
contract AuraToken is ERC20, ERC20Burnable, Ownable {

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion $AURA

    // Allocation (% of max supply)
    uint256 public constant COMMUNITY_ALLOCATION   = 300_000_000 * 10**18; // 30%
    uint256 public constant FOUNDER_ALLOCATION     = 180_000_000 * 10**18; // 18%
    uint256 public constant INVESTOR_ALLOCATION    = 200_000_000 * 10**18; // 20%
    uint256 public constant ECOSYSTEM_ALLOCATION   = 200_000_000 * 10**18; // 20%
    uint256 public constant TREASURY_ALLOCATION    = 120_000_000 * 10**18; // 12%

    // Staking
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakeTimestamp;
    uint256 public totalStaked;

    // Protocol fee vault
    address public feeVault;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event FeeVaultUpdated(address indexed newVault);

    constructor(
        address communityWallet,
        address founderWallet,
        address investorWallet,
        address ecosystemWallet,
        address treasuryWallet
    ) ERC20("Aura Protocol", "AURA") Ownable(msg.sender) {
        require(
            COMMUNITY_ALLOCATION + FOUNDER_ALLOCATION + INVESTOR_ALLOCATION +
            ECOSYSTEM_ALLOCATION + TREASURY_ALLOCATION == MAX_SUPPLY,
            "AuraToken: allocation mismatch"
        );

        _mint(communityWallet,  COMMUNITY_ALLOCATION);
        _mint(founderWallet,    FOUNDER_ALLOCATION);
        _mint(investorWallet,   INVESTOR_ALLOCATION);
        _mint(ecosystemWallet,  ECOSYSTEM_ALLOCATION);
        _mint(treasuryWallet,   TREASURY_ALLOCATION);
    }

    // ── Staking ───────────────────────────────────────────────────────────────

    /**
     * @notice Stake $AURA to earn protocol fee share and unlock premium features.
     */
    function stake(uint256 amount) external {
        require(amount > 0, "AuraToken: amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "AuraToken: insufficient balance");

        _transfer(msg.sender, address(this), amount);
        stakedBalance[msg.sender] += amount;
        stakeTimestamp[msg.sender] = block.timestamp;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Unstake $AURA after a minimum lock period.
     */
    function unstake(uint256 amount) external {
        require(stakedBalance[msg.sender] >= amount, "AuraToken: insufficient staked");
        require(
            block.timestamp >= stakeTimestamp[msg.sender] + 7 days,
            "AuraToken: minimum stake period not met"
        );

        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    // ── Premium access ────────────────────────────────────────────────────────

    /**
     * @notice Check if a wallet has enough staked $AURA for Pro tier.
     */
    function hasProAccess(address wallet) external view returns (bool) {
        return stakedBalance[wallet] >= 1_000 * 10**18; // 1,000 $AURA
    }

    /**
     * @notice Check if a wallet has enough staked $AURA for Business tier.
     */
    function hasBusinessAccess(address wallet) external view returns (bool) {
        return stakedBalance[wallet] >= 10_000 * 10**18; // 10,000 $AURA
    }

    /**
     * @notice Check if a wallet has enough staked $AURA to enter a premium room.
     * @param requiredStake The stake threshold set by the room creator (in wei)
     */
    function hasPremiumRoomAccess(address wallet, uint256 requiredStake) external view returns (bool) {
        return stakedBalance[wallet] >= requiredStake;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setFeeVault(address _feeVault) external onlyOwner {
        feeVault = _feeVault;
        emit FeeVaultUpdated(_feeVault);
    }
}
