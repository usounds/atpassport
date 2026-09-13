import { NextRequest, NextResponse } from "next/server";
import { getAssociations } from "@/lib/models";
import { getSessionUuid, setFedCmSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";
const SUPPORTED_LOCALES = new Set(["en", "ja", "pt", "de", "fr", "es"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const safeLocale = SUPPORTED_LOCALES.has(locale) ? locale : "en";
  const uuid = await getSessionUuid();

  if (!uuid || (await getAssociations(uuid)).length === 0) {
    const response = NextResponse.redirect(new URL(`/${safeLocale}`, request.url));
    response.headers.set("Set-Login", "logged-out");
    return response;
  }

  await setFedCmSessionCookie(uuid);

  return new NextResponse(
    `<!doctype html>
<html lang="${safeLocale}">
  <head><meta charset="utf-8"><title>@passport</title></head>
  <body>
    <script>
      (async () => {
        try { await navigator.login?.setStatus?.('logged-in'); } catch {}
        try { IdentityProvider.close(); } catch { window.close(); }
      })();
    </script>
  </body>
</html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
        "Set-Login": "logged-in",
      },
    },
  );
}
