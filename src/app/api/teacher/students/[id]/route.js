import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { Connect } from "@/dbConfig/dbConfig";
import User from "@/models/userModel";
import CourseSubscription from "@/models/courseSubscriptionModel";

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

export async function DELETE(request, { params }) {
  const { error, decoded } = auth(request);
  if (error) return error;

  if (!["teacher", "admin"].includes(decoded.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const userId = params?.id;
  if (!userId) return NextResponse.json({ message: "User id is required" }, { status: 400 });

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  if (user._id.toString() === decoded.id) {
    return NextResponse.json({ message: "You cannot delete your own account" }, { status: 400 });
  }

  if (decoded.role === "teacher" && user.role !== "student") {
    return NextResponse.json({ message: "Teachers can only delete student accounts" }, { status: 403 });
  }

  await CourseSubscription.deleteMany({ userId: user._id });
  await user.deleteOne();

  return NextResponse.json({ success: true, message: "Student account deleted" });
}
