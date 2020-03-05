import {
  StateNodeConfig,
  MachineConfig,
  Machine,
  MachineOptions,
  AnyEventObject,
  DoneInvokeEvent,
  ServiceConfig,
  assign,
  spawn
} from 'xstate';
import {filter, flatMap} from 'rxjs/operators';

import {Store} from '../store/memory-store';
import {LedgerFunding, VirtualFundingAsLeaf} from '.';
import {checkThat} from '../utils';
import {isSimpleEthAllocation} from '../utils/outcome';

import {FundGuarantor, AllocationItem, isFundGuarantor, Participant} from '../store/types';

import _ from 'lodash';
import {Role, States} from './virtual-funding-as-leaf';

type Init = VirtualFundingAsLeaf.Init;

type Deductions = {
  deductions: {
    [Role.A]: AllocationItem[];
    [Role.B]: AllocationItem[];
  };
};

type WithDeductions = Init & Deductions;

type TEvent = AnyEventObject;

const enum Actions {
  assignDeductions = 'assignDeductions',
  watchObjectives = 'watchObjectives'
}

const enum Services {
  getDeductions = 'getDeductions',
  waitForFirstJointState = 'waitForFirstJointState',
  jointChannelUpdate = 'jointChannelUpdate',
  supportState = 'supportState',
  ledgerFunding = 'ledgerFunding'
}

const enum Events {
  FundGuarantorWithA = 'FundGuarantorWithA',
  FundGuarantorWithB = 'FundGuarantorWithB'
}

const waitThenFundGuarantor = (
  role: Role.A | Role.B
): StateNodeConfig<WithDeductions, any, any> => {
  const event = role === Role.A ? Events.FundGuarantorWithA : Events.FundGuarantorWithB;
  return {
    initial: 'waitForObjective',
    states: {
      waitForObjective: {on: {[event]: 'runObjective'}},
      runObjective: {
        invoke: {
          src: Services.ledgerFunding,
          data: (ctx: WithDeductions, {data}: FundGuarantor): LedgerFunding.Init => {
            return {
              targetChannelId: data.guarantorId,
              ledgerChannelId: data.ledgerId,
              deductions: ctx.deductions[role]
            };
          },
          onDone: 'done'
        }
      },
      done: {type: 'final'}
    }
  };
};

export const config: MachineConfig<Init, any, any> = {
  key: 'virtual-funding-as-hub',
  id: 'workflow',
  initial: States.setupJointChannel,
  states: {
    ...VirtualFundingAsLeaf.config.states,
    [States.fundJointChannel]: {
      type: 'parallel',
      entry: [Actions.watchObjectives, Actions.assignDeductions],
      states: {
        fundGuarantorAH: waitThenFundGuarantor(Role.A),
        fundGuarantorBH: waitThenFundGuarantor(Role.B)
      },
      onDone: States.fundTargetChannel
    }
  }
};

const getDeductions = (store: Store) => async (ctx: Init): Promise<Deductions> => {
  const {latest} = await store.getEntry(ctx.jointChannelId);
  const {allocationItems} = checkThat(latest.outcome, isSimpleEthAllocation);

  return {
    deductions: {
      [Role.A]: [
        {
          destination: allocationItems[Role.Hub].destination,
          amount: allocationItems[Role.B].amount
        },
        allocationItems[Role.A]
      ],
      [Role.B]: [
        {
          destination: allocationItems[Role.Hub].destination,
          amount: allocationItems[Role.A].amount
        },
        allocationItems[Role.B]
      ]
    }
  };
};

const watchObjectives = (store: Store) => (ctx: Init) => {
  return store.newObjectiveFeed.pipe(
    filter(isFundGuarantor),
    filter(o => o.data.jointChannelId === ctx.jointChannelId),
    flatMap(async o => {
      const participant = o.participants[0].participantId;
      const jointParticipants: Participant[] = await (await store.getEntry(ctx.jointChannelId))
        .channelConstants.participants;

      switch (participant) {
        case jointParticipants[Role.A].participantId:
          return {...o, type: Events.FundGuarantorWithA};
        case jointParticipants[Role.B].participantId:
          return {...o, type: Events.FundGuarantorWithB};
        default:
          throw 'Participant not found';
      }
    })
  );
};

export const options = (store: Store): Partial<MachineOptions<Init, TEvent>> => {
  const actions: Record<Actions, any> = {
    watchObjectives: assign<any>({watcher: (ctx: Init) => spawn(watchObjectives(store)(ctx))}),
    [Actions.assignDeductions]: assign(
      (ctx: Init, {data}: DoneInvokeEvent<Deductions>): WithDeductions => ({
        ...ctx,
        ...data
      })
    )
  };

  const leafServices = VirtualFundingAsLeaf.options(store).services;
  const services: Record<Services, ServiceConfig<Init>> = {
    getDeductions: getDeductions(store),
    supportState: leafServices.supportState,
    ledgerFunding: leafServices.ledgerFunding,
    waitForFirstJointState: leafServices.waitForFirstJointState,
    jointChannelUpdate: leafServices.jointChannelUpdate
  };

  return {actions, services};
};

export const machine = (store: Store) => Machine(config, options(store));
