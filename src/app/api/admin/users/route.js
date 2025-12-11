import { NextResponse } from "next/server";
import { Connect } from "@/dbConfig/dbConfig";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import User from "@/models/userModel";

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
  const role = (searchParams.get("role") || "").trim();

  const filter = {};
  if (role) filter.role = role;

  const users = await User.find(filter)
    .select("_id firstName lastName email role createdAt updatedAt")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, count: users.length, data: users });
}

export async function POST(request) {
  const { error, decoded } = auth(request);
  if (error) return error;
  if (decoded.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  try {
    const { firstName, lastName, email, password } = await request.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ message: "firstName, lastName, email, password are required" }, { status: 400 });
    }

    const exists = await User.findOne({ email }).lean();
    if (exists) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "teacher",
    });

    return NextResponse.json({
      success: true,
      message: "Teacher created successfully",
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: err?.message || "Failed to create teacher" }, { status: 500 });
  }
}
