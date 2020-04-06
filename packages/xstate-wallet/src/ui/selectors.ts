import {
  WorkflowState as AppWorkflowState,
  StateValue as AppStateValue
} from '../workflows/application';
import {WorkflowState as CCCWorkflowState} from '../workflows/confirm';
import {SiteBudget} from '../store/types';
import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {BigNumber} from 'ethers/utils';
import {unreachable} from '../utils';
import {Interpreter} from 'xstate';

export function getApplicationStateValue(
  applicationWorkflowState: AppWorkflowState
): AppStateValue {
  if (typeof applicationWorkflowState.value === 'string') {
    return applicationWorkflowState.value as AppStateValue;
  } else {
    return Object.keys(applicationWorkflowState.value)[0] as AppStateValue;
  }
}

export function getConfirmCreateChannelState(
  applicationWorkflowState: AppWorkflowState
): CCCWorkflowState {
  return applicationWorkflowState.children[Object.keys(applicationWorkflowState.children)[0]]
    .state as CCCWorkflowState;
}
export function getConfirmCreateChannelService(
  applicationWorkflowState: AppWorkflowState
): Interpreter<any> {
  return applicationWorkflowState.children.invokeCreateChannelConfirmation as any;
}

// TODO:Ideally this should be a type guard
export function isConfirmCreateChannel(applicationWorkflowState: AppWorkflowState): boolean {
  return applicationWorkflowState.value === 'confirmingWithUser';
}

export function isApplicationOpening(applicationWorkflowState: AppWorkflowState): boolean {
  const stateValue = getApplicationStateValue(applicationWorkflowState);
  return (
    stateValue === 'joiningChannel' ||
    stateValue === 'creatingChannel' ||
    stateValue === 'openChannelAndFundProtocol'
  );
}

export function getApplicationOpenProgress(applicationWorkflowState: AppWorkflowState): number {
  const stateValue = getApplicationStateValue(applicationWorkflowState);
  switch (stateValue) {
    case 'confirmingWithUser':
      return 0.25;
    case 'joiningChannel':
    case 'creatingChannel':
      return 0.5;
    case 'openChannelAndFundProtocol':
      return 0.75;
    case 'running':
      return 1;
    case 'closing':
    case 'done':
    case 'failure':
    case 'branchingOnFundingStrategy':
      throw Error('Should not be in this state');
    default:
      return unreachable(stateValue);
  }
}

export function getAmountsFromBudget(
  budget: SiteBudget
): {playerAmount: BigNumber; hubAmount: BigNumber} {
  const pending = budget.forAsset[ETH_ASSET_HOLDER_ADDRESS];
  if (!pending) throw new Error('No eth budget found');
  const {availableReceiveCapacity, availableSendCapacity} = pending;
  return {playerAmount: availableSendCapacity, hubAmount: availableReceiveCapacity};
}
