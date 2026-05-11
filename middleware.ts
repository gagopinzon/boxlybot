import { NextRequest, NextResponse } from "next/server";

const encoder = new TextEncoder();

async function sha256(value: string) {
  return crypto.subtle.digest("SHA-256", encoder.encode(value));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}

async function secureCompare(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([sha256(left), sha256(right)]);

  return constantTimeEqual(new Uint8Array(leftHash), new Uint8Array(rightHash));
}

function unauthorized() {
  return new NextResponse("Autenticacion requerida", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="Boxlybot", charset="UTF-8"',
    },
  });
}

function authNotConfigured() {
  return new NextResponse("Autenticacion no configurada", {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function readCredentials(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(header.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) {
      return null;
    }

    return {
      user: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return authNotConfigured();
  }

  const credentials = readCredentials(request);

  if (!credentials) {
    return unauthorized();
  }

  const [userMatches, passwordMatches] = await Promise.all([
    secureCompare(credentials.user, expectedUser),
    secureCompare(credentials.password, expectedPassword),
  ]);

  if (!userMatches || !passwordMatches) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
