import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Connect } from "@/dbConfig/dbConfig";
import CourseSubscription from "@/models/courseSubscriptionModel";
import Course from "@/models/courseModel";

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

export async function GET(request, { params }) {
  const { error, decoded } = auth(request);
  if (error) return error;

  if (!["teacher", "admin"].includes(decoded.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const courseId = params.id;
  if (!mongoose.isValidObjectId(courseId)) {
    return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
  }

  const course = await Course.findById(courseId).select("_id createdBy").lean();
  if (!course) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 });
  }

  if (decoded.role !== "admin" && String(course.createdBy) !== String(decoded.id)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const subs = await CourseSubscription.find({ courseId })
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
      role: s.userId.role || "student",
      subscribedAt: s.createdAt,
    }));

  return NextResponse.json({ success: true, data: students });
}

export async function DELETE(request, { params }) {
  const { error, decoded } = auth(request);
  if (error) return error;

  if (!["teacher", "admin"].includes(decoded.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const courseId = params.id;
  const { userId } = await request.json();

  if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ message: "Invalid courseId or userId" }, { status: 400 });
  }

  const course = await Course.findById(courseId).select("_id createdBy").lean();
  if (!course) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 });
  }

  if (decoded.role !== "admin" && String(course.createdBy) !== String(decoded.id)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const del = await CourseSubscription.deleteOne({ courseId, userId });
  if (del.deletedCount === 0) {
    return NextResponse.json({ success: true, message: "Subscription not found" });
  }

  return NextResponse.json({ success: true, message: "Student removed from course" });
}
