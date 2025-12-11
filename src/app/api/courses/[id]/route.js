import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import Course from "@/models/courseModel";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

await Connect();

function auth(request) {
  const token = request.cookies.get("edutoken")?.value;
  if (!token) return { error: NextResponse.json({ message: "Not authenticated" }, { status: 401 }) };
  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    return { decoded };
  } catch {
    return { error: NextResponse.json({ message: "Invalid token" }, { status: 401 }) };
  }
}

export async function GET(request, { params }) {
  const { error } = auth(request);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
  }

  const course = await Course.findById(id)
    .populate({ path: "createdBy", model: "users", select: "firstName lastName email role" })
    .lean();

  if (!course) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: course });
}


export async function PATCH(request, { params }) {
  const { error, decoded } = auth(request);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
  }

  const body = await request.json();
  const update = {};
  if (body.title !== undefined) update.title = body.title;
  if (body.description !== undefined) update.description = body.description;
  if (body.subject !== undefined) update.subject = body.subject;
  if (body.tags !== undefined) update.tags = body.tags;
  if (body.thumbnail !== undefined) update.thumbnail = body.thumbnail;

  const course = await Course.findById(id);
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 });

  if (course.createdBy.toString() !== decoded.id && decoded.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const updated = await Course.findByIdAndUpdate(id, update, { new: true })
    .populate({ path: "createdBy", model: "users", select: "firstName lastName email role" })
    .lean();

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request, { params }) {
  const { error, decoded } = auth(request);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
  }

  const course = await Course.findById(id);
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 });

  if (course.createdBy.toString() !== decoded.id && decoded.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await course.deleteOne();
  return NextResponse.json({ success: true, message: "Course deleted" });
}
