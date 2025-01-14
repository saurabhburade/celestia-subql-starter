import {
  CosmosEvent,
  CosmosBlock,
  CosmosMessage,
  CosmosTransaction,
} from "@subql/types-cosmos";

/*
export async function handleBlock(block: CosmosBlock): Promise<void> {
  // If you want to index each block in Cosmos (CosmosHub), you could do that here
}
*/
export async function handleBlock(block: CosmosBlock): Promise<void> {
  // If you want to index each block in Cosmos (CosmosHub), you could do that here
  // const height = block?.block?.header?.height;
  // const txs = block.txs;
  // if (height === 199552) {
  //   logger.info(`BLOCK ::  ${height}`);
  //   txs.forEach((tx) => {
  //     logger.info(`EVENTS ::  ${JSON.stringify(tx?.events)}`);
  //     logger.info(`LOGS ::  ${JSON.stringify(tx?.log)}`);
  //     logger.info(`DATA ::  ${JSON.stringify(tx?.data)}`);
  //   });
  // }
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
  logger.info(`Found event for ${event.event.type}`);
  event.event.attributes.forEach((attr) => {
    const baseDecoded = Buffer.from(attr.value.toString(), "base64").toString(
      "utf-8"
    );
    const baseDecodedKey = Buffer.from(attr.key.toString(), "base64").toString(
      "utf-8"
    );

    logger.info(` ${event.event.type}::  ATTR MSG ${baseDecodedKey} `);
  });

  // Handle Blob Event
}
export async function handleTransaction(tx: CosmosTransaction): Promise<void> {
  tx.decodedTx.body.messages.forEach((msg) => {
    const base = Buffer.from(msg.value).toString("utf-8");
    logger.info(`TXN MSG ${msg.typeUrl} ::: ${base}`);
  });
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
