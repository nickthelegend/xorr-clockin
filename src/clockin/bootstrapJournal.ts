import { Buffer } from 'buffer';
import { PublicKey, SystemProgram, Message, Transaction, type VersionedTransactionResponse } from '@solana/web3.js';
import bs58 from 'bs58';
import {MINT_SIZE,TOKEN_PROGRAM_ID,createInitializeMint2Instruction} from '@solana/spl-token';
export type MintOperation={version:1;scope:string;owner:string;venue:string;rent:string;mints:{key:string;address:string;decimals:number}[];batches:{stage:'prepared'|'intent'|'submitted'|'verified';signature:string|null;message:string|null}[]};
export function validateMintOperation(value:unknown,scope:string,owner?:string):MintOperation {
 try {const r=value as MintOperation;if(r.version!==1||r.scope!==scope||(owner!==undefined&&r.owner!==owner))throw new Error();for(const k of [r.owner,r.venue,...r.mints.map(m=>m.address)])if(new PublicKey(k).toBase58()!==k)throw new Error();if(!/^[1-9][0-9]*$/.test(r.rent)||BigInt(r.rent)>BigInt(Number.MAX_SAFE_INTEGER))throw new Error();const expected=[['usdc',6],['skr',6],['NVDAx',8],['TSLAx',8],['AAPLx',8],['MSFTx',8],['SPYx',8]];if(r.mints.some((m,i)=>m.key!==expected[i]?.[0]||m.decimals!==expected[i]?.[1]))throw new Error();if(r.mints.length!==7||new Set(r.mints.map(m=>m.key)).size!==7||new Set(r.mints.map(m=>m.address)).size!==7||r.mints.some(m=>!Number.isInteger(m.decimals)||m.decimals<0||m.decimals>18)||r.batches.length!==Math.ceil(r.mints.length/4))throw new Error();for(const b of r.batches){if(!['prepared','intent','submitted','verified'].includes(b.stage))throw new Error();if(b.stage==='prepared'||b.stage==='intent'){if(b.signature!==null||b.message!==null)throw new Error();}else if(typeof b.signature!=='string'||bs58.decode(b.signature).length!==64||typeof b.message!=='string'||!b.message||Buffer.from(b.message,'base64').toString('base64')!==b.message)throw new Error();}return r;}catch {throw new Error('Original mint setup record is invalid or belongs to another wallet/network. New mints are blocked.');}
}
export function verifyMintBatchTransaction(operation:MintOperation,index:number,tx:VersionedTransactionResponse|null):void {
 const b=operation.batches[index];
 if(b?.message)verifyMintSignedMessage(operation,index,b.message);
 if(!b||!b.signature||!b.message||!tx||tx.transaction.signatures[0]!==b.signature||!tx.meta||tx.meta.err!==null||!Number.isSafeInteger(tx.slot)||tx.slot<=0||Buffer.from(tx.transaction.message.serialize()).toString('base64')!==b.message)throw new Error('Original finalized mint batch transaction is missing, failed or differs from its saved signed message. Setup remains unresolved.');
}
export async function writeMintOperation(store:{get:()=>Promise<string|null>;set:(value:string)=>Promise<void>},record:MintOperation,previous:string|null):Promise<string>{
 if(await store.get()!==previous)throw new Error('Original mint operation changed. Submission blocked.');const encoded=JSON.stringify(record);await store.set(encoded);if(await store.get()!==encoded)throw new Error('Mint operation storage write was not retained. Submission blocked.');return encoded;
}

export function mintBatchInstructions(r:MintOperation,index:number){return r.mints.slice(index*4,index*4+4).flatMap(m=>[SystemProgram.createAccount({fromPubkey:new PublicKey(r.owner),newAccountPubkey:new PublicKey(m.address),lamports:Number(r.rent),space:MINT_SIZE,programId:TOKEN_PROGRAM_ID}),createInitializeMint2Instruction(new PublicKey(m.address),m.decimals,new PublicKey(r.venue),null)]);}
export function verifyMintSignedMessage(r:MintOperation,index:number,message:string):void {
 const tx=Transaction.populate(Message.from(Buffer.from(message,'base64'))), expected=mintBatchInstructions(r,index);
 if(tx.feePayer?.toBase58()!==r.owner||tx.instructions.length!==expected.length)throw new Error('Signed mint batch does not match the original owner and plan.');
 for(let i=0;i<expected.length;i++){const a=tx.instructions[i]!,b=expected[i]!;if(!a.programId.equals(b.programId)||!a.data.equals(b.data)||a.keys.length!==b.keys.length||a.keys.some((k,j)=>!k.pubkey.equals(b.keys[j]!.pubkey)||(b.keys[j]!.isSigner&&!k.isSigner)||(b.keys[j]!.isWritable&&!k.isWritable)))throw new Error('Signed mint instruction/account/rent/authority differs from the original plan.');}
}
