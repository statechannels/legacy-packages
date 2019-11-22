import { Outcome, store } from '../..';
import { saveConfig } from '../../utils';

const PROTOCOL = 'ledger-defunding';
const success = { type: 'final' };

function defundedOutcome(
  ledgerChannelID: string,
  targetChannelID: string
): Outcome {
  const { outcome } = store.getLatestState(ledgerChannelID);
  const concludedState = store.getLatestState(targetChannelID);

  // Assumes that the target channel only has one entry in the ledger channel
  // TODO: How do we ensure this?
  return outcome
    .filter(item => item.destination !== targetChannelID)
    .concat(concludedState.outcome);
}

const concludeTarget = {
  invoke: {
    src: 'concludeChannel',
    data: 'context => ({ channelID: context.ledgerChannelID })',
    onDone: 'defundTarget',
  },
};

const defundTarget = {
  invoke: {
    src: 'ledgerUpdate',
    data:
      'context => ({ channelID: context.ledgerChannelID, outcome: defundedOutcome( context.ledgerChannelID, context.targetChannelID), })',
    onDone: 'success',
  },
};

const ledgerFundingConfig = {
  key: PROTOCOL,
  initial: 'concludeTarget',
  states: {
    concludeTarget,
    defundTarget,
    success,
  },
};

const guards = {};

saveConfig(ledgerFundingConfig, { guards });
