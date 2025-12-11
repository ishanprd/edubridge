
import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import LiveSession from "@/models/liveSessionModel";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

await Connect();

function auth(request) {
  const token = request.cookies?.get?.("edutoken")?.value;
  if (!token) {
    return { error: NextResponse.json({ message: "Not authenticated" }, { status: 401 }) };
  }
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

  try {
    const liveSessions = await LiveSession.find({ participants: decoded.id })
      .populate("courseId", "title")
      .sort({ startDate: -1 })
      .lean();

    return NextResponse.json({ success: true, data: liveSessions });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
