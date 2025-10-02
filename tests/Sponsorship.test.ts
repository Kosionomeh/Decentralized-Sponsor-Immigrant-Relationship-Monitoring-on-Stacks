import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_MAX_DEPENDENTS = 101;
const ERR_INVALID_SUPPORT_AMOUNT = 102;
const ERR_INVALID_FREQUENCY = 103;
const ERR_INVALID_PENALTY_RATE = 104;
const ERR_INVALID_VOTING_THRESHOLD = 105;
const ERR_AGREEMENT_ALREADY_EXISTS = 106;
const ERR_AGREEMENT_NOT_FOUND = 107;
const ERR_INVALID_AGREEMENT_TYPE = 115;
const ERR_INVALID_INTEREST_RATE = 116;
const ERR_INVALID_GRACE_PERIOD = 117;
const ERR_INVALID_LOCATION = 118;
const ERR_INVALID_CURRENCY = 119;
const ERR_INVALID_MIN_SUPPORT = 110;
const ERR_INVALID_MAX_OBLIGATION = 111;
const ERR_MAX_AGREEMENTS_EXCEEDED = 114;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_AUTHORITY_NOT_VERIFIED = 109;

interface Agreement {
  name: string;
  maxDependents: number;
  supportAmount: number;
  frequency: number;
  penaltyRate: number;
  votingThreshold: number;
  timestamp: number;
  sponsor: string;
  immigrant: string;
  agreementType: string;
  interestRate: number;
  gracePeriod: number;
  location: string;
  currency: string;
  status: boolean;
  minSupport: number;
  maxObligation: number;
}

