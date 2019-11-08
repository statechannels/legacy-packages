import * as directFunding from "./protocols/direct-funding/actions";
import * as NewLedgerChannel from "./protocols/new-ledger-channel/actions";
import * as application from "./protocols/application/actions";
import * as protocol from "./protocols/actions";
import * as advanceChannel from "./protocols/advance-channel";
import {FundingAction, isFundingAction} from "./protocols/funding/actions";
import {RelayableAction, ProtocolLocator} from "../communication";
import {
  TransactionAction as TA,
  isTransactionAction as isTA
} from "./protocols/transaction-submission/actions";

import {ConcludingAction, isConcludingAction} from "./protocols/concluding";
import {ApplicationAction} from "./protocols/application/actions";
import {ActionConstructor} from "./utils";
import {isDefundingAction, DefundingAction} from "./protocols/defunding/actions";
import {AdvanceChannelAction} from "./protocols/advance-channel/actions";
import {FundingStrategyNegotiationAction} from "./protocols/funding-strategy-negotiation/actions";
import {LedgerFundingAction} from "./protocols/ledger-funding";

import {LOAD as LOAD_FROM_STORAGE} from "redux-storage";
import {SignedState, State} from "@statechannels/nitro-protocol";
import {BigNumber} from "ethers/utils";
export * from "./protocols/transaction-submission/actions";

export type TransactionAction = TA;
export const isTransactionAction = isTA;

// -------
// Actions
// -------

export interface MultipleWalletActions {
  type: "WALLET.MULTIPLE_ACTIONS";
  actions: WalletAction[];
}
export interface AdjudicatorKnown {
  type: "WALLET.ADJUDICATOR_KNOWN";
  networkId: string;
  adjudicator: string;
}

export interface MessageSent {
  type: "WALLET.MESSAGE_SENT";
}

export interface DisplayMessageSent {
  type: "WALLET.DISPLAY_MESSAGE_SENT";
}

export interface AssetTransferredEvent {
  type: "WALLET.ASSET_HOLDER.ASSET_TRANSFERRED";

  // This is either a `channelId` or an external destination (both bytes32).
  destination: string;
  amount: BigNumber;
}

export interface DepositedEvent {
  type: "WALLET.ASSET_HOLDER.DEPOSITED";

  // This is either a `channelId` or an external destination (both bytes32).
  destination: string;
  amountDeposited: BigNumber;
  destinationHoldings: BigNumber;
}

export interface BlockMined {
  type: "BLOCK_MINED";
  block: {timestamp: number; number: number};
}

export interface MetamaskLoadError {
  type: "METAMASK_LOAD_ERROR";
}

export type Message = "FundingDeclined";

export interface ChallengeExpirySetEvent {
  type: "WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET";
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  expiryTime;
}

export interface ChallengeCreatedEvent {
  type: "WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT";
  channelId: string;

  finalizedAt: number;
  challengeStates: SignedState[];
}

export interface ChallengeClearedEvent {
  type: "WALLET.ADJUDICATOR.CHALLENGE_CLEARED_EVENT";
  channelId: string;

  newTurnNumRecord: number;
}

export interface ConcludedEvent {
  channelId: string;
  type: "WALLET.ADJUDICATOR.CONCLUDED_EVENT";
}

export interface RefutedEvent {
  type: "WALLET.ADJUDICATOR.REFUTED_EVENT";
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  refuteState: State;
}

export interface RespondWithMoveEvent {
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  signedResponseState: SignedState;
  type: "WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT";
}

export interface FundingReceivedEvent {
  type: "WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT";
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  amount: string;
  totalForDestination: string;
}

export interface ChallengeExpiredEvent {
  type: "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED";
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  timestamp: number;
}

export interface ChannelUpdate {
  type: "WALLET.ADJUDICATOR.CHANNEL_UPDATE";
  channelId: string;
  isFinalized: boolean;
  balance: string;
}
// -------
// Constructors
// -------

export const multipleWalletActions: ActionConstructor<MultipleWalletActions> = p => ({
  ...p,
  type: "WALLET.MULTIPLE_ACTIONS"
});

export const adjudicatorKnown: ActionConstructor<AdjudicatorKnown> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR_KNOWN"
});

export const messageSent: ActionConstructor<MessageSent> = p => ({
  ...p,
  type: "WALLET.MESSAGE_SENT"
});

export const displayMessageSent: ActionConstructor<DisplayMessageSent> = p => ({
  ...p,
  type: "WALLET.DISPLAY_MESSAGE_SENT"
});

export const depositedEvent: ActionConstructor<DepositedEvent> = p => ({
  ...p,
  type: "WALLET.ASSET_HOLDER.DEPOSITED"
});

