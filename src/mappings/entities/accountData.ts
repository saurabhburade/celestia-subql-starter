"use strict";

import { SubstrateExtrinsic } from "@subql/types";
import { AccountEntity, AppEntity, PriceFeedMinute } from "../../types";

import { CosmosBlock, TxData } from "@subql/types-cosmos";
import { getDecodedTxData } from "../../utils/decodeBlockTx";

export async function handleAccount(
  transaction: TxData,
  priceFeed: PriceFeedMinute,
  block: CosmosBlock,
  type: number = 0,
  appRecord?: AppEntity
) {
  const decodedTxn = getDecodedTxData(transaction);
  try {
    let dataSubmissionSize = decodedTxn.totalBytes ? decodedTxn?.totalBytes : 0;
    const id =
      type === 1
        ? `${decodedTxn.signer.toString()}-${appRecord!.id}`
        : `${decodedTxn.signer.toString()}`;
    let accountEntity = await AccountEntity.get(id);

    if (accountEntity === undefined || accountEntity === null) {
      accountEntity = AccountEntity.create({
        id: id,
        address: decodedTxn.signer,
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
        totalExtrinsicCount: 0,
        totalFees: 0,
        totalFeesNative: 0,
        totalFeesUSD: 0,
        totalTransferCount: 0,
        lastPriceFeedId: priceFeed.id,
        endBlock: 0,
        startBlock: block.header.height,
        type,
      });
    }

    accountEntity.timestampLast = new Date(block.header.time.getTime());

    accountEntity.updatedAt = new Date(block.header.time.getTime());
    accountEntity.avgNativePrice =
      (accountEntity.avgNativePrice! + priceFeed.nativeBlock) / 2;

    // const extrinsicType = `${decodedTxn.}_${methodData.method}`;
    const isDataSubmission = decodedTxn.blobs.length > 0;
    const fees = Number(decodedTxn.txFee);
    const feesUSD = fees * priceFeed.nativePrice;
    if (isDataSubmission) {
      accountEntity.totalDAFees =
        accountEntity.totalDAFees! + Number(decodedTxn.txFee)!;
      accountEntity.totalDAFeesUSD = accountEntity.totalDAFeesUSD! + feesUSD;
      accountEntity.totalDataSubmissionCount =
        accountEntity.totalDataSubmissionCount! + 1;

      accountEntity.totalByteSize =
        accountEntity.totalByteSize + Number(dataSubmissionSize);
      if (
        accountEntity.endBlock!.toString() != block.header.height.toString()
      ) {
        accountEntity.totalDataBlocksCount =
          accountEntity.totalDataBlocksCount! + 1;
      }
    }
    if (accountEntity.endBlock!.toString() != block.header.height.toString()) {
      accountEntity.totalBlocksCount = accountEntity.totalBlocksCount! + 1;
    }
    accountEntity.totalExtrinsicCount = accountEntity.totalExtrinsicCount! + 1;
    accountEntity.totalFees =
      accountEntity.totalFees! + Number(decodedTxn.txFee!);
    accountEntity.totalFeesNative =
      accountEntity.totalFeesNative! + Number(decodedTxn.txFee!);
    accountEntity.totalFeesUSD = accountEntity.totalFeesUSD! + Number(feesUSD);
    accountEntity.lastPriceFeedId = priceFeed.id;
    accountEntity.endBlock = block.header.height;
    logger.info(`New ACCOUNT SAVE::::::  ${JSON.stringify(accountEntity)}`);
    if (type === 1) {
      accountEntity.appId = appRecord!.id;
      accountEntity.attachedAppId = appRecord!.id;
      // await accountEntity.save();
    }
    // return accountEntity;
    await accountEntity.save();
  } catch (error) {
    logger.error(`New ACCOUNT SAVE ERROR::::::  ${error}`);
    throw error;
  }
}
