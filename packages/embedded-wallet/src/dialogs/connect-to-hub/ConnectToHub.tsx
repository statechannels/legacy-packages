import debug from 'debug';
import React, {useEffect, useState} from 'react';
import {RouteComponentProps} from 'react-router';
import {useOnboardingFlowContext} from '../../flows';
import {allocate, closeWallet} from '../../message-dispatchers';
import {Dialog, FlowProcess, FlowStep, FlowStepProps, FlowStepStatus} from '../../ui';

const log = debug('wallet:connect-to-hub');

export const FlowSteps = [
  {
    title: 'Deposit 5 ETH',
    status: FlowStepStatus.InProgress
  },
  {
    title: 'Wait for TX to mine',
    status: FlowStepStatus.Pending
  },
  {
    title: 'Wait for hub.com',
    status: FlowStepStatus.Pending
  },
  {
    title: 'Done!',
    status: FlowStepStatus.Pending
  }
];

const ConnectToHub: React.FC<RouteComponentProps> = () => {
  const [steps, setSteps] = useState<FlowStepProps[]>(FlowSteps);

  const onboardingFlowContext = useOnboardingFlowContext();

  useEffect(() => {
    log('Initiated flow step with request %o', onboardingFlowContext.request);
  }, [onboardingFlowContext.request]);

  useEffect(() => {
    if (steps[steps.length - 1].status !== FlowStepStatus.Done) {
      setTimeout(() => {
        const newSteps = [...steps];
        const finishedStep = newSteps.findIndex(step => step.status === FlowStepStatus.InProgress);
        newSteps[finishedStep].status = FlowStepStatus.Done;
        log('step updated: %o', newSteps[finishedStep]);
        if (newSteps[finishedStep + 1]) {
          newSteps[finishedStep + 1].status = FlowStepStatus.InProgress;
        } else {
          setTimeout(() => {
            allocate(onboardingFlowContext.request.id, {
              done: true
            });
            closeWallet();
          }, 1000);
        }
        setSteps(newSteps);
      }, 1000);
    }
  }, [steps, onboardingFlowContext.request.id]);

  return (
    <Dialog title="Connect to Hub" onClose={closeWallet}>
      <FlowProcess>
        {steps.map((step, index) => (
          <FlowStep key={`step${index}`} {...step} />
        ))}
      </FlowProcess>
    </Dialog>
  );
};

export {ConnectToHub};