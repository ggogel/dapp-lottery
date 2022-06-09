const TLToken = artifacts.require("TLToken");
const Lottery = artifacts.require("Lottery");
const { soliditySha3 } = require("web3-utils");

const jsonrpc = '2.0'
const id = 0;
const initialLotteryTime = 1651438800;
const purchaseInterval = 345600;
const revealInterval = 259200;
const ticketPrice = 10;

// https://github.com/Synthetixio/synthetix/blob/debf03c2afcc63607d4be3f7482ccc52e2c38e3c/test/utils/testUtils.js#L9-L20
const send = payload => {
	if (!payload.jsonrpc) payload.jsonrpc = '2.0';
	if (!payload.id) payload.id = new Date().getTime();

	return new Promise((resolve, reject) => {
		web3.currentProvider.send(payload, (error, result) => {
			if (error) return reject(error);

			return resolve(result);
		});
	});
};

const timeTravel = async seconds => {
  const res = await send({ method:'evm_increaseTime', params:[seconds]});
  await send({ method:'evm_mine', params:[]});
}

const skipToNextPurchasePhase = async () => {
    const LotteryInstance = await Lottery.deployed();

    const time = (await web3.eth.getBlock('latest'))['timestamp'];
    const lottery_no = (await LotteryInstance.getLotteryNo(time)).toNumber();
    const diff = time - initialLotteryTime - lottery_no * (purchaseInterval + revealInterval);
    const skip = purchaseInterval + revealInterval - diff + 1;

    await timeTravel(skip);
}

const skipFromPurchaseToRevealPhase = async () => {
    const LotteryInstance = await Lottery.deployed();

    if(await LotteryInstance.isPurchaseActive()){
        const time = (await web3.eth.getBlock('latest'))['timestamp'];
        const lottery_no = (await LotteryInstance.getLotteryNo(time)).toNumber();
        const diff = time - initialLotteryTime - lottery_no * (purchaseInterval + revealInterval);
        const skip = purchaseInterval - diff + 1;

        await timeTravel(skip);
    }
}


