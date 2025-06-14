import { toHex } from "@cosmjs/encoding";
import { TxData } from "@subql/types-cosmos";

export interface TxStats {
  nMessages: number; // Number of messages
  nEvents: number; // Number of events
  nTransfer: number; // Number of transfers
  nDataSubs: number; // Number of data subscriptions
  totalBytes: number; // Total number of bytes
  namespaces: string[]; // List of namespaces (if they are strings, otherwise adjust accordingly)
  decodedEvents: any[]; // Array of decoded events (replace 'any' with a more specific type if possible)
  decodedMessages: any[]; // Array of decoded messages (replace 'any' with a more specific type if possible)
  txFee: number; // Transaction fee
  code: number;
  codespace: string; // Codespace, optional
  gasUsed: number; // Gas used, optional
  gasWanted: number; // Gas used, optional
  signer: string; // Signer address, optional
  blobs: any[];
  index: number;
}

export const getDecodedTxData = (tx: TxData, index: number = 0): TxStats => {
  const code = tx?.code || 0;
  const codespace = tx?.codespace || "";
  const gasUsed = tx?.gasUsed ? Number(tx.gasUsed) : 0;
  const gasWanted = tx?.gasWanted ? Number(tx.gasWanted) : 0;

  const decodedData = tx?.events?.reduce(
    (acc: TxStats, v) => {
      acc.nEvents = tx?.events.length;
      const decodedType = v.type.toString();
      const bbs: {
        namespace?: string;
        commitment?: string;
        shareVersion?: number | string;
        blob_size?: number | string;
      }[] = [];
      const decodedAttributes = v.attributes?.map((attr) => {
        const decodeAttrKey = Buffer.from(
          attr.key.toString(),
          "base64"
        ).toString("utf-8");
        const decodeAttrValue = Buffer.from(
          attr.value.toString(),
          "base64"
        ).toString("utf-8");
        try {
          const attrKey = Buffer.from(attr.key.toString(), "base64").toString(
            "utf-8"
          );

          // logger.info(
          //   `🚀 ~ decodeBlockTx.ts:55 ~ attr: ${decodedType} :: ${attrKey} :: ${
          //     decodeAttrValue.length
          //   } ::::  ${decodeAttrValue.length < 70 ? decodeAttrValue : ""}`
          // );
          const attrValue = Buffer.from(
            attr.value.toString(),
            "base64"
          ).toString("utf-8");
        } catch (error) {
          logger.info(`BUFFER DECODE ERROR`);
        }

        if (decodedType === "message") {
          if (decodeAttrKey === "sender") {
            if (decodeAttrValue && decodeAttrValue !== "") {
              acc.signer = decodeAttrValue;
            }
          }
          acc.nMessages += 1;
          acc.decodedMessages = [
            ...acc.decodedMessages,
            {
              type: decodedType,
              decodedAttributes: {
                key: decodeAttrKey,
                value: decodeAttrValue,
              },
            },
          ];
        }
        if (decodedType === "transfer") {
          acc.nTransfer += 1;
        }
        if (decodedType === "tx") {
          if (decodeAttrKey === "fee") {
            const [fee] = decodeAttrValue?.split("utia");
            acc.txFee += Number(fee);
          }
        }
        if (decodeAttrKey === "signer") {
          if (decodeAttrValue && decodeAttrValue !== "") {
            acc.signer = decodeAttrValue;
          }
        }
        if (decodeAttrKey === "Signer") {
          if (decodeAttrValue && decodeAttrValue !== "") {
            acc.signer = decodeAttrValue;
          }
        }
        if (decodedType === "celestia.blob.v1.EventPayForBlobs") {
          acc.nDataSubs += 1;

          if (decodeAttrKey === "namespaces") {
            const nameSpaces = decodeAttrValue;
            if (nameSpaces?.length > 0) {
              JSON.parse(nameSpaces).forEach((ns: string, idx: number) => {
                const prev = bbs[idx] || {};
                bbs[idx] = { ...prev, namespace: toHex(Buffer.from(ns)) };
              });
            }
            acc.namespaces = [...acc.namespaces, ...nameSpaces];
          }
          if (decodeAttrKey === "share_commitments") {
            const commitments = decodeAttrValue;
            if (commitments?.length > 0) {
              JSON.parse(commitments).forEach((c: string, idx: number) => {
                const prev = bbs[idx] || {};
                bbs[idx] = { ...prev, commitment: c };
              });
            }
          }

          if (decodeAttrKey === "share_versions") {
            JSON.parse(decodeAttrValue)?.forEach(
              (attrV: number | string, idx: number) => {
                const prev = bbs[idx] || {};
                bbs[idx] = { ...prev, shareVersion: attrV };
              }
            );
          }
          if (decodeAttrKey === "blob_sizes") {
            const blobSizes = JSON.parse(decodeAttrValue)?.reduce(
              (sum: number, attrV: number | string, idx: number) => {
                const prev = bbs[idx] || {};
                bbs[idx] = { ...prev, blob_size: attrV };
                return sum + Number(attrV);
              },
              0
            );

            acc.totalBytes += blobSizes;
          }
        }
        return {
          key: decodeAttrKey,
          value: decodeAttrValue,
        };
      });
      const tmpEvents = acc.decodedEvents;
      tmpEvents?.push({
        type: decodedType,
        decodedAttributes,
      });
      acc.decodedEvents = tmpEvents;
      acc.blobs = [...acc.blobs, ...bbs];
      return acc;
    },
    {
      nMessages: 0,
      nEvents: 0,
      nTransfer: 0,
      nDataSubs: 0,
      totalBytes: 0,
      namespaces: [],
      decodedEvents: [],
      decodedMessages: [],
      txFee: 0,
      code: code,
      codespace: codespace,
      gasUsed: gasUsed,
      gasWanted: gasWanted,
      signer: "",
      blobs: [],
      index,
    }
  );
  return {
    ...decodedData,
    index,
  };
};
