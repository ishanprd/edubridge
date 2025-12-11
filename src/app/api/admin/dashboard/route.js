import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import jwt from "jsonwebtoken";
import User from "@/models/userModel";
import Course from "@/models/courseModel";
import CourseContent from "@/models/contentModel";
import CourseRating from "@/models/ratingModel";
import CourseSubscription from "@/models/courseSubscriptionModel";
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
  if (decoded.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const [
    totalUsers, totalStudents, totalTeachers,
    totalCourses, totalContents, totalRatings,
    totalSubscriptions, totalLiveSessions
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "teacher" }),
    Course.countDocuments({}),
    CourseContent.countDocuments({}),
    CourseRating.countDocuments({}),
    CourseSubscription.countDocuments({}),
    LiveSession.countDocuments({}),
  ]);

  const avgRatingAgg = await CourseRating.aggregate([
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    { $project: { _id: 0, avg: { $ifNull: ["$avg", 0] }, count: 1 } },
  ]);
  const globalAvgRating = avgRatingAgg[0]?.avg ?? 0;

  const topRatedCourses = await CourseRating.aggregate([
    { $group: { _id: "$courseId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    { $match: { count: { $gte: 3 } } },
    { $sort: { avgRating: -1, count: -1 } },
    { $limit: 5 },
    { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } },
    { $unwind: "$course" },
    { $project: { courseId: "$_id", title: "$course.title", avgRating: 1, count: 1, _id: 0 } },
  ]);

  const mostSubscribed = await CourseSubscription.aggregate([
    { $group: { _id: "$courseId", subs: { $sum: 1 } } },
    { $sort: { subs: -1 } },
    { $limit: 5 },
    { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } },
    { $unwind: "$course" },
    { $project: { courseId: "$_id", title: "$course.title", subs: 1, _id: 0 } },
  ]);

  const [recentCourses, recentRatings, recentSessions] = await Promise.all([
    Course.find({}).select("_id title createdAt").sort({ createdAt: -1 }).limit(12).lean(),
    CourseRating.find({}).select("_id rating courseId createdAt").sort({ createdAt: -1 }).limit(12).lean(),
    LiveSession.find({}).select("_id title courseId startDate createdAt").sort({ createdAt: -1 }).limit(12).lean(),
  ]);

  const recentActivities = [
    ...recentCourses.map(c => ({ type: "course_created", title: c.title, date: c.createdAt, id: `c_${c._id}` })),
    ...recentRatings.map(r => ({ type: "rating_received", rating: r.rating, date: r.createdAt, id: `r_${r._id}` })),
    ...recentSessions.map(s => ({ type: "session_created", title: s.title, date: s.startDate || s.createdAt, id: `s_${s._id}` })),
  ]
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 12);

  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - 30);

  const [coursesByDay, usersByDay, ratingsByDay, sessionsByDay, subsByDay] = await Promise.all([
    Course.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    CourseRating.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } }, count: { $sum: 1 }, avg: { $avg: "$rating" } } },
      { $sort: { _id: 1 } },
    ]),
    LiveSession.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    CourseSubscription.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return NextResponse.json({
    success: true,
    stats: {
      totalUsers,
      totalStudents,
      totalTeachers,
      totalCourses,
      totalContents,
      totalRatings,
      totalSubscriptions,
      totalLiveSessions,
      globalAvgRating: Number(globalAvgRating.toFixed ? globalAvgRating.toFixed(2) : globalAvgRating),
    },
    charts: {
      coursesByDay,
      usersByDay,
      ratingsByDay,
      sessionsByDay,
      subsByDay,
      topRatedCourses,
      mostSubscribed,
    },
    recentActivities,
  });
}
