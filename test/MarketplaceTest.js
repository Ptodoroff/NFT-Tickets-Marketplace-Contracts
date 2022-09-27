const { expect, assert } = require("chai");
const ether = require("@openzeppelin/test-helpers/src/ether");
const { ethers, network } = require("hardhat");
const provider = waffle.provider;

let marketplace;
//=======================================
// Testing the Marketplace contract.
//=======================================

beforeEach(async () => {
  [owner, addr1] = await ethers.getSigners();

  let vrfCoordinatorV2Mock = await ethers.getContractFactory(
    "VRFCoordinatorV2Mock"
  );
  hardhatVrfCoordinatorV2Mock = await vrfCoordinatorV2Mock.deploy(0, 0);

  const Marketplace = await ethers.getContractFactory("Marketplace");
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
    await marketplace.MintToRandomWinner(0);

    assert(
      (await marketplace.seeAmountOfSoldTickets(0)) ==
        Number(amountOfSolTicketsBeforeAnnouncingTheWinner) + 1
      //"The total amount of sold tickets for the event is incremented by 1 after the winner is sent a winning ticket"
    );
  });

  it("Should revert minting to winner if the sale period has not ended", async () => {
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

    await expect(marketplace.MintToRandomWinner(0)).to.be.revertedWith(
      "You cannot call this function before the ticket sale period for the designated event has ended"
    );
  });
  it("Should revert if called from an address that is not the organiser of the event", async () => {
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

    await expect(
      marketplace.connect(addr1).MintToRandomWinner(0)
    ).to.be.revertedWith(
      "Only the organiser, who has deployed the designated event can request random number generation."
    );

    //"Tx is reverted if called from an address,which is not the organiser of the designated event"
  });

  it("Should send the generated funds from the ticket sale to the event organiser", async () => {
    const EventContract = await ethers.getContractFactory("EventContract"); // getting the "abi" of the Event contract
    let newEvent = await marketplace.createEventContract(
      10,
      10000000000,
      1,
      1,
      100
    );
    await newEvent.wait();

    let eventAddress = await marketplace.eventContracts(0);
    let eventContractInstance = await EventContract.attach(eventAddress); //"attaching" the EventContract abi, to the first address in the EventContracts array
    await eventContractInstance.connect(addr1).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr1).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr1).mint({ value: 10000000000 });

    await network.provider.send("evm_increaseTime", [105]);
    await network.provider.send("evm_mine");

    let log = await marketplace.withdrawFundsFromEvent(0);
    await log.wait();
    let eventBalanceAfter = await provider.getBalance(eventAddress);
    console.log(eventBalanceAfter);

    assert(eventBalanceAfter == 0);

    //"Balance of the designated event account is transferred to its event organiser"
  });
  it("Should not allow funds to be withdrawn if called by wallet, other than the designated event organiser", async () => {
    const EventContract = await ethers.getContractFactory("EventContract"); // getting the "abi" of the Event contract
    let newEvent = await marketplace.createEventContract(
      10,
      10000000000,
      1,
      1,
      100
    );
    await newEvent.wait();

    let eventAddress = await marketplace.eventContracts(0);
    let eventContractInstance = await EventContract.attach(eventAddress); //"attaching" the EventContract abi, to the first address in the EventContracts array
    await eventContractInstance.connect(addr1).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr1).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr2).mint({ value: 10000000000 });
    await eventContractInstance.connect(addr1).mint({ value: 10000000000 });

    await network.provider.send("evm_increaseTime", [105]);
    await network.provider.send("evm_mine");

    await expect(
      marketplace.connect(addr1).withdrawFundsFromEvent(0)
    ).to.be.revertedWith(
      "'Only the organiser, who has deployed the designated event can withdraw the funds from the ticket sale.'"
    );

    //"Withdraw reverted if not called by the designated event organiser"
  });
});
