// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title IERC5192 — Minimal Soulbound Token standard
/// @dev EIP-5192: https://eips.ethereum.org/EIPS/eip-5192
interface IERC5192 {
    /// @notice Emitted when the locking status of a token is changed.
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);

    /// @notice Returns the locking status of a token.
    /// @dev Tokens minted under this contract are permanently locked.
    /// @param tokenId The token to check.
    function locked(uint256 tokenId) external view returns (bool);
}
