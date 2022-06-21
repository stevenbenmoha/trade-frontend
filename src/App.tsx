import React, { Component } from 'react';
import './App.css';
import Button from '@mui/material/Button';
import SendIcon from '@mui/icons-material/Send';
import { ethers } from "ethers";
import uniswap_abi from "../src/abis/router.json";
const { UNISWAP, WETH, ChainId, Token, TokenAmount, Trade, Fetcher, Route, Percent, TradeType } = require('@uniswap/sdk');

class App extends Component {

  privateKey: any;
  UNISWAP_ROUTER_ADDRESS = '';
  UNISWAP_ROUTER_ABI = '';
  UNISWAP_ROUTER_CONTRACT: any;
  wallet: any;

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <Button variant="contained" endIcon={<SendIcon />}
            onClick={() => {
             this.setup();
            }}>
            Send Bait Transaction
          </Button>
        </header>
      </div>
    );
  }

  async componentDidMount() {

  }

  async setup() {

    // provider and wallet setup
    const url = process.env.REACT_APP_GOERLI_ALCHEMY_URL;
    const provider = new ethers.providers.JsonRpcProvider(url);
    this.privateKey = process.env.REACT_APP_GOERLI_PRIVATE_KEY;
    const wallet = new ethers.Wallet(this.privateKey, provider);

    // get token to swap for
    const chainId = ChainId.GÖRLI;
    const uniTokenAddress = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
    const UNI = await Fetcher.fetchTokenData(chainId, uniTokenAddress, provider, 'UNI', 'Uniswap Token');

    // make trade
    await this.createTrade(UNI, .002, provider, wallet);
  }

  async createTrade(toxicToken: any, tokenAmount: any, provider: any, wallet: any) {
    try {

      this.UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
      this.UNISWAP_ROUTER_ABI = JSON.stringify(uniswap_abi);
      this.UNISWAP_ROUTER_CONTRACT = new ethers.Contract(this.UNISWAP_ROUTER_ADDRESS, this.UNISWAP_ROUTER_ABI, provider)

      const pair = await Fetcher.fetchPairData(toxicToken, WETH[toxicToken.chainId], provider);
      const route = new Route([pair], WETH[toxicToken.chainId]);

      let amountIn = ethers.utils.parseEther(tokenAmount.toString()).toString(); //helper function to convert ETH to Wei

      const trade = new Trade(route, new TokenAmount(WETH[toxicToken.chainId], amountIn), TradeType.EXACT_INPUT);

      const slippageTolerance = new Percent('1000', '10000') // 1000 bips, or 10%
      const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw // needs to be converted to e.g. hex
      const amountOutMinHex = ethers.BigNumber.from(amountOutMin.toString()).toHexString();

      const path = [WETH[toxicToken.chainId].address, toxicToken.address]


      const to = process.env.REACT_APP_TEST_WALLET_ADDRESS; // should be a checksummed recipient address
      const deadline = Math.floor(Date.now() / 1000) + 10; // 10 seconds from now(?)

      const value = trade.inputAmount.raw // // needs to be converted to e.g. hex
      const valueHex = await ethers.BigNumber.from(value.toString()).toHexString(); //convert to hex string

      const rawTxn = await this.UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactETHForTokens(amountOutMinHex, path, to, deadline, {
        value: valueHex
      });

      rawTxn.gasPrice = 80000;

      console.log('rawtxn: ', rawTxn);

      let sendTxn = (await wallet).sendTransaction(rawTxn);

      let reciept = (await sendTxn).wait();

      //Logs the information about the transaction it has been mined.
      if (reciept) {
        console.log(" - Transaction is mined - " + '\n'
          + "Transaction Hash:", (await sendTxn).hash
          + '\n' + "Block Number: "
          + (await reciept).blockNumber + '\n'
          + "Navigate to https://goerli.etherscan.io/txn/"
        + (await sendTxn).hash, "to see your transaction")
      } else {
        console.log("Error submitting transaction")
      }
    } catch (e) {
      console.log('reached here :(');
      console.log(e)
    }
  }


}

export default App;
