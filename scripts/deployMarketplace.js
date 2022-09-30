const { ethers } = require("hardhat");

async function main() {
  // deployment code is contained here

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    1396,
    "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D"
  );
  await marketplace.deployed();

  console.log(
    "contract deployed to Goerli at address:   " +
      `https://goerli.etherscan.io/address/${marketplace.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
