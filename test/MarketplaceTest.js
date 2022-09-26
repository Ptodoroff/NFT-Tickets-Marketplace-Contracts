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
    const [owner, addr1] = await ethers.getSigners();
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

  it("Should allow a user to buy a ticket from the already deployed event contract", async () => {
    const EventContract = await ethers.getContractFactory("EventContract"); // getting the "abi" of the Event contract
    let newEvent = await marketplace.createEventContract(10, 0, 1, 1, 100);
    await newEvent.wait();
    let eventAddress = await marketplace.eventContracts(0);
    let eventContractInstance = await EventContract.attach(eventAddress); //"attaching" the EventContract abi, to the first address in the EventContracts array
    await eventContractInstance.mint();
    await eventContractInstance.mint();
    await eventContractInstance.mint();
    await eventContractInstance.mint();
    await eventContractInstance.mint();
    await eventContractInstance.mint();
    await eventContractInstance.mint();
    await eventContractInstance.mint();

    await network.provider.send("evm_increaseTime", [105]);
    await network.provider.send("evm_mine");

    await marketplace.requestRandomWordsandMintToWinner(0);
    assert(
      (await eventContractInstance.balanceOf(owner.address)) == 9
      //"The balance of the address, calling the mint function is incremented by one. Hence, he has successfully bought a ticket."
    );
  });
});
