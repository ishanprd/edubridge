
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Connect } from "@/dbConfig/dbConfig";
import LiveSession from "@/models/liveSessionModel";
import User from "@/models/userModel";

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
    const user = await User.findById(uid).lean();
    if (!user) return { error: NextResponse.json({ message: "User not found" }, { status: 404 }) };
    return { user };
  } catch {
    return { error: NextResponse.json({ message: "Invalid or expired token" }, { status: 401 }) };
  }
}

export async function GET(req, { params }) {
  const { error } = await auth(req);
  if (error) return error;

  const courseId = params.id;
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return NextResponse.json({ message: "Invalid courseId" }, { status: 400 });
    }

  const url = new URL(req.url);
  const activeParam = url.searchParams.get("active");
  const match = { courseId };
  if (activeParam === "true") match.isActive = true;
  if (activeParam === "false") match.isActive = false;

  const list = await LiveSession.find(match)
    .sort({ startDate: -1 })
    .populate({ path: "createdBy", select: "firstName lastName email role" })
    .lean();

  return NextResponse.json({ message: "OK", data: { sessions: list } }, { status: 200 });
}

export async function PATCH(req, { params }) {
  const { user, error } = await auth(req);
  if (error) return error;

  if (!["teacher", "admin"].includes(user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const sessionId = params.id;
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return NextResponse.json({ message: "Invalid session id" }, { status: 400 });
  }

  const body = await req.json();
  const allowed = ["title", "description", "isActive", "startDate", "endDate", "courseId", "participants"];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k];

  if ("courseId" in update && !mongoose.Types.ObjectId.isValid(update.courseId)) {
    return NextResponse.json({ message: "Invalid courseId" }, { status: 400 });
  }
  if ("startDate" in update) update.startDate = update.startDate ? new Date(update.startDate) : undefined;
  if ("endDate" in update) update.endDate = update.endDate ? new Date(update.endDate) : null;

  const existing = await LiveSession.findById(sessionId);
  if (!existing) return NextResponse.json({ message: "Session not found" }, { status: 404 });
  if (user.role !== "admin" && String(existing.createdBy) !== String(user._id)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const updated = await LiveSession.findByIdAndUpdate(sessionId, update, { new: true }).lean();
  return NextResponse.json({ message: "Updated", data: { session: updated } }, { status: 200 });
}

export async function DELETE(req, { params }) {
  const { user, error } = await auth(req);
  if (error) return error;

  if (!["teacher", "admin"].includes(user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const sessionId = params.id;
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return NextResponse.json({ message: "Invalid session id" }, { status: 400 });
  }

  const existing = await LiveSession.findById(sessionId);
  if (!existing) return NextResponse.json({ message: "Session not found" }, { status: 404 });
  if (user.role !== "admin" && String(existing.createdBy) !== String(user._id)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await LiveSession.findByIdAndDelete(sessionId);
  return NextResponse.json({ message: "Deleted" }, { status: 200 });
}
