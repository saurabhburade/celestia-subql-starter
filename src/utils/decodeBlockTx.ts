import { TxData } from "@subql/types-cosmos";

interface TxStats {
  nMessages: number; // Number of messages
  nEvents: number; // Number of events
  nTransfer: number; // Number of transfers
  nDataSubs: number; // Number of data subscriptions
  totalBytes: number; // Total number of bytes
  namespaces: string[]; // List of namespaces (if they are strings, otherwise adjust accordingly)
  decodedEvents: any[]; // Array of decoded events (replace 'any' with a more specific type if possible)
  decodedMessages: any[]; // Array of decoded messages (replace 'any' with a more specific type if possible)
  txFee: number; // Transaction fee
}

export const getDecodedTxData = (tx: TxData): TxStats => {
  const decodedData = tx?.events?.reduce(
    (acc: TxStats, v) => {
      acc.nEvents = tx?.events.length;
      const decodedType = v.type.toString();

      const decodedAttributes = v.attributes?.map((attr) => {
        const decodeAttrKey = Buffer.from(
          attr.key.toString(),
          "base64"
        ).toString("utf-8");
        const decodeAttrValue = Buffer.from(
          attr.value.toString(),
          "base64"
        ).toString("utf-8");

        if (decodedType === "message") {
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
        if (decodedType === "celestia.blob.v1.EventPayForBlobs") {
          acc.nDataSubs += 1;

          if (decodeAttrKey === "namespaces") {
            const nameSpaces = decodeAttrValue;
            acc.namespaces = [...acc.namespaces, ...nameSpaces];
          }
          if (decodeAttrKey === "blob_sizes") {
            const blobSizes = JSON.parse(decodeAttrValue)?.reduce(
              (sum: number, attrV: number | string) => {
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
    }
  );
  return {
    ...decodedData,
  };
};
