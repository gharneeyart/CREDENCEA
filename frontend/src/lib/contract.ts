export const CREDENCEA_ABI = [
  // Custom errors
  "error NotAnInstitution()",
  "error AlreadyInstitution()",
  "error SoulboundCannotTransfer()",
  "error TokenDoesNotExist()",
  "error TokenAlreadyRevoked()",
  "error NotTokenIssuer()",
  "error ZeroAddress()",
  "error EmptyString()",
  "error URITooLong()",
  "error BatchTooLarge()",
  "error DailyCapExceeded(uint256 issued, uint256 cap)",
  "error RevocationWindowExpired(uint256 issuedAt, uint256 window)",
  "error NotPendingOwner()",
  "error ArrayLengthMismatch()",
  "error AbbrevTooLong()",
  "error AbbrevAlreadyTaken()",
  "error RecoveryNotActive()",
  "error RecoveryCooldownNotMet()",
  "error NotTokenRecipient()",
  "error SameAddress()",

  // Institution management
  "function addInstitution(address institution, string name, string abbrev, string themeColor, string accentColor, uint256 dailyCap) external",
  "function removeInstitution(address institution) external",
  "function setInstitutionCap(address institution, uint256 newCap) external",
  "function updateTheme(string themeColor, string accentColor) external",
  "function replaceInstitutionWallet(address oldWallet, address newWallet) external",
  "function institutions(address) external view returns (bool active, string name, string abbrev, string themeColor, string accentColor, uint256 addedAt, uint256 dailyCap, uint256 dailyIssuedCount, uint256 dailyWindowStart)",
  "function getInstitution(address institution) external view returns (bool active, string name, string abbrev, string themeColor, string accentColor, uint256 addedAt, uint256 dailyCap, uint256 dailyIssuedCount)",

  // Issuance
  "function issueCertificate(address recipient, string metadataURI) external returns (uint256)",
  "function issueBatch(address[] recipients, string[] metadataURIs) external returns (uint256[])",

  // Recovery
  "function requestRecovery(address oldWallet, address newWallet) external",
  "function executeRecovery(address oldWallet, uint256[] tokenIds) external",
  "function recoveryRequests(address) external view returns (address newWallet, uint256 requestedAt, bool active)",

  // Revocation (institution + owner only — NOT students)
  "function revokeCertificate(uint256 tokenId) external",
  "function grantRevocationOverride(uint256 tokenId) external",
  "function forceRevoke(uint256 tokenId) external",

  // Views
  "function getCertificate(uint256 tokenId) external view returns (address issuer, string issuerName, string issuerAbbrev, string issuerThemeColor, string issuerAccentColor, address recipient, string metadataURI, bool revoked, bool exists, uint256 issuedAt)",
  "function getCertDisplayId(uint256 tokenId) external view returns (string)",
  "function getTokensByRecipient(address recipient) external view returns (uint256[])",
  "function totalSupply() external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function locked(uint256 tokenId) external view returns (bool)",
  "function owner() external view returns (address)",
  "function pendingOwner() external view returns (address)",
  "function paused() external view returns (bool)",

  // Admin
  "function pause() external",
  "function unpause() external",
  "function transferOwnership(address newOwner) external",
  "function acceptOwnership() external",

  // Events
  "event InstitutionAdded(address indexed institution, string name, string abbrev, uint256 dailyCap)",
  "event InstitutionRemoved(address indexed institution)",
  "event InstitutionWalletReplaced(address indexed oldWallet, address indexed newWallet)",
  "event CertificateIssued(uint256 indexed tokenId, address indexed institution, address indexed recipient, string metadataURI, uint256 issuedAt)",
  "event CertificateRevoked(uint256 indexed tokenId, address indexed revokedBy)",
  "event RecoveryRequested(address indexed oldWallet, address indexed newWallet, address indexed requestedBy)",
  "event RecoveryExecuted(address indexed oldWallet, address indexed newWallet, uint256[] oldTokenIds, uint256[] newTokenIds)",
  "event Locked(uint256 indexed tokenId)",
] as const;

export const CONTRACT_ADDRESS: string = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
export const CONTRACT_CONFIGURED = Boolean(import.meta.env.VITE_CONTRACT_ADDRESS);
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 11155111);
export const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";
