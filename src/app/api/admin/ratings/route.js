import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import jwt from "jsonwebtoken";
import CourseRating from "@/models/ratingModel";

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

  const { searchParams } = new URL(request.url);
  const courseId = (searchParams.get("courseId") || "").trim();

  const filter = {};
  if (courseId) filter.courseId = courseId;

  const ratings = await CourseRating.find(filter)
    .populate("courseId", "title")
    .populate("userId", "firstName lastName email role")
    .sort({ createdAt: -1 })
    .lean();

  const byCourseMap = new Map();
  for (const r of ratings) {
    const cid = String(r.courseId?._id || r.courseId);
    const title = r.courseId?.title || "Course";
    if (!byCourseMap.has(cid)) byCourseMap.set(cid, { title, sum: 0, count: 0 });
    const s = byCourseMap.get(cid);
    s.sum += r.rating || 0;
    s.count += 1;
  }
  const byCourse = Array.from(byCourseMap.entries()).map(([courseId, { title, sum, count }]) => ({
    courseId, title, count, avgRating: count ? (sum / count).toFixed(1) : "0.0",
  }));

  return NextResponse.json({
    success: true,
    count: ratings.length,
    data: ratings,
    summary: {
      totalRatings: ratings.length,
      avgRating: ratings.length ? (ratings.reduce((a, r) => a + (r.rating || 0), 0) / ratings.length).toFixed(1) : "0.0",
      byCourse,
    },
  });
}
