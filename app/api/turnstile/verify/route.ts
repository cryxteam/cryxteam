import { NextRequest, NextResponse } from "next/server";

type TurnstileVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

export async function POST(request: NextRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    return NextResponse.json(
      { success: false, errors: ["missing-secret-server-config"] },
      { status: 500 }
    );
  }

  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    if (typeof body?.token === "string") {
      token = body.token.trim();
    }
  } catch {
    return NextResponse.json(
      { success: false, errors: ["invalid-json-body"] },
      { status: 400 }
    );
  }

  if (!token) {
    return NextResponse.json(
      { success: false, errors: ["missing-input-response"] },
      { status: 400 }
    );
  }

  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const formData = new URLSearchParams();
    formData.set("secret", secret);
    formData.set("response", token);
    if (ip) {
      formData.set("remoteip", ip);
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        cache: "no-store",
      }
    );

    if (!verifyResponse.ok) {
      return NextResponse.json(
        { success: false, errors: [`turnstile-http-${verifyResponse.status}`] },
        { status: 502 }
      );
    }

    const verifyResult = (await verifyResponse.json()) as TurnstileVerifyResponse;
    const success = Boolean(verifyResult.success);

    if (!success) {
      return NextResponse.json(
        { success: false, errors: verifyResult["error-codes"] ?? ["turnstile-failed"] },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, errors: ["turnstile-request-failed"] },
      { status: 502 }
    );
  }
}
