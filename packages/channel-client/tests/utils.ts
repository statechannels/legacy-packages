import {FakeChannelClient} from './fakes/fake-channel-client';
import {Participant, Allocation, ChannelStatus, ChannelResult} from '../src/types';
import {ETH_TOKEN_ADDRESS} from './constants';
import {FakeChannelProvider} from './fakes/fake-channel-provider';

export function setClientStates(clients: FakeChannelClient[], state: ChannelResult): void {
  clients.forEach(client => {
    client.setState(state);
  });
}

export function setProviderStates(clients: FakeChannelProvider[], state: ChannelResult): void {
  clients.forEach(client => {
    client.setState(state);
  });
}

export class ChannelResultBuilder {
  private channelResult: ChannelResult;

  constructor(
    participants: Participant[],
    allocations: Allocation[],
    appDefinition: string,
    appData: string,
    channelId: string,
    turnNum: string,
    status: ChannelStatus
  ) {
    this.channelResult = {
      participants,
      allocations,
      appDefinition,
      appData,
      channelId,
      turnNum,
      status
    };
  }

  static from(channelResult: ChannelResult): ChannelResultBuilder {
    return new ChannelResultBuilder(
      channelResult.participants,
      channelResult.allocations,
      channelResult.appDefinition,
      channelResult.appData,
      channelResult.channelId,
      channelResult.turnNum,
      channelResult.status
    );
  }

  build(): ChannelResult {
    return this.channelResult;
  }

  setStatus(status: ChannelStatus): ChannelResultBuilder {
    this.channelResult.status = status;
    return this;
  }

  static setStatus(channelResult: ChannelResult, status: ChannelStatus): ChannelResult {
    return ChannelResultBuilder.from(channelResult)
      .setStatus(status)
      .build();
  }

  setTurnNum(turnNum: string): ChannelResultBuilder {
    this.channelResult.turnNum = turnNum;
    return this;
  }

  static setTurnNum(channelResult: ChannelResult, turnNum: string): ChannelResult {
    return ChannelResultBuilder.from(channelResult)
      .setTurnNum(turnNum)
      .build();
  }

  setAppData(appData: string): ChannelResultBuilder {
    this.channelResult.appData = appData;
    return this;
  }

  static setAppData(channelResult: ChannelResult, appData: string): ChannelResult {
    return ChannelResultBuilder.from(channelResult)
      .setAppData(appData)
      .build();
  }
}

export function buildParticipant(address: string): Participant {
  return {
    participantId: address,
    signingAddress: address,
    destination: address
  };
}

export function buildAllocation(
  destination: string,
  amount: string,
  token: string = ETH_TOKEN_ADDRESS
): Allocation {
  return {
    token,
    allocationItems: [
      {
        destination,
        amount
      }
    ]
  };
}
