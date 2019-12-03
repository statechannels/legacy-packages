import {applyMiddleware, compose, createStore} from "redux";
import {fork} from "redux-saga/effects";
import createSagaMiddleware from "redux-saga";
import {call} from "redux-saga/effects";
import * as storage from "redux-storage";
const sagaMiddleware = createSagaMiddleware();

import {walletReducer} from "./reducer";
import {sagaManager} from "./sagas/saga-manager";
import filter from "redux-storage-decorator-filter";
import createWallet from "redux-storage-engine-indexed-db";
import {USE_STORAGE} from "../constants";

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
let store;
if (USE_STORAGE) {
  // We currently whitelist the values that we store/load.
  const storageWallet = filter(createWallet("magmo-wallet"), [
    "whitelisted-key",
    ["address"],
    ["privateKey"],
    ["channelStore"],
    ["fundingState"]
  ]);
  const storageMiddleware = storage.createMiddleware(storageWallet);
  const enhancers = composeEnhancers(applyMiddleware(sagaMiddleware, storageMiddleware));
  store = createStore(storage.reducer(walletReducer), enhancers);
  const load = storage.createLoader(storageWallet);

  load(store).then(() => console.log("Successfully loaded state from indexedDB"));
} else {
  const enhancers = composeEnhancers(applyMiddleware(sagaMiddleware));
  store = createStore(walletReducer, enhancers);
}

function* rootSaga() {
  yield fork(sagaManager);
}

function* webAssemblyModuleLoaderSaga() {
  function* dynamicImportSaga(path) {
    return yield call(() => Promise.resolve(new Promise(resolve => import(path).then(resolve))));
  }
  PureEVM = ((yield call(dynamicImportSaga, "pure-evm")) as unknown) as typeof import("pure-evm");
}

// Must run before anything else runs
sagaMiddleware.run(webAssemblyModuleLoaderSaga);

sagaMiddleware.run(rootSaga);

export default store;
export const getWalletState = (storeObj: any) => storeObj.getState();
export const getFundingState = (storeObj: any) => storeObj.getState().fundingState;
