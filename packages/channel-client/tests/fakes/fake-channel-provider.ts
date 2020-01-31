import {ChannelProviderInterface} from '@statechannels/channel-provider/src';
import log = require('loglevel');
import {bigNumberify} from 'ethers/utils';
import {EventEmitter, ListenerFn} from 'eventemitter3';
import {
  Response,
  CreateChannelResult,
  CreateChannelParams,
  PushMessageResult,
  JoinChannelParams,
  UpdateChannelParams,
  Notification,
  CloseChannelParams,
  CloseChannelResult
} from '@statechannels/client-api-schema/types';
import {ChannelResult, Message, SiteBudget} from '../../src/types';
import {calculateChannelId} from '../../src/utils';

const wrapResponse = (
  method: string,
  result: any
): {jsonrpc: '2.0'; id: number; method: string; result: any} => {
  return {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    result
  };
};

/*
 This fake provider becomes the stateful object which handles the calls
 coming from a non-fake `ChannelClient`.
 */
export class FakeChannelProvider implements ChannelProviderInterface {
  private events = new EventEmitter();
  protected url = '';

  playerIndex?: number;
  opponentIndex?: number;
  address?: string;
  opponentAddress?: string;
  latestState?: ChannelResult;

  async enable(url?: string): Promise<void> {
    this.url = url || '';
  }

  async send(method: string, params: any): Promise<Response> {
    switch (method) {
      case 'CreateChannel':
        return wrapResponse('CreateChannel', await this.createChannel(params));
      case 'PushMessage':
        return wrapResponse('PushMessage', await this.pushMessage(params));

      case 'GetAddress':
        return wrapResponse('GetAddress', await this.getAddress());

      case 'JoinChannel':
        return wrapResponse('JoinChannel', await this.joinChannel(params));

      case 'UpdateChannel':
        return wrapResponse('UpdateChannel', await this.updateChannel(params));

      case 'CloseChannel':
        return wrapResponse('CloseChannel', await this.updateChannel(params));
      case 'ApproveBudgetAndFund':
        return wrapResponse('CloseAndWithdraw', await this.approveBudgetAndFund(params));
      case 'CloseAndWithdraw':
        return wrapResponse('CloseAndWithdraw', await this.CloseAndWithdraw(params));
      default:
        return Promise.reject(`No callback available for ${method}`);
    }
  }

  on(event: string, callback: ListenerFn): void {
    this.events.on(event, callback);
  }

  off(event: string): void {
    this.events.off(event);
  }

  subscribe(): Promise<string> {
    return Promise.resolve('success');
  }
  unsubscribe(): Promise<boolean> {
    return Promise.resolve(true);
  }

  setState(state: ChannelResult): void {
    this.latestState = state;
  }

  setAddress(address: string): void {
    this.address = address;
  }

  updatePlayerIndex(playerIndex: number): void {
    if (this.playerIndex === undefined) {
      this.playerIndex = playerIndex;
      this.opponentIndex = playerIndex == 1 ? 0 : 1;
    }
  }

  private async getAddress(): Promise<string> {
    if (this.address === undefined) {
      throw Error('No address has been set yet');
    }
    return this.address;
  }

  private getPlayerIndex(): number {
    if (this.playerIndex === undefined) {
      throw Error(`This client does not have its player index set yet`);
    }
    return this.playerIndex;
  }

  public getOpponentIndex(): number {
    if (this.opponentIndex === undefined) {
      throw Error(`This client does not have its opponent player index set yet`);
    }
    return this.opponentIndex;
  }

  public verifyTurnNum(turnNum: number): Promise<void> {
    const currentTurnNum = bigNumberify(turnNum);
    if (currentTurnNum.mod(2).eq(this.getPlayerIndex())) {
      return Promise.reject(
        `Not your turn: currentTurnNum = ${currentTurnNum}, index = ${this.playerIndex}`
      );
    }
    return Promise.resolve();
  }

  public findChannel(channelId: string): ChannelResult {
    if (!(this.latestState && this.latestState.channelId === channelId)) {
      throw Error(`Channel does't exist with channelId '${JSON.stringify(channelId, null, 4)}'`);
    }
    return this.latestState;
  }

  private async createChannel(params: CreateChannelParams): Promise<CreateChannelResult> {
    const participants = params.participants;
    const allocations = params.allocations;
    const appDefinition = params.appDefinition;
    const appData = params.appData;

    const channel: ChannelResult = {
      participants,
      allocations,
      appDefinition,
      appData,
      funding: [],
      channelId: calculateChannelId(participants, appDefinition),
      turnNum: 0,
      status: 'proposed'
    };
    this.updatePlayerIndex(0);
    this.latestState = channel;
    this.address = channel.participants[0].participantId;
    this.opponentAddress = channel.participants[1].participantId;
    this.notifyOpponent(channel, 'CreateChannel');

    return channel;
  }

  private async joinChannel(params: JoinChannelParams): Promise<ChannelResult> {
    const {channelId} = params;
    const latestState = this.findChannel(channelId);
    this.updatePlayerIndex(1);
    log.debug(`Player ${this.getPlayerIndex()} joining channel ${channelId}`);
    await this.verifyTurnNum(latestState.turnNum);

    // skip funding by setting the channel to 'running' the moment it is joined
    // [assuming we're working with 2-participant channels for the time being]
    this.latestState = {
      ...latestState,
      turnNum: 3,
      status: 'running'
    };
    this.opponentAddress = latestState.participants[0].participantId;
    this.notifyOpponent(this.latestState, 'joinChannel');

    return this.latestState;
  }

