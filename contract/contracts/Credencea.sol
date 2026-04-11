// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IERC5192.sol";

/**
 * @title Credencea
 * @notice Issues tamper-proof academic credentials as Soulbound Tokens (ERC-5192).
 *
 * v2 additions:
 *  - Institution struct stores abbrev (e.g. "MIT") used as certificate ID prefix
 *  - Institution struct stores themeColor hex for per-institution card branding
 *  - Wallet recovery: institution can migrate a token to a new wallet after off-chain
 *    identity verification; old token is burned, new one minted preserving metadata
 *  - Institution recovery: owner can replace a compromised institution wallet
 *  - STUDENTS CANNOT REVOKE — only the issuing institution or contract owner may revoke
 *
 * Security hardening (all v1 controls retained):
 *  - ReentrancyGuard, Pausable, input validation, rate limiting, revocation window,
 *    two-step ownership, batch cap, custom errors
 */
contract Credencea is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable, IERC5192 {

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MAX_URI_LENGTH = 256;
    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public constant DEFAULT_DAILY_CAP = 200;
    uint256 public constant REVOCATION_WINDOW = 30 days;

    /// @dev Max length of institution abbreviation (e.g. "MIT", "OXFD", "HARV")
    uint256 public constant MAX_ABBREV_LENGTH = 8;

    // ─── State ────────────────────────────────────────────────────────────────

    uint256 private _tokenIdCounter;

    address public pendingOwner;

    struct Institution {
        bool active;
        string name;
        string abbrev;        // Short prefix for cert IDs: "MIT", "OXFD", "STAN"
        string themeColor;    // Hex color string e.g. "#7c3aed" for institution branding
        string accentColor;   // Secondary accent color e.g. "#a78bfa"
        uint256 addedAt;
        uint256 dailyCap;
        uint256 dailyIssuedCount;
        uint256 dailyWindowStart;
    }
    mapping(address => Institution) public institutions;

    /// @dev Reverse mapping: abbrev → institution address (to enforce uniqueness)
    mapping(bytes32 => address) private _abbrevToInstitution;

    struct CertRecord {
        address issuer;
        address recipient;
        uint256 issuedAt;
        bool revoked;
        bool revocationOverride;
    }
    mapping(uint256 => CertRecord) private _certs;

    mapping(address => uint256[]) private _recipientTokens;

    /// @dev Pending wallet recovery requests: oldWallet → (newWallet, tokenId[])
    struct RecoveryRequest {
        address newWallet;
        uint256 requestedAt;
        bool active;
    }
    /// @dev Maps old recipient address to a pending recovery request
    mapping(address => RecoveryRequest) public recoveryRequests;

    /// @dev Recovery cooldown — institution must wait before executing after requesting
    uint256 public constant RECOVERY_DELAY = 48 hours;

    // ─── Events ───────────────────────────────────────────────────────────────

    event InstitutionAdded(address indexed institution, string name, string abbrev, uint256 dailyCap);
    event InstitutionRemoved(address indexed institution);
    event InstitutionCapUpdated(address indexed institution, uint256 newCap);
    event InstitutionThemeUpdated(address indexed institution, string themeColor, string accentColor);
    event InstitutionWalletReplaced(address indexed oldWallet, address indexed newWallet);
    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed institution,
        address indexed recipient,
        string metadataURI,
        uint256 issuedAt
    );
    event CertificateRevoked(uint256 indexed tokenId, address indexed revokedBy);
    event RevocationOverrideGranted(uint256 indexed tokenId);
    event RecoveryRequested(address indexed oldWallet, address indexed newWallet, address indexed requestedBy);
    event RecoveryExecuted(address indexed oldWallet, address indexed newWallet, uint256[] oldTokenIds, uint256[] newTokenIds);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);

    error NotAnInstitution();
    error AlreadyInstitution();
    error SoulboundCannotTransfer();
    error TokenDoesNotExist();
    error TokenAlreadyRevoked();
    error NotTokenIssuer();
    error ZeroAddress();
    error EmptyString();
    error URITooLong();
    error BatchTooLarge();
    error DailyCapExceeded(uint256 issued, uint256 cap);
    error RevocationWindowExpired(uint256 issuedAt, uint256 window);
    error NotPendingOwner();
    error ArrayLengthMismatch();
    error AbbrevTooLong();
    error AbbrevAlreadyTaken();
    error RecoveryNotActive();
    error RecoveryCooldownNotMet();
    error NotTokenRecipient();
    error SameAddress();

    modifier onlyInstitution() {
        if (!institutions[msg.sender].active) revert NotAnInstitution();
        _;
    }

    modifier tokenExists(uint256 tokenId) {
        if (!_exists(tokenId)) revert TokenDoesNotExist();
        _;
    }


    constructor()
        ERC721("Credencea Credential", "CRED")
        Ownable(msg.sender)
    {}


    function transferOwnership(address newOwner) public override onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner(), newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        pendingOwner = address(0);
        _transferOwnership(msg.sender);
    }


    function pause() external onlyOwner {
        _pause();
        emit ContractPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    function addInstitution(
        address institution,
        string calldata name,
        string calldata abbrev,
        string calldata themeColor,
        string calldata accentColor,
        uint256 dailyCap
    ) external onlyOwner {
        if (institution == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0) revert EmptyString();
        if (bytes(abbrev).length == 0) revert EmptyString();
        if (bytes(abbrev).length > MAX_ABBREV_LENGTH) revert AbbrevTooLong();
        if (institutions[institution].active) revert AlreadyInstitution();

        bytes32 abbrevKey = keccak256(bytes(abbrev));
        if (_abbrevToInstitution[abbrevKey] != address(0)) revert AbbrevAlreadyTaken();

        uint256 cap = dailyCap == 0 ? DEFAULT_DAILY_CAP : dailyCap;
        institutions[institution] = Institution({
            active: true,
            name: name,
            abbrev: abbrev,
            themeColor: themeColor,
            accentColor: accentColor,
            addedAt: block.timestamp,
            dailyCap: cap,
            dailyIssuedCount: 0,
            dailyWindowStart: block.timestamp
        });
        _abbrevToInstitution[abbrevKey] = institution;

        emit InstitutionAdded(institution, name, abbrev, cap);
    }

    function removeInstitution(address institution) external onlyOwner {
        if (!institutions[institution].active) revert NotAnInstitution();
        bytes32 abbrevKey = keccak256(bytes(institutions[institution].abbrev));
        delete _abbrevToInstitution[abbrevKey];
        institutions[institution].active = false;
        emit InstitutionRemoved(institution);
    }

    function setInstitutionCap(address institution, uint256 newCap) external onlyOwner {
        if (!institutions[institution].active) revert NotAnInstitution();
        institutions[institution].dailyCap = newCap == 0 ? DEFAULT_DAILY_CAP : newCap;
        emit InstitutionCapUpdated(institution, institutions[institution].dailyCap);
    }

 
    function updateTheme(string calldata themeColor, string calldata accentColor)
        external onlyInstitution
    {
        institutions[msg.sender].themeColor = themeColor;
        institutions[msg.sender].accentColor = accentColor;
        emit InstitutionThemeUpdated(msg.sender, themeColor, accentColor);
    }


    function replaceInstitutionWallet(address oldWallet, address newWallet)
        external onlyOwner
    {
        if (newWallet == address(0)) revert ZeroAddress();
        if (oldWallet == newWallet) revert SameAddress();
        if (!institutions[oldWallet].active) revert NotAnInstitution();
        if (institutions[newWallet].active) revert AlreadyInstitution();

        institutions[newWallet] = institutions[oldWallet];
        institutions[oldWallet].active = false;

        emit InstitutionWalletReplaced(oldWallet, newWallet);
    }


    function requestRecovery(address oldWallet, address newWallet)
        external nonReentrant whenNotPaused onlyInstitution
    {
        if (oldWallet == address(0) || newWallet == address(0)) revert ZeroAddress();
        if (oldWallet == newWallet) revert SameAddress();

        recoveryRequests[oldWallet] = RecoveryRequest({
            newWallet: newWallet,
            requestedAt: block.timestamp,
            active: true
        });

        emit RecoveryRequested(oldWallet, newWallet, msg.sender);
    }

    function executeRecovery(address oldWallet, uint256[] calldata tokenIds)
        external nonReentrant whenNotPaused onlyInstitution
    {
        RecoveryRequest storage req = recoveryRequests[oldWallet];
        if (!req.active) revert RecoveryNotActive();
        if (block.timestamp < req.requestedAt + RECOVERY_DELAY) revert RecoveryCooldownNotMet();

        address newWallet = req.newWallet;
        req.active = false;

        uint256[] memory newTokenIds = new uint256[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; ) {
            uint256 oldId = tokenIds[i];
            if (!_exists(oldId)) revert TokenDoesNotExist();

            CertRecord storage cert = _certs[oldId];
            if (cert.issuer != msg.sender) revert NotTokenIssuer();
            if (cert.recipient != oldWallet) revert NotTokenRecipient();

            // Snapshot metadata before burning
            string memory uri = tokenURI(oldId);
            bool wasRevoked = cert.revoked;

            // Burn old token
            _burn(oldId);

            // Mint new token to new wallet with same metadata
            uint256 newId = ++_tokenIdCounter;
            _safeMint(newWallet, newId);
            _setTokenURI(newId, uri);

            _certs[newId] = CertRecord({
                issuer: msg.sender,
                recipient: newWallet,
                issuedAt: cert.issuedAt, // preserve original issue date
                revoked: wasRevoked,
                revocationOverride: false
            });
            _recipientTokens[newWallet].push(newId);

            emit Locked(newId);
            emit CertificateIssued(newId, msg.sender, newWallet, uri, cert.issuedAt);

            newTokenIds[i] = newId;
            unchecked { ++i; }
        }

        emit RecoveryExecuted(oldWallet, newWallet, tokenIds, newTokenIds);
    }

    function _checkAndIncrementRateLimit(uint256 count) internal {
        Institution storage inst = institutions[msg.sender];
        uint256 cap = inst.dailyCap == 0 ? DEFAULT_DAILY_CAP : inst.dailyCap;
        if (block.timestamp >= inst.dailyWindowStart + 1 days) {
            inst.dailyIssuedCount = 0;
            inst.dailyWindowStart = block.timestamp;
        }
        uint256 newTotal = inst.dailyIssuedCount + count;
        if (newTotal > cap) revert DailyCapExceeded(inst.dailyIssuedCount, cap);
        inst.dailyIssuedCount = newTotal;
    }


    function issueCertificate(
        address recipient,
        string calldata metadataURI
    ) external nonReentrant whenNotPaused onlyInstitution returns (uint256) {
        if (recipient == address(0)) revert ZeroAddress();
        if (bytes(metadataURI).length == 0) revert EmptyString();
        if (bytes(metadataURI).length > MAX_URI_LENGTH) revert URITooLong();
        _checkAndIncrementRateLimit(1);
        return _mintCert(recipient, metadataURI);
    }

    function issueBatch(
        address[] calldata recipients,
        string[] calldata metadataURIs
    ) external nonReentrant whenNotPaused onlyInstitution returns (uint256[] memory tokenIds) {
        uint256 count = recipients.length;
        if (count == 0 || count > MAX_BATCH_SIZE) revert BatchTooLarge();
        if (count != metadataURIs.length) revert ArrayLengthMismatch();
        _checkAndIncrementRateLimit(count);
        tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; ) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (bytes(metadataURIs[i]).length == 0) revert EmptyString();
            if (bytes(metadataURIs[i]).length > MAX_URI_LENGTH) revert URITooLong();
            tokenIds[i] = _mintCert(recipients[i], metadataURIs[i]);
            unchecked { ++i; }
        }
    }

    function _mintCert(address recipient, string calldata metadataURI)
        internal returns (uint256 tokenId)
    {
        tokenId = ++_tokenIdCounter;
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, metadataURI);
        _certs[tokenId] = CertRecord({
            issuer: msg.sender,
            recipient: recipient,
            issuedAt: block.timestamp,
            revoked: false,
            revocationOverride: false
        });
        _recipientTokens[recipient].push(tokenId);
        emit Locked(tokenId);
        emit CertificateIssued(tokenId, msg.sender, recipient, metadataURI, block.timestamp);
    }

    function revokeCertificate(uint256 tokenId)
        external nonReentrant whenNotPaused tokenExists(tokenId)
    {
        CertRecord storage cert = _certs[tokenId];
        if (cert.revoked) revert TokenAlreadyRevoked();
    
        if (cert.issuer != msg.sender) revert NotTokenIssuer();

        bool withinWindow = block.timestamp <= cert.issuedAt + REVOCATION_WINDOW;
        if (!withinWindow && !cert.revocationOverride) {
            revert RevocationWindowExpired(cert.issuedAt, REVOCATION_WINDOW);
        }
        cert.revoked = true;
        emit CertificateRevoked(tokenId, msg.sender);
    }

    function grantRevocationOverride(uint256 tokenId)
        external onlyOwner tokenExists(tokenId)
    {
        _certs[tokenId].revocationOverride = true;
        emit RevocationOverrideGranted(tokenId);
    }

    function forceRevoke(uint256 tokenId)
        external onlyOwner nonReentrant tokenExists(tokenId)
    {
        CertRecord storage cert = _certs[tokenId];
        if (cert.revoked) revert TokenAlreadyRevoked();
        cert.revoked = true;
        emit CertificateRevoked(tokenId, msg.sender);
    }


    function getCertificate(uint256 tokenId) external view returns (
        address issuer,
        string memory issuerName,
        string memory issuerAbbrev,
        string memory issuerThemeColor,
        string memory issuerAccentColor,
        address recipient,
        string memory metadataURI,
        bool revoked,
        bool exists,
        uint256 issuedAt
    ) {
        exists = _exists(tokenId);
        if (!exists) return (address(0), "", "", "", "", address(0), "", false, false, 0);
        CertRecord storage cert = _certs[tokenId];
        Institution storage inst = institutions[cert.issuer];
        issuer = cert.issuer;
        issuerName = inst.name;
        issuerAbbrev = inst.abbrev;
        issuerThemeColor = inst.themeColor;
        issuerAccentColor = inst.accentColor;
        recipient = cert.recipient;
        metadataURI = tokenURI(tokenId);
        revoked = cert.revoked;
        issuedAt = cert.issuedAt;
    }

  
    function getCertDisplayId(uint256 tokenId) external view tokenExists(tokenId) returns (string memory) {
        string memory abbrev = institutions[_certs[tokenId].issuer].abbrev;
        return string(abi.encodePacked(abbrev, "-", _uint256ToString(tokenId, 4)));
    }

    function getTokensByRecipient(address recipient)
        external view returns (uint256[] memory)
    {
        return _recipientTokens[recipient];
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function getInstitution(address institution) external view returns (
        bool active, string memory name, string memory abbrev,
        string memory themeColor, string memory accentColor,
        uint256 addedAt, uint256 dailyCap, uint256 dailyIssuedCount
    ) {
        Institution storage inst = institutions[institution];
        active = inst.active;
        name = inst.name;
        abbrev = inst.abbrev;
        themeColor = inst.themeColor;
        accentColor = inst.accentColor;
        addedAt = inst.addedAt;
        dailyCap = inst.dailyCap == 0 ? DEFAULT_DAILY_CAP : inst.dailyCap;
        dailyIssuedCount = inst.dailyIssuedCount;
    }


    function locked(uint256 tokenId) external view override tokenExists(tokenId) returns (bool) {
        return true;
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721URIStorage) returns (bool)
    {
        return interfaceId == type(IERC5192).interfaceId || super.supportsInterface(interfaceId);
    }


    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert SoulboundCannotTransfer();
        return super._update(to, tokenId, auth);
    }


    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function _uint256ToString(uint256 value, uint8 minDigits) internal pure returns (string memory) {
        bytes memory digits = new bytes(20);
        uint8 len = 0;
        if (value == 0) {
            digits[len++] = "0";
        } else {
            uint256 temp = value;
            while (temp != 0) {
                digits[len++] = bytes1(uint8(48 + (temp % 10)));
                temp /= 10;
            }
            // reverse
            for (uint8 i = 0; i < len / 2; i++) {
                (digits[i], digits[len - 1 - i]) = (digits[len - 1 - i], digits[i]);
            }
        }
        // zero-pad to minDigits
        if (len < minDigits) {
            uint8 pad = minDigits - len;
            bytes memory padded = new bytes(minDigits);
            for (uint8 i = 0; i < pad; i++) padded[i] = "0";
            for (uint8 i = 0; i < len; i++) padded[pad + i] = digits[i];
            return string(padded);
        }
        bytes memory result = new bytes(len);
        for (uint8 i = 0; i < len; i++) result[i] = digits[i];
        return string(result);
    }
}
