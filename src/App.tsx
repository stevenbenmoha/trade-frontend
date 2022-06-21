import React, { Component } from 'react';
import './App.css';
import Button from '@mui/material/Button';
import ContactlessIcon from '@mui/icons-material/Contactless';
import { BigNumber, ethers } from "ethers";
import uniswap_abi from "../src/abis/router.json";
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
const { UNISWAP, WETH, ChainId, Token, TokenAmount, Trade, Fetcher, Route, Percent, TradeType } = require('@uniswap/sdk');

class App extends Component {


  url = process.env.REACT_APP_GOERLI_ALCHEMY_URL;
  provider = new ethers.providers.JsonRpcProvider(this.url);
  privateKey: any = process.env.REACT_APP_GOERLI_PRIVATE_KEY;
  chainId = ChainId.GÖRLI;
  uniTokenAddress = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
  UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
  UNISWAP_ROUTER_ABI = JSON.stringify(uniswap_abi);
  UNISWAP_ROUTER_CONTRACT = new ethers.Contract(this.UNISWAP_ROUTER_ADDRESS, this.UNISWAP_ROUTER_ABI, this.provider);
  immediateTxHash = '';
  txIsPending = false;
  txInfo: any;

  render() {
    if (!this.txIsPending) {
      return (
        <div className="App">
          <header className="App-header">
            <Button variant="contained" endIcon={<ContactlessIcon />}
              onClick={() => {
                this.setupWalletAndSendTrade();
              }}>
              Send Bait Transaction
            </Button>
          </header>
        </div>
      );
    } else {
      return (
        <div className="App">
          <header className="App-header">
            <Card className="rounded-border" elevation={12} sx={{ minWidth: 275 }}>
              <CardContent>
                <h5 className="defaultFont">
                  Tx Pending
                </h5>
              </CardContent>
              <Box sx={{ width: '100%' }}>
                <LinearProgress />
              </Box>
              <br />
              <CardActions className="center-me">
                <a target="_blank" rel="noreferrer" href={'https://goerli.etherscan.io/tx/' + this.txInfo.hash}><Button size="small">monitor transaction progress on etherscan</Button></a>
              </CardActions>
            </Card>
            <br />
            <br />
            <Button variant="contained" disabled endIcon={<ContactlessIcon />}>
              Send Bait Transaction
            </Button>
          </header>
        </div>
      );
    }
  }

  async componentDidMount() {

  }

  async setupWalletAndSendTrade() {

    const wallet = new ethers.Wallet(this.privateKey, this.provider);
    const UNI = await Fetcher.fetchTokenData(this.chainId, this.uniTokenAddress, this.provider, 'UNI', 'Uniswap Token');

    await this.sendTrade(UNI, .002, this.provider, wallet);
  }

  async sendTrade(toxicToken: any, tokenAmount: any, provider: any, wallet: any) {
    try {

      const pair = await Fetcher.fetchPairData(toxicToken, WETH[toxicToken.chainId], provider);
      const route = new Route([pair], WETH[toxicToken.chainId]);

      let amountIn = ethers.utils.parseEther(tokenAmount.toString()).toString(); //helper function to convert ETH to Wei

      const trade = new Trade(route, new TokenAmount(WETH[toxicToken.chainId], amountIn), TradeType.EXACT_INPUT);

      const slippageTolerance = new Percent('1000', '10000') // 1000 bips, or 10%
      const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw // needs to be converted to e.g. hex
      const amountOutMinHex = ethers.BigNumber.from(amountOutMin.toString()).toHexString();

      const path = [WETH[toxicToken.chainId].address, toxicToken.address]


      const to = process.env.REACT_APP_TEST_WALLET_ADDRESS; // should be a checksummed recipient address
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 mins from now(?)

      const value = trade.inputAmount.raw // // needs to be converted to e.g. hex
      const valueHex = await ethers.BigNumber.from(value.toString()).toHexString(); //convert to hex string

      const rawTxn = await this.UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactETHForTokens(amountOutMinHex, path, to, deadline, {
        value: valueHex
      });

      rawTxn.gasPrice = BigNumber.from("80000");

      console.log('rawtxn: ', rawTxn);

      let sendTxn = (await wallet).sendTransaction(rawTxn).then(async (res: any) => {
        this.immediateTxHash = res.hash;
        this.txInfo = res;
        this.txIsPending = true;
        this.forceUpdate();
      });

      wallet.provider.on("pending", (tx: any) => {
        wallet.provider.getTransaction(this.immediateTxHash).then(async (transaction: any) => {
          console.log(transaction);
          if (null !== transaction.blockNumber) {
            this.txIsPending = false;
            await this.forceUpdate();
          }
        });
      });

      let reciept = (await sendTxn).wait();

      //Logs the information about the transaction it has been mined.
      if (reciept) {
        console.log(
          " - Transaction is mined - " + "\n" + "Transaction Hash:",
          (await sendTxn).hash +
          "\n" +
          "Block Number: " +
          (await reciept).blockNumber +
          "\n" +
          "Navigate to https://goerli.etherscan.io/txn/" +
          (await sendTxn).hash,
          "to see your transaction"
        );
      } else {
        console.log("Error submitting transaction");
      }

    } catch (e) {
      console.log('reached here :(');
      console.log(e)
    }
  }


}

export default App;
