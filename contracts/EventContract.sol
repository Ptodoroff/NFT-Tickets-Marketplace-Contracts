 //SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;  //locked pragma because of Secureum's recommendations. I must explain it.


// for the randonmness - Chainlink's VRF function will be implemented. There will be a number generator function 
// the number generated will represent the winning tokenID. The last winning ticket will be then minted to the winner


// idea : I should format all comments in natspec for better look
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
//counters should me imported
//ownable as well, or maybe i could create emy own modifier since it would be only one


contract EventContract is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;       // a variable to store the current tokenId that is to be minted
    uint public totalSupply;
    address payable public eventOrganiser;

    struct  Event {
        address  payable  organiser;                      //payable so that he can withdraw funds 
        string symbol;
        string eventName;
        uint _totalSupply;
        uint priceInEth;
        uint startDate;
        uint endDate;
        address  eventAddress;
    }

    Event this_event;



constructor (address payable _organiser, uint m_totalSupply, uint _priceInEth, string memory _name, string memory _symbol,uint _eventDuration) ERC721(_name, _symbol) {
    this_event = Event (
        _organiser,
        _symbol,
        _name,
        m_totalSupply,
        _priceInEth,
        block.timestamp,
        block.timestamp + _eventDuration,
        address(this)
    );
 

    totalSupply=m_totalSupply;
    eventOrganiser=_organiser;
   // each event lasts for two days
    // the event address should point to the address of the newly created event;
}


function mint () public payable returns (uint){
    uint256 newItemId = _tokenIds.current();
    require (newItemId < totalSupply, "Tickets for this event are sold out.");  
    require (block.timestamp < this_event.endDate, "Ticket sale for this event has ended.");
    require (msg.value == this_event.priceInEth, "You must pay the exact ticket price.");
    _mint(msg.sender, newItemId);
    _setTokenURI(newItemId, "https://ipfs.io/ipfs/QmPhtX9KpJQtRcnQcdQUf2qM8i6RJ5kitqH9yL3cCfEBNf");
    _tokenIds.increment();                                          /// tokenId should be the next Id from the counter
    return newItemId;
//erc721 mint
}


function mintToWinner (uint winningTokenId) public payable {
    uint256 newItemId = _tokenIds.current();
    require (msg.sender == this_event.organiser, " Only the event organiser can distribute the winning ticket to the winner.");
    _mint(ownerOf(winningTokenId), newItemId);
    _setTokenURI(newItemId, "https://ipfs.io/ipfs/QmPhtX9KpJQtRcnQcdQUf2qM8i6RJ5kitqH9yL3cCfEBNf");
    _tokenIds.increment();                                          

}

//contract is payable so that the creator of the event could withdraw the revenue from the tickets
//function is declared external - cannot be called from the factory contract !
function withdrawFunds () external payable  {
require (msg.sender == this_event.organiser , "Only the organiser of the event can call this function!");
require (this_event.endDate < block.timestamp, "The organiser cannot withdraw funds before the event has concluded.");
this_event.organiser.transfer(address(this).balance);

}

function currentEventRevenue () public view returns (uint) {
    return address(this).balance;
}

}