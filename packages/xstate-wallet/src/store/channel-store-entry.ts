import {
  ChannelConstants,
  StateVariables,
  SignedState,
  Participant,
  ChannelStoredData,
  StateVariablesWithHash,
  SignedStateWithHash
} from './types';
import {hashState, calculateChannelId, createSignatureEntry, outcomesEqual} from './state-utils';
import _ from 'lodash';
import {BigNumber, bigNumberify} from 'ethers/utils';

import {Funding} from './store';
export interface SignatureEntry {
  signature: string;
  signer: string;
}

export type SignedStateVariables = StateVariables & {signatures: SignatureEntry[]};

export class ChannelStoreEntry {
  public readonly channelConstants: ChannelConstants;
  public readonly myIndex: number;
  private stateVariables: Array<StateVariablesWithHash> = [];
  private signatures: Record<string, Array<SignatureEntry>> = {};
  public funding: Funding | undefined = undefined;
  public readonly applicationSite?: string;
  constructor(channelData: ChannelStoredData) {
    this.myIndex = channelData.myIndex;

    this.signatures = channelData.signatures;
    this.funding = channelData.funding;
    this.applicationSite = channelData.applicationSite;
    this.channelConstants = {
      chainId: channelData.channelConstants.chainId,
      participants: channelData.channelConstants.participants,
      appDefinition: channelData.channelConstants.appDefinition,
      challengeDuration: bigNumberify(channelData.channelConstants.challengeDuration),
      channelNonce: bigNumberify(channelData.channelConstants.channelNonce)
    };

    this.stateVariables = channelData.stateVariables;
  }

  public setFunding(funding: Funding) {
    this.funding = funding;
  }

  public get sortedStates() {
    return this.signedStates.map(s => ({...this.channelConstants, ...s}));
  }

  private mySignature(stateVars: StateVariables, signatures: SignatureEntry[]): boolean {
    return signatures.some(sig => sig.signer === this.myAddress);
  }

  private get myAddress(): string {
    return this.participants[this.myIndex].signingAddress;
  }

  private get signedStates(): Array<SignedStateWithHash> {
    return this.stateVariables.map(s => ({
      ...this.channelConstants,
      ...s,
      signatures: this.signatures[s.stateHash]
    }));
  }

  get isSupported() {
    return !!this._supported;
  }

  get isFinalized() {
    return this.isSupported && this.supported.isFinal;
  }

  private get _supported() {
    const latestSupport = this._support;
    return latestSupport.length === 0 ? undefined : latestSupport[0];
  }

  public get support(): Array<SignedState> {
    return this._support.map(s => ({...s, ...this.channelConstants}));
  }

  // This is a simple check based on _requireValidTransition from NitroProtocol
  // We will eventually want to perform a proper validTransition check
  // but we will have to be careful where we do that to prevent eating up a ton of cpu
  private validChain(firstState: SignedState, secondState: SignedState): boolean {
    if (!firstState.turnNum.add(1).eq(secondState.turnNum)) {
      return false;
    }
    if (secondState.isFinal) {
      return outcomesEqual(firstState.outcome, secondState.outcome);
    }
    if (secondState.turnNum.lt(2 * this.nParticipants())) {
      return (
        outcomesEqual(firstState.outcome, secondState.outcome) &&
        firstState.appData === secondState.appData
      );
    }
    return true;
  }

  private get _support(): Array<SignedStateWithHash> {
    let support: Array<SignedStateWithHash> = [];

    let participantsWhoHaveNotSigned = new Set(this.participants.map(p => p.signingAddress));
    let previousState;

    for (const signedState of this.signedStates.reverse()) {
      // If there is not a valid transition we know there cannot be a valid support
      // so we clear out what we have and start at the current signed state
      if (previousState && !this.validChain(signedState, previousState)) {
        support = [];
        participantsWhoHaveNotSigned = new Set(this.participants.map(p => p.signingAddress));
      }
      const moverIndex = signedState.turnNum.mod(this.nParticipants()).toNumber();
      const moverForThisTurn = this.participants[moverIndex].signingAddress;

      // If the mover hasn't signed the state then we know it cannot be part of the support
      if (signedState.signatures.some(s => s.signer === moverForThisTurn)) {
        support.push(signedState);

        for (const signature of signedState.signatures) {
          participantsWhoHaveNotSigned.delete(signature.signer);
          if (participantsWhoHaveNotSigned.size === 0) {
            return support;
          }
        }
      }
      previousState = signedState;
    }
    return [];
  }

  get supported() {
    const vars = this._supported;
    if (!vars) throw new Error('No supported state found');
    return {...this.channelConstants, ...vars};
  }

  get isSupportedByMe() {
    return !!this._latestSupportedByMe;
  }

  private get _latestSupportedByMe() {
    return this.signedStates.find(s => this.mySignature(s, s.signatures));
  }

