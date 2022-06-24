//declare var window: any
import React, { Component, useState } from 'react';
import './App.css';
import Button from '@mui/material/Button';
import ContactlessIcon from '@mui/icons-material/Contactless';
import CloseIcon from '@mui/icons-material/Close';
import { BigNumber, ethers } from "ethers";
import uniswap_abi from "../src/abis/router.json";
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { exit } from 'process';
const { UNISWAP, WETH, ChainId, Token, TokenAmount, Trade, Fetcher, Route, Percent, TradeType } = require('@uniswap/sdk');

class App extends Component {

  // my alchemy endpoint
  url = process.env.REACT_APP_GOERLI_ALCHEMY_URL;
  // ethers provider
  provider = new ethers.providers.JsonRpcProvider(this.url);
  // my private key
  privateKey: any = process.env.REACT_APP_GOERLI_PRIVATE_KEY;
  // Chain ID 5
  chainId = ChainId.GÖRLI;
  // Uniswap (UNI) token address
  uniTokenAddress = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
  // Uniswap ROUTER address (where we will send our trade)
  UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  // Router ABI
  UNISWAP_ROUTER_ABI = JSON.stringify(uniswap_abi);
  // Instance of the Uniswap Router -> will interact with this
  UNISWAP_ROUTER_CONTRACT = new ethers.Contract(this.UNISWAP_ROUTER_ADDRESS, this.UNISWAP_ROUTER_ABI, this.provider);
  // Tx Hash
  immediateTxHash = '';
  txIsPending = false;
  txInfo: any;

  state = {
    amountIn: 0,
    gasAmount: 0
  }


  handleChange = (e: any) => {
   // console.log(e.target.value);
    this.setState({[e.target.name]: e.target.value});
  }

