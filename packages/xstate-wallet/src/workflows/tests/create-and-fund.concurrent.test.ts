import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {Init, machine, services} from '../create-and-fund';

import {Store} from '../../store';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';
import {firstState, signState, calculateChannelId} from '../../store/state-utils';
import {ChannelConstants, Outcome, State} from '../../store/types';
import {AddressZero} from 'ethers/constants';
import {wallet1, wallet2, participants, wallet3, ledgerState, first, third, second} from './data';
import {subscribeToMessages} from './message-service';
import {ETH_ASSET_HOLDER_ADDRESS, HUB} from '../../constants';
import {FakeChain} from '../../chain';
import {SimpleHub} from './simple-hub';
import {TestStore} from './store';
import {add} from '../../utils/math-utils';

jest.setTimeout(30000);
const EXPECT_TIMEOUT = 1000;

const chainId = '0x01';
const challengeDuration = bigNumberify(10);
const appDefinition = AddressZero;

const targetChannel: ChannelConstants = {
  channelNonce: bigNumberify(0),
  chainId,
  challengeDuration,
  participants,
  appDefinition
};
const targetChannelId = calculateChannelId(targetChannel);

const ledgerChannel: ChannelConstants = {
  channelNonce: bigNumberify(1),
  chainId,
  challengeDuration,
  participants,
  appDefinition
};

const destinations = participants.map(p => p.destination);
const amounts = [bigNumberify(7), bigNumberify(5)];

const allocation: Outcome = {
  type: 'SimpleAllocation',
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [0, 1].map(i => ({
    destination: destinations[i],
    amount: amounts[i]
  }))
};

const ledgerAmounts = amounts.map(a => a.add(2));
const depositAmount = ledgerAmounts.reduce(add).toHexString();

const context: Init = {channelId: targetChannelId, allocation};

let aStore: TestStore;
let bStore: TestStore;

const allSignState = (state: State) => ({
  ...state,
  signatures: [wallet1, wallet2].map(({privateKey}) => signState(state, privateKey))
});

let chain: FakeChain;
beforeEach(() => {
  chain = new FakeChain();
  aStore = new TestStore([wallet1.privateKey], chain);
  bStore = new TestStore([wallet2.privateKey], chain);
  const hubStore = new SimpleHub(wallet3.privateKey);

  [aStore, bStore].map(store => {
    store.createEntry(allSignState(firstState(allocation, targetChannel)));
    store.createEntry(allSignState(firstState(allocation, ledgerChannel)));
  });

  subscribeToMessages({
    [participants[0].participantId]: aStore,
    [participants[1].participantId]: bStore,
    [HUB.participantId]: hubStore
  });
});

const connectToStore = (store: Store) =>
  interpret(
    machine(store).withConfig(
      {services: {...services(store), virtualFunding: () => Promise.resolve()}},
      context
    )
  ).start();

test('it must acquire a lock on the ledger channel', async () => {
  process.env.USE_VIRTUAL_FUNDING = 'true';

  {
    const state = ledgerState([first, third], ledgerAmounts);
    const ledgerId = calculateChannelId(state);
    const signatures = [wallet1, wallet3].map(({privateKey}) => signState(state, privateKey));
    aStore.setLedger(aStore.createEntry({...state, signatures}));
    chain.depositSync(ledgerId, '0', depositAmount);
  }

  {
    const state = ledgerState([second, third], ledgerAmounts);
    const ledgerId = calculateChannelId(state);
    const signatures = [wallet2, wallet3].map(({privateKey}) => signState(state, privateKey));
    bStore.setLedger(bStore.createEntry({...state, signatures}));
    chain.depositSync(ledgerId, '0', depositAmount);
  }

  const status = await aStore.lockLedger(HUB.participantId);
  const [aService] = [aStore, bStore].map(connectToStore);

  aService.onTransition(s => {
    if (_.isEqual(s.value, {funding: {virtual: {running: 'virtualFunding '}}})) {
      expect((s.context as any).ledgerStatus).toBeDefined();
      expect((s.context as any).ledgerStatus.lock).not.toEqual(status.lock);
    }
  });

  await waitForExpect(async () => {
    expect(aService.state.value).toEqual({funding: {virtual: 'lockLedger'}});
  }, EXPECT_TIMEOUT);

  await aStore.releaseLedger(status);

  await waitForExpect(async () => {
    expect(aService.state.value).toEqual('success');
  }, EXPECT_TIMEOUT);

  const currentStatus = aStore._ledgers[HUB.participantId];
  expect(currentStatus).toBeDefined();
  expect(currentStatus?.lock).toBeUndefined();

  delete process.env.USE_VIRTUAL_FUNDING;
});
