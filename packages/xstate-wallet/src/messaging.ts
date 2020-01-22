import {getChannelId, Channel} from '@statechannels/wallet-protocols';
import * as ethers from 'ethers';
import {Interpreter} from 'xstate';
import {Wallet} from '@statechannels/wallet-protocols/lib/src/protocols';
import * as jrs from 'jsonrpc-lite';
import {validateRequest} from './json-rpc-validation/validator';
import {IStore} from '@statechannels/wallet-protocols/lib/src/store';
import {CreateChannelEvent} from '@statechannels/wallet-protocols/lib/src/protocols/wallet/protocol';
import {UpdateChannelParams} from '@statechannels/client-api-schema/types/update-channel';
import {
  createStateFromUpdateChannelParams,
  createJsonRpcAllocationsFromOutcome
} from './utils/json-rpc-utils';
import {CloseChannelParams} from '@statechannels/client-api-schema/types/close-channel';
import {bigNumberify} from 'ethers/utils';
import {ChannelStoreEntry} from '@statechannels/wallet-protocols/lib/src/ChannelStoreEntry';

export async function handleMessage(
  event,
  walletMachine: Interpreter<Wallet.Init, any, Wallet.Events>,
  store: IStore,
  ourWallet: ethers.Wallet
) {
  if (event.data && event.data.jsonrpc && event.data.jsonrpc === '2.0') {
    const jsonRpcMessage = event.data;
    const parsedMessage = jrs.parseObject(event.data);
    switch (parsedMessage.type) {
      case 'notification':
      case 'success':
        console.warn(`Received unexpected JSON-RPC message ${JSON.stringify(jsonRpcMessage)}`);
        break;
      case 'error':
        throw new Error('TODO: Respond with error message');

      case 'request':
        const validationResult = await validateRequest(jsonRpcMessage);
        if (!validationResult.isValid) {
          throw Error('Validation Failure');
        }
        const {id} = parsedMessage.payload;
        switch (parsedMessage.payload.method) {
          case 'GetAddress':
            const address = ourWallet.address;
            window.parent.postMessage(jrs.success(id, address), '*');
            break;
          case 'CreateChannel':
            await handleCreateChannelMessage(
              parsedMessage.payload,
              walletMachine,
              store,
              ourWallet
            );
            break;
          case 'UpdateChannel':
            await handleUpdateChannel(parsedMessage.payload, store);
            break;
          case 'PushMessage':
            await handlePushMessage(parsedMessage.payload, walletMachine);
            break;
          case 'CloseChannel':
            await handleCloseChannel(parsedMessage.payload, store);
            break;
        }
        break;
    }
  }
}

async function handleCloseChannel(payload: jrs.RequestObject, store: IStore) {
  const {id} = payload;
  const {channelId} = payload.params as CloseChannelParams;
  const result = jrs.success(id, await getChannelInfo(channelId, store.getEntry(channelId)));
  window.parent.postMessage(result, '*');
}

async function handleUpdateChannel(payload: jrs.RequestObject, store: IStore) {
  const params = payload.params as UpdateChannelParams;
  const entry = store.getEntry(params.channelId);
  const {latestState} = entry;

  const state = createStateFromUpdateChannelParams(latestState, params);
  const signedState = store.signState(state);
  store.receiveStates([signedState]);
  window.parent.postMessage(
    jrs.success(
      payload.id,
      await getChannelInfo(params.channelId, store.getEntry(params.channelId))
    ),
    '*'
  );
  dispatchChannelUpdatedMessage(params.channelId, store.getEntry(params.channelId));
}

async function handlePushMessage(
  payload: jrs.RequestObject,
  machine: Interpreter<Wallet.Init, any, Wallet.Events>
) {
  machine.send((payload.params as any).data as any);

  window.parent.postMessage(jrs.success(payload.id, {success: true}), '*');
}

async function handleCreateChannelMessage(
  payload: jrs.RequestObject,
  machine: Interpreter<Wallet.Init, any, Wallet.Events>,
  store: IStore,
  ethersWallet: ethers.Wallet
) {
  const params = payload.params as any;
  const {participants} = payload.params as any;

  const address = ethersWallet.address;
  const addressMatches = participants[0].signingAddress === address;

  if (!addressMatches) {
    throw new Error('TODO');
  } else {
    const createChannel: CreateChannelEvent = {
      type: 'CREATE_CHANNEL',
      participants: params.participants,
      allocations: params.allocations[0].allocationItems,
      appDefinition: params.appDefinition,
      appData: params.appData,
      chainId: process.env.NETWORK_CHAIN_ID || '0',
      challengeDuration: 500
    };

    // TODO: Nonce management / setting the chainID correctly (state machines)
    const channel: Channel = {
      participants: params.participants.map(p => p.signingAddress),
      channelNonce: '1',
      chainId: process.env.NETWORK_CHAIN_ID || '0'
    };
    machine.send(createChannel);

    const channelId = getChannelId(channel);
    const response = jrs.success(
      payload.id,
      await getChannelInfo(channelId, store.getEntry(channelId))
    );
    window.parent.postMessage(response, '*');
  }
}

async function getChannelInfo(channelId: string, channelEntry: ChannelStoreEntry) {
  const {participants, latestState} = channelEntry;
  const {appData, appDefinition, turnNum, channel} = latestState;

  // TODO: Status and funding
  const funding = [];
  let status = 'running';
  if (turnNum === 0) {
    status = 'proposed';
  } else if (turnNum < 2 * channel.participants.length - 1) {
    status = 'opening';
  }
  return {
    participants,
    allocations: createJsonRpcAllocationsFromOutcome(latestState.outcome),
    appDefinition,
    appData,
    status,
    funding,
    turnNum,
    channelId
  };
}

// TODO: Probably should be async and the store should have async methods
export function dispatchChannelUpdatedMessage(channelId: string, channelEntry: ChannelStoreEntry) {
  getChannelInfo(channelId, channelEntry).then(channelInfo => {
    // TODO: Right now we assume anything that is not a null channel is an app channel
    if (!!channelInfo.appData && !bigNumberify(channelInfo.appData).isZero()) {
      const notification = jrs.notification('ChannelUpdated', channelInfo);
      window.parent.postMessage(notification, '*');
    }
  });
}

export function sendMessage(recipient: string, message: any) {
  const notification = jrs.notification('MessageQueued', {
    recipient,
    sender: 'TODO',
    data: message
  });
  window.parent.postMessage(notification, '*');
}
