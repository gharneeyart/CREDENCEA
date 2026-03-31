import { expect } from "chai";
import { ethers } from "hardhat";
import { Credencea } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";


describe("Credencea", function () {
  let credencea: Credencea;
  let owner: SignerWithAddress, inst: SignerWithAddress, inst2: SignerWithAddress;
  let student: SignerWithAddress, stranger: SignerWithAddress;
  const URI = "ipfs://QmExample/metadata.json";
  const NAME = "Ambrose Alli University";
  const ABBREV = "AAU";

  beforeEach(async () => {
    [owner, inst, inst2, student, stranger] = await ethers.getSigners();
    const F = await ethers.getContractFactory("Credencea");
    credencea = await F.deploy();
    await credencea.waitForDeployment();
  });


  async function addInst(addr = inst.address, name = NAME, cap = 0, abbrev = ABBREV, themeColor = "#000000", accentColor = "#FFFFFF") {
    return credencea.addInstitution(addr, name, abbrev, themeColor, accentColor, cap);
  }
  async function issue(from = inst, to = student.address, uri = URI) {
    return credencea.connect(from).issueCertificate(to, uri);
  }

  // ─── Institution management ──────────────────────────────────────────────
  describe("Institution management", () => {
    it("owner can add institution with default cap", async () => {
      await expect(addInst()).to.emit(credencea, "InstitutionAdded").withArgs(inst.address, NAME,ABBREV, 200n);
      const i = await credencea.getInstitution(inst.address);
      expect(i.active).to.be.true;
      expect(i.dailyCap).to.equal(200n);
    });

    it("owner can add institution with custom cap", async () => {
      await expect(credencea.addInstitution(inst.address, NAME, ABBREV, "#000000", "#FFFFFF", 50)).to.emit(credencea, "InstitutionAdded").withArgs(inst.address, NAME, ABBREV, 50n);
      const i = await credencea.getInstitution(inst.address);
      expect(i.dailyCap).to.equal(50n);
    });

    it("rejects zero address", async () => {
      await expect(credencea.addInstitution(ethers.ZeroAddress, NAME, ABBREV, "#000000", "#FFFFFF", 0)).to.be.revertedWithCustomError(credencea, "ZeroAddress");
    });

    it("rejects empty name", async () => {
      await expect(credencea.addInstitution(inst.address, "", ABBREV, "#000000", "#FFFFFF", 0)).to.be.revertedWithCustomError(credencea, "EmptyString");
    });

    it("rejects duplicate institution", async () => {
      await addInst();
      await expect(addInst()).to.be.revertedWithCustomError(credencea, "AlreadyInstitution");
    });

    it("non-owner cannot add institution", async () => {
      await expect(credencea.connect(stranger).addInstitution(inst.address, NAME, ABBREV, "#000000", "#FFFFFF", 0))
        .to.be.revertedWithCustomError(credencea, "OwnableUnauthorizedAccount");
    });

    it("owner can remove institution", async () => {
      await addInst();
      await expect(credencea.removeInstitution(inst.address)).to.emit(credencea, "InstitutionRemoved").withArgs(inst.address);
      const i = await credencea.getInstitution(inst.address);
      expect(i.active).to.be.false;
    });

    it("owner can update cap", async () => {
      await addInst();
      await expect(credencea.setInstitutionCap(inst.address, 75)).to.emit(credencea, "InstitutionCapUpdated").withArgs(inst.address, 75n);
    });
  });

  // ─── Two-step ownership ──────────────────────────────────────────────────
  describe("Two-step ownership", () => {
    it("pending owner must call acceptOwnership", async () => {
      await credencea.transferOwnership(stranger.address);
      expect(await credencea.pendingOwner()).to.equal(stranger.address);
      await credencea.connect(stranger).acceptOwnership();
      expect(await credencea.owner()).to.equal(stranger.address);
    });

    it("non-pending-owner cannot accept", async () => {
      await credencea.transferOwnership(stranger.address);
      await expect(credencea.connect(inst).acceptOwnership()).to.be.revertedWithCustomError(credencea, "NotPendingOwner");
    });
  });

  // ─── Emergency pause ─────────────────────────────────────────────────────
  describe("Emergency pause", () => {
    beforeEach(() => addInst());

    it("owner can pause and unpause", async () => {
      await credencea.pause();
      expect(await credencea.paused()).to.be.true;
      await credencea.unpause();
      expect(await credencea.paused()).to.be.false;
    });

    it("issuance reverts when paused", async () => {
      await credencea.pause();
      await expect(issue()).to.be.revertedWithCustomError(credencea, "EnforcedPause");
    });

    it("revocation reverts when paused", async () => {
      await issue();
      await credencea.pause();
      await expect(credencea.connect(inst).revokeCertificate(1n)).to.be.revertedWithCustomError(credencea, "EnforcedPause");
    });
  });

  // ─── Issuance ────────────────────────────────────────────────────────────
  describe("Issuance", () => {
    beforeEach(() => addInst());

    it("institution issues certificate", async () => {
      await expect(issue()).to.emit(credencea, "CertificateIssued").and.emit(credencea, "Locked").withArgs(1n);
      expect(await credencea.ownerOf(1n)).to.equal(student.address);
    });

    it("rejects zero address recipient", async () => {
      await expect(issue(inst, ethers.ZeroAddress)).to.be.revertedWithCustomError(credencea, "ZeroAddress");
    });

    it("rejects empty URI", async () => {
      await expect(credencea.connect(inst).issueCertificate(student.address, "")).to.be.revertedWithCustomError(credencea, "EmptyString");
    });

    it("rejects URI over MAX_URI_LENGTH", async () => {
      const longURI = "ipfs://" + "a".repeat(300);
      await expect(credencea.connect(inst).issueCertificate(student.address, longURI)).to.be.revertedWithCustomError(credencea, "URITooLong");
    });

    it("non-institution cannot issue", async () => {
      await expect(credencea.connect(stranger).issueCertificate(student.address, URI)).to.be.revertedWithCustomError(credencea, "NotAnInstitution");
    });
  });

  // ─── Rate limiting ───────────────────────────────────────────────────────
  describe("Rate limiting", () => {
    it("respects daily cap", async () => {
      await credencea.addInstitution(inst.address, NAME, ABBREV, "#000000", "#FFFFFF", 2);
      await credencea.connect(inst).issueCertificate(student.address, URI);
      await credencea.connect(inst).issueCertificate(student.address, URI);
      await expect(credencea.connect(inst).issueCertificate(student.address, URI))
        .to.be.revertedWithCustomError(credencea, "DailyCapExceeded");
    });

    it("cap resets after 24 hours", async () => {
      await credencea.addInstitution(inst.address, NAME, ABBREV, "#000000", "#FFFFFF", 1);
      await credencea.connect(inst).issueCertificate(student.address, URI);
      await time.increase(24 * 60 * 60 + 1);
      await expect(credencea.connect(inst).issueCertificate(student.address, URI)).to.not.be.reverted;
    });
  });

  // ─── Batch issuance ──────────────────────────────────────────────────────
  describe("Batch issuance", () => {
    beforeEach(() => addInst());

    it("issues batch successfully", async () => {
      const recipients = [student.address, stranger.address];
      const uris = [URI, URI + "2"];
      const tx = await credencea.connect(inst).issueBatch(recipients, uris);
      const r = await tx.wait();
      expect(r).to.not.be.null;
      expect(await credencea.totalSupply()).to.equal(2n);
    });

    it("rejects mismatched arrays", async () => {
      await expect(credencea.connect(inst).issueBatch([student.address], [URI, URI]))
        .to.be.revertedWithCustomError(credencea, "ArrayLengthMismatch");
    });

    it("rejects batch over MAX_BATCH_SIZE", async () => {
      const recipients = Array(51).fill(student.address);
      const uris = Array(51).fill(URI);
      await expect(credencea.connect(inst).issueBatch(recipients, uris))
        .to.be.revertedWithCustomError(credencea, "BatchTooLarge");
    });
  });

  // ─── Soulbound ───────────────────────────────────────────────────────────
  describe("Soulbound", () => {
    beforeEach(async () => { await addInst(); await issue(); });

    it("locked() returns true", async () => { expect(await credencea.locked(1n)).to.be.true; });
    it("transferFrom reverts", async () => {
      await expect(credencea.connect(student).transferFrom(student.address, stranger.address, 1n))
        .to.be.revertedWithCustomError(credencea, "SoulboundCannotTransfer");
    });
    it("safeTransferFrom reverts", async () => {
      await expect(credencea.connect(student)["safeTransferFrom(address,address,uint256)"](student.address, stranger.address, 1n))
        .to.be.revertedWithCustomError(credencea, "SoulboundCannotTransfer");
    });
  });

  // ─── Revocation ──────────────────────────────────────────────────────────
  describe("Revocation", () => {
    beforeEach(async () => { await addInst(); await issue(); });

    it("issuer can revoke within window", async () => {
      await expect(credencea.connect(inst).revokeCertificate(1n))
        .to.emit(credencea, "CertificateRevoked").withArgs(1n, inst.address);
    });

    it("revocation fails after window without override", async () => {
      await time.increase(31 * 24 * 60 * 60);
      await expect(credencea.connect(inst).revokeCertificate(1n))
        .to.be.revertedWithCustomError(credencea, "RevocationWindowExpired");
    });

    it("owner override allows late revocation", async () => {
      await time.increase(31 * 24 * 60 * 60);
      await credencea.grantRevocationOverride(1n);
      await expect(credencea.connect(inst).revokeCertificate(1n)).to.not.be.reverted;
    });

    it("owner can force-revoke any token", async () => {
      await expect(credencea.forceRevoke(1n))
        .to.emit(credencea, "CertificateRevoked").withArgs(1n, owner.address);
    });

    it("non-issuer cannot revoke", async () => {
      await expect(credencea.connect(stranger).revokeCertificate(1n)).to.be.revertedWithCustomError(credencea, "NotTokenIssuer");
    });

    it("cannot revoke already-revoked token", async () => {
      await credencea.connect(inst).revokeCertificate(1n);
      await expect(credencea.connect(inst).revokeCertificate(1n)).to.be.revertedWithCustomError(credencea, "TokenAlreadyRevoked");
    });
  });

  // ─── View functions ──────────────────────────────────────────────────────
  describe("Views", () => {
    beforeEach(async () => { await addInst(); await issue(); await issue(); });

    it("getCertificate returns full data", async () => {
      const c = await credencea.getCertificate(1n);
      expect(c.issuer).to.equal(inst.address);
      expect(c.issuerName).to.equal(NAME);
      expect(c.recipient).to.equal(student.address);
      expect(c.exists).to.be.true;
      expect(c.revoked).to.be.false;
      expect(c.issuedAt).to.be.gt(0n);
    });

    it("getCertificate returns exists=false for missing token", async () => {
      const c = await credencea.getCertificate(999n);
      expect(c.exists).to.be.false;
    });

    it("getTokensByRecipient returns correct IDs", async () => {
      const ids = await credencea.getTokensByRecipient(student.address);
      expect(ids).to.deep.equal([1n, 2n]);
    });

    it("supportsInterface ERC-5192", async () => {
      expect(await credencea.supportsInterface("0xb45a3c0e")).to.be.true;
    });

    it("supportsInterface ERC-721", async () => {
      expect(await credencea.supportsInterface("0x80ac58cd")).to.be.true;
    });
  });
});
