import {
  CosmosDatasourceKind,
  CosmosHandlerKind,
  CosmosProject,
} from "@subql/types-cosmos";

// Can expand the Datasource processor types via the genreic param
const project: CosmosProject = {
  specVersion: "1.0.0",
  version: "0.0.1",
  name: "celestia-starter",
  description:
    "This project can be use as a starting point for developing your Cosmos Celestia based SubQuery project",
  runner: {
    node: {
      name: "@subql/node-cosmos",
      version: ">=3.0.0",
    },
    query: {
      name: "@subql/query",
      version: "*",
    },
  },
  schema: {
    file: "./schema.graphql",
  },
  network: {
    /* The unique chainID of the Cosmos Zone */
    chainId: "celestia",
    /**
     * These endpoint(s) should be public non-pruned archive node
     * We recommend providing more than one endpoint for improved reliability, performance, and uptime
     * Public nodes may be rate limited, which can affect indexing speed
     * When developing your project we suggest getting a private API key
     * If you use a rate limited endpoint, adjust the --batch-size and --workers parameters
     * These settings can be found in your docker-compose.yaml, they will slow indexing but prevent your project being rate limited
     */
    endpoint: [
      "https://celestia.cumulo.org.es",
      // "https://public-celestia-rpc.numia.xyz",
      // "https://celestia-rpc.mesa.newmetric.xyz",
    ],
    // chaintypes: new Map([
    //   [
    //     "cosmos.slashing.v1beta1",
    //     {
    //       file: "./proto/cosmos/slashing/v1beta1/tx.proto",
    //       messages: ["MsgUnjail"],
    //     },
    //   ],
    //   [
    //     "cosmos.gov.v1beta1",
    //     {
    //       file: "./proto/cosmos/gov/v1beta1/tx.proto",
    //       messages: ["MsgVoteWeighted"],
    //     },
    //   ],
    //   [
    //     "cosmos.gov.v1beta1.gov",
    //     {
    //       file: "./proto/cosmos/gov/v1beta1/gov.proto",
    //       messages: ["WeightedVoteOption"],
    //     },
    //   ],
    // ]),
  },
  dataSources: [
    {
      kind: CosmosDatasourceKind.Runtime,
      startBlock: 3130617,
      mapping: {
        file: "./dist/index.js",
        handlers: [
          {
            handler: "handleMessage",
            kind: CosmosHandlerKind.Message,
            filter: {
              type: "celestia.blob.v1.MsgPayForBlobs",
            },
          },
          {
            handler: "handleBlock",
            kind: CosmosHandlerKind.Block,
          },
          // {
          //   handler: "handleTransaction",
          //   kind: CosmosHandlerKind.Transaction,
          // },
        ],
      },
    },
  ],
};

// Must set default to the project instance
export default project;
