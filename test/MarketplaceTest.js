const { expect, assert } = require("chai");
const { expectRevert, time } = require("@openzeppelin/test-helpers");
const ether = require("@openzeppelin/test-helpers/src/ether");

describe("Marketplace", () => {
  it("Should deploy a new event contract", async () => {
    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy(1396);

    let newEvent = await marketplace.createEventContract(10, 10, 1, 1, 100);
    await newEvent.wait();
    assert(
      (await marketplace.eventContracts(0)) != 0,
      "The new contract is pushed to the eventContracts array."
    );
  });
});
