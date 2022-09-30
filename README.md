# Read Me

![Project Image](https://ipfs.moralis.io:2053/ipfs/Qmc8J3Fvje1UCSgNymJW5phnZsPeCSwEXtLomaMY8hS3D9)

> Todoroff Events Co. - a decentralised marketplace application to create events and buy tickets.

---

### Table of Contents

- [Description](#description)
- [Technologies](#technologies)
- [Installation](#installation)
- [How To Use](#how-to-use)

---

## Description

This repository consists of the contracts, their unit tests and Hardhat task for the decentralsied application that I created. The overall project represents an event management platform, where one factory contract `Marketplace.sol ` is used by the user to create different events (equivalent to NFT collections) with set parameters like event name, ticket price, ticket quantity, ticket sale duration, etc. Once the event contract `EventContract.sol ` is deployed, users can buy tickets (mint them) as long as the ticket sale period has not ended. When this happens, the Event organiser can call a function that would randomly select a ticket owner and would send one additional ticket to him/her.

The factory contract `Marketplace.sol` includes functionality from the Chainlink protocol, namely the VRF. It is used to generate a number that would represent a tokenId.
The owner of the ticket with the corresponding tokenId is sent one additional ticket as a reward.

---

#### Technologies

- HardHat
- Javascript
- Chainlink VRF (Verifiable Random Function)
- Openzeppelin libraries - contracts, utils (counters)
- Chai
- ethers.js

[Back To The Top](#read-me)

---

#### Installation

First, make sure you have Goerli test ether. You can get some at: [goerlifaucet.com](https://goerlifaucet.com/)

1. Clone the repository
2. Run `npm install`
3. Interacting with the contract - Although it can easily be done with Hardhat, it requires setting up a Goerli provider, etc. An easier alternative, in my opinion, would be:
   a/ Go to [Remix](https://remix.ethereum.org/)
   b/ Create a new file called `Marketplace.sol` and paste the code of `Marketplace.sol` from this repository to the newly created file in Remix.
   c/ Do the same for `EventContract.sol`
   d/ In the SOLIDITY COMPILER tab, select compiler version 0.8.7 to match the one, required by the contracts and COMPILE `Marketplace.sol`
   e/ Go to the DEPLOY & RUN TRANSACTIONS tab. In the Environment dropdown, select `Inejcted provider - Metamask` (could be different if you use another wallet extension, but look for `injected provider`). Then go to your wallet extension dashboard and connect it to the **Goerli testnet**
   f/ Back in Remix in DEPLOY & RUN TRANSACTIONS tab, in the `At address` window , paste the address `0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D`.
   g/ An UI with the callable functions of the contract should pop up below.

   CAUTION - attempting to deploy a new `Marketplace.sol` contract would require adding it to an already-funded subscription via the Chainlink subscription dashboard, otherwise the `MintToRandomWinner` will not execute.

## How To Use

This section will explain the core functions for the two main contracts - `Marketplace.sol` and `EventContract.sol`. For any additional information, pelase take a look at the comments in the code of the contracts.

1. `Marketplace.sol`
   a/ `eventContracts` a public array with a getter function, which contains all the addresses of the deployed Event contracts from the factory contract.
   b/ `createEventContract` - deploys a new instance of the `EventContract.sol` with the parameters provided.
   c/ `withdrawFundsFromEvent` - accepts a uint as an argument, which is the index of the Event contract from the `eventContracts` array. Callable only by the event organiser for the selected event contract.
   d/ `MintToRandomWinner` - randomly selects a tokenId from the already minted tickets and mints one extra ticket to its owner. Here the Chainlink VRF functionality is implemented.

2. `EventContract.sol`
   a/`mint` - allows the user to buy tickets for the event. Require statements:
   -cannot mint after the totalSupply has been reached.
   -cannot mint if the ticket sale period has ended.
   -cannot mint if the transaction value is not the same as the ticket price.
   b/`mintToWinner` - sends the winner one additional ticket. Require statements:
   -can be called only by the event organiser via the factory contract's function `MintToRandomWinner`.

3. Tests
   The tests for both `Marketplace.sol` and `EventContract.sol` can be run by typing `npx hardhat test`. I used a mock VRF contract in order to conduct the tests properly.

4. Task
   I have also created a Hardhat task called `Fullcycle` that mimics the entire process of deploying the factory contract, creating an event, buying of tickets,
   lottery draw and withdrawal of funds. It can be run by typung `npx hardhat fullcycle`.

---

## Author Info

- LinkedIn - [Petar Todorov](https://www.linkedin.com/in/petargtodorov/)
- Blog - [0xTodorov](https://0xtodorov.hashnode.dev/)

[Back To The Top](#read-me-template)
