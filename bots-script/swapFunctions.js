const Web3 = require("web3")
const HDWalletProvider =require("@truffle/hdwallet-provider")
const IRouter = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json')
const IFactory = require('../build/contracts/IUniswapV2Factory.json')

const contractAddress= "0x5b6B2Cf5950D98dcaCf2a405C08d26bD7B9B7Fa0"
const privateKey ="852831eb8fcf1210ab60381ad70648d920060e4ebea15331235e4bc2eee5f123"
const ArbContract=require("../build/contracts/ArbitrageBot.json")
const erc20min=require("../build/contracts/IERC20.json")
const publicAddress="0xC84D575389D950d2af60c1057bce53AC960Fb9c9"
const wss_provider = new HDWalletProvider(
    privateKey,
    "wss://goerli.infura.io/ws/v3/85fc7c4c61664a96808975adbb581787"
     )
// const addrToken0="0x6B175474E89094C44Da98b954EedeAC495271d0F"
// const addrToken1="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" 
const addrToken0="0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60"
const addrToken1="0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6" 


const web3 = new Web3(wss_provider)


const arbContract=new web3.eth.Contract(
  ArbContract,
  contractAddress
)







const  swapUniToSushi=async()=>{
    try{
       
        const res=await arbContract.methods.UniswapToSushiwapTrade(addrToken0,addrToken1).send({
            from:publicAddress
           
           })
            console.log(res)
            console.log(res.transactionHash)
            return res.transactionHash
    }catch(e){
        console.log(e)
        console.log("Transaction failed")
        
    }
   
        
    
    }

    
const  swapSushiToUni=async()=>{
    try{
       
        const res=await arbContract.methods.SushiwapToUniswapTrade(addrToken0,addrToken1).send({
            from:publicAddress
           
           })
            console.log(res)
            console.log(res.transactionHash)
            return res.transactionHash
    }catch(e){
        console.log(e)
        console.log("Transaction failed")
        
    }
   
        
    
    }

module.exports={swapUniToSushi,swapSushiToUni}