import { NextRequest, NextResponse } from "next/server";
import { getSessionUuid } from "@/lib/session";
import { getAssociations } from "@/lib/models";
import { signPassportToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = searchParams.get("callbackUrl");

  if (!callbackUrl) {
    return NextResponse.json({ error: "Missing callbackUrl" }, { status: 400 });
  }

  try {
    const uuid = await getSessionUuid();
    if (!uuid) {
      return NextResponse.redirect(callbackUrl);
    }

    // 2. DynamoDBから、そのUUIDに紐づくプライマリーのハンドル・DID情報を取得する。
    // 現時点では全てプライマリーとして扱うため、最初の1つを取得
    const associations = await getAssociations(uuid);

    if (associations.length > 0) {
      const primary = associations[0];

      // 3. 取得した結果を JWT (JSON Web Token) に格納し、atpassport固有の秘密鍵でデジタル署名
      const token = await signPassportToken({
        did: primary.did,
        handle: primary.handle,
        uuid: uuid
      });

      // 4. callbackUrl 内のプレースホルダー（{handle}, {did}）を置換する
      let finalUrl = callbackUrl
        .replace(/{handle}/g, encodeURIComponent(primary.handle))
        .replace(/{did}/g, encodeURIComponent(primary.did));

      // 5. 署名済みJWTを、callbackUrl のクエリパラメータ ?token=<JWT> として付与し、リダイレクトする。
      const url = new URL(finalUrl);
      url.searchParams.set("token", token);
      return NextResponse.redirect(url.toString());
    } else {
      // 1. 存在しない・無効な場合は何も返さない状態でリダイレクトする。
      return NextResponse.redirect(callbackUrl);
    }
  } catch (e) {
    console.error("Resolve API error:", e);
    return NextResponse.redirect(callbackUrl);
  }
}
