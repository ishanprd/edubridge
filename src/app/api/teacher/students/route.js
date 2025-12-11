import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Connect } from "@/dbConfig/dbConfig";
import Course from "@/models/courseModel";
import CourseSubscription from "@/models/courseSubscriptionModel";

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

  const courses = await Course.find(
    decoded.role === "admin" ? {} : { createdBy: decoded.id }
  )
    .select("_id title")
    .lean();

  if (!courses.length) {
    return NextResponse.json({ success: true, data: [], total: 0 });
  }

  const courseMap = new Map(courses.map((c) => [String(c._id), c.title || "Course"]));
  const courseIds = [...courseMap.keys()];

  const subs = await CourseSubscription.find({ courseId: { $in: courseIds } })
    .populate({ path: "userId", select: "firstName lastName email role" })
    .sort({ createdAt: -1 })
    .lean();

  const students = subs
    .filter((s) => s.userId)
    .map((s) => ({
      id: String(s.userId._id),
      firstName: s.userId.firstName || "",
      lastName: s.userId.lastName || "",
      email: s.userId.email || "",
      courseId: String(s.courseId),
      courseTitle: courseMap.get(String(s.courseId)) || "Course",
      subscribedAt: s.createdAt,
    }));

  return NextResponse.json({ success: true, data: students, total: students.length });
}
