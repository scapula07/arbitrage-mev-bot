const {db} =require("../firebase")
const { collection, setDoc,doc,getDoc,addDoc,updateDoc } =require('firebase/firestore')  
const Web3 = require("web3")
const express =require("express")
const router=express.Router()
const io =require("../index")
const erc20min=require("../build/contracts/IERC20Minimal.json")
const {swapUniToSushi,swapSushiToUni}=require("./swapFunctions")
const HDWalletProvider =require("@truffle/hdwallet-provider")
const IFactory = require('@uniswap/v2-core/build/IUniswapV2Factory.json')
const IPair = require('@uniswap/v2-core/build/IUniswapV2Pair.json')  
const IRouter = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json')
const IERC20 = require('@uniswap/v2-periphery/build/IERC20.json')
const ArbContract=require("../build/contracts/ArbitrageBot.json")
const IFactoryV3 = require('@uniswap/v2-core/build/IUniswapV2Factory.json')
const IPairV3 = require('@uniswap/v2-core/build/IUniswapV2Pair.json')  

const publicAddress="0xeA55260DA2091B592E9FD7A41e22205618A48E9E"
const contractAddress= "0x6Df0E5E592029fEf046FFA03cc93f79C1589634f"
const addrSFactory = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac"
const addrSRouter ="0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
const addrUFactory ="0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
const addrURouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"

const privateKey ="5b884004eed1c51ca80a9b8ed26ad2c0ba2b6ec6c3cc9ab36297b9d97442489c"

const validPeriod = 50
const wss="wss://mainnet.infura.io/ws/v3/85fc7c4c61664a96808975adbb581787"



const addrToken0 ="0x6B175474E89094C44Da98b954EedeAC495271d0F"
 const addrToken1 ="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" 
  

const web3 = new Web3("wss://mainnet.infura.io/ws/v3/85fc7c4c61664a96808975adbb581787")
const wss_provider = new HDWalletProvider(
    privateKey,
    "wss://mainnet.infura.io/ws/v3/85fc7c4c61664a96808975adbb581787"
     )
     const Tweb3 = new Web3(wss_provider)
const arbContract = new web3.eth.Contract(
    ArbContract,
    contractAddress
)
const arbContractTx =new Tweb3.eth.Contract(
    ArbContract,
    contractAddress
)
const Token0Tx =new Tweb3.eth.Contract(
    IERC20.abi,
    addrToken0
)


const token0 = new web3.eth.Contract(IERC20.abi,addrToken0)
const token1 = new web3.eth.Contract(IERC20.abi,addrToken1)

const uFactory = new web3.eth.Contract(IFactory.abi,addrUFactory)
 const uRouter = new web3.eth.Contract(IRouter.abi,addrURouter)
const sFactory = new web3.eth.Contract(IFactory.abi,addrSFactory)//sushiswap, same ABIs, sushiswap forked uniswap so, basically same contracts
const sRouter = new web3.eth.Contract(IRouter.abi,addrSRouter)



