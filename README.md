# OnChainRaffle

A secure, gas-efficient on-chain raffle system built with Solidity and Hardhat. This project enables provably fair winner selection for on-chain lotteries and raffle systems with robust access control and executor management.

## Features

- **On-Chain Raffle Execution**: Conduct raffles entirely on-chain with verifiable randomness
- **Flexible Winner Selection**: Select any number of winners from a participant pool
- **Access Control**: Role-based executor system with owner management (OpenZeppelin Ownable)
- **Raffle History**: All raffle results are stored on-chain with unique IDs
- **Gas Optimized**: Efficient Fisher-Yates shuffle algorithm for winner selection
- **Comprehensive Testing**: 45+ test cases with full coverage
- **Event Emissions**: Complete event tracking for off-chain monitoring

## Table of Contents

- [Installation](#installation)
- [Contract Overview](#contract-overview)
- [Usage](#usage)
- [Testing](#testing)
- [Deployment](#deployment)
- [Gas Costs](#gas-costs)
- [Security](#security)
- [API Reference](#api-reference)
- [License](#license)

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd OnchainRaffle
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Add your private key to `.env`:
```
PK=your_private_key_here
```

5. Add your RPC to `.env`:
```
RPC=your_rpc
```

## Contract Overview

### OnChainRaffle.sol

The main raffle contract that provides:

- **Executor Management**: Owner can add/remove authorized raffle executors
- **Raffle Execution**: Executors can run raffles with specified participants and winner counts
- **Result Storage**: All raffle results stored in mapping with unique IDs
- **Pseudo-Random Selection**: Uses block variables for winner selection (Fisher-Yates algorithm)

### Key Components

```solidity
struct Raffle {
    uint256[] participants;
    uint256[] winners;
    address executor;
    uint256 timestamp;
}

mapping(uint256 => uint256[]) public raffleResults;
mapping(address => bool) public raffleExecutors;
uint256 public raffleCounter;
```

## Usage

### Basic Example

```javascript
const { ethers } = require("hardhat");

// Deploy contract
const OnChainRaffle = await ethers.getContractFactory("OnChainRaffle");
const raffle = await OnChainRaffle.deploy([executor1.address, executor2.address]);

// Execute a raffle
const participants = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const numberOfWinners = 3;

const tx = await raffle.connect(executor1).executeRaffle(participants, numberOfWinners);
const receipt = await tx.wait();

// Get winners
const winners = await raffle.getRaffleWinners(0);
console.log("Winners:", winners);
```

### Managing Executors

```javascript
// Add executor (only owner)
await raffle.connect(owner).addExecutor(newExecutor.address);

// Remove executor (only owner)
await raffle.connect(owner).removeExecutor(executor.address);

// Check executor status
const isExecutor = await raffle.isExecutor(address);
```

### Querying Raffle Results

```javascript
// Get winners for a specific raffle
const winners = await raffle.getRaffleWinners(raffleId);

// Check raffle counter
const totalRaffles = await raffle.raffleCounter();
```

## Testing

The project includes comprehensive test coverage with 45 test cases.

### Run All Tests

```bash
npx hardhat test
```

### Run Specific Test File

```bash
npx hardhat test test/OnChainRaffle.test.js
```

### Test Coverage

- **Deployment Tests** (6 tests): Owner setup, executor initialization, validation
- **Execute Raffle Tests** (11 tests): Winner selection, storage, events, edge cases
- **Executor Management Tests** (9 tests): Add/remove executors, access control
- **Ownership Management Tests** (6 tests): Ownership transfer, permissions
- **View Functions Tests** (5 tests): Data retrieval and status checks
- **Multiple Raffles Tests** (3 tests): Concurrent operations, independence
- **Gas & Edge Cases Tests** (5 tests): Large numbers, duplicates, randomness

### Test Results

```
45 passing (548ms)

Gas Usage:
- Contract Deployment: ~1,102,686 gas (3.7% block limit)
- executeRaffle: 100,769 - 925,247 gas (avg: 172,489)
- addExecutor: 27,705 - 47,605 gas (avg: 45,118)
- removeExecutor: ~25,692 gas
- transferOwnership: ~29,086 gas
```

## Deployment

### Local Hardhat Network

```bash
npx hardhat ignition deploy ignition/modules/OnChainRaffle.js --network localhost
```

### Other networks
After configuring new network in `hardhat.config.js`, run:

```bash
npx hardhat ignition deploy ignition/modules/OnChainRaffle.js --network OTHER_NETWORK
```

## Gas Costs

Average gas costs for common operations:

| Operation | Gas Cost (avg) | Description |
|-----------|----------------|-------------|
| Deploy Contract | 1,102,686 | Initial contract deployment |
| executeRaffle (small) | ~100,769 | Execute raffle with few participants |
| executeRaffle (large) | ~925,247 | Execute raffle with 1000 participants |
| addExecutor | ~45,118 | Add new executor |
| removeExecutor | ~25,692 | Remove existing executor |
| transferOwnership | ~29,086 | Transfer contract ownership |

*Note: Gas costs may vary based on network conditions and participant array sizes*

## Security

### Access Control

- **Owner**: Can add/remove executors and transfer ownership (OpenZeppelin Ownable)
- **Executors**: Can execute raffles only
- **Public**: Can view raffle results and status

### Randomness

**Important**: The current implementation uses pseudo-random number generation based on block variables:

```solidity
keccak256(abi.encodePacked(
    block.timestamp,
    block.prevrandao,
    msg.sender,
    nonce,
    raffleCounter
))
```

**For production use with high-value raffles**, consider integrating:
- [Chainlink VRF](https://docs.chain.link/vrf) (Verifiable Random Function)
- Other oracle-based randomness solutions

### Security Features

- Custom errors for gas efficiency
- OpenZeppelin Ownable for ownership management
- Input validation on all external functions
- Zero address checks
- Access control modifiers
- Event emissions for transparency

## API Reference

### Core Functions

#### `executeRaffle(uint256[] calldata participants, uint256 numberOfWinners)`

Executes a raffle and selects random winners.

- **Access**: Only executors
- **Parameters**:
  - `participants`: Array of participant IDs
  - `numberOfWinners`: Number of winners to select
- **Returns**: `uint256[]` array of winner IDs
- **Events**: `RaffleExecuted(raffleId, participants, winners)`

#### `addExecutor(address executor)`

Adds a new authorized executor.

- **Access**: Only owner
- **Parameters**: `executor` - Address to add as executor
- **Events**: `ExecutorAdded(executor)`

#### `removeExecutor(address executor)`

Removes an executor.

- **Access**: Only owner
- **Parameters**: `executor` - Address to remove
- **Events**: `ExecutorRemoved(executor)`

### View Functions

#### `getRaffleWinners(uint256 raffleId)`

Returns the winners for a specific raffle.

- **Parameters**: `raffleId` - The raffle ID
- **Returns**: `uint256[]` array of winner IDs

#### `isExecutor(address executor)`

Checks if an address is an authorized executor.

- **Parameters**: `executor` - Address to check
- **Returns**: `bool` indicating executor status

#### `raffleCounter()`

Returns the total number of raffles executed.

- **Returns**: `uint256` raffle count

### Events

```solidity
event RaffleExecuted(uint256 indexed raffleId, uint256[] participants, uint256[] winners);
event ExecutorAdded(address indexed executor);
event ExecutorRemoved(address indexed executor);
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

## Project Structure

```
OnchainRaffle/
-> contracts/
-> contracts/OnChainRaffle.sol          # Main raffle contract
-> test/
-> test/OnChainRaffle.test.js      # Comprehensive test suite
-> ignition/                       # Deployment modules
-> hardhat.config.js               # Hardhat configuration
-> package.json                    # Dependencies
-> README.md                       # This file
```


## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Testing Contributions

Please ensure all tests pass before submitting:

```bash
npx hardhat test
```

Add tests for any new functionality.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This smart contract is provided as-is for educational and development purposes. The pseudo-random number generation is NOT suitable for high-stakes raffles or production use without proper auditing and integration with a verifiable randomness source like Chainlink VRF.

Always conduct thorough security audits before deploying to mainnet with real value at stake.

## Contact & Support

For questions, issues, or contributions:
- Open an issue on GitHub
- Submit a pull request
- Contact the development team

---

Built using Hardhat and OpenZeppelin
