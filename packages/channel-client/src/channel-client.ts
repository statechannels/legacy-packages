import {ChannelProviderInterface} from '@statechannels/channel-provider';

import {ChannelClientInterface, UnsubscribeFunction} from './types';
import {
  PushMessageResult,
  ChannelResult,
  Allocation,
  Participant,
  SiteBudget,
  ChannelUpdatedNotification,
  ChannelProposedNotification,
  BudgetUpdatedNotification,
  Message,
  MessageQueuedNotification
} from '@statechannels/client-api-schema';

type TokenAllocations = Allocation[];

export class ChannelClient implements ChannelClientInterface {
  constructor(private readonly provider: ChannelProviderInterface) {}

  onMessageQueued(
    callback: (result: MessageQueuedNotification['params']) => void
  ): UnsubscribeFunction {
    this.provider.on('MessageQueued', callback);
    return (): void => {
      this.provider.off('MessageQueued', callback);
    };
  }

  onChannelUpdated(
    callback: (result: ChannelUpdatedNotification['params']) => void
  ): UnsubscribeFunction {
    this.provider.on('ChannelUpdated', callback);
    return (): void => {
      this.provider.off('ChannelUpdated', callback);
    };
  }

  onChannelProposed(
    callback: (result: ChannelProposedNotification['params']) => void
  ): UnsubscribeFunction {
    this.provider.on('ChannelProposed', callback);
    return (): void => {
      this.provider.off('ChannelProposed', callback);
    };
  }

  onBudgetUpdated(
    callback: (result: BudgetUpdatedNotification['params']) => void
  ): UnsubscribeFunction {
    this.provider.on('BudgetUpdated', callback);
    return (): void => {
      this.provider.off('BudgetUpdated', callback);
    };
  }
  async createChannel(
    participants: Participant[],
    allocations: TokenAllocations,
    appDefinition: string,
    appData: string
  ): Promise<ChannelResult> {
    return this.provider.send({
      method: 'CreateChannel',
      params: {
        participants,
        allocations,
        appDefinition,
        appData
      }
    });
  }

  async joinChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send({method: 'JoinChannel', params: {channelId}});
  }

  async updateChannel(
    channelId: string,
    participants: Participant[],
    allocations: TokenAllocations,
    appData: string
  ): Promise<ChannelResult> {
    return this.provider.send({
      method: 'UpdateChannel',
      params: {
        channelId,
        participants,
        allocations,
        appData
      }
    });
  }

  async getState(channelId: string): Promise<ChannelResult> {
    return this.provider.send({method: 'GetState', params: {channelId}});
  }

  async challengeChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send({
      method: 'ChallengeChannel',
      params: {
        channelId
      }
    });
  }

  async closeChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send({method: 'CloseChannel', params: {channelId}});
  }

  async pushMessage(message: Message): Promise<PushMessageResult> {
    return this.provider.send({method: 'PushMessage', params: message});
  }

  async enableEthereum(): Promise<string> {
    return this.provider.send({method: 'EnableEthereum', params: {}});
  }

  async getAddress(): Promise<string> {
    return this.provider.send({method: 'GetAddress', params: {}});
  }

  async getEthereumSelectedAddress(): Promise<string> {
    return this.provider.send({method: 'GetEthereumSelectedAddress', params: {}});
  }

  async approveBudgetAndFund(
    playerAmount: string,
    hubAmount: string,
    playerOutcomeAddress: string,
    hubAddress: string,
    hubOutcomeAddress: string
  ): Promise<SiteBudget> {
    return this.provider.send({
      method: 'ApproveBudgetAndFund',
      params: {
        playerAmount,
        hubAmount,
        site: window.location.hostname,
        player: {
          participantId: await this.getAddress(),
          signingAddress: await this.getAddress(),
          destination: playerOutcomeAddress
        },
        hub: {
          participantId: hubAddress,
          signingAddress: hubAddress,
          destination: hubOutcomeAddress
        }
      }
    });
  }

  async getBudget(hubAddress: string): Promise<SiteBudget | {}> {
    return this.provider.send({method: 'GetBudget', params: {hubAddress}});
  }

  async closeAndWithdraw(hubAddress: string): Promise<SiteBudget | {}> {
    return this.provider.send({method: 'CloseAndWithdraw', params: {hubAddress}});
  }
}
