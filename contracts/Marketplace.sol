// SPDX-License-Identifier: UNLICENSED

//EVERY INSTANCE OF THE FACTRY CONTRACT, DEPLOYED ON THE GOERLI TESTNET MUST BE ADDED AS A CONSUMER FROM THE CHAINLINK VRF UI OR THE RANDOM FUNCTION WONT WORK!!!!!

//  IF REDEPLOYING :
//1. Use this address as the VRF coordinator ( _vrfCoordinator) input for Goerli - 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D;
//2. Use 1396 as _subscriptionId

/* From my basic knowledge of smart contract security, I decided to follow one of the most important rules of it  -- The best source of randomness is always off-chain.
 This is the reason why I decided to include Chainlink's VRF functionality and deploy the entire projects with all its contracts on the Goerli testnet. 
This is why the marketplace will have a function, callable only by the people who have created an EventContract before.

I have not considered a pseudo-random function which requires on parameters like block.timestamp, etc. for the reasons, outlined above.

*/
pragma solidity 0.8.17;
import "./EventContract.sol";

//======================================================
//the following imports are needed for the VRF functionality to work
//======================================================
import "./ChainlinkContracts/VRFCoordinatorV2Interface.sol";
import "./ChainlinkContracts/VRFConsumerBaseV2.sol";

contract Marketplace is VRFConsumerBaseV2 {
  // declared public in order to generate getter functions
  EventContract[] public eventContracts;
  uint256 public randomNumber;

  // event that I use to fetch the data for every event contract card in the frontend
  event EventContractCreated(
    string name,
    address indexed EventContractAddress,
    address indexed eventOrganiser,
    string symbol,
    uint256 price,
    uint256 duration,
    uint256 ticketSupply
  );

  //creates an event (event contract) with the passed parameters. I have used names, which I think are self - explanatory
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

  // The function is added for ease when looking for a specific event organiser and also used as a require statement prior to calling the VRF random function
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

  function receiveEther() public payable {}

  // I added this function in order to lift the state and make the withdrawal of funds easier, rather than havin to go to the event contract and calling it from there
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
  // Generating a random number with Chainlink's VRF. The result represents a tokenID. Its owner is the winner and the extra ticket is sent/minted to him/her
  //The function can only be called:
  //1. From the creator of the event contract for which the  lottery is to be drawn
  //2. From the creator of the event contract but VIA THE FACTORY CONTRACT. Since the VRF logic is in the Marketplace contract  (this contract), this is required, otherwise the event creator would simply call the mint function from the event contract itself, thus bypassing the random number generation and imposing a security risk
  //3. After the ticket sale period for the particular event has concluded.
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

    // mints the extra lottery ticket to the owner of the randomly generated token ID (represented by the randomNumber variable
    eventContracts[eventContractId].mintToWinner(randomNumber);

    return randomNumber;
  }

  function fulfillRandomWords(
    uint256, /* requestId */
    uint256[] memory randomWords
  ) internal override {
    s_randomWords = randomWords;
  }
}
