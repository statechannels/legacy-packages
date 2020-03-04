import * as firebase from 'firebase';
import {configureEnvVariables} from '@statechannels/devtools';
import {cFirebasePrefix} from '../src/constants';
import {Message} from '@statechannels/wire-format';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages: Array<Message> = require('./message-sequence.json');

configureEnvVariables(true);

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT}.firebaseapp.com`,
  databaseURL: `https://${process.env.FIREBASE_PROJECT}.firebaseio.com`,
  projectId: process.env.FIREBASE_PROJECT,
  storageBucket: '',
  messagingSenderId: '913007764573'
};

let firebaseApp: firebase.app.App;
function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }
  firebaseApp = firebase.initializeApp(config);
  return firebaseApp;
}

function getMessagesRef() {
  const firebaseAppInsance = getFirebaseApp();
  return firebaseAppInsance.database().ref(`${cFirebasePrefix}/messages`);
}

async function sendMessage(message: Message) {
  return getMessagesRef()
    .child(message.recipient)
    .push(message);
}

async function readAndFeedMessages() {
  console.log(messages.length);
  await Promise.all(messages.map(sendMessage));
  getFirebaseApp().delete();
}

if (require.main === module) {
  readAndFeedMessages();
}
