
import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Course from "@/models/courseModel";
import CourseRating from "@/models/ratingModel";

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

  const teacherCourses = await Course.find({ createdBy: decoded.id })
    .select("_id title")
    .lean();
  const courseIds = teacherCourses.map((c) => c._id);

  if (courseIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: [],
      summary: { totalRatings: 0, avgRating: 0, byCourse: [] },
    });
  }

  const ratings = await CourseRating.find({ courseId: { $in: courseIds } })
    .populate("courseId", "title").populate("userId","firstName lastName email")
    .sort({ createdAt: -1 })
    .lean();

  const byCourseMap = new Map(); 
  for (const r of ratings) {
    const cid = String(r.courseId?._id || r.courseId);
    const title = r.courseId?.title || "Course";
    if (!byCourseMap.has(cid)) byCourseMap.set(cid, { count: 0, sum: 0, title });
    const s = byCourseMap.get(cid);
    s.count += 1;
    s.sum += r.rating || 0;
  }
  const byCourse = Array.from(byCourseMap.entries()).map(([courseId, v]) => ({
    courseId,
    title: v.title,
    count: v.count,
    avgRating: v.count ? (v.sum / v.count).toFixed(1) : "0.0",
  }));

  const totalRatings = ratings.length;
  const totalSum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
  const avgRating = totalRatings ? (totalSum / totalRatings).toFixed(1) : "0.0";

  return NextResponse.json({
    success: true,
    data: ratings,
    summary: { totalRatings, avgRating, byCourse },
  });
}
