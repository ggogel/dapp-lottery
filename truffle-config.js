const HDWalletProvider = require("@truffle/hdwallet-provider");

const mnemonic = "INSERT MNEMONIC FOR DEPLOYMENT"

module.exports = {
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      accounts: 500,
      blockTime: 10
    },
    fuji: {
      provider: () => new HDWalletProvider(mnemonic, `https://api.avax-test.network/ext/bc/C/rpc`),
      network_id: 43113,
      timeoutBlocks: 200,
      confirmations: 5
    }
  },
  compilers: {
     solc: {
       version: "0.8.13" 
     }
  },
  mocha: {
    enableTimeouts: false
  }
};