export const assetTransferredEvent: ActionConstructor<AssetTransferredEvent> = p => ({
  ...p,
  type: "WALLET.ASSET_HOLDER.ASSET_TRANSFERRED"
});

export const blockMined: ActionConstructor<BlockMined> = p => ({...p, type: "BLOCK_MINED"});

export const metamaskLoadError: ActionConstructor<MetamaskLoadError> = p => ({
  ...p,
  type: "METAMASK_LOAD_ERROR"
});

export const challengeExpirySetEvent: ActionConstructor<ChallengeExpirySetEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET"
});

export const challengeCreatedEvent: ActionConstructor<ChallengeCreatedEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT"
});

export const challengeClearedEvent: ActionConstructor<ChallengeClearedEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CHALLENGE_CLEARED_EVENT"
});

export const concludedEvent: ActionConstructor<ConcludedEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CONCLUDED_EVENT"
});

export const refutedEvent: ActionConstructor<RefutedEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.REFUTED_EVENT"
});

export const respondWithMoveEvent: ActionConstructor<RespondWithMoveEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT"
});
export const fundingReceivedEvent: ActionConstructor<FundingReceivedEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT"
});
export const challengeExpiredEvent: ActionConstructor<ChallengeExpiredEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED"
});
export const channelUpdate: ActionConstructor<ChannelUpdate> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CHANNEL_UPDATE"
});

// -------
// Unions and Guards
// -------

export type AdjudicatorEventAction =
  | ConcludedEvent
  | RefutedEvent
  | RespondWithMoveEvent
  | FundingReceivedEvent
  | ChallengeExpiredEvent
  | ChallengeCreatedEvent
  | ChallengeClearedEvent
  | ChallengeExpirySetEvent
  | ChannelUpdate;

export type AssetHolderEventAction = AssetTransferredEvent | DepositedEvent;

export type ProtocolAction =
  // only list top level protocol actions
  FundingAction | DefundingAction | ApplicationAction | ConcludingAction;

export function isProtocolAction(action: WalletAction): action is ProtocolAction {
  return (
    isFundingAction(action) ||
    application.isApplicationAction(action) ||
    isConcludingAction(action) ||
    isDefundingAction(action)
  );
}

export type WalletAction =
  | AdvanceChannelAction
  | AdjudicatorKnown
  | AdjudicatorEventAction
  | AssetHolderEventAction
  | BlockMined
  | DisplayMessageSent
  | AddressRequest
  | MessageSent
  | MetamaskLoadError
  | ProtocolAction
  | protocol.NewProcessAction
  | RelayableAction
  | FundingStrategyNegotiationAction
  | FundingAction
  | LedgerFundingAction;

export {directFunding as funding, NewLedgerChannel, protocol, application, advanceChannel};

// These are any actions that update shared data directly without any protocol
export type SharedDataUpdateAction = AdjudicatorEventAction | AssetHolderEventAction;

export function isSharedDataUpdateAction(action: WalletAction): action is SharedDataUpdateAction {
  return isAdjudicatorEventAction(action) || isAssetHolderEventAction(action);
}

export function isAdjudicatorEventAction(action: WalletAction): action is AdjudicatorEventAction {
  return (
    action.type === "WALLET.ADJUDICATOR.CONCLUDED_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.REFUTED_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED" ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_CLEARED_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET" ||
    action.type === "WALLET.ADJUDICATOR.CHANNEL_UPDATE"
  );
}

export function isAssetHolderEventAction(action: WalletAction): action is AssetHolderEventAction {
  return (
    action.type === "WALLET.ASSET_HOLDER.DEPOSITED" ||
    action.type === "WALLET.ASSET_HOLDER.ASSET_TRANSFERRED"
  );
}

// These are actions related to storage
export interface LoadAction {
  type: typeof LOAD_FROM_STORAGE;
  payload: any;
}

export function isLoadAction(action: any): action is LoadAction {
  return action.type && action.type === LOAD_FROM_STORAGE;
}

export interface JsonRpcAction {
  id: number;
  type: string;
}

export interface AddressRequest extends JsonRpcAction {
  domain: string; // Un-used for now
  type: "WALLET.ADDRESS_REQUEST";
}

export const addressRequest: ActionConstructor<AddressRequest> = p => ({
  ...p,
  type: "WALLET.ADDRESS_REQUEST"
});

export interface AddressResponse extends JsonRpcAction {
  type: "WALLET.ADDRESS_RESPONSE";
  address: string;
}
export const addressResponse: ActionConstructor<AddressResponse> = p => ({
  ...p,
  type: "WALLET.ADDRESS_RESPONSE"
});

export type JsonRpcRequestAction = AddressRequest;
export type JsonRpcResponseAction = AddressResponse;
