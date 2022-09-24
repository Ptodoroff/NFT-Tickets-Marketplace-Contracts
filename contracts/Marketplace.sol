/* the marketplace contract will include the VRF from Chainlink. Initially I wanted to include this logic in every EventContract contract, but then I would have a hard time 
funding every EventContract contract with test LINK tokens in order for the VRF to work. 
This is why the marketplace will have a function, callable only by the people who have created an EventContract before.

the function that would generate the number must have the total supply of the particular EventContract as an input and then use this input as a limit for the random number size.


I have not considered a pseudo-random function, implemneted in every isntance of the EventContract contract, due to the fact that nothing on-chain is really random.


- another possible solution (currently exploring it) - the vrf would accept the address for which the lottery is intended. Its sole purpose is to be included in an 
EventContract, together with the random number generated. then, the corresponding EventContract contract instance will listen if an EventContract from the factory contract has been emitted ( with 
an address, mathing the particular EventContract contract address and would act accordingly)
*/
pragma solidity 0.8.17;
import "./EventContract.sol";

contract Marketplace {
EventContract[] public EventContracts;
  
  event EventContractCreated ( string indexed _name, address indexed EventContractAddress );

  function createEventContract (uint factory_totalSupply, 
                        uint factory_priceInEth, 
                        string memory factory_name, 
                        string memory factory_symbol,
                        uint factory_EventContractDuration)  external {

   EventContract new_EventContract = new EventContract 
                                                ( factory_totalSupply,
                                                factory_priceInEth,
                                                factory_name,
                                                factory_symbol,
                                                factory_EventContractDuration);
   EventContracts.push(new_EventContract);
   emit EventContractCreated (factory_name, address(new_EventContract));
   }



}