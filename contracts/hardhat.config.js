require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {
            chainId: 31337
        },
        // opBNB 测试网
        opbnbTestnet: {
            url: "https://opbnb-testnet-rpc.bnbchain.org",
            chainId: 5611,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            gasPrice: 1000000000 // 1 gwei
        },
        // opBNB 主网
        opbnb: {
            url: "https://opbnb-mainnet-rpc.bnbchain.org",
            chainId: 204,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            gasPrice: 1000000000
        },
        // BSC 测试网
        bscTestnet: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545",
            chainId: 97,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
        },
        // BSC 主网
        bsc: {
            url: "https://bsc-dataseed.binance.org/",
            chainId: 56,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
        }
    },
    etherscan: {
        apiKey: {
            opbnbTestnet: process.env.OPBNB_API_KEY || "",
            opbnb: process.env.OPBNB_API_KEY || "",
            bscTestnet: process.env.BSCSCAN_API_KEY || "",
            bsc: process.env.BSCSCAN_API_KEY || ""
        },
        customChains: [
            {
                network: "opbnbTestnet",
                chainId: 5611,
                urls: {
                    apiURL: "https://open-platform.nodereal.io/5e3e0d2e89764dae963e4a75f9d0c9a9/op-bnb-testnet/contract/",
                    browserURL: "https://opbnb-testnet.bscscan.com/"
                }
            },
            {
                network: "opbnb",
                chainId: 204,
                urls: {
                    apiURL: "https://api-opbnb.bscscan.com/api",
                    browserURL: "https://opbnb.bscscan.com/"
                }
            }
        ]
    },
    paths: {
        sources: "./src",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};
