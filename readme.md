<h1 align="center">
  <br>
  <a href="https://statechannels.org"><img src="./logo.svg" alt="State Channels" width="350"></a>
</h1>

<h4 align="center">Simple off-chain applications framework for Ethereum.</h4>

<p align="center">
  <a href="https://circleci.com/gh/statechannels/statechannels/tree/master"><img src="https://circleci.com/gh/statechannels/statechannels/tree/master.svg?style=shield" alt="circleci"></a>
  <a href="https://lernajs.io/"><img src="https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg"/></a>
  <a href="https://research.statechannels.org/"><img src="https://img.shields.io/badge/Forums-Chat-blue"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"></a>
</p>
<br>

**LEGACY MONOREPO**: this monorepo contains packages that are no longer being actively supported by 
the state channels project. They are provided here for reference.

**statechannels** is a simple off-chain framework for building **state channel applications** on top of the Ethereum blockchain. It aims to make it simpler to build permissionless applications that have instant finality with zero-fee transactions.

You can learn more about what state channels are by reading [one](https://l4.ventures/papers/statechannels.pdf) or [other](https://magmo.com/force-move-games.pdf) of the whitepapers underpinning the project, or a less technical written [description](https://medium.com/blockchannel/state-channel-for-dummies-part-2-2ffef52220eb).

- [Packages](#packages)
- [Contributing](#contributing)
  - [Installing dependencies](#installing-dependencies)
  - [Building packages](#building-packages)
  - [Clean](#clean)
  - [Lint](#lint)
  - [Tests](#tests)
- [Community](#community)

## Packages

This repository is a monorepo, and contains the following packages maintained with [lerna](https://github.com/lerna/lerna) and [yarn workspaces](https://yarnpkg.com/lang/en/docs/workspaces/):

- [channel-client](./packages/channel-client) : A JavaScript object interface for the state channels client API
- [iframe-channel-provider](./packages/iframe-channel-provider) : Thin wrapper around PostMessage communication between an App and a Wallet
- [client-api-schema](./packages/client-api-schema) : JSON-RPC based schema definitions for the Client API with TypeScript typings
- [xstate-wallet](./packages/xstate-wallet) : A browser wallet implementation

### Installing dependencies

**Make sure you have Yarn v1.17.3 installed**. For easy management of specific Yarn versions, we recommend using [Yarn Version Manager (YVM)](https://github.com/tophat/yvm).

To install the dependencies:

```shell
yarn
```

from the monorepo root.

### Building packages

To build all packages:

```shell
yarn build
```

### Clean

To clean all packages:

```shell
yarn clean
```

### Lint

To lint all packages:

```shell
yarn lint:check
```

To also apply automatic fixes:

```shell
yarn lint:write
```

### Tests

To run all tests:

```shell
yarn test
```

### Authoring conventional commits

We follow the convention at https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional. Your commits will be linted against this convention. You can do this yourself locally by running

```shell
yarn commitlint --from=HEAD~1 --verbose
```

For help authoring commits, you can check out https://commitizen.github.io/cz-cli/.

### Publishing packages

To publish you will need to trigger a github action:

![publishing via a github](./notes/publishing.png)

1. Select the actions tab
2. Select whether you want to do a regular publish (`Publish Packages`) or a pre-release (`Publish Packages (canary)`)
3. Click on `Run workflow`
4. Select the branch (regular publishes will fail unless on master)
5. For regular publishes, a PR will be created to get the updated version and changelog info back into master. You should merge this immediately!

#### Fixing a failed publish

Sometimes things will go wrong on CI and the git tags will be created but the package will not be published.
To fix this you can do the following locally:

```
# fetch down any publish tags
git fetch --tags

# push packages to the registries, without creating new releases
npx lerna publish from-package
```

You might need a `npm login --registry https://testnet.thegraph.com/npm-registry/` if you don't
already have an access token in your `.npmrc`.

## Typescript doc comments

These should adhere to the [TSDoc standard](https://github.com/Microsoft/tsdoc). You can try the [TSDoc playground](https://microsoft.github.io/tsdoc/).

Doc comments will appear in our documentation at https://docs.statechannels.org.

## Community

State Channels Forums: https://research.statechannels.org/
