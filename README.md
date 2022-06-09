# Documentation

This project uses Truffle Suite for compilation, migration and testing. Truffle is included in the npm packages of the project.

## Install

```
npm install
```

## Compile
```
npx truffle compile
```

## Test
Runs all tests defined in the `test` folder of the project. Starts a server with 10 accounts. Tests are written such that every account participates in the lottery. Run `test` in `truffle develop` for more accounts.
```
npx truffle test
```

## Run Truffle develop server
Start the truffle develop server defined in `truffle-config.js`. Change the `accounts` value to change the number of accounts. Opens a new shell, which can be used to run `compile`, `migrate` and `test`, as well as web3 commands.
```
npx truffle develop
```
Deploy the contracts using the migration scripts.
```
migrate --reset --compile-all
```

Send ETH to MetaMask Wallet:
```
web3.eth.sendTransaction({to:"0x072fcae9ad9aDdDa92D736492A83A411EDDd58b1", from:accounts[0], value: web3.utils.toWei('1')})
```

Send TL to MetaMask Wallet:
```
const TLInstance = await TLToken.deployed();
TLInstance.transfer("0x072fcae9ad9aDdDa92D736492A83A411EDDd58b1", 10000);
```

## Generate Docs from Comments

```
npx solidity-docgen --solc-module solc-0.8.13
```

# API Spec

## `Lottery`

This contract implements a decentralized Lottery based on the ERC721 standard. Each lottery ticket is represented by a ERC721 token. Each lottery round consists of two phases: purchase and reveal. At any time accounts can deposit and withdraw TL tokens. The contract holds a balance of those. In the purchase phase the balance can be used to buy tickets. When buying a ticket a random number concatenated with the sending account address has to be hashed with keccak256 has to be provided. In the reveal phase, it can be decided to either refund the ticket for half of the original price or submit the random number. After the random number was submitted the ticket is eligible for winning. When submitting the random number, it is compared with the original hash. Only the original buyer can submit the random number and collect a refund or prize. When the reveal phase is over and the next lottery round has started, users can check if their tickets have won and collect their prize. When a user buys a ticket, a token representing the ticket is transferred to the user. When a refund or prize is collected, the user must transfer the ticket back to the lottery. In each lottery, the whole prize pool is distributed entirely.

### `onERC721Received(address operator, address from, uint256 tokenId, bytes data) → bytes4` (public)



This function is called by IERC721.safeTransferFrom whenever an ERC721 is transferred to this contract. This should only happen within the collectTicketPrize and collectTicketRefund functions. If a user would transfer a ticket back to the lottery without calling this functions, the right for refund or winning is forfeit.

### `constructor(uint256 _initialLotteryTime, uint256 _purchaseInterval, uint256 _revealInterval, uint256 _ticketPrice, address _token)` (public)



Constructor of Lottery.


### `depositTL(uint256 amnt)` (public)

Deposit TL to your lottery balance. Allowance to the lottery contract address greater than or equal to the deposit amount has to be granted first.


Adds amount of TL to the users balance by using a transferFrom call.


### `withdrawTL(uint256 amnt)` (public)

Withdraw TL to your wallet.


Withdraws amount of TL from the users balance. First it is checked if the amount is lower than or equal than the current balance or the transaction is reverted. Then the transfer function is used to the transfer the TL tokens and the amount is deducted from the balance.


### `getBalance() → uint256 amnt` (public)

Get your current account balance.


Returns the balance of msg.sender.


### `buyTicket(bytes32 hash_rnd_number)` (public)

Buy a lottery ticket using your balance. Sufficient balance has to be in the account. The purchase phase has to be active. The hash value submitted, has to be a random number concatenated with the sender's address and hashed with keccak256. This can be done with soliditySha3(rnd_number,address) in JS or keccak256(rnd_number,address)) in Solidity. The bought ticket will be transferred to your wallet.


The sender has to submit a hash value, which is a random number concatenated with the sender's address and hashed with keccak256. This can be done with soliditySha3(rnd_number,address) in JS or keccak256(rnd_number,address)) in Solidity. It requires the purchase phase to be active and the a balance larger than or equal than the ticket price. The tokenId equals the ticket number and is counted with the _ticketNumber counter. The token is minted to the sender. Then the balance is deducted by ticketPrice. The ticket number is added to ownedTickets. The submitted hash is saved in randomNumberHashes mapped with the ticket number. The moneyCollectedInLottery value of the current lottery is increased by ticket price. The lottery number of ticket is saved in the lotteryNumber mapping. The _ticketNumber counter is incremented.


### `collectTicketRefund(uint256 ticket_no)` (public)

Collect a refund for a ticket. The reveal phase of the lottery, where the ticket has been bought, has to be active and the random number of ticket must not have been submitted. Half of the original ticket price will be refunded. You must be the owner of the ticket and the ticket will be transferred back to the lottery.