interface AgreementUpdate {
  updateName: string;
  updateMaxDependents: number;
  updateSupportAmount: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class SponsorshipMock {
  state: {
    nextAgreementId: number;
    maxAgreements: number;
    creationFee: number;
    authorityContract: string | null;
    agreements: Map<number, Agreement>;
    agreementUpdates: Map<number, AgreementUpdate>;
    agreementsByName: Map<string, number>;
  } = {
    nextAgreementId: 0,
    maxAgreements: 1000,
    creationFee: 1000,
    authorityContract: null,
    agreements: new Map(),
    agreementUpdates: new Map(),
    agreementsByName: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextAgreementId: 0,
      maxAgreements: 1000,
      creationFee: 1000,
      authorityContract: null,
      agreements: new Map(),
      agreementUpdates: new Map(),
      agreementsByName: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  createAgreement(
    name: string,
    maxDependents: number,
    supportAmount: number,
    frequency: number,
    penaltyRate: number,
    votingThreshold: number,
    immigrant: string,
    agreementType: string,
    interestRate: number,
    gracePeriod: number,
    location: string,
    currency: string,
    minSupport: number,
    maxObligation: number
  ): Result<number> {
    if (this.state.nextAgreementId >= this.state.maxAgreements) return { ok: false, value: ERR_MAX_AGREEMENTS_EXCEEDED };
    if (!name || name.length > 100) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    if (maxDependents <= 0 || maxDependents > 50) return { ok: false, value: ERR_INVALID_MAX_DEPENDENTS };
    if (supportAmount <= 0) return { ok: false, value: ERR_INVALID_SUPPORT_AMOUNT };
    if (frequency <= 0) return { ok: false, value: ERR_INVALID_FREQUENCY };
    if (penaltyRate > 100) return { ok: false, value: ERR_INVALID_PENALTY_RATE };
    if (votingThreshold <= 0 || votingThreshold > 100) return { ok: false, value: ERR_INVALID_VOTING_THRESHOLD };
    if (!["family", "employment", "community"].includes(agreementType)) return { ok: false, value: ERR_INVALID_AGREEMENT_TYPE };
    if (interestRate > 20) return { ok: false, value: ERR_INVALID_INTEREST_RATE };
    if (gracePeriod > 30) return { ok: false, value: ERR_INVALID_GRACE_PERIOD };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (minSupport <= 0) return { ok: false, value: ERR_INVALID_MIN_SUPPORT };
    if (maxObligation <= 0) return { ok: false, value: ERR_INVALID_MAX_OBLIGATION };
    if (!this.isVerifiedAuthority(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.agreementsByName.has(name)) return { ok: false, value: ERR_AGREEMENT_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextAgreementId;
    const agreement: Agreement = {
      name,
      maxDependents,
      supportAmount,
      frequency,
      penaltyRate,
      votingThreshold,
      timestamp: this.blockHeight,
      sponsor: this.caller,
      immigrant,
      agreementType,
      interestRate,
      gracePeriod,
      location,
      currency,
      status: true,
      minSupport,
      maxObligation,
    };
    this.state.agreements.set(id, agreement);
    this.state.agreementsByName.set(name, id);
    this.state.nextAgreementId++;
    return { ok: true, value: id };
  }

  getAgreement(id: number): Agreement | null {
    return this.state.agreements.get(id) || null;
  }

  updateAgreement(id: number, updateName: string, updateMaxDependents: number, updateSupportAmount: number): Result<boolean> {
    const agreement = this.state.agreements.get(id);
    if (!agreement) return { ok: false, value: false };
    if (agreement.sponsor !== this.caller) return { ok: false, value: false };
    if (!updateName || updateName.length > 100) return { ok: false, value: false };
    if (updateMaxDependents <= 0 || updateMaxDependents > 50) return { ok: false, value: false };
    if (updateSupportAmount <= 0) return { ok: false, value: false };
    if (this.state.agreementsByName.has(updateName) && this.state.agreementsByName.get(updateName) !== id) {
      return { ok: false, value: false };
    }

    const updated: Agreement = {
      ...agreement,
      name: updateName,
      maxDependents: updateMaxDependents,
      supportAmount: updateSupportAmount,
      timestamp: this.blockHeight,
    };
    this.state.agreements.set(id, updated);
    this.state.agreementsByName.delete(agreement.name);
    this.state.agreementsByName.set(updateName, id);
    this.state.agreementUpdates.set(id, {
      updateName,
      updateMaxDependents,
      updateSupportAmount,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getAgreementCount(): Result<number> {
    return { ok: true, value: this.state.nextAgreementId };
  }

  checkAgreementExistence(name: string): Result<boolean> {
    return { ok: true, value: this.state.agreementsByName.has(name) };
  }
}

describe("Sponsorship", () => {
  let contract: SponsorshipMock;

  beforeEach(() => {
    contract = new SponsorshipMock();
    contract.reset();
  });

  it("creates an agreement successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createAgreement(
      "Alpha",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const agreement = contract.getAgreement(0);
    expect(agreement?.name).toBe("Alpha");
    expect(agreement?.maxDependents).toBe(10);
    expect(agreement?.supportAmount).toBe(100);
    expect(agreement?.frequency).toBe(30);
    expect(agreement?.penaltyRate).toBe(5);
    expect(agreement?.votingThreshold).toBe(50);
    expect(agreement?.agreementType).toBe("family");
    expect(agreement?.interestRate).toBe(10);
    expect(agreement?.gracePeriod).toBe(7);
    expect(agreement?.location).toBe("VillageX");
    expect(agreement?.currency).toBe("STX");
    expect(agreement?.minSupport).toBe(50);
    expect(agreement?.maxObligation).toBe(1000);
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate agreement names", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createAgreement(
      "Alpha",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    const result = contract.createAgreement(
      "Alpha",
      20,
      200,
      60,
      10,
      60,
      "ST4IMMIGRANT",
      "employment",
      15,
      14,
      "CityY",
      "USD",
      100,
      2000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AGREEMENT_ALREADY_EXISTS);
  });

  it("rejects non-authorized caller", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const result = contract.createAgreement(
      "Beta",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("parses agreement name with Clarity", () => {
    const cv = stringUtf8CV("Gamma");
    expect(cv.value).toBe("Gamma");
  });

  it("rejects agreement creation without authority contract", () => {
    const result = contract.createAgreement(
      "NoAuth",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid max dependents", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createAgreement(
      "InvalidDependents",
      51,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MAX_DEPENDENTS);
  });

  it("rejects invalid support amount", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createAgreement(
      "InvalidSupport",
      10,
      0,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SUPPORT_AMOUNT);
  });

  it("rejects invalid agreement type", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createAgreement(
      "InvalidType",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "invalid",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AGREEMENT_TYPE);
  });

  it("updates an agreement successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createAgreement(
      "OldAgreement",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    const result = contract.updateAgreement(0, "NewAgreement", 15, 200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const agreement = contract.getAgreement(0);
    expect(agreement?.name).toBe("NewAgreement");
    expect(agreement?.maxDependents).toBe(15);
    expect(agreement?.supportAmount).toBe(200);
    const update = contract.state.agreementUpdates.get(0);
    expect(update?.updateName).toBe("NewAgreement");
    expect(update?.updateMaxDependents).toBe(15);
    expect(update?.updateSupportAmount).toBe(200);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent agreement", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateAgreement(99, "NewAgreement", 15, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-sponsor", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createAgreement(
      "TestAgreement",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateAgreement(0, "NewAgreement", 15, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets creation fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.creationFee).toBe(2000);
    contract.createAgreement(
      "TestAgreement",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(contract.stxTransfers).toEqual([{ amount: 2000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects creation fee change without authority contract", () => {
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct agreement count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createAgreement(
      "Agreement1",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    contract.createAgreement(
      "Agreement2",
      15,
      200,
      60,
      10,
      60,
      "ST4IMMIGRANT",
      "employment",
      15,
      14,
      "CityY",
      "USD",
      100,
      2000
    );
    const result = contract.getAgreementCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks agreement existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createAgreement(
      "TestAgreement",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    const result = contract.checkAgreementExistence("TestAgreement");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkAgreementExistence("NonExistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("parses agreement parameters with Clarity types", () => {
    const name = stringUtf8CV("TestAgreement");
    const maxDependents = uintCV(10);
    const supportAmount = uintCV(100);
    expect(name.value).toBe("TestAgreement");
    expect(maxDependents.value).toEqual(BigInt(10));
    expect(supportAmount.value).toEqual(BigInt(100));
  });

  it("rejects agreement creation with empty name", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createAgreement(
      "",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_UPDATE_PARAM);
  });

  it("rejects agreement creation with max agreements exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxAgreements = 1;
    contract.createAgreement(
      "Agreement1",
      10,
      100,
      30,
      5,
      50,
      "ST3IMMIGRANT",
      "family",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    const result = contract.createAgreement(
      "Agreement2",
      15,
      200,
      60,
      10,
      60,
      "ST4IMMIGRANT",
      "employment",
      15,
      14,
      "CityY",
      "USD",
      100,
      2000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_AGREEMENTS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});