const arbTrade=async()=>{
   
 
    console.log("Starting Bot")
    let count =0
    let uPair0,uPair1,sPair,sPair0,sPair1,myAccount,token0Name,token1Name,token0Symbol,token1Symbol,amountIn

    async function asyncsVar() {
        uPair0 = new web3.eth.Contract(IPair.abi, (await uFactory.methods.getPair(addrToken0, addrToken1).call()) )
        uPair1 = new web3.eth.Contract(IPair.abi, (await uFactory.methods.getPair(token0.options.address, token1.options.address).call()) )
        sPair = new web3.eth.Contract(IPair.abi, (await sFactory.methods.getPair(token0.options.address, token1.options.address).call()) )
        sPair0 = new web3.eth.Contract(IPair.abi, (await sFactory.methods.getPair(addrToken0, addrToken1).call()) )
        sPair1 = new web3.eth.Contract(IPair.abi, (await sFactory.methods.getPair(token0.options.address, token1.options.address).call()) )
        const accountObj = await web3.eth.accounts.privateKeyToAccount(privateKey)
        myAccount = accountObj.address
        console.log(`Wallet address of trader ${myAccount}`)
      

        token0Name = await token0.methods.name().call()
        token0Symbol = await token0.methods.symbol().call()
        token1Name = await token1.methods.name().call()
        token1Symbol = await token1.methods.symbol().call()
        console.log(`Token Assets: ${ token0Symbol}/${token1Symbol}`)
       
        amountIn = await  Token0Tx.methods.balanceOf(myAccount).call()
        console.log(`Initial Balance of Contract:${web3.utils.fromWei(amountIn , "ether")} DAI`)
        
    }
    asyncsVar()

       const newBlockEvent = web3.eth.subscribe('newBlockHeaders')
       newBlockEvent.on('connected', () =>{
        console.log('\nBot listening!\n');
       
         })
        
       let skip = true
       newBlockEvent.on('data', async function(blockHeader){
        skip = !skip
        if (skip) return
          
        try {
            count++
            console.log(count,"count")
            let uReserves, uReserve0, uReserve1, sReserves, sReserve0, sReserve1
            console.log("obtaining eth prices from uniswap and sushiswap")
            // AddToDb("None")
            uReserves = await uPair0.methods.getReserves().call()
             uReserve0 = uReserves[0] //dai
             uReserve1 = uReserves[1] //eth
            uPriceEth = (uReserve0/uReserve1) 
            console.log(` 1 Eth price on uniswap:${uPriceEth} DAI`)
           
       
            sReserves = await sPair0.methods.getReserves().call()
            sReserve0 = sReserves[0] //dai
            sReserve1 = sReserves[1] //eth
            sPriceEth = (sReserve0/sReserve1) 
            console.log(`1 Eth price on sushiswap:${sPriceEth} DAI`)
           
            

            // sPriceEth = (uReserve0/uReserve1) 
            // const uAmountOut = await uRouter.methods.getAmountOut(amountIn ,uReserve0 ,uReserve1).call()
            // // console.log(`amountOut uniswap:${uAmountOut}`)
            // const sAmountOut = await sRouter.methods.getAmountOut(amountIn ,sReserve0 ,sReserve1).call()
            // console.log(`ampontOut sushiswap :${sAmountOut}`)



            if (uPriceEth===sPriceEth) {
                console.log(`No arbitrage opportunity on block ${blockHeader.number}\n`);
                // UpdateDb("0","0",`No arbitrage opportunity on block ${blockHeader.number}\n`)
             return}
            if(uPriceEth >sPriceEth){
                const difference=uPriceEth -sPriceEth
                console.log(`Price difference:$ ${difference} `)
                // UpdateDb(difference,"0","None")
              
                if (difference<=1) {
                    console.log(`Price difference insufficient for arbitrage ${blockHeader.number}\n`);
                    // UpdateDb(difference,"0",`Price difference insufficient for arbitrage ${blockHeader.number}`)
                   return
                }
                //const totalDifference = difference*Math.round(amountIn/10**18)
                const totalDifference = difference*Math.round(amountIn /10**18)
                console.log(`Total Difference :${totalDifference}`)
              
                const path = [token0.options.address,token1.options.address]
                const deadline = Math.round(Date.now()/1000)+validPeriod*60 
                // const gasNeeded0 = await token0.methods.approve(uRouter.options.address,amountIn ).estimateGas()
                // console.log(`Gas needed for token approval :${gasNeeded0}`)
                // console.log((0.03*10**6)*2,"gasss")
                // const gasNeeded1 = await arbContract.methods.SushiwapToUniswapTrade(token0.options.address,token1.options.address ).estimateGas()
                 
                const gasNeeded0 = await token0.methods.approve(uRouter.options.address,amountIn).estimateGas()
                console.log(gasNeeded0,"gasNeeded0")
                // console.log(`Gas for swap:${gasNeeded1}`)
                // const gasNeeded=gasNeeded1
            
                
                await token0.methods.approve(uRouter.options.address,amountIn).send()
                const gasNeeded1 = await uRouter.methods.swapExactTokensForTokens(
                    amountIn,
                    0,
                    path,
                    publicAddress,
                    deadline
                ).estimateGas()
                console.log(gasNeeded1,"gasNeeded1")
                const gasNeeded=gasNeeded0+gasNeeded1
                
                const gasPrice = await web3.eth.getGasPrice()
                const gasCost = Number(gasPrice)*gasNeeded/10**18
              
                 const token0PriceEth=0.999689*1/uPriceEth 
            //    const token1Price=1558.82
                 console.log(`Price of Dai in eth:${token0PriceEth}`)
                

                // const profit = (totalDifference*token0PriceEth)-gasCost
                const profit = (difference*token0PriceEth)-gasCost
                console.log(`Trade profit:${profit} ETH`)  
               
                const profitUsd =profit * uPriceEth 
                console.log(`profit:$ ${profitUsd} or  DAI`)
                // UpdateDb(difference,profitUsd,"None")
                
                if(profitUsd <=1) return console.log("Profit too low for trade")
                //    swapSushiToUni()
                //   UpdateDb(difference,profitUsd,"Sushiswap to Uniswap . No swap")
               
            const tx0 = {//transaction
                from:publicAddress, 
                to: token0.options.address, 
                gas: gasNeeded0, 
                data: token0.methods.approve(uRouter.options.address,amountIn).encodeABI()
            }

            signedTx0 = await web3.eth.accounts.signTransaction(tx0, privateKey);
            
            console.log('Tx pending {1/2}')
            receipt0 = await web3.eth.sendSignedTransaction(signedTx0.rawTransaction)
            
            console.log(
                `Tx mined\n`+
                `Tx hash: ${receipt0.transactionHash}\n`
                )

            const tx1 = {
                from: publicAddress, 
                to: uRouter.options.address, 
                gas: gasNeeded1, 
                data: uRouter.methods.swapExactTokensForTokens(
                    amountIn,
                    0,
                    path,
                    myAccount,
                    deadline
                ).encodeABI()
            }

              signedTx1 = await web3.eth.accounts.signTransaction(tx1, privateKey);
            
            console.log('Tx pending {2/2}')
            receipt1 = await web3.eth.sendSignedTransaction(signedTx1.rawTransaction)
            
            console.log(
                `Tx mined, trade executed!\n`+
                `Tx hash: ${receipt1.transactionHash}\n`
                )


               
            }else{
                const difference=sPriceEth - uPriceEth 
                console.log(`Price difference :$ ${difference} `)
                // UpdateDb(difference,"0","None")
               if (difference<=0.5) {
                console.log(`Price difference insufficient for arbitrage ${blockHeader.number}\n`); 
                // UpdateDb(difference,"0",`Price difference insufficient for arbitrage ${blockHeader.number}`)
               return}
                //const totalDifference = difference*Math.round(amountIn/10**18)
                const totalDifference = difference*Math.round(amountIn /10**18)
                console.log(`Total Difference :${totalDifference}`)

                const path = [token0.options.address,token1.options.address]

                const deadline = Math.round(Date.now()/1000)+validPeriod*60 
                const gasNeeded0 = await token0.methods.approve(sRouter.options.address,amountIn).estimateGas()
                console.log(gasNeeded0,"gasNeeded0")
                // console.log(`Gas for swap:${gasNeeded1}`)
                // const gasNeeded=gasNeeded1
            
                
                await token0.methods.approve(uRouter.options.address,amountIn).send()
                const gasNeeded1 = await sRouter.methods.swapExactTokensForTokens(
                    amountIn,
                    0,
                    path,
                   publicAddress,
                    deadline
                ).estimateGas()
                console.log(gasNeeded1,"gasNeeded1")
                const gasNeeded=gasNeeded0+gasNeeded1
                
                const gasPrice = await web3.eth.getGasPrice()
                const gasCost = Number(gasPrice)*gasNeeded/10**18
              

               const token0PriceEth=0.999689*1/sPriceEth 
            //    const token1Price=1558.82
            console.log(`Price of Dai in eth:${token0PriceEth}`)
         

               const profit = (totalDifference*token0PriceEth)-gasCost
               console.log(`Trade profit:${profit}`)
              
               const profitUsd =profit * sPriceEth 
               console.log(`profit:$ ${profitUsd} or  DAI`)
            //    UpdateDb(difference,profitUsd,"None")
                 if(profitUsd <1) return  console.log("profit is too low for trade")
                   
                      
            const tx0 = {//transaction
                from:publicAddress, 
                to: token0.options.address, 
                gas: gasNeeded0, 
                data: token0.methods.approve(uRouter.options.address,amountIn).encodeABI()
            }

            signedTx0 = await web3.eth.accounts.signTransaction(tx0, privateKey);
            
            console.log('Tx pending {1/2}')
            receipt0 = await web3.eth.sendSignedTransaction(signedTx0.rawTransaction)
            
            console.log(
                `Tx mined\n`+
                `Tx hash: ${receipt0.transactionHash}\n`
                )

            const tx1 = {
                from: myAccount, 
                to: sRouter.options.address, 
                gas: gasNeeded1, 
                data: sRouter.methods.swapExactTokensForTokens(
                    amountIn,
                    0,
                    path,
                    myAccount,
                    deadline
                ).encodeABI()
            }

              signedTx1 = await web3.eth.accounts.signTransaction(tx1, privateKey);
            
            console.log('Tx pending {2/2}')
            receipt1 = await web3.eth.sendSignedTransaction(signedTx1.rawTransaction)
            
            console.log(
                `Tx mined, trade executed!\n`+
                `Tx hash: ${receipt1.transactionHash}\n`
                )

             
             
                
            }

        }catch(e){
            console.log(e)
        }
       })

       newBlockEvent.on('error', console.error);

    

    }



module.exports={arbTrade}