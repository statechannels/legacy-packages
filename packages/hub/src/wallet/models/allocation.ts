import {Bytes32} from '@statechannels/nitro-protocol/lib/src/contract/types';
import {Uint256, Uint32} from 'fmg-core';
import {Model, snakeCaseMappers} from 'objection';
import Outcome from './outcome';

export default class Allocation extends Model {
  static tableName = 'allocations';

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static relationMappings = {
    outcome: {
      relation: Model.BelongsToOneRelation,
      modelClass: Outcome,
      join: {
        from: 'allocations.outcome_id',
        to: 'outcomes.id'
      }
    }
  };
  readonly id!: number;
  destination!: Bytes32;
  amount: Uint256;
  priority!: Uint32;
}
