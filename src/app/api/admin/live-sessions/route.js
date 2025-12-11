import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import jwt from "jsonwebtoken";
import LiveSession from "@/models/liveSessionModel";

await Connect();

function auth(request) {
  const token = request.cookies?.get?.("edutoken")?.value;
  if (!token) return { error: NextResponse.json({ message: "Not authenticated" }, { status: 401 }) };
  try { return { decoded: jwt.verify(token, process.env.TOKEN_SECRET) }; }
  catch { return { error: NextResponse.json({ message: "Invalid token" }, { status: 401 }) }; }
}

export async function GET(request) {
  const { error, decoded } = auth(request);
  if (error) return error;
  if (decoded.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const sessions = await LiveSession.find({})
    .populate("courseId", "title")
    .populate("createdBy", "firstName lastName email role")
    .populate("participants", "firstName lastName email role")
    .sort({ startDate: -1 })
    .lean();

  return NextResponse.json({ success: true, count: sessions.length, data: sessions });
}
