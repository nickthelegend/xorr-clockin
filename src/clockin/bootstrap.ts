/**
 * Make sure there are stand-in mints to trade, whatever happened to xorr's shared devnet faucet.
 *
 * Normally the shared set in `devnet.json` exists on devnet and xorr's faucet is its mint authority. If that set is not
 * on the cluster (it was never created — devnet SOL is rate-limited — or devnet was reset), this phone creates its own
 * set: a venue key kept in the keystore becomes the mint authority. The owner must already hold real devnet SOL for
 * rent and fees. Original keys/batches survive interruption; this flow never retries a faucet or replaces unknown mints.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Keypair, PublicKey } from '@solana/web3.js';
import { MINT_SIZE, TOKEN_PROGRAM_ID, unpackMint } from '@solana/spl-token';
import bs58 from 'bs58';
import { DEVNET, SHARED_SET, STOCKS, applyMintSet, type MintSet } from './config';
import { connection, send, setDeviceVenue } from './chain';
import { getSecret, setSecret, deleteSecret } from './secret';
import {validateMintOperation,writeMintOperation,verifyMintBatchTransaction,verifyMintSignedMessage,mintBatchInstructions,type MintOperation} from './bootstrapJournal';
import type { Owner } from './useOwner';

export const SET_KEY = 'xorr.clockin.mintset.v1';
export const VENUE_KEY = 'xorr.clockin.venue';
export const OPERATION_KEY='xorr.clockin.mint-operation.v1';
const MINT_SECRETS='xorr.clockin.mint-operation.secrets.v1';
const operationStore={get:()=>AsyncStorage.getItem(OPERATION_KEY),set:(value:string)=>AsyncStorage.setItem(OPERATION_KEY,value)};
let creating=false;

let checked: 'shared' | 'device' | null = null;

/**
 * Whether a mint account is on the cluster. A network failure is not "absent": it throws, so an offline phone says it
 * can't reach devnet instead of "setting up the stand-in tokens" (and never builds a second set over a good one).
 */
async function exists(addr: string): Promise<boolean> {
  let key: PublicKey;
  try {
    key = new PublicKey(addr);
  } catch {
    return false;
  }
  return !!(await connection().getAccountInfo(key, 'confirmed'));
}

/** Use the stored device set, if there is one and it is on chain. */
async function loadDeviceSet(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(SET_KEY);
  const secret = await getSecret(VENUE_KEY);
  if (!raw || !secret) return false;
  const set = JSON.parse(raw) as MintSet;
  if (!(await exists(set.usdc))) return false;
  setDeviceVenue(Keypair.fromSecretKey(bs58.decode(secret)));
  applyMintSet(set, 'device');
  return true;
}

/**
 * Resolve which mints this session uses, before anything is read. Cheap after the first call. Returns 'missing' when
 * neither set is usable yet; `createDeviceSet` fixes that.
 */
export async function resolveMints(): Promise<'shared' | 'device' | 'missing'> {
  if (checked) return checked;
  if(await operationStore.get()!==null)return 'missing';
  if (SHARED_SET.usdc && (await exists(SHARED_SET.usdc))) {
    applyMintSet(SHARED_SET, 'shared');
    return (checked = 'shared');
  }
  if (await loadDeviceSet()) return (checked = 'device');
  return 'missing';
}

