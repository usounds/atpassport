import { 
  CompositeHandleResolver, 
  WellKnownHandleResolver, 
  CompositeDidDocumentResolver, 
  PlcDidDocumentResolver, 
  WebDidDocumentResolver, 
  LocalActorResolver
} from "@atcute/identity-resolver";
import { NodeDnsHandleResolver } from "@atcute/identity-resolver-node";
import { isActorIdentifier } from "@atcute/lexicons/syntax";

// Setup handle resolver with DNS and HTTP methods
const handleResolver = new CompositeHandleResolver({
  methods: {
    dns: new NodeDnsHandleResolver(),
    http: new WellKnownHandleResolver(),
  },
});

// Setup DID document resolver for did:plc and did:web
// 使用するのは標準の PlcDidDocumentResolver (plc.directory)
const didResolver = new CompositeDidDocumentResolver({
  methods: {
    plc: new PlcDidDocumentResolver(),
    web: new WebDidDocumentResolver(),
  },
});

// Setup actor resolver that combines handle and DID resolution
const actorResolver = new LocalActorResolver({
  handleResolver,
  didDocumentResolver: didResolver,
});

export async function resolveIdentity(handleOrDid: string) {
  console.log(`[resolveIdentity] Start: ${handleOrDid}`);
  
  if (!isActorIdentifier(handleOrDid)) {
    console.warn(`[resolveIdentity] Invalid identifier format: ${handleOrDid}`);
    return null;
  }

  try {
    console.log(`[resolveIdentity] Calling actorResolver.resolve...`);
    // タイムアウトを防ぐため、念のためPromise.race等でのタイムアウト制御も検討可能ですが、
    // まずは標準的な呼び出しでログを確認します。
    const actor = await actorResolver.resolve(handleOrDid);
    console.log(`[resolveIdentity] Successfully resolved:`, JSON.stringify({
      did: actor.did,
      handle: actor.handle,
      pds: actor.pds
    }));
    
    if (!actor.did || !actor.pds) {
      console.warn(`[resolveIdentity] Result missing DID or PDS: ${handleOrDid}`);
      return null;
    }

    return { 
      did: actor.did, 
      handle: actor.handle,
      pdsUrl: actor.pds 
    };
  } catch (e: unknown) {
    const error = e as { name?: string; message?: string; cause?: { name?: string; message?: string } };
    
    // ActorResolutionError や DidNotFoundError は想定内のエラーとして扱う
    if (error?.name === 'ActorResolutionError' || error?.cause?.name === 'DidNotFoundError') {
      console.warn(`[resolveIdentity] Identity not found: ${handleOrDid} (${error.message})`);
    } else {
      // それ以外の予期せぬエラーは詳細に出力
      console.error(`[resolveIdentity] UNEXPECTED ERROR for ${handleOrDid}:`, {
        name: error?.name,
        message: error?.message,
        cause: error?.cause,
        stack: (e as Error)?.stack
      });
    }
    return null;
  }
}
