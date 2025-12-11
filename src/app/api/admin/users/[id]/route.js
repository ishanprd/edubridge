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

export async function PATCH(request, { params }) {
  const { error, decoded } = auth(request);
  if (error) return error;
  if (decoded.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const id = params?.id;
  if (!id) return NextResponse.json({ message: "User id is required" }, { status: 400 });

  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ message: "password is required" }, { status: 400 });
    }

    const user = await User.findById(id);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const salt = await bcryptjs.genSalt(10);
    user.password = await bcryptjs.hash(password, salt);
    await user.save();

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    return NextResponse.json({ message: err?.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { error, decoded } = auth(request);
  if (error) return error;
  if (decoded.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const id = params?.id;
  if (!id) return NextResponse.json({ message: "User id is required" }, { status: 400 });

  try {
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    if (user._id.toString() === decoded.id) {
      return NextResponse.json({ message: "You cannot delete your own account" }, { status: 400 });
    }

    await user.deleteOne();

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    return NextResponse.json({ message: err?.message || "Failed to delete user" }, { status: 500 });
  }
}
