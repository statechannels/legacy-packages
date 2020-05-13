import {ethers} from 'ethers';
import {Participant, State, DomainBudget} from '../../store/types';
import {BigNumberish, bigNumberify, BigNumber} from 'ethers/utils';
import {CHALLENGE_DURATION, HUB, HUB_ADDRESS, ETH_ASSET_HOLDER_ADDRESS} from '../../config';
import {simpleEthAllocation, makeDestination} from '../../utils';

export const wallet1 = new ethers.Wallet(
  '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318'
); // 0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf
export const wallet2 = new ethers.Wallet(
  '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727'
); // 0x2222E21c8019b14dA16235319D34b5Dd83E644A9

// Hub
export const wallet3 = new ethers.Wallet(
  '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29'
); // 0xaaaa84838319627Fa056fC3FC29ab94d479B8502

export const first: Participant = {
  signingAddress: wallet1.address,
  destination: makeDestination(
    '0xaaaa000000000000000000000000000000000000000000000000000000000001'
  ),
  participantId: 'playerA'
};
export const second: Participant = {
  signingAddress: wallet2.address,
  destination: makeDestination(
    '0xbbbb000000000000000000000000000000000000000000000000000000000002'
  ),
  participantId: 'playerB'
};
export const third: Participant = HUB;
export const participants: [Participant, Participant] = [first, second];
export const threeParticipants: [Participant, Participant, Participant] = [first, second, third];

export const appState = (n: BigNumberish, isFinal = false): State => ({
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  appDefinition: '0x0000000000000000000000000000000000000000',
  isFinal,
  turnNum: bigNumberify(n),
  outcome: simpleEthAllocation([
    {destination: first.destination, amount: bigNumberify(1)},
    {destination: second.destination, amount: bigNumberify(3)}
  ]),
  participants,
  channelNonce: bigNumberify('0x01'),
  chainId: '0x01',
  challengeDuration: CHALLENGE_DURATION
});

export const ledgerState = (
  participants: Participant[],
  amounts: BigNumberish[],
  turnNum = 0
): State => ({
  turnNum: bigNumberify(turnNum),
  outcome: simpleEthAllocation(
    amounts.map((a, i) => ({
      destination: participants[i].destination,
      amount: bigNumberify(a)
    }))
  ),
  participants,
  channelNonce: bigNumberify('0x02'),
  chainId: '0x01',
  isFinal: false,
  challengeDuration: CHALLENGE_DURATION,
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  appDefinition: '0x0000000000000000000000000000000000000000'
});

export const TEST_APP_DOMAIN = 'localhost';
export const budget = (send: BigNumber, receive: BigNumber): DomainBudget => ({
  hubAddress: HUB_ADDRESS,
  domain: TEST_APP_DOMAIN,
  forAsset: {
    [ETH_ASSET_HOLDER_ADDRESS]: {
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      availableReceiveCapacity: receive,
      availableSendCapacity: send,
      channels: {}
    }
  }
});
