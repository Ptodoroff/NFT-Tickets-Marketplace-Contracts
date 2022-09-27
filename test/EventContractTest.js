const { expect, assert } = require("chai");
const ether = require("@openzeppelin/test-helpers/src/ether");
const { ethers, network } = require("hardhat");
const provider = waffle.provider;

let marketplace;
let eventContractInstance;
//=======================================
// Testing the Event contract.
//=======================================

beforeEach(async () => {
  [owner, addr1, addr2] = await ethers.getSigners();

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

  //deploying an event from the factory

  await marketplace.createEventContract(10, 10, 1, 1, 100);
  let eventAddress = await marketplace.eventContracts(0);
  const EventContract = await ethers.getContractFactory("EventContract");
  eventContractInstance = await EventContract.attach(eventAddress);
});

describe("EventContract", () => {
  it("Allow people to buy tickets", async () => {
    await eventContractInstance.mint({ value: 10 });

    let balanceOfOwner = await eventContractInstance.balanceOf(owner.address);

    expect(balanceOfOwner).to.equal(1);
    //"Balance of the ticket buyer is incremented by one."
  });

  it("Does not allow  buying of tickets after sale period has ended.", async () => {
    await network.provider.send("evm_increaseTime", [105]);
    await network.provider.send("evm_mine");

    await expect(eventContractInstance.mint({ value: 10 })).to.be.revertedWith(
      "Ticket sale for this event has ended."
    );
    //"Does not allow the mint function to execute."
  });

  it("Does not allow  buying of tickets after the ticket supply has ended.", async () => {
    await eventContractInstance.mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });

    await expect(eventContractInstance.mint({ value: 10 })).to.be.revertedWith(
      "Tickets for this event are sold out."
    );
    //"Does not allow the mint function to execute after if the totalSupply of minted tickets has been reached."
  });

  it("Does not allow buying a ticket if the price paid is not the price of the ticket", async () => {
    await expect(eventContractInstance.mint({ value: 1 })).to.be.revertedWith(
      "You must pay the exact ticket price."
    );
    //"Transaction is reverted if the value sent does not match the ticket price
  });

  it("Does not allow executing the MintToWinner function if it is called directly from the event contract", async () => {
    await eventContractInstance.connect(addr1).mint({ value: 10 });
    await eventContractInstance.connect(addr2).mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });
    await expect(eventContractInstance.mintToWinner(0)).to.be.revertedWith(
      "Only the event organiser can invoke this function THROUGH THE FACTORY ADDRESS and can distribute the winning ticket to the winner."
    );
    //"Transaction is reverted if called by the eventOrganiser, but not via the factory contract
  });
  it("Does not allow executing the withdrawFunds function if it is called before the sale period has ended", async () => {
    await eventContractInstance.connect(addr1).mint({ value: 10 });
    await eventContractInstance.connect(addr2).mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });
    await expect(eventContractInstance.withdrawFunds()).to.be.revertedWith(
      "The organiser cannot withdraw funds before the event has concluded."
    );
    //"Transaction is reverted if called before the ticket sale period has ended
  });
  it("Does not allow executing the withdrawFunds function if it is called by an account, other than the eventOrganiser", async () => {
    await eventContractInstance.connect(addr1).mint({ value: 10 });
    await eventContractInstance.connect(addr2).mint({ value: 10 });
    await eventContractInstance.mint({ value: 10 });
    await expect(
      eventContractInstance.connect(marketplace.address).withdrawFunds()
    );
    //allows execution of the function if the tx is sent from the eventOrganiser via the factory contract
    await expect(
      eventContractInstance.connect(addr1).withdrawFunds()
    ).to.be.revertedWith(
      "Only the event organiser or the event organiser via the factory contract can invoke this function  and get his/her revenue from the ticket sale."
    );
    //"Transaction is reverted if not called by the eventOrganiser or the factory contract
  });
});
