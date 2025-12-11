
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Connect } from "@/dbConfig/dbConfig";
import LiveSession from "@/models/liveSessionModel";
import User from "@/models/userModel";
import { sendBulkLiveSessionEmails } from "@/lib/email/liveSessionEmail";
import CourseSubscription from "@/models/courseSubscriptionModel";
import Course from "@/models/courseModel";

await Connect();

function getToken(req) {
  const c = req.cookies.get("edutoken")?.value;
  if (c) return c;
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7).trim();
  return null;
}

async function auth(req) {
  const token = getToken(req);
  if (!token) return { error: NextResponse.json({ message: "Not authenticated" }, { status: 401 }) };
  if (!process.env.TOKEN_SECRET) return { error: NextResponse.json({ message: "Server misconfigured" }, { status: 500 }) };

  try {
    const payload = jwt.verify(token, process.env.TOKEN_SECRET);
    const uid = payload.id || payload._id;
    if (!uid) return { error: NextResponse.json({ message: "Token missing subject" }, { status: 400 }) };
    const user = await User.findById(uid).lean();
    if (!user) return { error: NextResponse.json({ message: "User not found" }, { status: 404 }) };
    return { user };
  } catch {
    return { error: NextResponse.json({ message: "Invalid or expired token" }, { status: 401 }) };
  }
}


export async function POST(req) {
  try {
    const { user, error } = await auth(req);
    if (error) return error;

    if (!["teacher", "admin"].includes(user.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { roomId, courseId, title, description, isActive, startDate, endDate, participants } = body || {};

    if (!roomId || !courseId || !title) {
      return NextResponse.json({ message: "roomId, courseId, title are required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json({ message: "Invalid courseId" }, { status: 400 });
    }

    const course = await Course.findById(courseId)
      .populate({ path: "createdBy", select: "firstName lastName" })
      .lean();
      
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const doc = await LiveSession.create({
      roomId,
      courseId,
      createdBy: user._id,
      title,
      description: description || "",
      isActive: !!isActive,
      startDate: startDate ? new Date(startDate) : Date.now(),
      endDate: endDate ? new Date(endDate) : null,
      participants: Array.isArray(participants) ? participants : [],
    });

    sendLiveSessionEmailNotifications({
      courseId,
      courseName: course.title,
      sessionTitle: title,
      sessionDescription: description || "",
      startDate: doc.startDate,
      endDate: doc.endDate,
      roomId: doc.roomId,
      teacherName: `${course.createdBy?.firstName || ""} ${course.createdBy?.lastName || ""}`.trim() || "Your Teacher",
    }).catch((error) => {
      console.error("Failed to send live session email notifications:", error);
    });

    return NextResponse.json({ message: "Created", data: { session: doc } }, { status: 201 });
  } catch (e) {
    if (e?.code === 11000) {
      return NextResponse.json({ message: "roomId already exists" }, { status: 409 });
    }
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

async function sendLiveSessionEmailNotifications({
  courseId,
  courseName,
  sessionTitle,
  sessionDescription,
  startDate,
  endDate,
  roomId,
  teacherName,
}) {
  try {
    const subscriptions = await CourseSubscription.find({ courseId })
      .populate({ path: "userId", select: "email firstName" })
      .lean();

    if (subscriptions.length === 0) {
      console.log("No subscribers found for course:", courseId);
      return;
    }

    console.log(`Sending live session emails to ${subscriptions.length} subscribers...`);

    const emailData = subscriptions
      .filter((sub) => sub.userId?.email)
      .map((sub) => ({
        to: sub.userId.email,
        courseName,
        sessionTitle,
        sessionDescription,
        startDate,
        endDate,
        roomId,
        courseId,
        teacherName,
      }));

    const results = await sendBulkLiveSessionEmails(emailData, 10);

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    
    console.log(`Live session email notifications sent: ${successful} successful, ${failed} failed`);
  } catch (error) {
    console.error("Error in sendLiveSessionEmailNotifications:", error);
    throw error;
  }
}
