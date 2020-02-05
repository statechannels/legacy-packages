import {
  confirmChannelCreationWorkflow,
  config,
  WorkflowContext
} from '../../workflows/confirm-create-channel';
export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {interpret} from 'xstate';
import {EphemeralStore} from '@statechannels/wallet-protocols';
import {Participant} from '@statechannels/client-api-schema/types/definitions';
import {renderWalletInFrontOfApp} from './helpers';

const store = new EphemeralStore({
  privateKeys: {
    ['0xaddress']: '0xkey'
  },
  ethAssetHolderAddress: '0xassetholder'
});

const alice: Participant = {
  participantId: 'a',
  signingAddress: '0xa',
  destination: '0xad'
};

const bob: Participant = {
  participantId: 'b',
  signingAddress: '0xb',
  destination: '0xbd'
};

const testContext: WorkflowContext = {
  participants: [alice, bob],
  allocations: [],
  appDefinition: '0x0',
  appData: '0x0',
  chainId: '0',
  challengeDuration: 1
};

if (config.states) {
  Object.keys(config.states).forEach(state => {
    const machine = interpret<any, any, any>(
      confirmChannelCreationWorkflow(store).withContext(testContext),
      {
        devTools: true
      }
    ); // start a new interpreted machine for each story
    machine.start(state);
    storiesOf('Workflows / Confirm Channel Creation', module).add(
      state.toString(),
      renderWalletInFrontOfApp(machine)
    );
    machine.stop();
  });
}

// if (config.states) {
//   ['CREATE_CHANNEL', 'OPEN_CHANNEL'].forEach(event => {
//     const machineWithChildren = interpret<any, any, any>(
//       confirmChannelCreationWorkflow(store).withContext(testContext)
//     ).start(); // start a new interpreted machine for each story
//     machineWithChildren.send(event);
//     storiesOf('Application Workflow', module).add(
//       'Initialising + ' + event,
//       renderWalletInFrontOfApp(machineWithChildren)
//     );
//     machineWithChildren.stop();
//   });
// }
