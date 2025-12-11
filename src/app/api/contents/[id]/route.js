
import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import mongoose from "mongoose";

import { Connect } from "@/dbConfig/dbConfig";
import { requireAuth } from "@/lib/auth";
import CourseContent from "@/models/contentModel";

function buildWhatToLearnFrom(
  body,
  form
) {
  if (form) {
    const all = form.getAll("whatToLearn");
    if (all.length) {
      return all
        .flatMap((v) => String(v).split(/[,|\n]/g).map((s) => s.trim()))
        .filter(Boolean);
    }
    const txt = String(form.get("whatToLearnText") || "");
    if (txt) {
      return txt
        .split(/[,|\n]/g)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return undefined;
  } else if (body) {
    if (Array.isArray(body.whatToLearn)) {
      return body.whatToLearn
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean);
    }
    if (typeof body.whatToLearnText === "string") {
      return body.whatToLearnText
        .split(/[,|\n]/g)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return undefined;
}

function isFilesPublicPath(url) {
  return !!url && url.startsWith("/files/");
}

async function tryUnlinkPublicFile(pdfUrl) {
  try {
    if (!isFilesPublicPath(pdfUrl)) return;
    const publicDir = path.join(process.cwd(), "public");
    const abs = path.join(publicDir, pdfUrl); 
    await fs.unlink(abs).catch(() => {});
  } catch {}
}

export async function PATCH(req, { params }) {
  await Connect();

  try {
    const user = requireAuth(); 

    const { id } = params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid content id" }, { status: 400 });
    }

    const existing = await CourseContent.findById(id);
    if (!existing) {
      return NextResponse.json({ message: "Content not found" }, { status: 404 });
    }

    if (
      String(existing.createdBy || "") !== String(user.id) &&
      String(user.role || "").toLowerCase() !== "admin"
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const ct = req.headers.get("content-type") || "";
    let updates = {};
    let newPdfUrl= undefined;
    let newPdfName= undefined;
    let replacePdf = false;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();

      const title = String(form.get("title") ?? "").trim();
      const description = String(form.get("description") ?? "").trim();
      const positionRaw = form.get("position");
      const position =
        positionRaw !== null && positionRaw !== undefined && String(positionRaw).trim() !== ""
          ? Number(positionRaw)
          : undefined;

      if (title) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (!Number.isNaN(position) && position !== undefined) updates.position = position;

      const wtl = buildWhatToLearnFrom(null, form);
      if (wtl) updates.whatToLearn = wtl;

      const removePdf = String(form.get("removePdf") || "").toLowerCase() === "true";

      const pdf = form.get("pdf");
      if (removePdf) {
        replacePdf = true;
        newPdfUrl = null;
        newPdfName = "";
      } else if (pdf) {
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

        const original = (pdf.name || "document.pdf").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
        const safeName = `${Date.now()}_${original.endsWith(".pdf") ? original : `${original}.pdf`}`;
        const filePath = path.join(filesDir, safeName);
        const arrayBuffer = await pdf.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(arrayBuffer));

        newPdfUrl = `/files/${safeName}`;
        newPdfName = pdf.name || safeName;
        replacePdf = true;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim();
      if (typeof body.description === "string") updates.description = body.description.trim();

      if (body.position !== undefined && body.position !== null) {
        const num = Number(body.position);
        if (!Number.isNaN(num)) updates.position = num;
      }

      const wtl = buildWhatToLearnFrom(body);
      if (wtl) updates.whatToLearn = wtl;

      if (body.removePdf === true) {
        newPdfUrl = null;
        newPdfName = "";
        replacePdf = true;
      }
    }

    if (replacePdf) {
      if (existing.pdfUrl) {
        await tryUnlinkPublicFile(existing.pdfUrl);
      }
      updates.pdfUrl = newPdfUrl === undefined ? existing.pdfUrl : newPdfUrl;
      updates.pdfName = newPdfName === undefined ? (newPdfUrl === null ? "" : existing.pdfName) : newPdfName;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No changes provided" }, { status: 400 });
    }

    await CourseContent.updateOne({ _id: id }, { $set: updates });
    const updated = await CourseContent.findById(id).lean();

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    const msg = err?.message || "Failed to update content";
    const code = /auth|token|forbidden/i.test(msg) ? 401 : 500;
    return NextResponse.json({ message: msg }, { status: code });
  }
}

export async function DELETE(_req, { params }) {
  await Connect();

  try {
    const user = requireAuth(); 

    const { id } = params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid content id" }, { status: 400 });
    }

    const existing = await CourseContent.findById(id);
    if (!existing) {
      return NextResponse.json({ message: "Content not found" }, { status: 404 });
    }

    if (
      String(existing.createdBy || "") !== String(user.id) &&
      String(user.role || "").toLowerCase() !== "admin"
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await tryUnlinkPublicFile(existing.pdfUrl);

    await CourseContent.deleteOne({ _id: id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const msg = err?.message || "Failed to delete content";
    const code = /auth|token|forbidden/i.test(msg) ? 401 : 500;
    return NextResponse.json({ message: msg }, { status: code });
  }
}
