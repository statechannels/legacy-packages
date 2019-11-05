import {TransactionRequest} from "ethers/providers";
import {getAdjudicatorInterface} from "./contract-utils";
import {splitSignature} from "ethers/utils";
import {Commitment, SignedCommitment} from "../domain";
import {asEthersObject} from "fmg-core";
import {
  createDepositTransaction as createNitroDepositTransaction,
  createTransferAllTransaction as createNitroTransferAllTransaction,
  Transactions as nitroTrans,
  SignedState,
  State
} from "@statechannels/nitro-protocol";
import {Allocation, AllocationItem} from "@statechannels/nitro-protocol/src/contract/outcome";
import {convertAddressToBytes32} from "./data-type-utils";

export function createForceMoveTransaction(
  fromState: SignedState,
  toState: SignedState,
  privateKey: string
): TransactionRequest {
  return nitroTrans.createForceMoveTransaction([fromState, toState], privateKey);
}

export function createRespondTransaction(challengeState: State, responseSignedState: SignedState): TransactionRequest {
  return nitroTrans.createRespondTransaction(challengeState, responseSignedState);
}

export function createRefuteTransaction(seriesOfSupportiveStates: SignedState[]): TransactionRequest {
  return nitroTrans.createCheckpointTransaction(seriesOfSupportiveStates);
}

export interface ConcludeAndWithdrawArgs {
  fromCommitment: Commitment;
  toCommitment: Commitment;
  fromSignature: string;
  toSignature: string;
  participant: string;
  destination: string;
  amount: string;
  verificationSignature: string;
}
export function createConcludeAndWithdrawTransaction(args: ConcludeAndWithdrawArgs): TransactionRequest {
  const adjudicatorInterface = getAdjudicatorInterface();
  const splitFromSignature = splitSignature(args.fromSignature);
  const splitToSignature = splitSignature(args.toSignature);
  const conclusionProof = {
    penultimateCommitment: asEthersObject(args.fromCommitment),
    ultimateCommitment: asEthersObject(args.toCommitment),
    penultimateSignature: splitFromSignature,
    ultimateSignature: splitToSignature
  };
  const {v, r, s} = splitSignature(args.verificationSignature);
  const {participant, destination, amount} = args;
  const data = adjudicatorInterface.functions.concludeAndWithdraw.encode([
    conclusionProof,
    participant,
    destination,
    amount,
    v,
    r,
    s
  ]);

  return {
    data,
    gasLimit: 3000000
  };
}

export function createConcludeTransaction(
  signedFromCommitment: SignedCommitment,
  signedToCommitment: SignedCommitment
): TransactionRequest {
  const signedStates: SignedState[] = [signedFromCommitment.signedState, signedToCommitment.signedState];
  return nitroTrans.createConcludeTransaction(signedStates);
}

export function createWithdrawTransaction(
  amount: string,
  participant: string,
  destination: string,
  verificationSignature: string
) {
  const adjudicatorInterface = getAdjudicatorInterface();
  const {v, r, s} = splitSignature(verificationSignature);
  const data = adjudicatorInterface.functions.withdraw.encode([participant, destination, amount, v, r, s]);

  return {
    data,
    gasLimit: 3000000
  };
}

export function createTransferAndWithdrawTransaction(
  channelId: string,
  participant: string,
  destination: string,
  amount: string,
  verificationSignature: string
) {
  const adjudicatorInterface = getAdjudicatorInterface();
  const {v, r, s} = splitSignature(verificationSignature);
  const data = adjudicatorInterface.functions.transferAndWithdraw.encode([
    channelId,
    participant,
    destination,
    amount,
    v,
    r,
    s
  ]);

  return {
    data,
    gasLimit: 3000000
  };
}

export function createDepositTransaction(destination: string, depositAmount: string, expectedHeld: string) {
  // If a legacy fmg-core channelId
  if (destination.length === 42) {
    destination = `0x${destination.substr(2).padStart(64, "1")}`; // note we do not pad with zeros, since that would imply an external destination (which we may not deposit to)
  }
  return createNitroDepositTransaction(destination, expectedHeld, depositAmount);
}

export function createTransferAllTransaction(source: string, destination: string, amount: string) {
  const allocation: Allocation = [
    {
      destination: externalizeAddress(destination),
      amount
    } as AllocationItem
  ];
  return createNitroTransferAllTransaction(source, allocation);
}

function externalizeAddress(address: string): string {
  return address.length !== 66 ? convertAddressToBytes32(address) : address;
}
