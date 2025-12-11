import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import Course from "@/models/courseModel";
import jwt from "jsonwebtoken";
import User from "@/models/userModel";


await Connect();

export async function POST(request) {
  try {
    const token = request.cookies.get("edutoken")?.value;
    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, subject, tags, thumbnail } = body;

    if (!title || !subject) {
      return NextResponse.json({ message: "Title and subject are required" }, { status: 400 });
    }

    const course = await Course.create({
      title,
      description,
      subject,
      tags,
      thumbnail,
      createdBy: decoded.id,
    });

    return NextResponse.json({
      message: "Course created successfully",
      success: true,
      data: course,
    });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const createdBy = searchParams.get("createdBy");
  const search = searchParams.get("search");

  const query = {};
  if (createdBy) query.createdBy = createdBy; 
  if (search) query.title = { $regex: search, $options: "i" };

  const docs = await Course.find(query)
  .populate({ path: "createdBy", model: "users", select: "firstName lastName email role" })
  .sort({ createdAt: -1 })
  .lean();

  const courses = docs.map(({ createdBy, ...rest }) => ({
    ...rest,
    user: createdBy,  
  }));

  return NextResponse.json({
    success: true,
    count: courses.length,
    data: courses,
  });
}
