const TLToken = artifacts.require("TLToken");
const Lottery = artifacts.require("Lottery");

const initialSupply = 1000000000000000000000n;
const initialLotteryTime = 1651438800;
// 4 Days = 345600
const purchaseInterval = 345600;
// 3 Days = 259200
const revealInterval = 259200;
const ticketPrice = 10;

module.exports = async function(deployer) {
  await deployer.deploy(TLToken, initialSupply);
  await deployer.deploy(Lottery, initialLotteryTime, purchaseInterval, revealInterval, ticketPrice,TLToken.address);
};