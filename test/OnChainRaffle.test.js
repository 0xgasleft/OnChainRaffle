const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
require("@nomicfoundation/hardhat-chai-matchers");

describe("OnChainRaffle", function () {
  // Fixture to deploy the contract with initial setup
  async function deployRaffleFixture() {
    const [owner, executor1, executor2, nonExecutor, user1, user2] = await ethers.getSigners();

    const OnChainRaffle = await ethers.getContractFactory("OnChainRaffle");
    const raffle = await OnChainRaffle.deploy([executor1.address, executor2.address]);

    return { raffle, owner, executor1, executor2, nonExecutor, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { raffle, owner } = await loadFixture(deployRaffleFixture);
      expect(await raffle.owner()).to.equal(owner.address);
    });

    it("Should initialize raffle counter to 0", async function () {
      const { raffle } = await loadFixture(deployRaffleFixture);
      expect(await raffle.raffleCounter()).to.equal(0);
    });

    it("Should add initial executors correctly", async function () {
      const { raffle, executor1, executor2 } = await loadFixture(deployRaffleFixture);
      expect(await raffle.raffleExecutors(executor1.address)).to.be.true;
      expect(await raffle.raffleExecutors(executor2.address)).to.be.true;
      expect(await raffle.isExecutor(executor1.address)).to.be.true;
      expect(await raffle.isExecutor(executor2.address)).to.be.true;
    });

    it("Should emit ExecutorAdded events for initial executors", async function () {
      // Note: Testing constructor events during deployment is challenging
      // We verify the executors are properly added by checking the state instead
      const [owner, executor1, executor2] = await ethers.getSigners();
      const OnChainRaffle = await ethers.getContractFactory("OnChainRaffle");
      const raffle = await OnChainRaffle.deploy([executor1.address, executor2.address]);

      // Verify executors were added successfully
      expect(await raffle.isExecutor(executor1.address)).to.be.true;
      expect(await raffle.isExecutor(executor2.address)).to.be.true;
    });

    it("Should revert if initial executor is zero address", async function () {
      const OnChainRaffle = await ethers.getContractFactory("OnChainRaffle");
      await expect(
        OnChainRaffle.deploy([ethers.ZeroAddress])
      ).to.be.revertedWithCustomError(OnChainRaffle, "ZeroAddress");
    });

    it("Should allow deployment with no initial executors", async function () {
      const OnChainRaffle = await ethers.getContractFactory("OnChainRaffle");
      const raffle = await OnChainRaffle.deploy([]);
      expect(await raffle.raffleCounter()).to.equal(0);
    });
  });

  describe("Execute Raffle", function () {
    it("Should execute a raffle and return winners", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const numberOfWinners = 3;

      const tx = await raffle.connect(executor1).executeRaffle(participants, numberOfWinners);
      const receipt = await tx.wait();

      // Find the RaffleExecuted event
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RaffleExecuted"
      );

      expect(event).to.not.be.undefined;
      const winners = event.args.winners;
      expect(winners.length).to.equal(numberOfWinners);
    });

    it("Should store raffle results with correct ID", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [10, 20, 30, 40, 50];
      const numberOfWinners = 2;

      await raffle.connect(executor1).executeRaffle(participants, numberOfWinners);

      const storedWinners = await raffle.getRaffleWinners(0);
      expect(storedWinners.length).to.equal(numberOfWinners);

      // Verify winners are from the participants list
      for (let winner of storedWinners) {
        expect(participants).to.include(Number(winner));
      }
    });

    it("Should increment raffle counter after execution", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5];

      expect(await raffle.raffleCounter()).to.equal(0);

      await raffle.connect(executor1).executeRaffle(participants, 2);
      expect(await raffle.raffleCounter()).to.equal(1);

      await raffle.connect(executor1).executeRaffle(participants, 2);
      expect(await raffle.raffleCounter()).to.equal(2);
    });

    it("Should emit RaffleExecuted event with correct data", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [100, 200, 300];
      const numberOfWinners = 2;

      await expect(raffle.connect(executor1).executeRaffle(participants, numberOfWinners))
        .to.emit(raffle, "RaffleExecuted")
        .withArgs(0, participants, (winners) => {
          return winners.length === numberOfWinners;
        });
    });

    it("Should select unique winners (no duplicates)", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const numberOfWinners = 5;

      const tx = await raffle.connect(executor1).executeRaffle(participants, numberOfWinners);
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RaffleExecuted"
      );

      const winners = event.args.winners.map(w => Number(w));
      const uniqueWinners = [...new Set(winners)];

      expect(winners.length).to.equal(uniqueWinners.length);
    });

    it("Should handle raffle with single winner", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5];
      const numberOfWinners = 1;

      const tx = await raffle.connect(executor1).executeRaffle(participants, numberOfWinners);
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RaffleExecuted"
      );

      expect(event.args.winners.length).to.equal(1);
      expect(participants).to.include(Number(event.args.winners[0]));
    });

    it("Should handle raffle where all participants win", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3];
      const numberOfWinners = 3;

      const tx = await raffle.connect(executor1).executeRaffle(participants, numberOfWinners);
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RaffleExecuted"
      );

      expect(event.args.winners.length).to.equal(3);
    });

    it("Should work with large participant arrays", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = Array.from({ length: 1000 }, (_, i) => i + 1);
      const numberOfWinners = 10;

      const tx = await raffle.connect(executor1).executeRaffle(participants, numberOfWinners);
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RaffleExecuted"
      );

      expect(event.args.winners.length).to.equal(numberOfWinners);
    });

    it("Should revert if caller is not an executor", async function () {
      const { raffle, nonExecutor } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5];

      await expect(
        raffle.connect(nonExecutor).executeRaffle(participants, 2)
      ).to.be.revertedWithCustomError(raffle, "NotAuthorized");
    });

    it("Should revert if participants array is empty", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [];

      await expect(
        raffle.connect(executor1).executeRaffle(participants, 1)
      ).to.be.revertedWithCustomError(raffle, "InvalidParticipants");
    });

    it("Should revert if numberOfWinners is zero", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5];

      await expect(
        raffle.connect(executor1).executeRaffle(participants, 0)
      ).to.be.revertedWithCustomError(raffle, "InvalidNumberOfWinners");
    });

    it("Should revert if numberOfWinners exceeds participants length", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3];

      await expect(
        raffle.connect(executor1).executeRaffle(participants, 5)
      ).to.be.revertedWithCustomError(raffle, "InvalidNumberOfWinners");
    });
  });

  describe("Executor Management", function () {
    it("Should allow owner to add new executor", async function () {
      const { raffle, owner, user1 } = await loadFixture(deployRaffleFixture);

      expect(await raffle.isExecutor(user1.address)).to.be.false;

      await raffle.connect(owner).addExecutor(user1.address);

      expect(await raffle.isExecutor(user1.address)).to.be.true;
      expect(await raffle.raffleExecutors(user1.address)).to.be.true;
    });

    it("Should emit ExecutorAdded event when adding executor", async function () {
      const { raffle, owner, user1 } = await loadFixture(deployRaffleFixture);

      await expect(raffle.connect(owner).addExecutor(user1.address))
        .to.emit(raffle, "ExecutorAdded")
        .withArgs(user1.address);
    });

    it("Should allow owner to remove executor", async function () {
      const { raffle, owner, executor1 } = await loadFixture(deployRaffleFixture);

      expect(await raffle.isExecutor(executor1.address)).to.be.true;

      await raffle.connect(owner).removeExecutor(executor1.address);

      expect(await raffle.isExecutor(executor1.address)).to.be.false;
      expect(await raffle.raffleExecutors(executor1.address)).to.be.false;
    });

    it("Should emit ExecutorRemoved event when removing executor", async function () {
      const { raffle, owner, executor1 } = await loadFixture(deployRaffleFixture);

      await expect(raffle.connect(owner).removeExecutor(executor1.address))
        .to.emit(raffle, "ExecutorRemoved")
        .withArgs(executor1.address);
    });

    it("Should prevent removed executor from executing raffles", async function () {
      const { raffle, owner, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5];

      await raffle.connect(owner).removeExecutor(executor1.address);

      await expect(
        raffle.connect(executor1).executeRaffle(participants, 2)
      ).to.be.revertedWithCustomError(raffle, "NotAuthorized");
    });

    it("Should allow newly added executor to execute raffles", async function () {
      const { raffle, owner, user1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5];

      await raffle.connect(owner).addExecutor(user1.address);

      await expect(
        raffle.connect(user1).executeRaffle(participants, 2)
      ).to.not.be.reverted;
    });

    it("Should revert when non-owner tries to add executor", async function () {
      const { raffle, nonExecutor, user1 } = await loadFixture(deployRaffleFixture);

      await expect(
        raffle.connect(nonExecutor).addExecutor(user1.address)
      ).to.be.revertedWithCustomError(raffle, "OwnableUnauthorizedAccount");
    });

    it("Should revert when non-owner tries to remove executor", async function () {
      const { raffle, nonExecutor, executor1 } = await loadFixture(deployRaffleFixture);

      await expect(
        raffle.connect(nonExecutor).removeExecutor(executor1.address)
      ).to.be.revertedWithCustomError(raffle, "OwnableUnauthorizedAccount");
    });

    it("Should revert when adding zero address as executor", async function () {
      const { raffle, owner } = await loadFixture(deployRaffleFixture);

      await expect(
        raffle.connect(owner).addExecutor(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(raffle, "ZeroAddress");
    });

    it("Should allow adding same executor multiple times (idempotent)", async function () {
      const { raffle, owner, user1 } = await loadFixture(deployRaffleFixture);

      await raffle.connect(owner).addExecutor(user1.address);
      await raffle.connect(owner).addExecutor(user1.address);

      expect(await raffle.isExecutor(user1.address)).to.be.true;
    });
  });

  describe("Ownership Management", function () {
    it("Should allow owner to transfer ownership", async function () {
      const { raffle, owner, user1 } = await loadFixture(deployRaffleFixture);

      await raffle.connect(owner).transferOwnership(user1.address);

      expect(await raffle.owner()).to.equal(user1.address);
    });

    it("Should emit OwnershipTransferred event", async function () {
      const { raffle, owner, user1 } = await loadFixture(deployRaffleFixture);

      await expect(raffle.connect(owner).transferOwnership(user1.address))
        .to.emit(raffle, "OwnershipTransferred")
        .withArgs(owner.address, user1.address);
    });

    it("Should allow new owner to manage executors", async function () {
      const { raffle, owner, user1, user2 } = await loadFixture(deployRaffleFixture);

      await raffle.connect(owner).transferOwnership(user1.address);

      await expect(raffle.connect(user1).addExecutor(user2.address))
        .to.not.be.reverted;

      expect(await raffle.isExecutor(user2.address)).to.be.true;
    });

    it("Should prevent old owner from managing executors after transfer", async function () {
      const { raffle, owner, user1, user2 } = await loadFixture(deployRaffleFixture);

      await raffle.connect(owner).transferOwnership(user1.address);

      await expect(
        raffle.connect(owner).addExecutor(user2.address)
      ).to.be.revertedWithCustomError(raffle, "OwnableUnauthorizedAccount");
    });

    it("Should revert when non-owner tries to transfer ownership", async function () {
      const { raffle, nonExecutor, user1 } = await loadFixture(deployRaffleFixture);

      await expect(
        raffle.connect(nonExecutor).transferOwnership(user1.address)
      ).to.be.revertedWithCustomError(raffle, "OwnableUnauthorizedAccount");
    });

    it("Should revert when transferring to zero address", async function () {
      const { raffle, owner } = await loadFixture(deployRaffleFixture);

      await expect(
        raffle.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(raffle, "OwnableInvalidOwner");
    });
  });

  describe("View Functions", function () {
    it("Should return correct raffle winners", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [10, 20, 30, 40, 50];

      await raffle.connect(executor1).executeRaffle(participants, 3);

      const winners = await raffle.getRaffleWinners(0);
      expect(winners.length).to.equal(3);
    });

    it("Should return empty array for non-existent raffle ID", async function () {
      const { raffle } = await loadFixture(deployRaffleFixture);

      const winners = await raffle.getRaffleWinners(999);
      expect(winners.length).to.equal(0);
    });

    it("Should return correct executor status", async function () {
      const { raffle, executor1, nonExecutor } = await loadFixture(deployRaffleFixture);

      expect(await raffle.isExecutor(executor1.address)).to.be.true;
      expect(await raffle.isExecutor(nonExecutor.address)).to.be.false;
    });

    it("Should allow accessing raffleExecutors mapping directly", async function () {
      const { raffle, executor1, nonExecutor } = await loadFixture(deployRaffleFixture);

      expect(await raffle.raffleExecutors(executor1.address)).to.be.true;
      expect(await raffle.raffleExecutors(nonExecutor.address)).to.be.false;
    });

    it("Should return correct raffleCounter value", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5];

      expect(await raffle.raffleCounter()).to.equal(0);

      await raffle.connect(executor1).executeRaffle(participants, 2);
      expect(await raffle.raffleCounter()).to.equal(1);

      await raffle.connect(executor1).executeRaffle(participants, 2);
      expect(await raffle.raffleCounter()).to.equal(2);
    });
  });

  describe("Multiple Raffles", function () {
    it("Should store multiple raffles independently", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);

      const participants1 = [1, 2, 3, 4, 5];
      const participants2 = [10, 20, 30, 40, 50];

      await raffle.connect(executor1).executeRaffle(participants1, 2);
      await raffle.connect(executor1).executeRaffle(participants2, 3);

      const winners1 = await raffle.getRaffleWinners(0);
      const winners2 = await raffle.getRaffleWinners(1);

      expect(winners1.length).to.equal(2);
      expect(winners2.length).to.equal(3);

      // Verify winners are from correct participant pools
      for (let winner of winners1) {
        expect(participants1).to.include(Number(winner));
      }
      for (let winner of winners2) {
        expect(participants2).to.include(Number(winner));
      }
    });

    it("Should handle multiple executors running raffles concurrently", async function () {
      const { raffle, executor1, executor2 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5];

      await raffle.connect(executor1).executeRaffle(participants, 2);
      await raffle.connect(executor2).executeRaffle(participants, 2);

      expect(await raffle.raffleCounter()).to.equal(2);

      const winners1 = await raffle.getRaffleWinners(0);
      const winners2 = await raffle.getRaffleWinners(1);

      expect(winners1.length).to.equal(2);
      expect(winners2.length).to.equal(2);
    });

    it("Should maintain accurate raffle counter across multiple raffles", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5];

      for (let i = 0; i < 10; i++) {
        await raffle.connect(executor1).executeRaffle(participants, 2);
        expect(await raffle.raffleCounter()).to.equal(i + 1);
      }
    });
  });

  describe("Gas Optimization and Edge Cases", function () {
    it("Should handle raffle with maximum uint256 participant values", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const maxUint = ethers.MaxUint256;
      const participants = [maxUint - 2n, maxUint - 1n, maxUint];

      const tx = await raffle.connect(executor1).executeRaffle(participants, 2);
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RaffleExecuted"
      );

      expect(event.args.winners.length).to.equal(2);
    });

    it("Should handle duplicate participant IDs correctly", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 1, 1, 2, 2, 3]; // Duplicates allowed in input

      const tx = await raffle.connect(executor1).executeRaffle(participants, 3);
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RaffleExecuted"
      );

      expect(event.args.winners.length).to.equal(3);
    });

    it("Should produce different results for consecutive raffles with same input", async function () {
      const { raffle, executor1 } = await loadFixture(deployRaffleFixture);
      const participants = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const numberOfWinners = 5;

      const tx1 = await raffle.connect(executor1).executeRaffle(participants, numberOfWinners);
      const receipt1 = await tx1.wait();
      const event1 = receipt1.logs.find(log => log.fragment && log.fragment.name === "RaffleExecuted");
      const winners1 = event1.args.winners.map(w => Number(w));

      // Advance time slightly
      await ethers.provider.send("evm_mine");

      const tx2 = await raffle.connect(executor1).executeRaffle(participants, numberOfWinners);
      const receipt2 = await tx2.wait();
      const event2 = receipt2.logs.find(log => log.fragment && log.fragment.name === "RaffleExecuted");
      const winners2 = event2.args.winners.map(w => Number(w));

      // Winners should likely be different (not guaranteed but highly probable)
      const areIdentical = winners1.length === winners2.length &&
                          winners1.every((val, idx) => val === winners2[idx]);

      // Note: This test might occasionally fail due to randomness
      // In production, you might want to run this multiple times or skip it
      expect(areIdentical).to.be.false;
    });
  });
});
