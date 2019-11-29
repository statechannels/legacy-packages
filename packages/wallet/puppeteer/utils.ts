import puppeteer from "puppeteer";

import fs from "fs";
import path from "path";

export async function loadWallet(page: puppeteer.Page, messageListener: (message) => void) {
  // TODO: This is kinda ugly but it works
  // We need to instantiate a web3 for the wallet so we import the web 3 script
  // and then assign it on the window
  const web3JsFile = fs.readFileSync(path.resolve(__dirname, "web3/web3.min.js"), "utf8");
  await page.evaluateOnNewDocument(web3JsFile);
  await page.evaluateOnNewDocument('window.web3 = new Web3("http://localhost:8547")');
  await page.goto("http://localhost:3055/");

  await page.waitFor(3000); // Delay lets things load
  // interceptMessage gets called in puppeteer's context
  await page.exposeFunction("interceptMessage", message => {
    messageListener(message);
  });
  await page.evaluate(() => {
    // We override window.parent.postMessage with our interceptMesage
    (window as any).parent = {...window.parent, postMessage: (window as any).interceptMessage};
  });
}

export async function setUpBrowser(): Promise<puppeteer.Browser> {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    // Needed to allow both windows to execute JS at the same time
    ignoreDefaultArgs: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding"
    ]
  });

  return browser;
}

export async function sendJoinChannel(page: puppeteer.Page, channelId: string) {
  await page.evaluate(cId => {
    window.postMessage(
      {
        jsonrpc: "2.0",
        method: "JoinChannel",
        id: 4,
        params: {
          channelId: cId
        }
      },
      "*"
    );
  }, channelId);
}

export async function sendCreateChannel(page: puppeteer.Page, playerAAddress, playerBAddress) {
  await page.evaluate(
    (a, b) => {
      const participants = [
        {
          participantId: "user-a",
          signingAddress: a,
          destination: a
        },
        {
          participantId: "user-b",
          signingAddress: b,
          destination: b
        }
      ];
      const allocations = [
        {
          token: "0x0",
          allocationItems: [{destination: a, amount: "0x1"}, {destination: b, amount: "0x1"}]
        }
      ];
      window.postMessage(
        {
          jsonrpc: "2.0",
          method: "CreateChannel",
          id: 2,
          params: {
            participants,
            allocations,
            appDefinition: "0x0000000000000000000000000000000000000000",
            appData: "0x0"
          }
        },
        "*"
      );
    },
    playerAAddress,
    playerBAddress
  );
}

export async function sendGetAddress(page: puppeteer.Page) {
  await page.evaluate(() => {
    window.postMessage(
      {
        jsonrpc: "2.0",
        method: "GetAddress",
        id: 1,
        params: {}
      },
      "*"
    );
  });
}

export async function pushMessage(page: puppeteer.Page, message: any) {
  await page.evaluate(m => {
    window.postMessage(
      {
        jsonrpc: "2.0",
        method: "PushMessage",
        id: 10,
        params: m
      },
      "*"
    );
  }, message);
}
