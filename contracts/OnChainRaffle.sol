// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OnChainRaffle
 * @dev A contract for conducting on-chain raffles with verifiable randomness
 * @notice This contract allows authorized executors to run raffles and stores results
 */
contract OnChainRaffle is Ownable {
    uint256 public raffleCounter;

    mapping(uint256 => uint256[]) public raffleResults;

    mapping(address => bool) public raffleExecutors;

    event RaffleExecuted(uint256 indexed raffleId, uint256[] participants, uint256[] winners);
    event ExecutorAdded(address indexed executor);
    event ExecutorRemoved(address indexed executor);

    error NotAuthorized();
    error InvalidNumberOfWinners();
    error InvalidParticipants();
    error ZeroAddress();

    modifier onlyExecutor() {
        if (!raffleExecutors[msg.sender]) revert NotAuthorized();
        _;
    }

    /**
     * @dev Constructor sets the deployer as owner and initial executors
     * @param _initialExecutors Array of addresses to be set as initial raffle executors
     */
    constructor(address[] memory _initialExecutors) Ownable(msg.sender) {
        for (uint256 i = 0; i < _initialExecutors.length; i++) {
            if (_initialExecutors[i] == address(0)) revert ZeroAddress();
            raffleExecutors[_initialExecutors[i]] = true;
            emit ExecutorAdded(_initialExecutors[i]);
        }
    }

    /**
     * @dev Executes a raffle and selects random winners
     * @param participants Array of participant IDs/indices
     * @param numberOfWinners Number of winners to select
     * @return winners Array of winner indices from the participants array
     */
    function executeRaffle(
        uint256[] calldata participants,
        uint256 numberOfWinners
    ) external onlyExecutor returns (uint256[] memory winners) {
        if (participants.length == 0) revert InvalidParticipants();
        if (numberOfWinners == 0 || numberOfWinners > participants.length) {
            revert InvalidNumberOfWinners();
        }

        uint256 raffleId = raffleCounter++;

        winners = new uint256[](numberOfWinners);
        uint256[] memory tempParticipants = new uint256[](participants.length);

        for (uint256 i = 0; i < participants.length; i++) {
            tempParticipants[i] = participants[i];
        }

        // Fisher-Yates shuffle algorithm
        uint256 remainingParticipants = participants.length;

        for (uint256 i = 0; i < numberOfWinners; i++) {
            uint256 randomIndex = _generateRandomNumber(i, remainingParticipants);

            winners[i] = tempParticipants[randomIndex];

            tempParticipants[randomIndex] = tempParticipants[remainingParticipants - 1];
            remainingParticipants--;
        }

        raffleResults[raffleId] = winners;

        emit RaffleExecuted(raffleId, participants, winners);

        return winners;
    }

    /**
     * @dev Generates a pseudo-random number
     * @param nonce Additional nonce for randomness
     * @param max Maximum value (exclusive)
     * @return Random number between 0 and max-1
     * @notice This uses block variables for randomness
     * 
     */
    function _generateRandomNumber(uint256 nonce, uint256 max) private view returns (uint256) {
        return uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    nonce,
                    raffleCounter
                )
            )
        ) % max;
    }

    /**
     * @dev Adds a new raffle executor
     * @param executor Address to add as executor
     */
    function addExecutor(address executor) external onlyOwner {
        if (executor == address(0)) revert ZeroAddress();
        raffleExecutors[executor] = true;
        emit ExecutorAdded(executor);
    }

    /**
     * @dev Removes a raffle executor
     * @param executor Address to remove from executors
     */
    function removeExecutor(address executor) external onlyOwner {
        raffleExecutors[executor] = false;
        emit ExecutorRemoved(executor);
    }


    /**
     * @dev Gets the winners of a specific raffle
     * @param raffleId The ID of the raffle
     * @return Array of winner indices
     */
    function getRaffleWinners(uint256 raffleId) external view returns (uint256[] memory) {
        return raffleResults[raffleId];
    }

    /**
     * @dev Checks if an address is an authorized executor
     * @param executor Address to check
     * @return bool indicating if the address is an executor
     */
    function isExecutor(address executor) external view returns (bool) {
        return raffleExecutors[executor];
    }
}
