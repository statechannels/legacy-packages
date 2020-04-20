import React from 'react';
import './wallet.scss';

import {useService} from '@xstate/react';

import {formatEther} from 'ethers/utils';
import {Button, Heading, Flex, Text, Link} from 'rimble-ui';
import {getAmountsFromBudget} from './selectors';
import {CloseLedgerAndWithdrawService} from '../workflows/close-ledger-and-withdraw';
import {SiteBudget} from '../store';

interface Props {
  service: CloseLedgerAndWithdrawService;
}

export const CloseLedgerAndWithdraw = (props: Props) => {
  const [current, send] = useService(props.service);

  const waitForUserApproval = ({waiting, budget}: {waiting: boolean; budget: SiteBudget}) => {
    const {playerAmount} = getAmountsFromBudget(budget);
    return (
      <Flex alignItems="left" flexDirection="column">
        <Heading textAlign="center" mb={0}>
          Withdraw Funds
        </Heading>
        <Heading textAlign="center" as="h4" mt={0} mb={2}>
          {budget.domain}
        </Heading>
        <Text fontSize={1} pb={2}>
          Close your hub connection with <strong>{budget.domain}</strong> and withdraw your funds?
        </Text>

        <Text pb={3} fontSize={1}>
          You will receive {formatEther(playerAmount)} ETH and the budget will be closed with the
          channel hub.
        </Text>
        <Button
          disabled={waiting}
          onClick={() => send('USER_APPROVES_CLOSE')}
          id="approve-withdraw"
        >
          Close and Withdraw
        </Button>
        <Button.Text onClick={() => send('USER_REJECTS_CLOSE')}>Cancel</Button.Text>
      </Flex>
    );
  };

  const talkingToHub = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Withdraw funds</Heading>

      <Text textAlign="center">Communicating with the hub</Text>
    </Flex>
  );
  const working = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Withdraw funds</Heading>

      <Text textAlign="center">Working...</Text>
    </Flex>
  );

  const withdrawSubmitTransaction = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Withdraw funds</Heading>

      <Text textAlign="center">Please approve the transaction in metamask</Text>
    </Flex>
  );

  const withdrawWaitMining = ({transactionId}: {transactionId: string}) => (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Withdraw funds</Heading>

      <Text pb={2}>Waiting for your transaction to be mined.</Text>

      <Text>
        Click <Link href={`https://etherscan.io/tx/${transactionId}`}>here</Link> to follow the
        progress on etherscan.
      </Text>
    </Flex>
  );

  if (current.matches('waitForUserApproval')) {
    const {budget} = current.context;
    return waitForUserApproval({waiting: false, budget});
  } else if (
    current.matches('createObjective') ||
    current.matches('fetchBudget') ||
    current.matches('clearBudget')
  ) {
    return working;
  } else if (
    current.matches({closeLedger: 'constructFinalState'}) ||
    current.matches({closeLedger: 'supportState'})
  ) {
    return talkingToHub;
  } else if (current.matches({withdraw: 'submitTransaction'})) {
    return withdrawSubmitTransaction;
  } else if (current.matches({withdraw: 'waitMining'})) {
    return withdrawWaitMining(current.context);
  } else if (current.matches('done')) {
    // workflow hides ui, so user shouldn't ever see this
    return <div>Success! Returning to app..</div>;
  } else if (current.matches('budgetFailure')) {
    // workflow hides ui, so user shouldn't ever see this
    return <div>Failed :(. Returning to app..</div>;
  } else {
    return <div>Todo</div>;
  }
};
