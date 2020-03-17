import {ethers} from 'ethers';

// TODO import {ChainWatcher} from './chain';
import {XstateStore} from './store';

import {ChannelWallet} from './channel-wallet';
import {MessagingService} from './messaging';
import {ChainWatcher} from './chain';
(async function() {
  const {privateKey} = ethers.Wallet.createRandom();
  const chain = new ChainWatcher();
  const store = new XstateStore(chain);
  await store.initialize([privateKey]);
  const messagingService = new MessagingService(store);
  const channelWallet = new ChannelWallet(store, messagingService);

  // Communicate via postMessage
  window.addEventListener('message', async event => {
    if (event.data && event.data.jsonrpc && event.data.jsonrpc === '2.0') {
      process.env.ADD_LOGS &&
        console.log(`INCOMING JSONRPC REQUEST: ${JSON.stringify(event.data, null, 1)}`);
      channelWallet.pushMessage(event.data);
    }
  });
  channelWallet.onSendMessage(m => {
    window.parent.postMessage(m, '*');
    process.env.ADD_LOGS && console.log(`OUTGOING JSONRPC MESSAGE: ${JSON.stringify(m, null, 1)}`);
  });
})();
