import {eventChannel, buffers} from "redux-saga";
import {take} from "redux-saga/effects";
import {messageHandler} from "./message-handler";

export function* postMessageListener() {
  const postMessageEventChannel = eventChannel(emitter => {
    const eventListener = (event: MessageEvent) => {
      if (event.data && typeof event.data === "string" && event.data.indexOf("jsonrpc") > -1) {
        emitter(event);
      }
    };

    window.addEventListener("message", eventListener);
    return () => {
      window.removeEventListener("message", eventListener);
    };
  }, buffers.fixed(100));

  while (true) {
    const event: MessageEvent = yield take(postMessageEventChannel);

    yield messageHandler(event.data, event.origin);
  }
}
