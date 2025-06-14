"use strict";

import { SubstrateExtrinsic } from "@subql/types";
import {
  AccountEntity,
  AppDayData,
  AppEntity,
  AppHourData,
  BlobData,
  PriceFeedMinute,
} from "../../types";

import { CosmosBlock, TxData } from "@subql/types-cosmos";
import { getDecodedTxData, TxStats } from "../../utils/decodeBlockTx";
import { sha256 } from "@cosmjs/crypto";
import { handleAccount } from "./accountData";

export async function handleApp(
  decodedTxn: TxStats,
  priceFeed: PriceFeedMinute,
  block: CosmosBlock,
  type: number = 0,
  blob: BlobData
) {
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
        creationTxnId: `${block.header.height}-${decodedTxn.index}`,
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
    logger.info(`APP SAVE::::::  ${JSON.stringify(appEntity.id)}`);

    // return appEntity;
    await appEntity.save();
    await handleAccount(decodedTxn, priceFeed!, block, 1, appEntity);

    await handleAppDayData(decodedTxn, priceFeed, block, type, appEntity, blob);
    await handleAppHourData(
      decodedTxn,
      priceFeed,
      block,
      type,
      appEntity,
      blob
    );
  } catch (error) {
    logger.error(` APP SAVE ERROR::::::  ${error}`);
    throw error;
  }
}

