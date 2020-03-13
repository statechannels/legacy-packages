import '../env'; // Note: importing this module has the side effect of modifying env vars

import * as Sentry from '@sentry/node';

if (process.env.RUNTIME_ENV) {
  Sentry.init({
    dsn: 'https://18f53d1daf144411b98547e2ac93a914@sentry.io/4410960',
    environment: process.env.RUNTIME_ENV
  });
}
import {logger} from './logger';
import {fbListen} from './message/firebase-relay';
import {Message} from '@statechannels/wire-format';
import {respondToMessage} from './wallet/respond-to-message';
import {ethAssetHolderObservable} from './blockchain/eth-asset-holder-watcher';
import {subscribeToEthAssetHolder} from './wallet/chain-event';

const log = logger();

function responseForMessage(incomingMessage: Message): Message[] {
  log.info({incomingMessage}, 'Received message from firebase');
  return respondToMessage(incomingMessage);
}

export async function startServer() {
  subscribeToEthAssetHolder(await ethAssetHolderObservable());
  fbListen(responseForMessage);
}

if (require.main === module) {
  startServer();
}