  get latestSignedByMe() {
    const vars = this._latestSupportedByMe;
    if (!vars) throw new Error('No state supported by me');
    return {...this.channelConstants, ...vars};
  }

  get latest() {
    return {...this.channelConstants, ...this.signedStates[this.signedStates.length - 1]};
  }

  get latestState() {
    return {...this.channelConstants, ...this.latest};
  }

  get channelId(): string {
    return calculateChannelId(this.channelConstants);
  }

  get participants(): Participant[] {
    return this.channelConstants.participants;
  }

  signAndAdd(stateVars: StateVariables, privateKey: string): SignedState {
    const state = {...stateVars, ...this.channelConstants};

    const signatureEntry = createSignatureEntry(state, privateKey);

    this.addState(stateVars, signatureEntry);
    const stateHash = hashState(state);
    return {
      ...stateVars,
      ...this.channelConstants,
      signatures: this.signatures[stateHash]
    };
  }

  addState(stateVars: StateVariables, signatureEntry: SignatureEntry) {
    const state = {...stateVars, ...this.channelConstants};
    const stateHash = hashState(state);
    // TODO: This check could be more efficient
    if (!this.stateVariables.some(s => s.stateHash === stateHash)) {
      this.stateVariables.push({...stateVars, stateHash});
    }
    const {participants} = this.channelConstants;

    // check the signature

    const signerIndex = participants.findIndex(p => p.signingAddress === signatureEntry.signer);

    if (signerIndex === -1) {
      throw new Error('State not signed by a participant of this channel');
    }

    const signatures = this.signatures[stateHash] ?? new Array<SignatureEntry>();
    signatures.push(signatureEntry);
    this.signatures[stateHash] = signatures;

    this.clearOldStates();
  }

  private clearOldStates() {
    // If we don't have a supported state we don't clean anything out
    if (this.isSupported) {
      // The support is returned in descending turn number so we need to grab the last element to find the earliest state
      const {stateHash: firstSupportStateHash} = this._support[this._support.length - 1];

      // Find where the first support state is in our current state array
      const supportIndex = this.stateVariables.findIndex(
        sv => sv.stateHash === firstSupportStateHash
      );
      // Take everything after that
      this.stateVariables = this.stateVariables.slice(supportIndex);
    }
  }

  private nParticipants(): number {
    return this.channelConstants.participants.length;
  }

  public data(): ChannelStoredData {
    const channelConstants = {
      ...this.channelConstants,
      challengeDuration: this.channelConstants.challengeDuration.toString(),
      channelNonce: this.channelConstants.channelNonce.toString()
    };

    const stateVariables = ChannelStoreEntry.prepareStateVariables(
      _.cloneDeep(this.stateVariables)
    );

    return {
      stateVariables,
      channelConstants,
      signatures: this.signatures,
      funding: this.funding,
      myIndex: this.myIndex,
      applicationSite: this.applicationSite
    };
  }
  static fromJson(data) {
    if (!data) {
      console.error("Data is undefined or null, Memory Channel Store Entry can't be created.");
      return data;
    }
    const {channelConstants, signatures, funding, myIndex, applicationSite} = data;
    const stateVariables = ChannelStoreEntry.prepareStateVariables(data.stateVariables);
    channelConstants.challengeDuration = new BigNumber(channelConstants.challengeDuration);
    channelConstants.channelNonce = new BigNumber(channelConstants.channelNonce);
    return new ChannelStoreEntry({
      channelConstants,
      myIndex,
      stateVariables,
      signatures,
      funding,
      applicationSite
    });
  }

  private static prepareStateVariables(
    stateVariables, // TODO: Make this typesafe!
    parserFunction: (data: string | BigNumber) => BigNumber | string = v => new BigNumber(v)
  ) {
    for (const state of stateVariables) {
      if (state.turnNum) {
        state.turnNum = parserFunction(state.turnNum);
      }
      if (state.channelNonce) {
        state.channelNonce = parserFunction(state.channelNonce);
      }
      if (state.challengeDuration) {
        state.challengeDuration = parserFunction(state.challengeDuration);
      }
      state.outcome = ChannelStoreEntry.toggleBigNumberOutcome(state.outcome, parserFunction);
    }
    return stateVariables;
  }

  private static toggleBigNumberOutcome(
    outcome,
    parserFunction: (data: string | BigNumber) => BigNumber | string
  ) {
    if (outcome.allocationItems) {
      return {
        ...outcome,
        allocationItems: outcome.allocationItems.map(item => ({
          ...item,
          amount: parserFunction(item.amount)
        }))
      };
    } else if (outcome.simpleAllocations) {
      return {
        ...outcome,
        simpleAllocations: outcome.simpleAllocations.map(sA =>
          ChannelStoreEntry.toggleBigNumberOutcome(sA, parserFunction)
        )
      };
    } else {
      return outcome;
    }
  }
}
