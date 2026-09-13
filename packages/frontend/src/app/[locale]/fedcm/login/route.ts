import { NextRequest, NextResponse } from "next/server";
import { getAssociations } from "@/lib/models";
import { getPublicRequestOrigin } from "@/lib/fedcm";
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

  const userLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const effectiveLocale = userLocale && SUPPORTED_LOCALES.has(userLocale) ? userLocale : safeLocale;

  if (uuid) {
    await setFedCmSessionCookie(uuid);
  }

  const hasAssociations = uuid ? (await getAssociations(uuid)).length > 0 : false;

  if (request.nextUrl.searchParams.get("close") === "1" || hasAssociations) {
    return new NextResponse(
      `<!doctype html>
<html lang="${effectiveLocale}">
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
          "Set-Login": hasAssociations ? "logged-in" : (uuid ? "logged-in" : "logged-out"),
        },
      },
    );
  }

  const origin = getPublicRequestOrigin(request);
  const redirectUrl = new URL(`/${effectiveLocale}`, origin);
  redirectUrl.searchParams.set("fedcm", "1");
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set("Set-Login", "logged-out");
  return response;
}