  private async updateChannel(params: UpdateChannelParams): Promise<ChannelResult> {
    const channelId = params.channelId;
    const participants = params.participants;
    const allocations = params.allocations;
    const appData = params.appData;

    log.debug(`Player ${this.getPlayerIndex()} updating channel ${channelId}`);
    const latestState = this.findChannel(channelId);

    const nextState = {...latestState, participants, allocations, appData};
    if (nextState !== latestState) {
      await this.verifyTurnNum(nextState.turnNum);
      nextState.turnNum = latestState.turnNum + 1;
      log.debug(`Player ${this.getPlayerIndex()} updated channel to turnNum ${nextState.turnNum}`);
    }

    this.latestState = nextState;

    this.notifyOpponent(this.latestState, 'ChannelUpdate');
    return this.latestState;
  }

  private async closeChannel(params: CloseChannelParams): Promise<CloseChannelResult> {
    const latestState = this.findChannel(params.channelId);
    await this.verifyTurnNum(latestState.turnNum);
    const turnNum = latestState.turnNum + 1;
    const status = 'closing';

    this.latestState = {...latestState, turnNum, status};
    log.debug(
      `Player ${this.getPlayerIndex()} updated channel to status ${status} on turnNum ${turnNum}`
    );
    this.notifyOpponent(this.latestState, 'ChannelUpdate');

    return this.latestState;
  }

  // TODO: Craft a full message
  protected notifyAppChannelUpdated(data: ChannelResult): void {
    const message: Notification = {
      jsonrpc: '2.0',
      method: 'ChannelUpdated',
      params: data
    };
    this.events.emit('ChannelUpdated', message);
  }
  protected notifyAppBudgetUpdated(data: SiteBudget): void {
    // TODO: Define budget type in the json-rpc types
    const message: Notification = {
      jsonrpc: '2.0',
      method: 'BudgetUpdated',
      params: data
    };
    this.events.emit('BudgetUpdated', message);
  }

  protected notifyOpponent(data: ChannelResult, notificationType: string): void {
    log.debug(
      `${this.getPlayerIndex()} notifying opponent ${this.getOpponentIndex()} about ${notificationType}`
    );
    const sender = this.address;
    const recipient = this.opponentAddress;

    if (!recipient) {
      throw Error(`Cannot notify opponent - opponent address not set`);
    }
    this.events.emit('MessageQueued', {sender, recipient, data});
  }

  private async pushMessage(params: Message<ChannelResult>): Promise<PushMessageResult> {
    this.latestState = params.data;
    this.notifyAppChannelUpdated(this.latestState);
    const turnNum = this.latestState.turnNum + 1;

    switch (params.data.status) {
      case 'proposed':
        this.events.emit('ChannelProposed', {params: params.data});
        break;
      // auto-close, if we received a close
      case 'closing':
        this.latestState = {...this.latestState, turnNum, status: 'closed'};
        this.notifyOpponent(this.latestState, 'ChannelUpdate');
        this.notifyAppChannelUpdated(this.latestState);
        break;
      default:
        break;
    }

    return {success: true};
  }

  private async approveBudgetAndFund(params: {
    playerAmount: string;
    hubAmount: string;
    playerDestinationAddress: string;
    hubAddress: string;
    hubDestinationAddress: string;
  }): Promise<SiteBudget> {
    const {hubAddress, playerAmount, hubAmount} = params;
    // TODO: Does this need to be delayed?
    this.notifyAppBudgetUpdated({
      hub: hubAddress,
      site: 'fakehub.com',
      inUse: {playerAmount: '0x0', hubAmount: '0x0'},
      free: {playerAmount, hubAmount},
      pending: {playerAmount: '0x0', hubAmount: '0x0'},
      direct: {playerAmount: '0x0', hubAmount: '0x0'}
    });
    return {
      hub: hubAddress,
      site: 'fakehub.com',
      pending: {playerAmount, hubAmount},
      free: {playerAmount: '0x0', hubAmount: '0x0'},
      inUse: {playerAmount: '0x0', hubAmount: '0x0'},
      direct: {playerAmount: '0x0', hubAmount: '0x0'}
    };
  }
  private async CloseAndWithdraw(params: {
    playerAmount: string;
    hubAmount: string;
    hubAddress: string;
  }): Promise<SiteBudget> {
    const {hubAddress, playerAmount, hubAmount} = params;
    const budget = {
      hub: hubAddress,
      site: 'fakehub.com',
      pending: {playerAmount, hubAmount},
      free: {playerAmount: '0x0', hubAmount: '0x0'},
      inUse: {playerAmount: '0x0', hubAmount: '0x0'},
      direct: {playerAmount: '0x0', hubAmount: '0x0'}
    };

    // TODO: Does this need to be delayed?

    this.notifyAppBudgetUpdated({
      hub: hubAddress,
      site: 'fakehub.com',
      inUse: {playerAmount: '0x0', hubAmount: '0x0'},
      free: {playerAmount: '0x0', hubAmount: '0x0'},
      pending: {playerAmount: '0x0', hubAmount: '0x0'},
      direct: {playerAmount: '0x0', hubAmount: '0x0'}
    });

    return budget;
  }
}
