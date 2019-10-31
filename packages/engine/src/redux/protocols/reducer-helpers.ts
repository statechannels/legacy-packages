import {fundingSuccess} from "../../magmo-engine-client";

import {accumulateSideEffects} from "../outbox";
import {SharedData, queueMessage, getExistingChannel, checkAndStoreComm} from "../state";
import * as selectors from "../selectors";
import {TwoPartyPlayerIndex, ThreePartyPlayerIndex} from "../types";
import {CommitmentType} from "fmg-core/lib/commitment";
import * as magmoEngineClient from "../../magmo-engine-client";
import {getLastCommitment, nextParticipant, Commitments} from "../channel-store";
import {Commitment} from "../../domain";
import {sendCommitmentsReceived, ProtocolLocator} from "../../communication";
import * as comms from "../../communication";
import {ourTurn as ourTurnOnChannel} from "../channel-store";
import _ from "lodash";
import {bigNumberify} from "ethers/utils";
import {convertStateToSignedCommitment} from "../../utils/nitro-converter";

export function sendFundingComplete(sharedData: SharedData, appChannelId: string) {
  const channelState = selectors.getOpenedChannelState(sharedData, appChannelId);
  const c = getLastCommitment(channelState);
  if (c.commitmentType !== CommitmentType.PostFundSetup || c.turnNum !== 3) {
    throw new Error(`Expected a post fund setup B commitment. Instead received ${JSON.stringify(c)}.`);
  }
  return queueMessage(sharedData, fundingSuccess(appChannelId, c));
}

export function showEngine(sharedData: SharedData): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    displayOutbox: magmoEngineClient.showEngine()
  });
  return newSharedData;
}

export function hideEngine(sharedData: SharedData): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    displayOutbox: magmoEngineClient.hideEngine()
  });
  return newSharedData;
}

export function sendConcludeSuccess(sharedData: SharedData): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: magmoEngineClient.concludeSuccess()
    // TODO could rename this helper function, as it covers both ways of finalizing a channel
  });
  return newSharedData;
}

export function sendConcludeInstigated(sharedData: SharedData, channelId: string): SharedData {
  const channel = getExistingChannel(sharedData, channelId);
  const {participants, ourIndex} = channel;
  const messageRelay = comms.sendConcludeInstigated(nextParticipant(participants, ourIndex), channelId);
  return queueMessage(sharedData, messageRelay);
}

export function sendOpponentConcluded(sharedData: SharedData): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: magmoEngineClient.opponentConcluded()
    // TODO could rename this helper function, as it covers both ways of finalizing a channel
  });
  return newSharedData;
}

export function sendCommitments(
  sharedData: SharedData,
  processId: string,
  channelId: string,
  protocolLocator: ProtocolLocator
): SharedData {
  const channel = getExistingChannel(sharedData, channelId);
  const {participants, ourIndex} = channel;
  const messageRelay = sendCommitmentsReceived(
    nextParticipant(participants, ourIndex),
    processId,
    channel.signedStates.map(ss => convertStateToSignedCommitment(ss.state, channel.privateKey)),
    protocolLocator
  );
  return queueMessage(sharedData, messageRelay);
}

export function checkCommitments(sharedData: SharedData, turnNum: number, commitments: Commitments): SharedData {
  // We don't bother checking "stale" commitments -- those whose turnNum does not
  // exceed the current turnNum.

  commitments
    .filter(signedCommitment => signedCommitment.commitment.turnNum > turnNum)
    .map(signedCommitment => {
      const result = checkAndStoreComm(sharedData, signedCommitment);
      if (result.isSuccess) {
        sharedData = result.store;
      } else {
        throw new Error("Unable to validate commitment");
      }
    });

  return sharedData;
}

export function sendChallengeResponseRequested(sharedData: SharedData, channelId: string): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: magmoEngineClient.challengeResponseRequested(channelId)
  });
  return newSharedData;
}

export function sendChallengeCommitmentReceived(sharedData: SharedData, commitment: Commitment) {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: magmoEngineClient.challengeCommitmentReceived(commitment)
  });
  return newSharedData;
}

// TODO 'Complete' here means the challenge was successfully responded to
export function sendChallengeComplete(sharedData: SharedData) {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: magmoEngineClient.challengeComplete()
  });
  return newSharedData;
}

export function sendConcludeFailure(sharedData: SharedData, reason: "Other" | "UserDeclined"): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: magmoEngineClient.concludeFailure(reason)
  });
  return newSharedData;
}

export const channelIsClosed = (channelId: string, sharedData: SharedData): boolean => {
  return channelHasConclusionProof(channelId, sharedData) || channelFinalizedOnChain(channelId, sharedData);
};

export const channelFundsAnotherChannel = (channelId: string, sharedData: SharedData): boolean => {
  const latestCommitment = getLatestCommitment(channelId, sharedData);
  return _.intersection(selectors.getChannelIds(sharedData), latestCommitment.destination).length > 0;
};