/** Create or read-only reconcile the retained original set. Explicit resume can approve only never-submitted batches. */
export async function createDeviceSet(owner: Owner, resumeOriginal = false): Promise<MintSet> {
 if(creating)throw new Error('Original mint setup is already being reviewed.');creating=true;
 try {
  const conn=connection();let raw=await operationStore.get();let operation:MintOperation;
  if(raw!==null)operation=validateMintOperation(JSON.parse(raw),conn.rpcEndpoint,owner.address);
  else {
   // No automatic faucet retries: genuine funded owner SOL is a prerequisite.
   const rent=await conn.getMinimumBalanceForRentExemption(MINT_SIZE);
   if(await conn.getBalance(owner.pubkey)<rent*(2+STOCKS.length)+100000)throw new Error('Insufficient real devnet SOL for original mint rent and transaction fees. Fund this wallet before setup.');
   const stored=await getSecret(VENUE_KEY);const venue=stored?Keypair.fromSecretKey(bs58.decode(stored)):Keypair.generate();
   if(!stored){const value=bs58.encode(venue.secretKey);await setSecret(VENUE_KEY,value);if(await getSecret(VENUE_KEY)!==value)throw new Error('Venue key storage was not retained.');}
   const plan=[{key:'usdc',decimals:6},{key:'skr',decimals:6},...STOCKS.map(m=>({key:m.symbol,decimals:m.decimals}))].map(m=>({...m,kp:Keypair.generate()}));
   operation={version:1,scope:conn.rpcEndpoint,owner:owner.address,venue:venue.publicKey.toBase58(),rent:String(rent),mints:plan.map(m=>({key:m.key,decimals:m.decimals,address:m.kp.publicKey.toBase58()})),batches:Array.from({length:Math.ceil(plan.length/4)},()=>({stage:'prepared',signature:null,message:null}))};
   const secrets=JSON.stringify(plan.map(m=>({address:m.kp.publicKey.toBase58(),secret:bs58.encode(m.kp.secretKey)})));await setSecret(MINT_SECRETS,secrets);if(await getSecret(MINT_SECRETS)!==secrets)throw new Error('Original mint keys were not saved reliably.');
   raw=await writeMintOperation(operationStore,operation,null);
   resumeOriginal=true; // Only this new user setup action may send its initial plan.
  }
  const venueRaw=await getSecret(VENUE_KEY);if(!venueRaw)throw new Error('Original venue key is unavailable; retained setup cannot be replaced.');const venue=Keypair.fromSecretKey(bs58.decode(venueRaw));if(venue.publicKey.toBase58()!==operation.venue)throw new Error('Original venue identity differs.');setDeviceVenue(venue);
  const update=async()=>{raw=await writeMintOperation(operationStore,operation,raw);};
  const reconcile=async(index:number)=>{
   const batch=operation.batches[index]!;
   if(!batch.signature)throw new Error('Original mint submission has no saved hash. Actual wallet history is required; new mints and retries are blocked.');
   const {value}=await conn.getSignatureStatuses([batch.signature],{searchTransactionHistory:true});const status=value[0];
   if(!status||status.confirmationStatus!=='finalized'||status.err!==null)throw new Error('Original mint receipt is unknown, failed or not finalized. Review the same transaction; automatic resubmission is disabled.');
   verifyMintBatchTransaction(operation,index,await conn.getTransaction(batch.signature,{commitment:'finalized',maxSupportedTransactionVersion:0}));
   for(const m of operation.mints.slice(index*4,index*4+4)){const address=new PublicKey(m.address);const info=await conn.getAccountInfo(address,'finalized');if(!info)throw new Error('Original finalized mint account is unavailable.');const mint=unpackMint(address,info,TOKEN_PROGRAM_ID);if(!mint.isInitialized||mint.decimals!==m.decimals||mint.mintAuthority?.toBase58()!==operation.venue||mint.freezeAuthority!==null)throw new Error('Actual mint state differs from its original authority/decimals.');}
   batch.stage='verified';await update();
  };
  for(let i=0;i<operation.batches.length;i++){
   const batch=operation.batches[i]!;
   if(batch.stage!=='prepared'){await reconcile(i);continue;}
   if(!resumeOriginal)throw new Error('Original partial mint setup is retained. Tap Review / resume original setup to approve only its never-submitted remaining batches.');
   const keysRaw=await getSecret(MINT_SECRETS);if(!keysRaw)throw new Error('Original mint keys are unavailable; replacement mints are blocked.');
   const keys=JSON.parse(keysRaw) as {address:string;secret:string}[];
   const signers=operation.mints.slice(i*4,i*4+4).map(m=>{const value=keys.find(k=>k.address===m.address);if(!value)throw new Error('Original mint key missing.');const key=Keypair.fromSecretKey(bs58.decode(value.secret));if(key.publicKey.toBase58()!==m.address)throw new Error('Original mint key differs.');return key;});
   batch.stage='intent';await update();
   await send(mintBatchInstructions(operation,i),{owner,signers,payer:{kind:'owner',pubkey:owner.pubkey},onSigned:async(signature,message)=>{verifyMintSignedMessage(operation,i,message);if(batch.signature!==null&&batch.signature!==signature)throw new Error('Original mint signature changed.');batch.signature=signature;batch.message=message;batch.stage='submitted';await update();},onNoBroadcast:async()=>{batch.stage='prepared';batch.signature=null;batch.message=null;await update();}});
   await reconcile(i);
  }
  const address=(key:string)=>operation.mints.find(m=>m.key===key)!.address;
  const set:MintSet={faucet:operation.venue,usdc:address('usdc'),skr:address('skr'),stocks:Object.fromEntries(STOCKS.map(m=>[m.symbol,address(m.symbol)]))};
  const encoded=JSON.stringify(set);await AsyncStorage.setItem(SET_KEY,encoded);if(await AsyncStorage.getItem(SET_KEY)!==encoded)throw new Error('Completed mint set was not saved reliably; original operation retained.');
  applyMintSet(set,'device');checked='device';return set;
 }finally{creating=false;}
}

/**
 * Forget device mint secrets and the active set. Retain the original public operation as a duplicate lock:
 * deleting private keys never authorizes replacement mints after an interrupted or completed original operation.
 */
export async function forgetDeviceSet(): Promise<void> {
  // Public original operation remains as a duplicate lock after forgetting private device keys.
  await deleteSecret(MINT_SECRETS);
  await AsyncStorage.removeItem(SET_KEY);
  setDeviceVenue(null);
  checked = null;
  if (DEVNET.source === 'device') applyMintSet(SHARED_SET, 'shared');
}

export function mintSource(): 'shared' | 'device' {
  return DEVNET.source;
}
