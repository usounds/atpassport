'use client';

import { configureOAuth } from '@atcute/oauth-browser-client';
import {
  CompositeDidDocumentResolver,
  LocalActorResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
  XrpcHandleResolver,
} from '@atcute/identity-resolver';

let initialized = false;

export function initOAuth() {
  if (initialized || typeof window === 'undefined') return;

  const origin = window.location.origin;
  // 認証完了後にこのページに必ず戻るように、現在のパスを redirect_uri とする
  const redirectUri = window.location.origin + window.location.pathname;

  configureOAuth({
    // atcute 3.0.0 では、metadata は object で client_id と redirect_uri を指定する必要がある
    metadata: {
      client_id: `${origin}/oauth-client-metadata.json`,
      redirect_uri: redirectUri,
    },
    identityResolver: new LocalActorResolver({
      handleResolver: new XrpcHandleResolver({
        serviceUrl: 'https://public.api.bsky.app',
      }),
      didDocumentResolver: new CompositeDidDocumentResolver({
        methods: {
          plc: new PlcDidDocumentResolver(),
          web: new WebDidDocumentResolver(),
        },
      }),
    }),
  });

  initialized = true;
}
