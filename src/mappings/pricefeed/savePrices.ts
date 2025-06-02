import fetch from "node-fetch";
import { PriceFeedMinute } from "../../types";
import { CosmosBlock } from "@subql/types-cosmos";

async function fetchData(url: string, options: any) {
  const response = await fetch(url, {
    ...options,
    //  signal: signal
  });
  if (!response?.ok) {
    throw new Error("Fetch failed");
  }
  return await response.json();
}
const MONTHLY_SECONDS = 2628000;
const INITIAL_TIMESTAMP = 1748816100000;
const MS_IN_DAY = 86400000;
const MS_IN_MINUTE = 1000 * 60;
const CONSTANT_PRICE_FEED_FILES = [
  "2023-10",
  "2023-11",
  "2023-12",
  "2024-01",
  "2024-02",
  "2024-03",
  "2024-04",
  "2024-05",
  "2024-06",
  "2024-07",
  "2024-08",
  "2024-09",
  "2024-10",
  "2024-11",
  "2024-12",
  "2025-01",
  "2025-02",
  "2025-03",
  "2025-04",
  "2025-05",
  "2025-06",
];
export async function handleNewPriceMinute({
  block,
}: {
  block: CosmosBlock;
}): Promise<PriceFeedMinute | undefined> {
  const blockDate = new Date(Number(block.block.header.time.getTime()));
  const minuteId = Math.floor(blockDate.getTime() / 60000);
  const currentMinuteId = Math.floor(new Date().getTime() / 60000);
  let ethBlockContext = {};
  // SKIP PRICES BEFORE GENESIS MINUTEID 28312800
  const tiaBlock = block.block.header.height;
  if (minuteId < 28312800) {
    const priceFeedMinuteZero = PriceFeedMinute.create({
      id: minuteId.toString(),
      tiaBlock: tiaBlock,
      tiaPrice: 2.4,
      date: blockDate,
      tiaDate: blockDate,
    });
    await priceFeedMinuteZero.save();
    logger.info(`PRICE BEFORE GENESIS :: minuteId: ${minuteId}`);
    return priceFeedMinuteZero!;
  }
  try {
    const existingPrice = await PriceFeedMinute.get(minuteId.toString());
    if (
      existingPrice &&
      (existingPrice !== null || existingPrice !== undefined)
    ) {
      logger.info(
        `PRICE FOR THIS MINUTE EXIST :: ${JSON.stringify(existingPrice)}`
      );
      return existingPrice!;
    }
    let priceFeedThisMinute;
    if (minuteId <= 29147512) {
      for (const file of CONSTANT_PRICE_FEED_FILES) {
        const data = await fetchData(
          `https://raw.githubusercontent.com/saurabhburade/celestia-subql-starter/refs/heads/dev/src/mappings/pricefeed/saveddata/${file}.json`,
          {}
        );
        logger.info(`FETCHED PRICE DATA FROM FILE :: ${file}.json`);
        const pricesToSave: PriceFeedMinute[] = [];
        for (const element of data) {
          // SAVE MONTHLY DATA FROM LOCAL FILES
          const priceForMinute = PriceFeedMinute.create({
            id: element?.minuteId?.toString(),
            tiaBlock: tiaBlock,
            tiaPrice: element?.avgPrice,
            date: element?.timestampF,
            tiaDate: blockDate,
          });
          pricesToSave.push(priceForMinute);
          if (Number(element?.minuteId) === minuteId) {
            priceFeedThisMinute = priceForMinute;
          }
          await store.bulkUpdate("PriceFeedMinute", pricesToSave);
        }
      }
      return priceFeedThisMinute!;
    }
    if (currentMinuteId - minuteId >= 5) {
      try {
        // if more than 5 minutes data is unavailable , fetch 5 minute prices from binance api
        const URL = `https://api.binance.com/api/v3/klines?symbol=TIAUSDT&interval=1m&limit=1000&startTime=${blockDate.getTime()}`;
        const res = await fetchData(URL, {});
        if (res?.length > 0) {
          const pricesToSave: PriceFeedMinute[] = [];
          for (const pricedatas of res) {
            const [timestamp, o, h, l, c] = pricedatas;
            const hp = h;
            const lp = l;
            const avgPrice = (Number(hp) + Number(lp)) / 2;

            const minuteIdOhlc = Math.floor(Number(timestamp) / MS_IN_MINUTE);

            const priceForMinute = PriceFeedMinute.create({
              id: minuteIdOhlc?.toString(),
              tiaBlock: tiaBlock,
              tiaPrice: avgPrice,
              date: new Date(new Date(Number(timestamp)).getTime()),
              tiaDate: blockDate,
            });
            pricesToSave.push(priceForMinute);
            // consider 2 mins diff if any
            if (
              Number(minuteIdOhlc) === minuteId ||
              (Number(minuteIdOhlc) < minuteId + 2 &&
                Number(minuteIdOhlc) > minuteId)
            ) {
              priceFeedThisMinute = priceForMinute;
            }
          }
          await store.bulkUpdate("PriceFeedMinute", pricesToSave);
          return priceFeedThisMinute!;
        }
      } catch (errorb) {
        logger.info(`PRICE ERROR BINANCE API ${errorb}`);
      }
    } else {
      try {
        // fetch latest price if minute difference is less than 5 mins
        // fetch price from chainlink oracle
        const URL = `https://api.redstone.finance/prices?forceInflux=true&interval=1&symbols=TIA`;
        const res = await fetchData(URL, {});
        if (res?.TIA) {
          const { TIA, timestamp } = res;
          const { value } = TIA;
          // check if price is within 3 mins range
          if (
            Number(timestamp) / MS_IN_MINUTE <= minuteId + 1 ||
            Number(timestamp) / MS_IN_MINUTE >= minuteId - 1
          ) {
            const priceForMinute = PriceFeedMinute.create({
              id: minuteId?.toString(),
              tiaBlock: tiaBlock,
              tiaPrice: value,
              date: new Date(timestamp),
              tiaDate: blockDate,
            });
            await priceForMinute.save();
            priceFeedThisMinute = priceForMinute;
            return priceFeedThisMinute!;
          } else {
            throw new Error("MINUTE ID MISMATCH");
          }
        }
        return priceFeedThisMinute!;
      } catch (errorR) {
        logger.info(`PRICE ERROR REDSTONE API ${errorR}`);
        logger.info(`TRY PRICE FROM COINGECKO`);
        // fetch price from chainlink oracle
        const URL = `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&symbols=tia&include_last_updated_at=true`;
        const res = await fetchData(URL, {});
        if (res?.tia) {
          const { tia } = res;
          const { usd, last_updated_at } = tia;
          // check if price is within 3 mins range
          if (
            (Number(last_updated_at) * 1000) / MS_IN_MINUTE <= minuteId + 1 ||
            (Number(last_updated_at) * 1000) / MS_IN_MINUTE >= minuteId - 1
          ) {
            const priceForMinute = PriceFeedMinute.create({
              id: minuteId?.toString(),
              tiaBlock: tiaBlock,
              tiaPrice: usd,
              date: new Date(Number(last_updated_at) * 1000),
              tiaDate: blockDate,
            });
            await priceForMinute.save();
            priceFeedThisMinute = priceForMinute;
            return priceFeedThisMinute!;
          }
        }
      }
    }
    return priceFeedThisMinute!;
  } catch (errorF) {
    logger.info(`PRICE ERROR FINAL CATCH ${errorF}`);
  }
}
