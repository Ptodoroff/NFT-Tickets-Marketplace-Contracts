const { expect, assert } = require("chai");
const { expectRevert, time } = require("@openzeppelin/test-helpers");
const ether = require("@openzeppelin/test-helpers/src/ether");
const { ethers } = require("hardhat");

let marketplace;

beforeEach(async () => {
  const Marketplace = await ethers.getContractFactory("Marketplace");

  marketplace = await Marketplace.deploy(1396);
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
    const EventContract = await ethers.getContractFactory("EventContract");
    const [owner, addr1] = await ethers.getSigners();
    let newEvent = await marketplace.createEventContract(10, 0, 1, 1, 100);
    await newEvent.wait();
    let eventAddress = await marketplace.eventContracts(0);
    let eventContractInstance = await EventContract.attach(eventAddress);
    let mint = await eventContractInstance.mint();
    await mint.wait();
    assert(
      (await eventContractInstance.balanceOf(owner.address)) == 1
      //"The balance of the address, calling the mint function is incremented by one. Hence, he has successfully bought a ticket."
    );
  });
});
