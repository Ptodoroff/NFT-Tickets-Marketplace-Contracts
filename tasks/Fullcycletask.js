// task is run by typing npx hardhat fullcycle

const ether = require("@openzeppelin/test-helpers/src/ether");
const { task } = require("hardhat/config");

task(
  "fullcycle",
  "Does a full cycle of the contract's functionality"
).setAction(async (setArgs, hre) => {
  // Defining signers and deploying the mock VRF contract
  [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

  let vrfCoordinatorV2Mock = await ethers.getContractFactory(
    "VRFCoordinatorV2Mock"
  );
  hardhatVrfCoordinatorV2Mock = await vrfCoordinatorV2Mock.deploy(0, 0);
  console.log(
    "================================================================================================================================================================"
  );
  console.log(
    `Deploying the VRF contract at: ${hardhatVrfCoordinatorV2Mock.address} ...`
  );
  // Deploying the Marketplace contract
  const Marketplace = await ethers.getContractFactory("Marketplace");
  marketplace = await Marketplace.deploy(
    1,
    hardhatVrfCoordinatorV2Mock.address
  );
  console.log(
    "================================================================================================================================================================"
  );
  console.log(
    `Deploying the Marketplace contract at: ${marketplace.address} ...`
  );
  console.log(
    `The owner deploying the Marketplace contract is: ${owner.address}`
  );
  console.log(
    "================================================================================================================================================================"
  );
  // Creating a subscriptin for the Chainlink VRF , funding it and adding the contract as a spender
  await hardhatVrfCoordinatorV2Mock.createSubscription();

  await hardhatVrfCoordinatorV2Mock.fundSubscription(
    1,
    ethers.utils.parseEther("7")
  );
  await hardhatVrfCoordinatorV2Mock.addConsumer(1, marketplace.address);
  // Deploying an event contract
  await marketplace
    .connect(addr4)
    .createEventContract(10, ethers.utils.parseUnits("5", 18), 1, 1, 100);
  let eventAddress = await marketplace.eventContracts(0);
  let NewEventContractInstance = await ethers.getContractFactory(
    "EventContract"
  );
  let newEventContract = await NewEventContractInstance.attach(eventAddress);
  let totalSupply = await newEventContract.totalSupply();
  console.log(
    `Deploying a new Event contract at: ${eventAddress} ...\nTicket supply of the created event: ${totalSupply} tickets\nPrice per ticket: 5 ETH`
  );
  console.log(
    "================================================================================================================================================================"
  );
  console.log(`The organiser of the event is: ${addr4.address}`);
  let initialBalanceOfEventOrganiser = await ethers.provider.getBalance(
    addr4.address
  );
  console.log(
    `Initial balance of the event organiser's wallet: ${ethers.utils.formatEther(
      initialBalanceOfEventOrganiser
    )} ETH`
  );

  console.log(
    "================================================================================================================================================================"
  );
  // Minting/buying tickets from the newly deployed event
  await newEventContract
    .connect(addr1)
    .mint({ value: ethers.utils.parseUnits("5", 18) });
  await newEventContract
    .connect(addr2)
    .mint({ value: ethers.utils.parseUnits("5", 18) });
  await newEventContract
    .connect(addr3)
    .mint({ value: ethers.utils.parseUnits("5", 18) });
  let soldTickets = await marketplace.seeAmountOfSoldTickets(0);
  console.log("A few users are buying tickets... ");
  console.log("3 users buy 1 ticket each");
  console.log(`A total of ${soldTickets} tickets were sold for this event`);

  //fast-frowarding the time so that the winning ticket can be mminted to the winner
  await network.provider.send("evm_increaseTime", [105]);
  await network.provider.send("evm_mine");
  console.log(
    "Fast-forwarding the time until the ticket sale period is over ..."
  );
  console.log(".");
  console.log(".");
  console.log(".");

  //Minting the winning ticket
  await marketplace.connect(addr4).MintToRandomWinner(0);
  let balanceOfAddr3 = await newEventContract.balanceOf(addr3.address);
  let balanceOfAddr1 = await newEventContract.balanceOf(addr1.address);
  let balanceOfAddr2 = await newEventContract.balanceOf(addr2.address);
  console.log(`User 1 got ${balanceOfAddr3} ticket. `);
  console.log(`User 2 got ${balanceOfAddr1} ticket. `);
  console.log(
    `User 3 got ${balanceOfAddr2} tickets - the winner, as this accounts owns one extra ticket.`
  );

  //Withdrawal of  the ticket revenue by the event organiser
  console.log(
    "================================================================================================================================================================"
  );
  await marketplace.connect(addr4).withdrawFundsFromEvent(0);
  let balanceOfEventOrganiser = await ethers.provider.getBalance(addr4.address);
  console.log(
    ` Balance of the event organiser's wallet after withdrawal of ticket proceeds : ${ethers.utils.formatEther(
      balanceOfEventOrganiser
    )} ETH`
  );
  console.log(
    "================================================================================================================================================================"
  );
});

module.exports = {};
