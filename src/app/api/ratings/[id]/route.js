import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import CourseRating from "@/models/ratingModel";

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

export async function GET(request, { params }) {
  const { error, decoded } = auth(request);
  if (error) return error;

  try {
    const { id: courseId } = params;

    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return NextResponse.json({ message: "Valid courseId is required" }, { status: 400 });
    }

    const rating = await CourseRating.findOne({
      userId: decoded.id,
      courseId
    }).lean();

    return NextResponse.json({
      success: true,
      hasRated: Boolean(rating),
      data: rating,
    });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}