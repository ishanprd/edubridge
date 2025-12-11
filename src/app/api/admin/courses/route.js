import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import jwt from "jsonwebtoken";
import Course from "@/models/courseModel";

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
  const q = (searchParams.get("q") || "").trim();
  const createdBy = (searchParams.get("createdBy") || "").trim();

  const filter = {};
  if (q) filter.title = { $regex: q, $options: "i" };
  if (createdBy) filter.createdBy = createdBy;

  const courses = await Course.find(filter)
    .populate({ path: "createdBy", select: "firstName lastName email role" })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, count: courses.length, data: courses });
}
