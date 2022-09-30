//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract EventContract is ERC721URIStorage {
  using Counters for Counters.Counter;
  Counters.Counter public tokenIds; // a variable to store the current tokenId that is to be minted. Declared public because all tickets are of the same value so there is no threat of someone using this as a prerequisite to mint a more "expensive" or "rare" NFT.
  uint256 public totalSupply;
  address payable public eventOrganiser;
  uint256 public eventDuration;

  struct Event {
    address factoryAddress;
    address payable organiser; //payable so that the event organiser  can withdraw funds
    string symbol;
    string eventName;
    uint256 _totalSupply;
    uint256 priceInEth;
    uint256 startDate;
    uint256 endDate;
    address eventAddress;
  }

  Event this_event;

  constructor(
    address _factoryAddress,
    address payable _organiser,
    uint256 m_totalSupply,
    uint256 _priceInEth,
    string memory _name,
    string memory _symbol,
    uint256 _eventDuration
  ) ERC721(_name, _symbol) {
    this_event = Event(
      _factoryAddress,
      _organiser,
      _symbol,
      _name,
      m_totalSupply,
      _priceInEth,
      block.timestamp,
      block.timestamp + _eventDuration,
      address(this)
    );

    eventDuration = this_event.endDate;
    totalSupply = m_totalSupply;
    eventOrganiser = _organiser;
  }

  // The function to buy (mint) tickets for the created event
  // upon mint, the user could check his/her wallet on the  Goerli Testnet Opensea  website and a generic NFT will be found in his/her account, representing an token the metadata, outlined in the ./metadata/metadata.json file
  function mint() public payable returns (uint256) {
    uint256 newItemId = tokenIds.current();
    require(newItemId < totalSupply, "Tickets for this event are sold out.");
    require(
      block.timestamp < this_event.endDate,
      "Ticket sale for this event has ended."
    );
    require(
      msg.value == this_event.priceInEth,
      "You must pay the exact ticket price."
    );
    _mint(msg.sender, newItemId);
    _setTokenURI(
      newItemId,
      "https://ipfs.io/ipfs/QmPhtX9KpJQtRcnQcdQUf2qM8i6RJ5kitqH9yL3cCfEBNf"
    );
    tokenIds.increment();
    return newItemId;
  }

  // I require that the msg.sender is the factory Address, because otherwise the organiser can simply come to this contract instance
  // and execute the function, thus bypassing the VRF by Chainlink that I have imported
  function mintToWinner(uint256 winningTokenId) external {
    uint256 newItemId = tokenIds.current();
    require(
      msg.sender == this_event.factoryAddress,
      "Only the event organiser can invoke this function THROUGH THE FACTORY ADDRESS and can distribute the winning ticket to the winner."
    );
    _mint(ownerOf(winningTokenId), newItemId);
    _setTokenURI(
      newItemId,
      "https://ipfs.io/ipfs/QmPhtX9KpJQtRcnQcdQUf2qM8i6RJ5kitqH9yL3cCfEBNf"
    );
    tokenIds.increment();
  }

  function withdrawFunds() external payable {
    require(
      msg.sender == this_event.factoryAddress ||
        msg.sender == this_event.organiser,
      "Only the event organiser or the event organiser via the factory contract can invoke this function  and get his/her revenue from the ticket sale."
    );
    require(
      this_event.endDate < block.timestamp,
      "The organiser cannot withdraw funds before the event has concluded."
    );
    eventOrganiser.transfer(address(this).balance);
  }

  function currentEventRevenue() public view returns (uint256) {
    return address(this).balance;
  }
}
