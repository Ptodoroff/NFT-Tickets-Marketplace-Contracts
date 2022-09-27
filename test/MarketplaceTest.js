const { expect, assert } = require("chai");
const ether = require("@openzeppelin/test-helpers/src/ether");
const { ethers } = require("hardhat");

let marketplace;

beforeEach(async () => {
  [owner, addr1] = await ethers.getSigners();

  let vrfCoordinatorV2Mock = await ethers.getContractFactory(
    "VRFCoordinatorV2Mock"
  );
  hardhatVrfCoordinatorV2Mock = await vrfCoordinatorV2Mock.deploy(0, 0);

  const Marketplace = await ethers.getContractFactory("MarketplaceTest");
  marketplace = await Marketplace.deploy(
    1,
    hardhatVrfCoordinatorV2Mock.address
  );

  await hardhatVrfCoordinatorV2Mock.createSubscription();

  await hardhatVrfCoordinatorV2Mock.fundSubscription(
    1,
    ethers.utils.parseEther("7")
  );
  await hardhatVrfCoordinatorV2Mock.addConsumer(1, marketplace.address);
});

describe("Marketplace", () => {
  it("Should deploy a new event contract", async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    let newEvent = await marketplace.createEventContract(10, 10, 1, 1, 100);
    await newEvent.wait();
    assert(
      (await marketplace.eventContracts(0)) != 0
      //"The new contract is pushed to the eventContracts array."
    );
  });

  it("Should allow a user to buy a ticket from the already deployed event contract", async () => {
    const EventContract = await ethers.getContractFactory("EventContract"); // getting the "abi" of the Event contract
    let newEvent = await marketplace.createEventContract(10, 0, 1, 1, 100);
    await newEvent.wait();
    let eventAddress = await marketplace.eventContracts(0);
    let eventContractInstance = await EventContract.attach(eventAddress); //"attaching" the EventContract abi, to the first address in the EventContracts array
    let mint = await eventContractInstance.mint();
    await mint.wait();
    assert(
      (await eventContractInstance.balanceOf(owner.address)) == 1
      //"The balance of the address, calling the mint function is incremented by one. Hence, he has successfully bought a ticket."
    );
  });

  it("Should generate a random number via the Chainlink VRF function and sends the winning ticket to the owner of the tokenId, represented by the number that Chainlink VRF generates", async () => {
    const EventContract = await ethers.getContractFactory("EventContract"); // getting the "abi" of the Event contract
    let newEvent = await marketplace.createEventContract(10, 0, 1, 1, 100);
    await newEvent.wait();
    let eventAddress = await marketplace.eventContracts(0);
    let eventContractInstance = await EventContract.attach(eventAddress); //"attaching" the EventContract abi, to the first address in the EventContracts array
    await eventContractInstance.connect(addr1).mint();
    await eventContractInstance.connect(addr1).mint();
    await eventContractInstance.connect(addr2).mint();
    await eventContractInstance.connect(addr2).mint();
    await eventContractInstance.connect(addr2).mint();
    await eventContractInstance.connect(owner).mint();
    await eventContractInstance.connect(owner).mint();
    await eventContractInstance.connect(owner).mint();
    await eventContractInstance.connect(addr1).mint();

    let amountOfSolTicketsBeforeAnnouncingTheWinner =
      await marketplace.seeAmountOfSoldTickets(0);
    // total tickets sold amount to 9

    //fast-forwarding the time with 105 seconds and then mining the block in order to jump 105 seconds ahead and bypass the require statement that checks if the ticketSale period has ended
    await network.provider.send("evm_increaseTime", [105]);
    await network.provider.send("evm_mine");
    await marketplace.requestRandomWordsandMintToWinner(0);

    assert(
      (await marketplace.seeAmountOfSoldTickets(0)) ==
        Number(amountOfSolTicketsBeforeAnnouncingTheWinner) + 1
      //"The total amount of sold tickets for the event is incremented by 1 after the winner is sent a winning ticket"
    );
  });
});
