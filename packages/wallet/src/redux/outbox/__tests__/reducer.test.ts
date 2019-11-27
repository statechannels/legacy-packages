import {clearOutbox} from "../reducer";

import * as actions from "../../actions";
import {OutboxState} from "../state";

const mockTransactionOutboxItem = {
  transactionRequest: {to: "0xabc"},
  processId: "processid",
  requestId: "requestId"
};

describe("when a side effect occured", () => {
  const sendMessageA = actions.apiNotImplemented({apiMethod: "testA"});
  const sendMessageB = actions.apiNotImplemented({apiMethod: "testB"});
  const displayOutbox: Array<"Hide" | "Show"> = ["Hide", "Show"];
  const transactionOutbox = [mockTransactionOutboxItem, mockTransactionOutboxItem];
  const messageOutbox = [sendMessageA, sendMessageB];
  const state: OutboxState = {
    displayOutbox,
    transactionOutbox,
    messageOutbox
  };

  it("clears the first element of the displayOutbox", () => {
    const action = actions.displayMessageSent({});
    const updatedState = clearOutbox(state, action);
    expect(updatedState.displayOutbox).toMatchObject(displayOutbox.slice(1));
  });

  it("clears the first element of the messageOutbox", () => {
    const action = actions.messageSent({});
    const updatedState = clearOutbox(state, action);
    expect(updatedState.messageOutbox).toMatchObject(messageOutbox.slice(1));
  });

  it("clears the first element of the transactionOutbox", () => {
    const action = actions.transactionSent({processId: "processId"});
    const updatedState = clearOutbox(state, action);
    expect(updatedState.transactionOutbox).toMatchObject(transactionOutbox.slice(1));
  });
});
