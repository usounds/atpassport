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
  if (!isActorIdentifier(handleOrDid)) {
    return null;
  }

  try {
    const actor = await actorResolver.resolve(handleOrDid);
    
    if (!actor.did || !actor.pds) {
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
    if (error?.name !== 'ActorResolutionError' && error?.cause?.name !== 'DidNotFoundError') {
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

export async function resolveDidDocument(did: string) {
  try {
    return await didResolver.resolve(did as `did:${string}`);
  } catch (error) {
    console.error(`[resolveDidDocument] Failed to resolve DID ${did}:`, error);
    return null;
  }
}
