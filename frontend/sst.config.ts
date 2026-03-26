export default $config({
  app(input) {
    return {
      name: "atpassport",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // 1. Secret を定義
    const sessionSecret = new sst.Secret("SessionSecret");

    // 2. DynamoDB テーブルを定義
    const table = new sst.aws.Dynamo("AtPassportSessions", {
      fields: {
        uuid: "string",
        did: "string",
      },
      primaryIndex: { hashKey: "uuid", rangeKey: "did" },
      ttl: "expiresAt",
    });

    const shareTokensTable = new sst.aws.Dynamo("AtPassportShareTokens", {
      fields: {
        token: "string",
      },
      primaryIndex: { hashKey: "token" },
      ttl: "expiresAt",
    });

    // 3. Next.js (frontend) を定義
    new sst.aws.Nextjs("AtPassportApp", {
      path: ".",
      link: [table, shareTokensTable, sessionSecret],
      environment: {
        SESSION_SECRET: sessionSecret.value,
      },
      transform: {
        server: {
          memory: "1024 MB",
          timeout: "30 seconds",
        },
      },
      domain: $app.stage === "production" ? {
        name: "atpassport.net",
        dns: false,
        cert: "arn:aws:acm:us-east-1:036820509199:certificate/8079cb72-a379-4240-b071-8274653e6ace"
      } : undefined,
    });
  },
});
