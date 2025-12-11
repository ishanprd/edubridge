import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import CourseSubscription from "@/models/courseSubscriptionModel";
import Course from "@/models/courseModel";

await Connect();

function auth(request) {
  const token = (request).cookies?.get?.("edutoken")?.value;
  if (!token) return { error: NextResponse.json({ message: "Not authenticated" }, { status: 401 }) };
  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    return { decoded };
  } catch {
    return { error: NextResponse.json({ message: "Invalid token" }, { status: 401 }) };
  }
}

export async function POST(request) {
  const { error, decoded } = auth(request);
  if (error) return error;

  const { courseId } = await request.json();
  if (!courseId || !mongoose.isValidObjectId(courseId)) {
    return NextResponse.json({ message: "Valid courseId is required" }, { status: 400 });
  }

  const courseExists = await Course.exists({ _id: courseId });
  if (!courseExists) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 });
  }

  const result = await CourseSubscription.updateOne(
    { userId: decoded.id, courseId },
    { $setOnInsert: { userId: decoded.id, courseId } },
    { upsert: true }
  );

  const doc = await CourseSubscription.findOne({ userId: decoded.id, courseId }).lean();

  const created = (result).upsertedCount === 1 || (result).upsertedId;
  return NextResponse.json({
    success: true,
    message: created ? "Subscribed" : "Already subscribed",
    data: doc,
  });
}

export async function DELETE(request) {
  const { error, decoded } = auth(request);
  if (error) return error;

  const { courseId } = await request.json();
  if (!courseId || !mongoose.isValidObjectId(courseId)) {
    return NextResponse.json({ message: "Valid courseId is required" }, { status: 400 });
  }

  const del = await CourseSubscription.deleteOne({ userId: decoded.id, courseId });
  if (del.deletedCount === 0) {
    return NextResponse.json({ success: true, message: "No subscription found to delete" });
  }

  return NextResponse.json({ success: true, message: "Unsubscribed" });
}

export async function GET(request) {
  const { error, decoded } = auth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");

  if (courseId) {
    if (!mongoose.isValidObjectId(courseId)) {
      return NextResponse.json({ message: "Invalid courseId" }, { status: 400 });
    }
    const exists = await CourseSubscription.exists({ userId: decoded.id, courseId });
    return NextResponse.json({
      success: true,
      subscribed: Boolean(exists),
    });
  }

  const list = await CourseSubscription.find({ userId: decoded.id })
    .populate({ path: "courseId", model: "courses", select: "title subject thumbnail" })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    count: list.length,
    data: list,
  });
}
