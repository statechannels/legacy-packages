import {
  Outcome,
  Allocation,
  AssetOutcome,
  isAllocationOutcome,
  AllocationAssetOutcome,
  GuaranteeAssetOutcome,
  Guarantee,
} from '@statechannels/nitro-protocol';
import { hexZeroPad } from 'ethers/utils';
import { AddressZero } from 'ethers/constants';

import { add, subtract, gt } from './mathOps';

import { checkThat } from '.';

export enum Errors {
  DestinationMissing = 'Destination missing from ledger channel',
  InsufficientFunds = 'Insufficient funds in ledger channel',
}

export function allocateToTarget(
  targetAllocation: Allocation,
  ledgerAllocation: Allocation,
  targetChannelId: string
): Outcome {
  let total = '0';

  targetAllocation.forEach(targetItem => {
    const ledgerIdx = ledgerAllocation.findIndex(
      ledgerItem => ledgerItem.destination === targetItem.destination
    );
    if (ledgerIdx === -1) {
      throw new Error(Errors.DestinationMissing);
    }
    let ledgerItem = ledgerAllocation[ledgerIdx];
    try {
      ledgerItem = {
        destination: ledgerItem.destination,
        amount: subtract(ledgerItem.amount, targetItem.amount),
      };
    } catch (e) {
      if (e.message === 'Unsafe subtraction') {
        throw new Error(Errors.InsufficientFunds);
      } else {
        throw e;
      }
    }
    total = add(total, targetItem.amount);
    if (gt(ledgerItem.amount, 0)) {
      ledgerAllocation[ledgerIdx] = ledgerItem;
    } else {
      ledgerAllocation.splice(ledgerIdx, 1);
    }
  });
  ledgerAllocation.push({ destination: targetChannelId, amount: total });
  return ethAllocationOutcome(ledgerAllocation);
}

export function getEthAllocation(outcome: Outcome): Allocation {
  const ethOutcome: AssetOutcome | undefined = outcome.find(
    o => o.assetHolderAddress === AddressZero
  );
  return ethOutcome ? checkThat(ethOutcome, isAllocationOutcome).allocation : [];
}

export function ethAllocationOutcome(allocation: Allocation): AllocationAssetOutcome[] {
  return [
    {
      assetHolderAddress: AddressZero,
      allocation: allocation.map(a => ({ ...a, destination: hexZeroPad(a.destination, 32) })),
    },
  ];
}

export function ethGuaranteeOutcome(guarantee: Guarantee): GuaranteeAssetOutcome[] {
  return [
    {
      assetHolderAddress: AddressZero,
      guarantee,
    },
  ];
}