export const channelHasConclusionProof = (channelId: string, sharedData: SharedData): boolean => {
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);
  const [penultimateState, lastState] = channelState.signedStates.map(ss => ss.state);
  return penultimateState.isFinal && lastState.isFinal;
};

export const channelFinalizedOnChain = (channelId: string, sharedData: SharedData): boolean => {
  const channelState = selectors.getAdjudicatorChannelState(sharedData, channelId);
  return channelState && channelState.finalized;
};

export enum FundingType {
  Virtual,
  Ledger,
  Direct
}
export const getChannelFundingType = (channelId: string, sharedData: SharedData): FundingType => {
  const channelFundingState = selectors.getChannelFundingState(sharedData, channelId);
  if (!channelFundingState) {
    throw new Error(`No funding state for ${channelId}. Cannot determine funding type.`);
  }
  if (channelFundingState.directlyFunded) {
    return FundingType.Direct;
  }
  if (!channelFundingState.fundingChannel) {
    throw new Error(`Channel ${channelId} is not directly funded but has not fundingChannelId`);
  }
  const channelState = getExistingChannel(sharedData, channelFundingState.fundingChannel);
  return channelState.participants.length === 3 ? FundingType.Virtual : FundingType.Ledger;
};

export const getTwoPlayerIndex = (channelId: string, sharedData: SharedData): TwoPartyPlayerIndex => {
  const channelState = selectors.getChannelState(sharedData, channelId);
  return channelState.participants.indexOf(channelState.address);
};
export const isFirstPlayer = (channelId: string, sharedData: SharedData) => {
  const channelState = selectors.getChannelState(sharedData, channelId);
  return channelState.ourIndex === TwoPartyPlayerIndex.A;
};

export const isLastPlayer = (channelId: string, sharedData: SharedData) => {
  const channelState = selectors.getChannelState(sharedData, channelId);
  return channelState.ourIndex === channelState.participants.length - 1;
};

export function isSafeToSend({
  sharedData,
  channelId,
  ourIndex,
  clearedToSend
}: {
  sharedData: SharedData;
  ourIndex: TwoPartyPlayerIndex | ThreePartyPlayerIndex;
  channelId?: string;
  clearedToSend: boolean;
}): boolean {
  if (!clearedToSend) {
    return false;
  }

  // The possibilities are:
  // A. The channel is not in storage and our index is 0.
  // B. The channel is not in storage and our index is not 0.
  // C. The channel is in storage and it's our turn
  // D. The channel is in storage and it's not our turn

  if (!channelId) {
    return ourIndex === 0;
  }

  const channel = selectors.getChannelState(sharedData, channelId);
  const numParticipants = channel.participants.length;
  return (channel.turnNum + 1) % numParticipants === ourIndex;
}

export function getOpponentAddress(channelId: string, sharedData: SharedData) {
  const channel = getExistingChannel(sharedData, channelId);

  const {participants} = channel;
  const opponentAddress = participants[(channel.ourIndex + 1) % participants.length];
  return opponentAddress;
}

export function getOurAddress(channelId: string, sharedData: SharedData) {
  const channel = getExistingChannel(sharedData, channelId);
  return channel.participants[channel.ourIndex];
}

export function getLatestCommitment(channelId: string, sharedData: SharedData) {
  const channel = getExistingChannel(sharedData, channelId);
  return getLastCommitment(channel);
}

export function getNumberOfParticipants(commitment: Commitment): number {
  return commitment.channel.participants.length;
}

export function ourTurn(sharedData: SharedData, channelId: string) {
  const channel = getExistingChannel(sharedData, channelId);
  return ourTurnOnChannel(channel);
}

export function getFundingChannelId(channelId: string, sharedData: SharedData): string {
  const fundingState = selectors.getChannelFundingState(sharedData, channelId);
  if (!fundingState) {
    throw new Error(`No funding state found for ${channelId}`);
  }
  if (fundingState.directlyFunded) {
    return channelId;
  } else {
    const channelIdToCheck = !!fundingState.fundingChannel
      ? fundingState.fundingChannel
      : fundingState.guarantorChannel;
    if (!channelIdToCheck) {
      throw new Error(
        `Funding state for ${channelId} is not directly funded so it must have aq funding or guarantor channel`
      );
    }

    return getFundingChannelId(channelIdToCheck, sharedData);
  }
}

export function removeZeroFundsFromBalance(
  incomingAllocation: string[],
  incomingDestination: string[]
): {allocation: string[]; destination: string[]} {
  const allocation: string[] = [];
  const destination: string[] = [];
  incomingAllocation.map((a, i) => {
    if (bigNumberify(a).gt(0)) {
      allocation.push(incomingAllocation[i]);
      destination.push(incomingDestination[i]);
    }
  });
  return {allocation, destination};
}
