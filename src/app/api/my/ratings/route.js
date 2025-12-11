
import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import CourseRating from "@/models/ratingModel";
import jwt from "jsonwebtoken";
import "@/models/courseModel";
import "@/models/userModel";
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
    const ratings = await CourseRating.find({ userId: decoded.id }).populate("courseId", "title").lean();
    return NextResponse.json({ success: true, data: ratings });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
