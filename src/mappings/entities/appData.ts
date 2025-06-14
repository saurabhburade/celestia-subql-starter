"use strict";

import { SubstrateExtrinsic } from "@subql/types";
import {
  AccountEntity,
  AppEntity,
  BlobData,
  PriceFeedMinute,
} from "../../types";

import { CosmosBlock, TxData } from "@subql/types-cosmos";
import { getDecodedTxData } from "../../utils/decodeBlockTx";
import { sha256 } from "@cosmjs/crypto";

export async function handleApp(
  transaction: TxData,
  priceFeed: PriceFeedMinute,
  block: CosmosBlock,
  type: number = 0,
  blob: BlobData
) {
  const decodedTxn = getDecodedTxData(transaction);
  try {
    let dataSubmissionSize = decodedTxn.totalBytes ? decodedTxn?.totalBytes : 0;

    const id = blob.namespaceId!;

    let appEntity = await AppEntity.get(id);

    if (appEntity === undefined || appEntity === null) {
      appEntity = AppEntity.create({
        id: id,
        name: Buffer.from(id, "hex").toString("ascii"),
        owner: decodedTxn.signer,
        creationRawData: JSON.stringify({ ...decodedTxn }),
        createdAt: new Date(block.header.time.getTime()),
        timestampCreation: new Date(block.header.time.getTime()),
        timestampLast: new Date(block.header.time.getTime()),
        totalByteSize: 0,
        updatedAt: new Date(block.header.time.getTime()),
        avgNativePrice: priceFeed.nativePrice,
        totalDAFees: 0,
        totalDAFeesUSD: 0,
        totalDataSubmissionCount: 0,
        totalDataBlocksCount: 0,
        totalBlocksCount: 0,
        totalTxnCount: 0,
        totalFeesNative: 0,
        totalFeesUSD: 0,
        totalTransferCount: 0,
        lastPriceFeedId: priceFeed.id,
        endBlock: 0,
        startBlock: block.block.header.height,
        creationTxnId: sha256(transaction.data!).toString(),
        lastUpdatedTxnId: "",
      });
    }
    if (appEntity.lastUpdatedTxnId !== blob.transactionId) {
      appEntity.lastUpdatedTxnId = blob.transactionId!;
      appEntity.totalTxnCount += 1;

      const fees = Number(decodedTxn.txFee);
      const feesUSD = fees * priceFeed.nativePrice;

      appEntity.totalDAFees =
        appEntity.totalDAFees! + Number(decodedTxn.txFee)!;
      appEntity.totalDAFeesUSD = appEntity.totalDAFeesUSD! + feesUSD;
      appEntity.totalDataSubmissionCount =
        appEntity.totalDataSubmissionCount! + 1;

      appEntity.totalByteSize =
        appEntity.totalByteSize + Number(dataSubmissionSize);

      appEntity.totalFeesNative =
        appEntity.totalFeesNative! + Number(decodedTxn.txFee!);

      appEntity.totalFeesUSD = appEntity.totalFeesUSD! + Number(feesUSD);
    }
    appEntity.timestampLast = new Date(block.header.time.getTime());

    appEntity.updatedAt = new Date(block.header.time.getTime());
    appEntity.avgNativePrice =
      (appEntity.avgNativePrice! + priceFeed.nativePrice) / 2;

    if (appEntity.endBlock!.toString() != block.header.height.toString()) {
      appEntity.totalDataBlocksCount = appEntity.totalDataBlocksCount! + 1;
    }

    if (appEntity.endBlock!.toString() != block.header.height.toString()) {
      appEntity.totalBlocksCount = appEntity.totalBlocksCount! + 1;
    }

    appEntity.lastPriceFeedId = priceFeed.id;
    appEntity.endBlock = block.header.height;
    logger.info(`APP SAVE::::::  ${JSON.stringify(appEntity)}`);

    // return appEntity;
    await appEntity.save();
  } catch (error) {
    logger.error(` APP SAVE ERROR::::::  ${error}`);
    throw error;
  }
}
