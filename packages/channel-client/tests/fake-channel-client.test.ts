import log = require('loglevel');
import EventEmitter = require('eventemitter3');

import {FakeChannelClient} from '../src/fake-channel-client';
import {
  PARTICIPANT_A,
  PARTICIPANT_B,
  APP_DEFINITION,
  APP_DATA,
  UPDATED_APP_DATA
} from './constants';
import {ChannelResultBuilder, buildParticipant, buildAllocation, setClientStates} from './utils';
import {ChannelResult, Message} from '../src';
import {calculateChannelId} from '../src/utils';

log.setDefaultLevel(log.levels.SILENT);

interface StateMap {
  [channelStatus: string]: ChannelResult;
}

describe('FakeChannelClient', () => {
  const participantA = buildParticipant(PARTICIPANT_A);
  const participantB = buildParticipant(PARTICIPANT_B);

  const states: StateMap = {};
  const participants = [participantA, participantB];
  const allocations = [buildAllocation(PARTICIPANT_A, '5'), buildAllocation(PARTICIPANT_B, '5')];
  const channelId = calculateChannelId(participants, allocations, APP_DEFINITION, APP_DATA);

  let clientA: FakeChannelClient, clientB: FakeChannelClient;

  beforeAll(() => {
    states['proposed'] = new ChannelResultBuilder(
      participants,
      allocations,
      APP_DEFINITION,
      APP_DATA,
      channelId,
      '0',
      'proposed'
    ).build();

    states['running'] = ChannelResultBuilder.from(states['proposed'])
      .setStatus('running')
      .setTurnNum('3')
      .build();

    states['updated_app_data'] = ChannelResultBuilder.from(states['running'])
      .setAppData(UPDATED_APP_DATA)
      .setTurnNum('4')
      .build();

    states['closing'] = ChannelResultBuilder.from(states['running'])
      .setStatus('closing')
      .setTurnNum('4')
      .build();
  });

  beforeEach(() => {
    clientA = new FakeChannelClient(participantA.participantId);
    clientB = new FakeChannelClient(participantB.participantId);

    clientA.playerIndex = 0;
    clientA.opponentAddress = participantB.participantId;

    clientB.playerIndex = 1;
    clientB.opponentAddress = participantA.participantId;

    // This setup simulates the message being received from A's wallet
    // and "queued" in A's channel client (which resides on A's app side)
    // which then is "dequeued" and sent to B's app (directly handled by
    // B's channel client here) and pushed from B's app to B's wallet
    clientA.onMessageQueued(async (message: Message<ChannelResult>) => {
      await clientB.pushMessage(message);
    });

    clientB.onMessageQueued(async (message: Message<ChannelResult>) => {
      await clientA.pushMessage(message);
    });
  });

  it('instantiates', () => {
    expect(clientA).toBeDefined();
    expect(clientB).toBeDefined();
  });

  describe('creates a channel', () => {
    it('produces the right channel result', async () => {
      const channelResult = await clientA.createChannel(
        participants,
        allocations,
        APP_DEFINITION,
        APP_DATA
      );
      expect(states['proposed']).toEqual(channelResult);
    });

    it('confirms client B joined the channel', () => {
      log.info('Confirming client B joined channel');
      log.info(clientB.latestState);
    });
  });

  it('joins a channel', async () => {
    setClientStates([clientA, clientB], states['proposed']);
    const channelResult = await clientB.joinChannel(channelId);
    expect(states['running']).toEqual(channelResult);
  });

  describe('updates a channel', () => {
    it('the player whose turn it is can update the channel', async () => {
      setClientStates([clientA, clientB], states['running']);
      const channelResult = await clientA.updateChannel(
        channelId,
        participants,
        allocations,
        UPDATED_APP_DATA
      );
      expect(channelResult).toEqual(states['updated_app_data']);
    });

    it('the player whose turn it is not cannot update the channel', async () => {
      setClientStates([clientA, clientB], states['running']);
      await expect(
        clientB.updateChannel(channelId, participants, allocations, UPDATED_APP_DATA)
      ).rejects.toBeDefined();
    });
  });

  describe('closes a channel', () => {
    it('player with valid turn can make a valid close channel call', async () => {
      setClientStates([clientA, clientB], states['running']);
      const channelResult = await clientA.closeChannel(channelId);
      expect(channelResult).toEqual(states['closing']);
    });

    it('player with invalid turn cannot make a valid close channel call', async () => {
      setClientStates([clientA, clientB], states['running']);
      await expect(clientB.closeChannel(channelId)).rejects.toBeDefined();
    });
  });
});
