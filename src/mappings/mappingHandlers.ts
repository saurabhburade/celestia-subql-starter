import {
  CosmosEvent,
  CosmosBlock,
  CosmosMessage,
  CosmosTransaction,
} from "@subql/types-cosmos";
import { getDecodedTxData } from "../utils/decodeBlockTx";
import { BlobData, BlockData, TransactionData } from "../types/models";

import { handleNewPriceMinute } from "./pricefeed/savePrices";
import { handleAccount } from "./entities/accountData";
import { handleApp } from "./entities/appData";
import { handleCollective } from "./entities/collectiveData";
/*
export async function handleBlock(block: CosmosBlock): Promise<void> {
  // If you want to index each block in Cosmos (CosmosHub), you could do that here
}
*/
export async function handleBlock(block: CosmosBlock): Promise<void> {
  // If you want to index each block in Cosmos (CosmosHub), you could do that here
  const height = block?.block?.header.height;

  const txs = block.txs;
  const blockHash = block.blockId.hash;
  const priceData = await handleNewPriceMinute({ block });

  logger.info(`PRICE DATA FOUND ::  ${JSON.stringify(priceData?.nativePrice)}`);
  logger.info(`BLOCK ::  ${height}`);
  let bdata = BlockData.create({
    id: height.toString(),
    avgNativePrice: priceData?.nativePrice!,
    currentNativePrice: priceData?.nativePrice!,
    hash: "",
    height: height,
    proposer: block.header.proposerAddress.toString(),
    totalBlobSize: 0,
    totalBlobTransactionCount: 0,
    totalBlockFeeNatve: 0,
    totalBlockFeeUSD: 0,
    totalEventsCount: 0,
    totalSquareSize: 0,
    totalTransactionCount: block.txs.length,
  });
  for (let idx = 0; idx < txs.length; idx++) {
    const tx = txs[idx];

    const decodedTx = getDecodedTxData(tx, idx);

    const transactionRecord = TransactionData.create({
      id: `${height}-${idx}`,
      blockHeightId: height.toString(),

      denomination: "tia",
      amount: decodedTx.txFee,
      hash: `${height}-${idx}`,

      isBlobTransaction: decodedTx?.totalBytes > 0 ? true : false,
      nDataSubs: decodedTx.nDataSubs,
      nMessages: decodedTx.nMessages,

      totalBytes: decodedTx.totalBytes,
      nEvents: decodedTx.nEvents,
      txFeeNative: decodedTx.txFee,
      signerId: decodedTx.signer,
      // blockHeight: BigInt(block.block.header.height),
      timestamp: block.block.header.time.getTime(),
    });
    await transactionRecord.save();
    bdata.totalBlockFeeNatve += decodedTx.txFee;
    bdata.totalBlockFeeUSD +=
      Number(decodedTx.txFee) * (priceData?.nativePrice || 0);
    bdata.totalTransactionCount += 1;
    bdata.totalEventsCount += decodedTx.nEvents;

    if (decodedTx.blobs && decodedTx.blobs.length > 0) {
      bdata.totalBlobSize += decodedTx.totalBytes;
      bdata.totalBlobTransactionCount += 1;

      const blobs: BlobData[] = [];
      for (let idx = 0; idx < decodedTx.blobs.length; idx++) {
        const blob = decodedTx.blobs[idx];
        const bEntity = BlobData.create({
          id: `${height}-${idx}-${idx}`,
          data: "",
          namespaceId: blob.namespace || "",
          transactionId: transactionRecord.id || "",
          namespaceVersion: blob.shareVersion || 0,
          shareVersion: blob.shareVersion || 0,
          commitment: blob.commitment || "",
          size: blob.blob_size || 0,
          signer: decodedTx.signer || "",
        });
        await handleApp(decodedTx, priceData!, block, 0, bEntity);
        blobs.push(bEntity);
      }

      await store.bulkUpdate("BlobData", blobs);
    }

    await handleAccount(decodedTx, priceData!, block, 0);
    await handleCollective(decodedTx, priceData!, block, 0);
    // logger.info(`Bytes ::  ${decodedTx?.totalBytes}`);
    // logger.info(`nNamespaces ::  ${decodedTx.namespaces?.length}`);
    // logger.info(`nEvents ::   ${decodedTx.decodedEvents?.length}`);
    // logger.info(`nMsg ::   ${decodedTx.nMessages}`);
    // logger.info(`TxFee ::   ${decodedTx.txFee}`);
  }
  await bdata.save();
}
/*
export async function handleTransaction(tx: CosmosTransaction): Promise<void> {
  // If you want to index each transaction in Cosmos (CosmosHub), you could do that here
  const transactionRecord = Transaction.create({
    id: tx.hash,
    blockHeight: BigInt(tx.block.block.header.height),
    timestamp: tx.block.block.header.time,
  });
  await transactionRecord.save();
}
*/

export async function handleEvent(event: CosmosEvent): Promise<void> {
  // logger.info(`Found event for ${event.event.type}`);
  // if (event.event.type === "celestia.blob.v1.EventPayForBlobs") {
  //   logger.info(` ${event.event.type}:: BLOBS `);
  //   // await setTimeout(() => {}, 10000);
  //   event.event.attributes.forEach((attr) => {
  //     const baseDecoded = Buffer.from(attr.value.toString(), "base64").toString(
  //       "utf-8"
  //     );
  //     const baseDecodedKey = Buffer.from(
  //       attr.key.toString(),
  //       "base64"
  //     ).toString("utf-8");
  //     if (baseDecodedKey === "celestia.blob.v1.EventPayForBlobs") {
  //       logger.info(
  //         ` ${event.event.type}::  ATTR MSG ${baseDecodedKey} ::: ${baseDecodedKey} `
  //       );
  //     }
  //   });
  // }
  // Handle Blob Event
}
export async function handleTransaction(tx: CosmosTransaction): Promise<void> {
  tx.decodedTx.body.messages.forEach((msg) => {
    const base = Buffer.from(msg.value).toString("utf-8");

    // logger.info(`TXN MSG ${msg.typeUrl} ::: ${msg}`);
  });
}

export async function handleMessage(msg: CosmosMessage): Promise<void> {
  logger.info(`Found message for ${msg.msg.typeUrl} ${msg.msg.decodedMsg}`);
  // tx.decodedTx.body.messages.forEach((msg) => {
  //   const base = Buffer.from(msg.value).toString("utf-8");
  //   logger.info(`TXN MSG ${msg.typeUrl} ::: ${base}`);
  // });
}
//   newTransfers.blockHeight = BigInt(event.block.block.header.height);
//   newTransfers.txHash = event.tx.hash;
//   newTransfers.fromAddress = event.msg.msg.decodedMsg.fromAddress;
//   newTransfers.toAddress = event.msg.msg.decodedMsg.toAddress;
//   newTransfers.amount = event.msg.msg.decodedMsg.amount;
//   newTransfers.denomination = event.msg.msg.decodedMsg.denomination;

//   await newTransfers.save();
// }
// // export async function handleBlock(block: any): Promise<void> {
// //   logger.info(`Found Block at ${block.block.header.height.toString()}`);
// //   // const txns = block.txs;
// //   // txns.forEach((tx) => {
// //   //   logger.info(`TX DATA ${tx.log?.toString()}`);
// //   // });
// // }
// export async function handleTransaction(tx: CosmosTransaction): Promise<void> {
//   logger.info(`TX DATA ${tx?.decodedTx?.body?.messages?.length}`);
//   logger.info(`BLOCK ::  ${tx?.block?.block?.header?.height}`);
// }
