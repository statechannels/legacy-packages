import {BudgetItem, SiteBudget} from '../store/types';
import {HUB_ADDRESS, ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';

export function ethBudget(
  site: string,
  opts: {
    free?: BudgetItem;
    inUse?: BudgetItem;
    pending?: BudgetItem;
    direct?: BudgetItem;
  }
): SiteBudget {
  return {
    site,
    hubAddress: HUB_ADDRESS,
    forAsset: {
      [ETH_ASSET_HOLDER_ADDRESS]: _.assign(
        {
          assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
          free: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)},
          inUse: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)},
          pending: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)},
          direct: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)}
        },
        opts
      )
    }
  };
}
