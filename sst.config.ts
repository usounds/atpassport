/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "atpassport",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // 1. DynamoDB テーブルを正しく定義
    const table = new sst.aws.Dynamo("AtPassportSessions", {
      fields: {
        uuid: "string",
        did: "string",
      },
      primaryIndex: { hashKey: "uuid", rangeKey: "did" },
    });

    // 2. Next.js (frontend) を定義し、テーブルをリンク
    new sst.aws.Nextjs("AtPassportApp", {
      path: "frontend",
      link: [table],
    });
  },
});