It is required that the reveal phase of the lottery, where the ticket has been bought is active. It is further required that the random number for the ticket was not revealed yet, which is checked with the ticketNumberRevealed mapping. The ticket is transferred to the lottery contract using safeTransferFrom. If the sender is not the owner of the ticket, the transaction will be reverted. The balance of the sender is increased by half of ticketPrice. The randomNumberHash for the ticket is deleted. moneyCollectedInLottery is deducted by half of the ticketPrice. The ticket is looked up in ownedTickets and deleted.


### `revealRndNumber(uint256 ticketno, uint256 rnd_number)` (public)

Reveal the random number for the ticket, making the ticket eligible for winning. The reveal phase of the lottery, where ticket was bought, has to be active.


It is required that the reveal phase of the lottery, where the ticket has been bought is active. It is further required that the random number for the ticket was not revealed yet, which is checked with the ticketNumberRevealed mapping. The hash of the submitted random number and the sender address is generated and compared with original value at purchase. The ticketno is added to the revealedTicketNumbers mapping for the current lottery. The xors mapping is used to store the value of XOR over all revealed random numbers. The current valued is XORed with the submitted random number. In the ticketNumberRevealed mapping the value of the ticket number is set to true.


### `getLastOwnedTicketNo(uint256 lottery_no) → uint256, uint8 status` (public)

Get the last owned ticket in given lottery number.


It is required that the sender owns any ticket in the given lottery number. Then the last element of ownedTickets for the sender in the given lottery is returned. Status 1 is returned when a ticket was found.


### `getIthOwnedTicketNo(uint256 i, uint256 lottery_no) → uint256, uint8 status` (public)

Get the ticket with index i for the given lottery number.


It is required that the sender owns any ticket in the given lottery number. It is required that the number of tickets owned by the sender in the lottery is larger than the index. Then the index i of ownedTickets for the sender in the given lottery is returned. Status 1 is returned when a ticket with index i was found.


### `checkIfTicketWon(uint256 ticket_no) → uint256 amount` (public)

Check the prize amount a ticket number has won. The lottery round, where the ticket was purchased, has to be finished.


It is required that the requested ticket number exists. It is required that the lottery round, where the ticket was purchased, is finished. The function does allow to check ticket numbers, that have been refunded. The total number of winning tickets (iMax) is calculated from the total money collected in the lottery round. getIthWinningTicket is called iMax times and if it matches the requested ticket number, the prize amount is accumulated.


### `collectTicketPrize(uint256 ticket_no)` (public)

Collect the ticket prize for given ticket number. You must be the owner of the ticket and the ticket will be transferred back to the lottery.


It is required that the requested ticket number exists. It is required that the lottery round, where the ticket was purchased, is finished. safeTransferFrom is used to transfer the ticket back to the lottery. If the sender is not the owner of the ticket, the transaction will be reverted. checkIfTicketWon is used to add the prize amount to the sender's balance. The ticket is looked up in ownedTickets and deleted.


### `getIthWinningTicket(uint256 i, uint256 lottery_no) → uint256 ticket_no, uint256 amount` (public)

Get the i-th winning ticket for a given lottery number.


It is required that the lottery round, where the ticket was purchased, is finished. The total number of winning tickets (iMax) is calculated from the total money collected in the lottery round. It is required that i is lower than or equal than iMax. The prize amount for i-th winning ticket is calculated. The XOR value of all submitted random numbers is hashed i times using keccak256 and saved in the variable magic. The winning ticket number is determined by taking magic modulo the amount of revealed random numbers.


### `getLotteryNo(uint256 unixtimeinweek) → uint256 lottery_no` (public)

Get the lottery number for a given unix timestamp.


The lottery number is determined with the initialLotteryTime, pruchaseInterval and revealInterval.


### `getTotalLotteryMoneyCollected(uint256 lottery_no) → uint256 amount` (public)

Returns the total money collected in a given lottery.


Requires the lottery to have started. Then returns the total money collected, which is saved in the mapping moneyCollectedInLottery.


### `isPurchaseActive() → bool active` (public)

Check if the purchase phase is currently active.


Calculates if the purchase phase is currently active using initialLotteryTime, pruchaseInterval and revealInterval.


### `isRevealActive() → bool active` (public)

Check if the reveal phase is currently active.


Calculates if the reveal phase is currently active using initialLotteryTime, pruchaseInterval and revealInterval.


### `log2(uint256 x) → uint256 y` (internal)



Internal function that returns the ceiling of log2 for an unsigned integer. Uses the De Bruijn method and is very efficient. gas < 700 From: https://ethereum.stackexchange.com/a/30168



## `TLToken`

Simple ERC20 token used for the lottery contract.




### `constructor(uint256 initialSupply)` (public)



Constructor of TLToken.