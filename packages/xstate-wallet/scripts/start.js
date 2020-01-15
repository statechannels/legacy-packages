/* eslint-disable require-atomic-updates */
/* eslint-disable @typescript-eslint/no-var-requires */
// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = process.env.BABEL_ENV || 'development';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

let ganacheServer;
let devServer;
// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  if (ganacheServer) {
    ganacheServer.close();
  }
  if (devServer) {
    devServer.close();
  }
  throw err;
});

// Ensure environment variables are read.
const configureEnvVariables = require('@statechannels/devtools').configureEnvVariables;
configureEnvVariables(true);

const chalk = require('chalk');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');

const config = require('../webpack.config');
const {getNetworkName, setupGanache} = require('@statechannels/devtools');
const {deploy} = require('../deployment/deploy');

void (async () => {
  process.on('SIGINT', () => {
    if (devServer) {
      devServer.close();
    }
  });
  process.on('SIGTERM', () => {
    if (devServer) {
      devServer.close();
    }
  });

  const port = !!process.env.PORT ? parseInt(process.env.PORT, 10) : 3055;

  const deployer = await (await setupGanache()).deployer;
  const deployedArtifacts = await deploy(deployer);

  process.env = {...process.env, ...deployedArtifacts};

  process.env.TARGET_NETWORK = getNetworkName(process.env.CHAIN_NETWORK_ID);

  // Serve webpack assets generated by the compiler over a web sever.
  devServer = new WebpackDevServer(webpack(config), {
    hot: true,
    compress: true
  });
  // Launch WebpackDevServer.
  devServer.listen(port, '0.0.0.0', err => {
    if (err) {
      return console.log(err);
    }
    console.log(chalk.cyan(`Starting the development server at 0.0.0.0:${port} ...\n`));
  });
})();