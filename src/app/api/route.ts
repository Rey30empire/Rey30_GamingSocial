import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "REY30VERSE",
    status: "online",
    scope: "social-gaming-platform",
    timestamp: new Date().toISOString(),
  });
}
