// SPDX-License-Identifier: UNLICENSED

//THE CONTRACT MUST BE ADDED AS A CONSUMER FROM THE CHAINLINK VRF UI OR THE RANDOM FUNCTION WONT WORK!!!!!

// use this address as the VRF coordinator input for Goerli - 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D;
/* the marketplace contract will include the VRF from Chainlink. Initially I wanted to include this logic in every EventContract contract, but then I would have a hard time 
funding every EventContract contract with test LINK tokens in order for the VRF to work. 
This is why the marketplace will have a function, callable only by the people who have created an EventContract before.

the function that would generate the number must have the total supply, but better the currentId for the contract's nft count of the particular EventContract as an input and then use this input as a limit for the random number size.


I have not considered a pseudo-random function, implemneted in every isntance of the EventContract contract, due to the fact that nothing on-chain is really random.


- another possible solution (currently exploring it) - the vrf would accept the address for which the lottery is intended. Its sole purpose is to be included in an 
EventContract, together with the random number generated. then, the corresponding EventContract contract instance will listen if an EventContract from the factory contract has been emitted ( with 
an address, mathing the particular EventContract contract address and would act accordingly)


the arrays, holding the event instances and event addresses could be converted to mappings ( uint to address ) with Counters lib also imported, to increment the uint 
in the mappings 

-topic to address - The owner of every Event contract is the factory one. Maybe tx.origin ? Although highly not recommended 
*/
pragma solidity 0.8.17;
import "./EventContract.sol";

//the following imports are needed for the VRF contract
import "./ChainlinkContracts/VRFCoordinatorV2Interface.sol";
import "./ChainlinkContracts/VRFConsumerBaseV2.sol";

contract Marketplace is VRFConsumerBaseV2 {
  EventContract[] public eventContracts;
  uint256 public randomNumber;

  event EventContractCreated(
    string indexed name,
    address indexed EventContractAddress,
    address indexed eventOrganiser,
    string symbol,
    uint256 price,
    uint256 duration,
    uint256 ticketSupply
  );

  function createEventContract(
    uint256 factory_totalSupply,
    uint256 factory_priceInWei,
    string memory factory_name,
    string memory factory_symbol,
    uint256 factory_EventContractDuration
  ) external {
    EventContract new_EventContract = new EventContract(
      address(this),
      payable(msg.sender),
      factory_totalSupply,
      factory_priceInWei,
      factory_name,
      factory_symbol,
      factory_EventContractDuration
    );
    eventContracts.push(new_EventContract);
    emit EventContractCreated(
      factory_name,
      address(new_EventContract),
      new_EventContract.eventOrganiser(),
      factory_symbol,
      factory_priceInWei,
      factory_EventContractDuration,
      factory_totalSupply
    );
  }

  //======================================================
  //getter functions
  //======================================================
  function seeEventOrganiser(uint256 eventContractId)
    public
    view
    returns (address payable)
  {
    return eventContracts[eventContractId].eventOrganiser();
  }

  function seeAmountOfSoldTickets(uint256 eventContractId)
    public
    view
    returns (uint256)
  {
    return eventContracts[eventContractId].tokenIds();
  }

  function seeEventTicketSupply(uint256 eventContractId)
    public
    view
    returns (uint256)
  {
    return eventContracts[eventContractId].totalSupply();
  }

  function seeEventDuration(uint256 eventContractId)
    public
    view
    returns (uint256)
  {
    return eventContracts[eventContractId].eventDuration();
  }

  // The function is added for ease when looking for a specific event organiser and also used as a require statement prior to calling the VRF random function
  // in the VRF function an input is requested, representing the index of the address in the EventContracts array in the Marketplace contract
  // If the msg.sender is the deployer of the event, than the Randon Number Generation functio can be executed

  function receiveEther() public payable {}

  function withdrawFundsFromEvent(uint256 eventContractId) public {
    require(
      msg.sender == seeEventOrganiser(eventContractId),
      "Only the organiser, who has deployed the designated event can withdraw the funds from the ticket sale."
    );
    eventContracts[eventContractId].withdrawFunds();
  }

  //======================================================
  // VRF logic
  //======================================================

  /*
steps to use the VRF:

1/ get some test eth and link on goerli
2/ create a chainling subscription from their website
3/ fund the subscription
4/ deploy the 3 contracts via remix, with the subscription ID passed as an arg in the constructor
5/ call RequestRandomWOrds()
5/call requestID
6/ optional - paste the result from requestId to the getFInalValue fn

*/

  VRFCoordinatorV2Interface COORDINATOR;

  // Your subscription ID.
  uint64 s_subscriptionId;

  // Goerli coordinator. For other networks,
  // see https://docs.chain.link/docs/vrf-contracts/#configurations
  address vrfCoordinator = 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D;

  // The gas lane to use, which specifies the maximum gas price to bump to.
  // For a list of available gas lanes on each network,
  // see https://docs.chain.link/docs/vrf-contracts/#configurations
  bytes32 keyHash =
    0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15;

  // Depends on the number of requested values that you want sent to the
  // fulfillRandomWords() function. Storing each word costs about 20,000 gas,
  // so 100,000 is a safe default for this example contract. Test and adjust
  // this limit based on the network that you select, the size of the request,
  // and the processing of the callback request in the fulfillRandomWords()
  // function.
  uint32 callbackGasLimit = 100000;

  // The default is 3, but you can set this higher.
  uint16 requestConfirmations = 3;

  // For this example, retrieve 2 random values in one request.
  // Cannot exceed VRFCoordinatorV2.MAX_NUM_WORDS.
  uint32 numWords = 2;

  uint256[] private s_randomWords; //changed it to private in order to declutter the interface in case the contract is used in Remix
  uint256 private s_requestId; // -//-
  address s_owner;

  constructor(uint64 subscriptionId, address _vrfCoordinator)
    VRFConsumerBaseV2(_vrfCoordinator)
  {
    COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
    s_owner = msg.sender;
    s_subscriptionId = subscriptionId;
  }

  // Assumes the subscription is funded sufficiently.
  //======================================================
  // Generating a random number with Chainlink's VRF. The result represents a tokenID. Its owner is the winner and the extra ticket is sent minted to him/her
  //======================================================
  function MintToRandomWinner(uint256 eventContractId)
    external
    returns (uint256)
  {
    require(
      msg.sender == seeEventOrganiser(eventContractId),
      "Only the organiser, who has deployed the designated event can request random number generation."
    );
    require(
      block.timestamp > seeEventDuration(eventContractId),
      "You cannot call this function before the ticket sale period for the designated event has ended"
    );
    s_requestId = COORDINATOR.requestRandomWords(
      keyHash,
      s_subscriptionId,
      requestConfirmations,
      callbackGasLimit,
      numWords
    );

    randomNumber = (s_requestId % seeAmountOfSoldTickets(eventContractId)) * 1;

    eventContracts[eventContractId].mintToWinner(randomNumber);
    // mints the extra lottery ticket to the owner of the randomly generated token ID (represented by the randomNumber variable

    return randomNumber;
  }

  function fulfillRandomWords(
    uint256, /* requestId */
    uint256[] memory randomWords
  ) internal override {
    s_randomWords = randomWords;
  }
}
