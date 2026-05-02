export default $config({
  app(input) {
    return {
      name: "atpassport",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      build: {
        nodejs: {
          version: "24.x"
        }
      }
    };
  },
  async run() {
    const sessionSecret = new sst.Secret("SessionSecret");

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

    const verifiedDomainsTable = new sst.aws.Dynamo("AtPassportVerifiedDomains", {
      fields: {
        domain: "string",
        isPublic: "string",
        verifiedAt: "string",
        verifiedByDid: "string",
      },
      primaryIndex: { hashKey: "domain" },
      globalIndexes: {
        PublicVerifiedIndex: {
          hashKey: "isPublic",
          rangeKey: "verifiedAt",
          projection: "all",
        },
        VerifiedByDidIndex: {
          hashKey: "verifiedByDid",
          rangeKey: "verifiedAt",
          projection: "all",
        },
      },
    });

    const passkeysTable = new sst.aws.Dynamo("AtPassportPasskeys", {
      fields: {
        credentialID: "string",
        uuid: "string",
      },
      primaryIndex: { hashKey: "credentialID" },
      globalIndexes: {
        UuidIndex: {
          hashKey: "uuid",
          projection: "all",
        },
      },
    });

    new sst.aws.Nextjs("AtPassportApp", {
      path: ".",
      link: [table, shareTokensTable, verifiedDomainsTable, passkeysTable, sessionSecret],
      permissions: [
        {
          actions: ["dynamodb:Query", "dynamodb:Scan", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"],
          resources: [
            table.arn,
            $util.interpolate`${table.arn}/index/*`,
            shareTokensTable.arn,
            $util.interpolate`${shareTokensTable.arn}/index/*`,
            verifiedDomainsTable.arn,
            $util.interpolate`${verifiedDomainsTable.arn}/index/*`,
            passkeysTable.arn,
            $util.interpolate`${passkeysTable.arn}/index/*`
          ],
        },
      ],
      environment: {
        SESSION_SECRET: sessionSecret.value,
        NEXT_PUBLIC_URL: 
          $app.stage === "production" ? "https://atpassport.net" : 
          $app.stage === "preview" ? "https://preview.atpassport.net" : 
          "https://dev.atpassport.net",
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
      } : $app.stage === "preview" ? {
        name: "preview.atpassport.net",
        dns: false,
        cert: "arn:aws:acm:us-east-1:036820509199:certificate/5fcb00ba-ef88-4d6f-b909-21a1237ac677"
      } : undefined,
    });
  },
});
