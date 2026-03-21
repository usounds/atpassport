import { Client } from "@atcute/client";

export const publicAgent = new Client<any, any>({
  handler: (pathname, { params, body, headers, signal }: any) => {
    const url = new URL(pathname, "https://public.api.bsky.app");
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return fetch(url, {
      method: body ? "POST" : "GET",
      headers: headers as any,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  },
});

export async function getProfile(did: string) {
  try {
    const { data } = await publicAgent.get("app.bsky.actor.getProfile", {
      params: { actor: did },
    });
    return data;
  } catch (e) {
    return null;
  }
}
