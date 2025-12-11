import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import CourseRating from "@/models/ratingModel";
import Course from "@/models/courseModel";

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

export async function POST(request) {
  const { error, decoded } = auth(request);
  if (error) return error;

  try {
    const { courseId, rating, review } = await request.json();

    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return NextResponse.json({ message: "Valid courseId is required" }, { status: 400 });
    }

    if (!rating || ![1, 2, 3, 4, 5].includes(rating)) {
      return NextResponse.json({ message: "Rating must be 1, 2, 3, 4, or 5" }, { status: 400 });
    }

    const courseExists = await Course.exists({ _id: courseId });
    if (!courseExists) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const result = await CourseRating.findOneAndUpdate(
      { userId: decoded.id, courseId },
      { rating, review: review || "" },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: "Rating submitted successfully",
      data: result,
    });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { error, decoded } = auth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return NextResponse.json({ message: "Valid courseId is required" }, { status: 400 });
    }

    const deleted = await CourseRating.deleteOne({ userId: decoded.id, courseId });

    if (deleted.deletedCount === 0) {
      return NextResponse.json({ message: "No rating found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Rating deleted" });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const { error, decoded } = auth(request);
  if (error) return error;

  try {
    const { courseId, rating, review } = await request.json();

    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return NextResponse.json({ message: "Valid courseId is required" }, { status: 400 });
    }

    if (!rating || ![1, 2, 3, 4, 5].includes(rating)) {
      return NextResponse.json({ message: "Rating must be 1, 2, 3, 4, or 5" }, { status: 400 });
    }

    const existingRating = await CourseRating.findOne({
      userId: decoded.id,
      courseId
    });

    if (!existingRating) {
      return NextResponse.json({ message: "Rating not found" }, { status: 404 });
    }

    const updated = await CourseRating.findOneAndUpdate(
      { userId: decoded.id, courseId },
      { rating, review: review || "" },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: "Rating updated successfully",
      data: updated,
    });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}