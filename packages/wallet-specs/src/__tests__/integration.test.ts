import { ethers } from 'ethers';
import waitForExpect from 'wait-for-expect';
import { interpret } from 'xstate';
import { AddressZero, HashZero } from 'ethers/constants';
import { getChannelId } from '@statechannels/nitro-protocol';

import {
  Init,
  machine,
  CreateChannelEvent,
  ConcludeChannelEvent,
} from '../protocols/wallet/protocol';
import { Store, IStore } from '../store';
import { messageService } from '../messaging';
import { AddressableMessage } from '../wire-protocol';
import { log } from '../utils';
import { Chain } from '../chain';

import { processStates } from './utils';
import { first, second, wallet1, wallet2, participants } from './data';

jest.setTimeout(10000);

const logProcessStates = state => {
  log(processStates(state));
};

const chainId = '0x01';
const createChannel: CreateChannelEvent = {
  type: 'CREATE_CHANNEL',
  chainId,
  challengeDuration: 1,
  participants,
  allocations: [
    { destination: first.destination, amount: '3' },
    { destination: second.destination, amount: '1' },
  ],
  appDefinition: AddressZero,
  appData: HashZero,
};

const chain = new Chain();

const stores: Record<string, IStore> = {};

const connect = (wallet: ethers.Wallet) => {
  const store = new Store({
    privateKeys: { [wallet.address]: wallet.privateKey },
    chain,
  });
  const participantId =
    wallet.address === first.signingAddress ? first.participantId : second.participantId;

  const context: Init = {
    id: participantId,
    processes: [],
  };
  stores[participantId] = store;
  const service = interpret<any, any, any>(machine(store, context));

  service.onTransition(state => {
    setTimeout(() => logProcessStates(state), 100);
  });

  messageService.on('message', ({ to, ...event }: AddressableMessage) => {
    if (to === context.id) {
      service.send(event);
    }
  });

  service.start();

  return [service, store] as [typeof service, typeof store];
};

test('opening and closing a channel', async () => {
  const [left] = connect(wallet1);
  const [right] = connect(wallet2);

  left.send(createChannel);

  await waitForExpect(() => {
    const createChannelProcess = left.state.context.processes.find(p => /create/.test(p.id));
    const joinChannelProcess = right.state.context.processes.find(p => /join/.test(p.id));

    expect(createChannelProcess && createChannelProcess.ref.state.value).toEqual('success');
    expect(joinChannelProcess && joinChannelProcess.ref.state.value).toEqual('success');
  }, 200);

  const channelId = getChannelId({
    participants: participants.map(p => p.signingAddress),
    channelNonce: '0x01',
    chainId,
  });
  const { latestSupportedState } = stores[first.participantId].getEntry(channelId);
  expect(latestSupportedState.turnNum).toEqual(3);

  const concludeChannel: ConcludeChannelEvent = {
    type: 'CONCLUDE_CHANNEL',
    channelId,
  };

  left.send(concludeChannel);

  await waitForExpect(() => {
    const concludeChannelProcess = left.state.context.processes.find(p => /conclude/.test(p.id));

    // TODO: Expect success
    expect(concludeChannelProcess && concludeChannelProcess.ref.state.value).toEqual(
      'concludeTarget'
    );
  }, 200);
});