export async function handleAppDayData(
  decodedTxn: TxStats,
  priceFeed: PriceFeedMinute,
  block: CosmosBlock,
  type: number = 0,
  appData: AppEntity,
  blob: BlobData
) {
  const blockDate = new Date(Number(block.header.time.getTime()));
  const minuteId = Math.floor(blockDate.getTime() / 60000);
  const dayId = Math.floor(blockDate.getTime() / 86400000);
  const hourId = Math.floor(blockDate.getTime() / 3600000); // Divide by milliseconds in an hour

  const prevDayId = dayId - 1;
  try {
    let dataSubmissionSize = decodedTxn.totalBytes ? decodedTxn?.totalBytes : 0;

    const id = `${appData.id}-dayId-${dayId}`;
    const previd = `${appData.id}-dayId-${prevDayId}`;

    let appDayEntity = await AppDayData.get(id);

    if (appDayEntity === undefined || appDayEntity === null) {
      appDayEntity = AppDayData.create({
        id: id,
        appId: appData.id,
        timestampStart: new Date(block.header.time.getTime()),
        attachedAppId: appData.id,
        prevDayDataId: previd,
        totalDataAccountsCount: 0,
        totalFees: 0,
        type: 0,
        timestampLast: new Date(block.header.time.getTime()),
        totalByteSize: 0,
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

        lastUpdatedTxnId: "",
        collectiveDayDataId: dayId?.toString(),
      });
    }
    if (appDayEntity.lastUpdatedTxnId !== blob.transactionId) {
      appDayEntity.lastUpdatedTxnId = blob.transactionId!;
      appDayEntity.totalTxnCount! += 1;

      const fees = Number(decodedTxn.txFee);
      const feesUSD = fees * priceFeed.nativePrice;

      appDayEntity.totalDAFees =
        appDayEntity.totalDAFees! + Number(decodedTxn.txFee)!;
      appDayEntity.totalDAFeesUSD = appDayEntity.totalDAFeesUSD! + feesUSD;
      appDayEntity.totalDataSubmissionCount =
        appDayEntity.totalDataSubmissionCount! + 1;

      appDayEntity.totalByteSize =
        appDayEntity.totalByteSize + Number(dataSubmissionSize);

      appDayEntity.totalFeesNative =
        appDayEntity.totalFeesNative! + Number(decodedTxn.txFee!);

      appDayEntity.totalFeesUSD = appDayEntity.totalFeesUSD! + Number(feesUSD);
    }
    appDayEntity.timestampLast = new Date(block.header.time.getTime());

    appDayEntity.avgNativePrice =
      (appDayEntity.avgNativePrice! + priceFeed.nativePrice) / 2;

    if (appDayEntity.endBlock!.toString() != block.header.height.toString()) {
      appDayEntity.totalDataBlocksCount =
        appDayEntity.totalDataBlocksCount! + 1;
    }

    if (appDayEntity.endBlock!.toString() != block.header.height.toString()) {
      appDayEntity.totalBlocksCount = appDayEntity.totalBlocksCount! + 1;
    }

    appDayEntity.lastPriceFeedId = priceFeed.id;
    appDayEntity.endBlock = block.header.height;
    appDayEntity.collectiveHourDataId = hourId?.toString();

    logger.info(`APP DAY SAVE::::::  ${JSON.stringify(appDayEntity.id)}`);

    // return appEntity;
    await appDayEntity.save();
  } catch (error) {
    logger.error(` APP DAY SAVE ERROR::::::  ${error}`);
    throw error;
  }
}
export async function handleAppHourData(
  decodedTxn: TxStats,
  priceFeed: PriceFeedMinute,
  block: CosmosBlock,
  type: number = 0,
  appData: AppEntity,
  blob: BlobData
) {
  const blockDate = new Date(Number(block.header.time.getTime()));
  const minuteId = Math.floor(blockDate.getTime() / 60000);
  const dayId = Math.floor(blockDate.getTime() / 86400000);
  const prevDayId = dayId - 1;
  const hourId = Math.floor(blockDate.getTime() / 3600000); // Divide by milliseconds in an hour
  const prevHourId = hourId - 1; // Divide by milliseconds in an hour
  try {
    let dataSubmissionSize = decodedTxn.totalBytes ? decodedTxn?.totalBytes : 0;

    const id = `${appData.id}-hourId-${hourId}`;
    const previd = `${appData.id}-hourId-${prevHourId}`;

    let appHourEntity = await AppHourData.get(id);

    if (appHourEntity === undefined || appHourEntity === null) {
      appHourEntity = AppHourData.create({
        id: id,
        appId: appData.id,
        timestampStart: new Date(block.header.time.getTime()),
        attachedAppId: appData.id,
        prevHourDataId: previd,
        totalDataAccountsCount: 0,
        totalFees: 0,
        type: 0,
        timestampLast: new Date(block.header.time.getTime()),
        totalByteSize: 0,
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

        lastUpdatedTxnId: "",
        collectiveDayDataId: dayId?.toString(),
        collectiveHourDataId: hourId?.toString(),
      });
    }
    if (appHourEntity.lastUpdatedTxnId !== blob.transactionId) {
      appHourEntity.lastUpdatedTxnId = blob.transactionId!;
      appHourEntity.totalTxnCount! += 1;

      const fees = Number(decodedTxn.txFee);
      const feesUSD = fees * priceFeed.nativePrice;

      appHourEntity.totalDAFees =
        appHourEntity.totalDAFees! + Number(decodedTxn.txFee)!;
      appHourEntity.totalDAFeesUSD = appHourEntity.totalDAFeesUSD! + feesUSD;
      appHourEntity.totalDataSubmissionCount =
        appHourEntity.totalDataSubmissionCount! + 1;

      appHourEntity.totalByteSize =
        appHourEntity.totalByteSize + Number(dataSubmissionSize);

      appHourEntity.totalFeesNative =
        appHourEntity.totalFeesNative! + Number(decodedTxn.txFee!);

      appHourEntity.totalFeesUSD =
        appHourEntity.totalFeesUSD! + Number(feesUSD);
    }
    appHourEntity.timestampLast = new Date(block.header.time.getTime());

    appHourEntity.avgNativePrice =
      (appHourEntity.avgNativePrice! + priceFeed.nativePrice) / 2;

    if (appHourEntity.endBlock!.toString() != block.header.height.toString()) {
      appHourEntity.totalDataBlocksCount =
        appHourEntity.totalDataBlocksCount! + 1;
    }

    if (appHourEntity.endBlock!.toString() != block.header.height.toString()) {
      appHourEntity.totalBlocksCount = appHourEntity.totalBlocksCount! + 1;
    }

    appHourEntity.lastPriceFeedId = priceFeed.id;
    appHourEntity.endBlock = block.header.height;

    logger.info(`APP HOUR SAVE::::::  ${JSON.stringify(appHourEntity.id)}`);

    // return appEntity;
    await appHourEntity.save();
  } catch (error) {
    logger.error(` APP HOUR SAVE ERROR::::::  ${error}`);
    throw error;
  }
}
