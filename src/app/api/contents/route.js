import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import mongoose from "mongoose";

import { Connect } from "@/dbConfig/dbConfig";
import Course from "@/models/courseModel";
import CourseContent from "@/models/contentModel";
import CourseSubscription from "@/models/courseSubscriptionModel";
import User from "@/models/userModel";
import { requireAuth } from "@/lib/auth";
import { sendBulkEmails } from "@/lib/email";

export async function POST(request) {
  await Connect();

  try {
    const user = requireAuth();

    const formData = await request.formData();
    const courseId = String(formData.get("courseId") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();

    let whatToLearn = [];
    const all = formData.getAll("whatToLearn");
    if (all.length > 0) {
      whatToLearn = all
        .flatMap((v) => String(v).split(/[,|\n]/g).map((s) => s.trim()))
        .filter(Boolean);
    } else {
      const wtlText = String(formData.get("whatToLearnText") || "");
      whatToLearn = wtlText
        .split(/[,|\n]/g)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return NextResponse.json({ message: "Invalid courseId" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 });
    }

    const course = await Course.findById(courseId)
      .populate({ path: "createdBy", select: "firstName lastName" })
      .lean();
      
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const pdf = formData.get("pdf");
    let pdfUrl = null;
    let pdfName = "";

    if (pdf) {
      if (pdf.type !== "application/pdf") {
        return NextResponse.json({ message: "Only PDF files are allowed" }, { status: 400 });
      }
      const MAX_MB = 20;
      if (pdf.size > MAX_MB * 1024 * 1024) {
        return NextResponse.json({ message: `PDF must be <= ${MAX_MB}MB` }, { status: 400 });
      }

      const publicDir = path.join(process.cwd(), "public");
      const filesDir = path.join(publicDir, "files");
      await fs.mkdir(filesDir, { recursive: true });

      const original = (pdf.name || "document.pdf").replace(/\s+/g, "_");
      const base = original.replace(/[^a-zA-Z0-9._-]/g, "");
      const safeName = `${Date.now()}_${base.endsWith(".pdf") ? base : `${base}.pdf`}`;

      const filePath = path.join(filesDir, safeName);
      const arrayBuffer = await pdf.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(arrayBuffer));

      pdfUrl = `/files/${safeName}`;
      pdfName = pdf.name || safeName;
    }

    const created = await CourseContent.create({
      courseId,
      title,
      description,
      whatToLearn,
      pdfUrl,
      pdfName,
      createdBy: user.id,
    });

    sendEmailNotifications({
      courseId,
      courseName: course.title,
      contentTitle: title,
      contentDescription: description,
      teacherName: `${course.createdBy?.firstName || ""} ${course.createdBy?.lastName || ""}`.trim() || "Your Teacher",
    }).catch((error) => {
      console.error("Failed to send email notifications:", error);
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    const msg = err?.message || "Failed to create content";
    const code = /auth|token/i.test(msg) ? 401 : 500;
    return NextResponse.json({ message: msg }, { status: code });
  }
}

async function sendEmailNotifications({
  courseId,
  courseName,
  contentTitle,
  contentDescription,
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

    console.log(`Sending emails to ${subscriptions.length} subscribers...`);

    const emailData = subscriptions
      .filter((sub) => sub.userId?.email) 
      .map((sub) => ({
        to: sub.userId.email,
        courseName,
        contentTitle,
        contentDescription,
        courseId,
        teacherName,
      }));

    const results = await sendBulkEmails(emailData, 10);

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    
    console.log(`Email notifications sent: ${successful} successful, ${failed} failed`);
  } catch (error) {
    console.error("Error in sendEmailNotifications:", error);
    throw error;
  }
}

export async function GET(req) {
  await Connect();

  try {
    const { searchParams } = new URL(req.url);

    const courseId = (searchParams.get("courseId") || "").trim();
    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return NextResponse.json({ message: "Valid courseId is required" }, { status: 400 });
    }

    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);
    const sortParam = (searchParams.get("sort") || "").trim();
    const fields = (searchParams.get("fields") || "").trim();

    const courseExists = await Course.exists({ _id: courseId });
    if (!courseExists) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const filter = { courseId };
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    let sort = { position: 1, createdAt: 1 };
    if (sortParam) {
      sort = {};
      for (const piece of sortParam.split(",")) {
        const [key, dir] = piece.split(":");
        if (key?.trim()) sort[key.trim()] = (dir || "1") === "-1" ? -1 : 1;
      }
    }

    const defaultProjection =
      "courseId title description whatToLearn pdfUrl pdfName position createdBy createdAt updatedAt";
    const projection =
      fields && fields.split(",").map((s) => s.trim()).filter(Boolean).length
        ? fields.split(",").map((s) => s.trim()).filter(Boolean).join(" ")
        : defaultProjection;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      CourseContent.find(filter)
        .select(projection)
        .populate({
          path: "createdBy",
          select: "firstName lastName email role",
          options: { lean: true },
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseContent.countDocuments(filter),
    ]);

    const hasNext = page * limit < total;
    const hasPrev = page > 1;

    return NextResponse.json(
      {
        data: items,
        pagination: {
          page,
          limit,
          total,
          hasNext,
          hasPrev,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: err?.message || "Failed to fetch contents" },
      { status: 500 }
    );
  }
}