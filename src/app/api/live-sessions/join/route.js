
import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import LiveSession from "@/models/liveSessionModel";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

await Connect();

function getToken(req) {
  const c = req.cookies.get("edutoken")?.value;
  if (c) return c;
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7).trim();
  return null;
}

async function auth(req) {
  const token = getToken(req);
  if (!token) return { error: NextResponse.json({ message: "Not authenticated" }, { status: 401 }) };
  if (!process.env.TOKEN_SECRET) return { error: NextResponse.json({ message: "Server misconfigured" }, { status: 500 }) };

  try {
    const payload = jwt.verify(token, process.env.TOKEN_SECRET);
    const uid = payload.id || payload._id;
    if (!uid) return { error: NextResponse.json({ message: "Token missing subject" }, { status: 400 }) };
    return { userId: uid };
  } catch {
    return { error: NextResponse.json({ message: "Invalid or expired token" }, { status: 401 }) };
  }
}

export async function POST(req) {
  const { error, userId } = await auth(req);
  if (error) return error;

  try {
    const { sessionId } = await req.json();

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json({ message: "Invalid sessionId" }, { status: 400 });
    }

    const session = await LiveSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    if (session.participants.includes(userId)) {
      return NextResponse.json({ message: "You are already a participant in this session", data: session }, { status: 200 });
    }

    session.participants.push(userId);
    await session.save();

    return NextResponse.json({ message: "Successfully joined the session", data: session }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ message: err.message || "Failed to join session" }, { status: 500 });
  }
}
