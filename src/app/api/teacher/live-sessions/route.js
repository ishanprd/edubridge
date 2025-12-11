
import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import LiveSession from "@/models/liveSessionModel";

await Connect();

function auth(request) {
  const token = request.cookies?.get?.("edutoken")?.value;
  if (!token) return { error: NextResponse.json({ message: "Not authenticated" }, { status: 401 }) };
  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    return { decoded };
  } catch {
    return { error: NextResponse.json({ message: "Invalid token" }, { status: 401 }) };
  }
}

export async function GET(request) {
  const { error, decoded } = auth(request);
  if (error) return error;

  if (!["teacher", "admin"].includes(decoded.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeParam = searchParams.get("active");

  const match = { createdBy: new mongoose.Types.ObjectId(decoded.id) };
  if (activeParam === "true") match.isActive = true;
  if (activeParam === "false") match.isActive = false;

  const sessions = await LiveSession.find(match)
    .populate("courseId", "title").populate("participants", "firstName lastName email")
    .sort({ startDate: -1 })
    .lean();

  return NextResponse.json({ success: true, data: sessions });
}
