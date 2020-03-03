import {
  StateNodeConfig,
  MachineConfig,
  Machine,
  MachineOptions,
  AnyEventObject,
  DoneInvokeEvent,
  ServiceConfig,
  assign
} from 'xstate';
import {filter, map, take, flatMap, tap} from 'rxjs/operators';

import {Store, supportedStateFeed} from '../store/memory-store';
import {SupportState, LedgerFunding} from '.';
import {checkThat, getDataAndInvoke} from '../utils';
import {simpleEthGuarantee, isSimpleEthAllocation, simpleEthAllocation} from '../utils/outcome';

import {FundGuarantor, AllocationItem} from '../store/types';

import {bigNumberify} from 'ethers/utils';
import {CHALLENGE_DURATION} from '../constants';
import _ from 'lodash';

export const enum Role {
  A = 0,
  Hub = 1,
  B = 2
}

export type Init = {
  targetChannelId: string;
  jointChannelId: string;
};

type WithDeductions = Init & {deductions: AllocationItem[]};

const getObjective = (store: Store, peer: Role.A | Role.B) => async ({
  jointChannelId
}: Init): Promise<FundGuarantor> => {
  const entry = await store.getEntry(jointChannelId);
  const {participants: jointParticipants} = entry.channelConstants;
  const participants = [jointParticipants[peer], jointParticipants[Role.Hub]];

  const {channelId: ledgerId} = await store.getLedger(jointParticipants[Role.Hub].participantId);
  const {channelId: guarantorId} = await store.createChannel(participants, CHALLENGE_DURATION, {
    turnNum: bigNumberify(0),
    appData: '0x',
    isFinal: false,
    outcome: simpleEthGuarantee(jointChannelId, ...participants.map(p => p.destination))
  });

  return {
    type: 'FundGuarantor',
    participants,
    data: {jointChannelId, ledgerId, guarantorId}
  };
};

type TEvent = AnyEventObject;

const enum Actions {
  triggerGuarantorObjective = 'triggerGuarantorObjective',
  assignDeductions = 'assignDeductions'
}

const enum States {
  determineDeductions = 'determineDeductions',
  setupJointChannel = 'setupJointChannel',
  fundJointChannel = 'fundJointChannel',
  fundTargetChannel = 'fundTargetChannel',
  failure = '#workflow.failure',
  success = 'success'
}

const enum Services {
  getDeductions = 'getDeductions',
  waitForFirstJointState = 'waitForFirstJointState',
  jointChannelUpdate = 'jointChannelUpdate',
  supportState = 'supportState',
  ledgerFunding = 'ledgerFunding',
  fundGuarantorAH = 'fundGuarantorAH',
  fundGuarantorBH = 'fundGuarantorBH'
}

const fundJointChannel = (role: Role): StateNodeConfig<Init, any, TEvent> => {
  const fundGuarantor = (objective: Services.fundGuarantorAH | Services.fundGuarantorBH) => ({
    initial: 'getObjective',
    states: {
      getObjective: {invoke: {src: objective, onDone: 'runObjective'}},
      runObjective: {
        entry: Actions.triggerGuarantorObjective,
        invoke: {
          src: Services.ledgerFunding,
          data: (
            {deductions}: WithDeductions,
            {data}: DoneInvokeEvent<FundGuarantor>
          ): LedgerFunding.Init => ({
            targetChannelId: data.data.guarantorId,
            ledgerChannelId: data.data.ledgerId,
            deductions
          }),
          onDone: 'done'
        }
      },
      done: {type: 'final'}
    }
  });

  const waitThenFundGuarantor = (
    objective: Services.fundGuarantorAH | Services.fundGuarantorBH
  ) => ({
    initial: 'waitForObjective',
    states: {
      waitForObjective: {on: {FundGuarantor: 'runObjective'}},
      runObjective: {
        invoke: {
          src: Services.ledgerFunding,
          data: ({deductions}, {data}: FundGuarantor): LedgerFunding.Init => ({
            targetChannelId: data.guarantorId,
            ledgerChannelId: data.ledgerId,
            deductions
          }),
          onDone: 'done'
        }
      },
      done: {type: 'final'}
    }
  });

  let config;
  switch (role) {
    case Role.A:
      config = fundGuarantor(Services.fundGuarantorAH);
      break;
    case Role.B:
      config = fundGuarantor(Services.fundGuarantorBH);
      break;
    case Role.Hub:
      config = {
        type: 'parallel',
        states: {
          fundGuarantorAH: waitThenFundGuarantor(Services.fundGuarantorAH),
          fundGuarantorBH: waitThenFundGuarantor(Services.fundGuarantorBH)
        }
      };
  }

  return {...config, onDone: States.fundTargetChannel};
};

