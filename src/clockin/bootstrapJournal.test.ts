import {describe,it,expect} from 'vitest';
import {Buffer} from 'buffer';
import {PublicKey,Transaction,type VersionedTransactionResponse} from '@solana/web3.js';
import bs58 from 'bs58';
import {validateMintOperation,writeMintOperation,verifyMintBatchTransaction,verifyMintSignedMessage,mintBatchInstructions,type MintOperation} from './bootstrapJournal';
// Unsigned public ABI messages and fault-only storage checks; no wallet/key/provider positive evidence.
const pk=(n:number)=>new PublicKey(new Uint8Array(32).fill(n)).toBase58();
const scope='https://api.devnet.solana.com';
function operation():MintOperation{return{version:1,scope,owner:pk(8),venue:pk(9),rent:'1461600',mints:['usdc','skr','NVDAx','TSLAx','AAPLx','MSFTx','SPYx'].map((key,i)=>({key,address:pk(i+1),decimals:i<2?6:8})),batches:[0,1].map(()=>({stage:'prepared',signature:null,message:null}))};}
function message(r:MintOperation){const tx=new Transaction({feePayer:new PublicKey(r.owner),recentBlockhash:pk(10)}).add(...mintBatchInstructions(r,0));return Buffer.from(tx.serializeMessage()).toString('base64');}
describe('original mint plan offline guards',()=>{
 it('wrong wallet and network reject retained operation',()=>{const r=operation();expect(()=>validateMintOperation(r,'https://other.invalid')).toThrow();expect(()=>validateMintOperation(r,scope,pk(11))).toThrow();});
 it('corrupt schemas, duplicate mints and altered decimal/key order reject',()=>{for(const mutate of [(r:MintOperation)=>{r.mints[1]!.address=r.mints[0]!.address;},(r:MintOperation)=>{r.mints[0]!.decimals=8;},(r:MintOperation)=>{r.mints[0]!.key='unknown';},(r:MintOperation)=>{r.rent='0';},(r:MintOperation)=>{r.batches[0]!.stage='verified';}]){const r=operation();mutate(r);expect(()=>validateMintOperation(r,scope)).toThrow();}});
 it('lost write is not treated as durable submission intent',async()=>{await expect(writeMintOperation({get:async()=>null,set:async()=>{}},operation(),null)).rejects.toThrow(/not retained/);});
 it('disk storage rejection prevents continued setup',async()=>{await expect(writeMintOperation({get:async()=>null,set:async()=>{throw new Error('disk unavailable');}},operation(),null)).rejects.toThrow(/disk/);});
 it('changed prior operation refuses overwrite',async()=>{let writes=0;await expect(writeMintOperation({get:async()=>'different original',set:async()=>{writes++;}},operation(),'expected original')).rejects.toThrow(/changed/);expect(writes).toBe(0);});
 it('unknown original hash or absent transaction never proves setup',()=>{const r=operation();expect(()=>verifyMintBatchTransaction(r,0,null)).toThrow();r.batches[0]={stage:'submitted',signature:bs58.encode(new Uint8Array(64).fill(1)),message:message(r)};expect(()=>verifyMintBatchTransaction(r,0,null)).toThrow();});
 it('saved message altered owner, mint, rent or authority rejects before broadcast',()=>{const r=operation(),original=message(r);for(const change of [(v:MintOperation)=>{v.owner=pk(12);},(v:MintOperation)=>{v.venue=pk(12);},(v:MintOperation)=>{v.mints[0]!.address=pk(12);},(v:MintOperation)=>{v.rent='1461601';}]){const altered=structuredClone(r);change(altered);expect(()=>verifyMintSignedMessage(altered,0,original)).toThrow();}});
 it('failed or different finalized receipt cannot activate original mints',()=>{const r=operation();r.batches[0]={stage:'submitted',signature:bs58.encode(new Uint8Array(64).fill(1)),message:message(r)};for(const tx of [{slot:1,meta:{err:{InstructionError:[0,'failure']}},transaction:{signatures:[r.batches[0].signature]}},{slot:1,meta:{err:null},transaction:{signatures:[bs58.encode(new Uint8Array(64).fill(2))]}}])expect(()=>verifyMintBatchTransaction(r,0,tx as unknown as VersionedTransactionResponse)).toThrow();});
});
