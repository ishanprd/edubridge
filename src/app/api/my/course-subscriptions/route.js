
import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import CourseSubscription from "@/models/courseSubscriptionModel";
import Course from "@/models/courseModel";
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
    const subscriptions = await CourseSubscription.find({ userId: decoded.id })
      .populate("courseId", "title subject thumbnail description")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: subscriptions });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