const generateConfig = (role: Role): MachineConfig<Init, any, any> => ({
  key: 'virtual-funding',
  id: 'workflow',
  initial: States.setupJointChannel,
  states: {
    [States.setupJointChannel]: getDataAndInvoke<Init, Services>(
      {src: Services.waitForFirstJointState, opts: {onError: '#workflow.failure'}},
      {src: Services.supportState},
      States.determineDeductions
    ),
    [States.determineDeductions]: {
      invoke: {src: Services.getDeductions, data: ctx => ctx, onDone: States.fundJointChannel},
      exit: Actions.assignDeductions
    },
    [States.fundJointChannel]: fundJointChannel(role),
    [States.fundTargetChannel]: getDataAndInvoke(
      {src: Services.jointChannelUpdate},
      {src: Services.supportState},
      States.success
    ),
    success: {type: 'final'},
    failure: {}
  }
});

export const config = generateConfig(Role.Hub);

const waitForFirstJointState = (store: Store) => ({
  jointChannelId
}: Init): Promise<SupportState.Init> =>
  store
    .channelUpdatedFeed(jointChannelId)
    .pipe(
      flatMap(e => e.states),
      filter(({turnNum}) => turnNum.eq(0)),
      tap(({outcome, participants}) => {
        const {allocationItems} = checkThat(outcome, isSimpleEthAllocation);
        const destinations = allocationItems.map(i => i.destination);
        const amounts = allocationItems.map(i => i.amount);

        if (
          destinations[Role.A] === participants[Role.A].destination &&
          destinations[Role.Hub] === participants[Role.Hub].destination &&
          destinations[Role.B] === participants[Role.B].destination &&
          amounts[Role.A].add(amounts[Role.B]).eq(amounts[Role.Hub])
        ) {
          return;
        } else throw 'Invalid first state';
      }),
      map(s => ({state: s})),
      take(1)
    )
    .toPromise();

const jointChannelUpdate = (store: Store) => ({
  jointChannelId,
  targetChannelId
}: Init): Promise<SupportState.Init> =>
  supportedStateFeed(store, jointChannelId)
    .pipe(
      filter(({state}) => state.turnNum.eq(0)),
      map(({state}) => {
        const oldOutcome = checkThat(state.outcome, isSimpleEthAllocation);
        const amount = oldOutcome.allocationItems[Role.Hub].amount;
        const outcome = simpleEthAllocation([
          {destination: targetChannelId, amount},
          {destination: state.participants[Role.Hub].destination, amount}
        ]);
        return {state: {...state, turnNum: bigNumberify(1), outcome}};
      }),
      take(1)
    )
    .toPromise();

const getDeductions = (store: Store) => async (ctx: Init): Promise<AllocationItem[]> => {
  const {latest, myIndex} = await store.getEntry(ctx.jointChannelId);
  const {allocationItems} = checkThat(latest.outcome, isSimpleEthAllocation);

  const deductions = [
    {
      destination: allocationItems[1].destination,
      amount: allocationItems[2 - myIndex].amount
    },
    allocationItems[myIndex]
  ];

  return deductions;
};

export const options = (store: Store): Partial<MachineOptions<Init, TEvent>> => {
  const actions: Record<Actions, any> = {
    [Actions.triggerGuarantorObjective]: (_, {data}: DoneInvokeEvent<FundGuarantor>) =>
      store.addObjective(data),
    [Actions.assignDeductions]: assign(
      (ctx: Init, {data: deductions}: DoneInvokeEvent<AllocationItem[]>): WithDeductions => ({
        ...ctx,
        deductions
      })
    )
  };

  const services: Record<Services, ServiceConfig<Init>> = {
    getDeductions: getDeductions(store),
    supportState: SupportState.machine(store as any),
    ledgerFunding: LedgerFunding.machine(store),
    waitForFirstJointState: waitForFirstJointState(store),
    jointChannelUpdate: jointChannelUpdate(store),
    fundGuarantorAH: getObjective(store, Role.A),
    fundGuarantorBH: getObjective(store, Role.B)
  };

  return {actions, services};
};

export const machine = (store: Store, context: Init, role: Role) =>
  Machine(generateConfig(role), options(store)).withContext(context);