  // What we show to the screen
  render() {
    // If there is no tx currently pending, show the main screen.
    const {amountIn, gasAmount} = this.state;


    if (!this.txIsPending) {
      return (
        <div className="App">
          <header className="App-header">
            {/* Send Bait Transaction Button*/}
            <h1> Super Cool Bait Transaction Sender</h1>
            <form>
               <Box m={6} pb={2}>
              {/* Field for Transaction amount */}
               <h3> Amount in (In Ether): </h3>
                <input type="text" value={amountIn} onChange={this.handleChange} name="amountIn"/>
               {/* Field for Gas amount */}
               <h3> Amount of Gas (in Wei): </h3>
              <input type="text" value={gasAmount} onChange={this.handleChange} name="gasAmount"/>
               </Box>
            </form>
      
            <Button variant="contained" endIcon={<ContactlessIcon />}
              onClick={() => {
                {/* When button is click, run the setupWalletAndSendTrade Function*/}
                // Do some input checking
                if((this.state.amountIn > 0 && this.state.amountIn != undefined) && (this.state.gasAmount > 0 && this.state.gasAmount != undefined)){
                  this.setupWalletAndSendTrade(this.state.amountIn, this.state.gasAmount);
                  this.state.amountIn = 0;
                  this.state.gasAmount = 0;
                } else {
                  console.log("bad trade inputs");
                }
              }}>
              Send Bait Transaction
            </Button>
          </header>
        </div>
      );
    // Otherwise, the tx is pending, show Tx Pending card
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
                {/*Take tx hash and append to the etherscan url*/}
                <a target="_blank" rel="noreferrer" href={'https://goerli.etherscan.io/tx/' + this.txInfo.hash}><Button size="small">monitor transaction progress on etherscan</Button></a>
              </CardActions>
            </Card>

            <Button 
              variant="contained" 
              endIcon={<CloseIcon />} 
              sx={{ minHeight: 0, minWidth: 0, padding: 2 }} 
              onClick={() => {
              // Cancel the transaction
                let txId = this.txInfo.hash;
                // In Wei
                let gasPriceToChange = this.txInfo.gasPrice;
                let currentTxNonce = this.txInfo.nonce;
                this.cancelTransaction(currentTxNonce, gasPriceToChange);
                alert("AHH CANCEL ME!");
            }}>
              Cancel Transaction
            </Button>

            <br />
            <br />
            {/*When TX is pending, change original button to not be clickable*/}

            <Button variant="contained" disabled endIcon={<ContactlessIcon />} >
              Send Bait Transaction
            </Button>
          </header>
        </div>
      );
    }
  }

  async componentDidMount() {

  }

  // async requestAccount() {
  //   console.log("Requesting account...");

  //   if(window.ethereum){
  //     console.log("detected");

  //     try {
  //       const accounts = await window.ethereum.request({
  //         method: "eth_requestAccounts",
  //       });
  //       console.log(accounts);
  //     } catch (error) {
  //       console.error(error);
  //     }
      
  //   } else {
  //     console.log("metamask not detected");
  //   }

  // }
  

  async cancelTransaction(txNonce: any, gasPrice: any) {
    const wallet = new ethers.Wallet(this.privateKey, this.provider);
    console.log('txNonce ', txNonce);
    console.log('gasPrice ', gasPrice);
    console.log('blockNumber ', this.txInfo.blockNumber);

    // Not yet mined...
    if(this.txInfo.blockNumber === undefined){

      // Recreate tx with new gasPrice and same nonce.
      let rawTx = {
        nonce: txNonce,
        value: ethers.utils.parseEther("0"),
        gasPrice: BigNumber.from(gasPrice + 1000000),
      };

      let sendTxn = await wallet.sendTransaction(rawTx);

      this.immediateTxHash = sendTxn.hash;
      this.txInfo = sendTxn;
      this.txIsPending = true;
      this.forceUpdate();

      console.log("Cancelled Tx ", sendTxn);

      let reciept = await sendTxn.wait();
      console.log("Cancellation Reciept ", reciept);  

    }


  }

  async setupWalletAndSendTrade(tokenAmount: any, gasAmount: any) {
    // Create a new wallet using the private given in the .env file & a provider
    const wallet = new ethers.Wallet(this.privateKey, this.provider);
    //
    const UNI = await Fetcher.fetchTokenData(this.chainId, this.uniTokenAddress, this.provider, 'UNI', 'Uniswap Token');
    console.log("This object is", UNI);
    // call sendTrade()
    await this.sendTrade(UNI, tokenAmount, gasAmount, this.provider, wallet);
  }

  // Send trade through the uniswap router.

  async sendTrade(toxicToken: any, tokenAmount: any, gasAmount: any, provider: any, wallet: any) {
    try {
      // Get WETH/Toxic Token pair data.
      const pair = await Fetcher.fetchPairData(toxicToken, WETH[toxicToken.chainId], provider);
      console.log("Pair data: ", pair);
      // Get the route we're going to take to accomplish the trade. First param is an array of the token pair. Second param is the output token we want
      console.log('WETH[toxicToken.chainId]', WETH[toxicToken.chainId]); 
      const route = new Route([pair], WETH[toxicToken.chainId]); // Get Route for WETH
      console.log("Route: ", route);

      let amountIn = ethers.utils.parseEther(tokenAmount.toString()).toString(); //helper function to convert ETH to Wei

      /*
        Setting up the Trade itself
        1st param: the trade route
        2nd param: the amount of toxicToken we wish to trade for
        3rd param: Corresponds to using the swapExactFor router function
      */
      const trade = new Trade(route, new TokenAmount(WETH[toxicToken.chainId], amountIn), TradeType.EXACT_INPUT);

      const slippageTolerance = new Percent('1000', '10000') // 1000 bips, or 10% --  must be greater than 0.3%
      
      // The min amount of the OUTPUT token that should be recieved from a trade, given the slippage tolerance.
      const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw // needs to be converted to e.g. hex
      const amountOutMinHex = ethers.BigNumber.from(amountOutMin.toString()).toHexString(); // minimumAmountOut in HEX.

      const path = [WETH[toxicToken.chainId].address, toxicToken.address] // The path we need to take for this trade (from WETH -> TOXIC TOKEN)


      const to = process.env.REACT_APP_TEST_WALLET_ADDRESS; // should be a checksummed recipient address
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 mins from now(?) -- the unix timestamp after which the tx will fail.

      const value = trade.inputAmount.raw // // needs to be converted to e.g. hex -> our amountIn that was calculated before
      const valueHex = await ethers.BigNumber.from(value.toString()).toHexString(); //convert to hex string - amountIn in HEX

      /* 
      Creating our txn object (unsigned)

        referencing the ROUTER contract
        we use the Ethers.JS populateTransaction to create an unsigned tx (https://docs.ethers.io/v5/api/contract/contract/#contract-populateTransaction)
        we then specify which method we'd like to call, in this case swapExactEthForTokens
          we pass in the required values for that function
     
         */
      const rawTxn = await this.UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactETHForTokens(amountOutMinHex, path, to, deadline, {
        value: valueHex
      });

      // Statically form gas price
      rawTxn.gasPrice = BigNumber.from(gasAmount);

      console.log('rawtxn: ', rawTxn);

      // Sign and send TX
      // let sendTxn = await wallet.sendTransaction(rawTxn).then(async (res: any) => {
      //   this.immediateTxHash = res.hash;
      //   console.log(res);
      //   this.txInfo = res;
      //   this.txIsPending = true;
      //   // Re-render the react component
      //   this.forceUpdate();
      // });

      let sendTxn2 = await wallet.sendTransaction(rawTxn);
      this.immediateTxHash = sendTxn2.hash;
      this.txInfo = sendTxn2;
      this.txIsPending = true;
      this.forceUpdate();

      console.log("Send TX ", sendTxn2);

      let x = true;

        wallet.provider.on("pending",  async () => {
          try {
            let transaction = await wallet.provider.getTransaction(this.immediateTxHash);
            if(x){
              if (null !== transaction.blockNumber) {
                  console.log("Transaction Included!");
                  this.txIsPending = false;
                  this.forceUpdate();
                  x = false;     
              } else {
                console.log("Waiting to be mined...");
              }
            }
          } catch(err) {
            alert(err);
          }
        });
  

    let reciept = await sendTxn2.wait();
    console.log("Reciept ", reciept);
      //Logs the information about the transaction it has been mined.
      if (reciept) {
        console.log(
          " - Transaction is mined - " + "\n" + "Transaction Hash:",
          (await sendTxn2).hash +
          "\n" +
          "Block Number: " +
          (await reciept).blockNumber +
          "\n" +
          "Navigate to https://goerli.etherscan.io/txn/" +
          (await sendTxn2).hash,
          "to see your transaction"
        );
      } else {
        console.log("Error submitting transaction");
      }

    } catch (e) {
      console.log('reached here :(');
      console.error(e)
    }
  }
}

export default App;