contract('Lottery', (accounts) => {
    it('should skip one hour', async () =>{
        const skip = 3600
        const time = (await web3.eth.getBlock('latest'))['timestamp'];

        await timeTravel(skip);

        const new_time = (await web3.eth.getBlock('latest'))['timestamp'];

        assert.isTrue(new_time >= skip + time && new_time <= skip + time + 5);
    });

    it('should dristribute TL to all accounts', async () =>{
        const TLInstance = await TLToken.deployed();

        for(let i = 1; i < accounts.length; i++){
            await TLInstance.transfer(accounts[i], ticketPrice);
        }

        for(let i = 0; i < accounts.length; i++){
            const balance = (await TLInstance.balanceOf(accounts[i])).toNumber();
            assert.isTrue(balance >= ticketPrice, "balance should be enough to buy two tickets");
        }
    });

    it('should increase TL allowance and deposit TL', async () =>{
        const TLInstance = await TLToken.deployed();
        const LotteryInstance = await Lottery.deployed();

        for(let i = 0; i < accounts.length; i++){
            await TLInstance.increaseAllowance(LotteryInstance.address, ticketPrice, { from: accounts[i] });
            await LotteryInstance.depositTL(ticketPrice, { from: accounts[i] });

            const balance = (await LotteryInstance.getBalance({ from: accounts[i] })).toNumber();

            assert.equal(balance, ticketPrice, "balance doesn't match deposited amount");
        }
    });

    it('should buy a ticket and confirm ownership', async () =>{
        const TLInstance = await TLToken.deployed();
        const LotteryInstance = await Lottery.deployed();

        if(!(await LotteryInstance.isPurchaseActive())){
            await skipToNextPurchasePhase();
        }

        for(let i = 0; i < accounts.length; i++){
            await LotteryInstance.buyTicket(soliditySha3(i,accounts[i]), { from: accounts[i] });

            const time = (await web3.eth.getBlock('latest'))['timestamp'];
            const lottery_no = (await LotteryInstance.getLotteryNo(time)).toNumber();
            const ticket_no = (await LotteryInstance.getLastOwnedTicketNo(lottery_no, { from: accounts[i] }))[0].toNumber();

            assert.equal( await LotteryInstance.ownerOf(ticket_no), accounts[i], "first account isn't the owner")
        }
    });

    it('should skip from purchase phase to correspondant reveal phase', async () =>{
        const LotteryInstance = await Lottery.deployed();

        if(!(await LotteryInstance.isPurchaseActive())){
            await skipToNextPurchasePhase();
        }

        const time = (await web3.eth.getBlock('latest'))['timestamp'];
        const lottery_no = (await LotteryInstance.getLotteryNo(time)).toNumber();

        await skipFromPurchaseToRevealPhase();

        const new_lottery_no = (await LotteryInstance.getLotteryNo(time)).toNumber();

        assert.equal(await LotteryInstance.isRevealActive(), true, "reveal phase isn't active");
        assert.equal(lottery_no, new_lottery_no, "lottery number changed")
    });

    it('should refund every second ticket', async () =>{
        const LotteryInstance = await Lottery.deployed();

        const time = (await web3.eth.getBlock('latest'))['timestamp'];
        const lottery_no = (await LotteryInstance.getLotteryNo(time)).toNumber();

        for(let i = 0; i < accounts.length; i++){
            if(i % 2 == 0){
                const balance = (await LotteryInstance.getBalance({ from: accounts[i] })).toNumber();
                const ticket_no = (await LotteryInstance.getLastOwnedTicketNo(lottery_no, { from: accounts[i] }))[0].toNumber();
                await LotteryInstance.collectTicketRefund(ticket_no, { from: accounts[i] });
                const new_balance = (await LotteryInstance.getBalance({ from: accounts[i] })).toNumber();
                assert.equal(balance + ticketPrice / 2, new_balance, "didn't refund correct amount of TL");
            }
        }
    });


    it('should reveal the random number', async () =>{
        const LotteryInstance = await Lottery.deployed();

        const time = (await web3.eth.getBlock('latest'))['timestamp'];
        const lottery_no = (await LotteryInstance.getLotteryNo(time)).toNumber();

        for(let i = 0; i < accounts.length; i++){
            if(i % 2 == 1){
                const ticket_no = (await LotteryInstance.getLastOwnedTicketNo(lottery_no, { from: accounts[i] }))[0].toNumber();
                await LotteryInstance.revealRndNumber(ticket_no, i, { from: accounts[i] });
            }
        }

    });

    it('should skip to the next purchase phase / lottery', async () =>{
        const LotteryInstance = await Lottery.deployed();

        const time = (await web3.eth.getBlock('latest'))['timestamp'];
        const lottery_no = (await LotteryInstance.getLotteryNo(time)).toNumber();

        await skipToNextPurchasePhase();

        const new_time = (await web3.eth.getBlock('latest'))['timestamp'];
        const new_lottery_no = (await LotteryInstance.getLotteryNo(new_time)).toNumber();

        assert.equal(await LotteryInstance.isPurchaseActive(), true, "purchase phase isn't active");
        assert.equal(lottery_no + 1, new_lottery_no, "lottery number didn't increase by 1")
    });

    it('should check if ticket won', async () =>{
        const LotteryInstance = await Lottery.deployed();

        const time = (await web3.eth.getBlock('latest'))['timestamp'];
        const last_lottery_no = (await LotteryInstance.getLotteryNo(time)).toNumber() - 1;
        const total = (await LotteryInstance.getTotalLotteryMoneyCollected(last_lottery_no)).toNumber();

        console.log("Results of lottery_no: ", last_lottery_no);
        console.log("Total TL collected: ", total)

        let prizes = 0;

        for(let i = 0; i < accounts.length; i++){
            if(i % 2 == 1){
                const ticket_no = (await LotteryInstance.getLastOwnedTicketNo(last_lottery_no,  { from: accounts[i] }))[0].toNumber();
                const prize = (await LotteryInstance.checkIfTicketWon(ticket_no, { from: accounts[i] })).toNumber();
                prizes = prizes + prize;
                if(prize > 0){
                    console.log("ticket_no:", ticket_no, " winner:", i, " prize:", prize);
                }
            }
        }
        assert.equal(total, prizes, "total money collected doesn't match total prize money")
    });

    it('should collect ticket prize and transfer ticket', async () =>{
        const LotteryInstance = await Lottery.deployed();

        const time = (await web3.eth.getBlock('latest'))['timestamp'];
        const last_lottery_no = (await LotteryInstance.getLotteryNo(time)).toNumber() - 1;
        const total = (await LotteryInstance.getTotalLotteryMoneyCollected(last_lottery_no)).toNumber();

        let payout = 0

        for(let i = 0; i < accounts.length; i++){
            if(i % 2 == 1){
                const ticket_no = (await LotteryInstance.getLastOwnedTicketNo(last_lottery_no, { from: accounts[i] }))[0].toNumber();
                const balance = (await LotteryInstance.getBalance({ from: accounts[i] })).toNumber();
                await LotteryInstance.collectTicketPrize(ticket_no, { from: accounts[i] });
                const new_balance = (await LotteryInstance.getBalance({ from: accounts[i] })).toNumber();
                payout = payout - balance + new_balance;
            }
        }

        assert.equal(total, payout, "total money collected doesn't match total payout")
    });

    it('should withdraw all TL', async () =>{
        const TLInstance = await TLToken.deployed();
        const LotteryInstance = await Lottery.deployed();

        for(let i = 0; i < accounts.length; i++){
            const tl_balance = (await TLInstance.balanceOf(accounts[i])).toNumber();
            const balance = (await LotteryInstance.getBalance({ from: accounts[i] })).toNumber();

            await LotteryInstance.withdrawTL(balance, { from: accounts[i] });

            const new_tl_balance = (await TLInstance.balanceOf(accounts[i])).toNumber();
            const new_balance = (await LotteryInstance.getBalance({ from: accounts[i] })).toNumber();

            assert.equal( tl_balance + balance, new_tl_balance, "TL wasn't withdrawn correctly");
            assert.equal( new_balance, 0, "lottery balance isn't zero");
        }
    });
});
