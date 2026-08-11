import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isPasswordCorrect,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json(
      { error: "El dashboard no tiene contraseña configurada en el servidor." },
      { status: 500 }
    );
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (typeof password !== "string" || !isPasswordCorrect(password)) {
    // Small delay to blunt rapid-fire guessing from a single client.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json(
      { error: "Contraseña incorrecta" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
