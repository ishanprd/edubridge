
import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Course from "@/models/courseModel";
import CourseRating from "@/models/ratingModel";
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

  const teacherId = new mongoose.Types.ObjectId(decoded.id);

  const [courses, sessions] = await Promise.all([
    Course.find({ createdBy: teacherId }).select("_id title createdAt").lean(),
    LiveSession.find({ createdBy: teacherId })
      .populate("courseId", "title")
      .sort({ startDate: -1 })
      .lean(),
  ]);

  const courseIds = courses.map((c) => c._id);
  const ratings = courseIds.length
    ? await CourseRating.find({ courseId: { $in: courseIds } })
        .populate("courseId", "title")
        .lean()
    : [];

  const totalCourses = courses.length;
  const totalRatings = ratings.length;
  const liveSessionsHosted = sessions.length;
  const avgRating =
    totalRatings > 0
      ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings).toFixed(1)
      : "0.0";

  const activities = [
    ...courses.map((c) => ({
      type: "course_created",
      title: c.title,
      date: c.createdAt,
      id: `c_${c._id}`,
    })),
    ...ratings.map((r) => ({
      type: "rating_received",
      title: r.courseId?.title || "Course",
      rating: r.rating,
      date: r.createdAt,
      id: `r_${r._id}`,
    })),
    ...sessions.map((s) => ({
      type: "session_created",
      title: s.title || s.courseId?.title || "Live Session",
      date: s.startDate || s.createdAt,
      id: `s_${s._id}`,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  return NextResponse.json({
    success: true,
    stats: { totalCourses, totalRatings, liveSessionsHosted, avgRating },
    recentActivities: activities,
  });
}
