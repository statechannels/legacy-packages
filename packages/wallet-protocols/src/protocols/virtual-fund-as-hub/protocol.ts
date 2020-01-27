import { assign } from 'xstate';
import { Channel } from '@statechannels/nitro-protocol';

import { Store } from '../../store';
import { Balance } from '../../types';
import { connectToStore, getDataAndInvoke } from '../../machine-utils';
import { VirtualLeaf, CreateNullChannel, SupportState, LedgerFunding } from '../';
import { FINAL } from '../..';
const PROTOCOL = 'virtual-funding-as-hub';

export interface Init {
  balances: Balance[];
  leftLedgerId: string;
  rightLedgerId: string;
  targetChannelId: string;
  hubAddress: string;
}

type ChannelsKnown = Init & {
  jointChannel: Channel;
  guarantorChannels: [Channel, Channel];
};

const jointChannelArgs = (store: Store) => ({
  jointChannel,
  balances,
}: ChannelsKnown): CreateNullChannel.Init =>
  VirtualLeaf.jointChannelArgs(store)({
    jointChannel: jointChannel,
    balances: balances,
    hubAddress: jointChannel.participants[1],
  });

const createJointChannel = getDataAndInvoke('jointChannelArgs', 'createNullChannel');

const guarantorArgs = (index: VirtualLeaf.Indices) => (store: Store) => ({
  jointChannel,
  guarantorChannels,
}: ChannelsKnown): CreateNullChannel.Init =>
  VirtualLeaf.guarantorChannelArgs(store)({
    jointChannel,
    guarantorChannel: guarantorChannels[index],
    index,
  });

const leftGuarantorArgs = guarantorArgs(0);
const createLeftGuarantorChannel = getDataAndInvoke('leftGuarantorArgs', 'createNullChannel');

const rightGuarantorArgs = guarantorArgs(1);
const createRightGuarantorChannel = getDataAndInvoke('rightGuarantorArgs', 'createNullChannel');

export const assignChannels = (store: Store) =>
  assign(
    (ctx: Init): ChannelsKnown => {
      const { leftLedgerId, rightLedgerId } = ctx;
      const { channel: leftLedgerChannel } = store.getEntry(leftLedgerId).latestState;
      const { channel: rightLedgerChannel } = store.getEntry(rightLedgerId).latestState;

      const jointParticipants = [
        ...leftLedgerChannel.participants,
        rightLedgerChannel.participants[1],
      ];
      const jointChannel: Channel = {
        participants: jointParticipants,
        channelNonce: store.getNextNonce(jointParticipants),
        chainId: leftLedgerChannel.chainId,
      };

      const leftGuarantorChannel: Channel = {
        ...leftLedgerChannel,
        channelNonce: store.getNextNonce(leftLedgerChannel.participants),
      };

      const rightGuarantorChannel: Channel = {
        ...rightLedgerChannel,
        channelNonce: store.getNextNonce(rightLedgerChannel.participants),
      };

      return {
        ...ctx,
        jointChannel,
        guarantorChannels: [leftGuarantorChannel, rightGuarantorChannel],
      };
    }
  );
const parallel = 'parallel' as 'parallel';
const createChannels = {
  entry: 'assignChannels',
  type: parallel,
  states: { createLeftGuarantorChannel, createRightGuarantorChannel, createJointChannel },
  onDone: 'fundGuarantors',
};

const fundGuarantorArgs = (index: VirtualLeaf.Indices) => ({
  guarantorChannels,
  balances,
  hubAddress,
}: ChannelsKnown): LedgerFunding.Init =>
  VirtualLeaf.fundGuarantorArgs({
    guarantorChannel: guarantorChannels[index],
    index,
    balances,
    hubAddress,
  });
const fundGuarantors = {
  type: parallel,
  states: {
    fundLeftGuarantor: {
      invoke: { src: 'ledgerFunding', data: fundGuarantorArgs(VirtualLeaf.Indices.Left) },
    },
    fundRightGuarantor: {
      invoke: { src: 'ledgerFunding', data: fundGuarantorArgs(VirtualLeaf.Indices.Right) },
    },
  },
  onDone: 'fundTarget',
};

const fundTarget = getDataAndInvoke('fundTargetArgs', 'supportState', 'success');

// PROTOCOL DEFINITION
export const config = {
  key: PROTOCOL,
  initial: 'createChannels',
  states: { createChannels, fundGuarantors, fundTarget, success: { type: FINAL } },
};

const options = (store: Store) => ({
  actions: { assignChannels: assignChannels(store) },
  services: {
    fundTargetArgs: VirtualLeaf.fundTargetArgs(store),
    createNullChannel: CreateNullChannel.machine(store),
    supportState: SupportState.machine(store),
    jointChannelArgs: jointChannelArgs(store),
    leftGuarantorArgs: leftGuarantorArgs(store),
    rightGuarantorArgs: rightGuarantorArgs(store),
  },
});

export const machine = connectToStore<any>(config, options);
