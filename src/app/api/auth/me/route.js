
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { Connect } from "@/dbConfig/dbConfig";
import User from "@/models/userModel";

await Connect();

function getToken(req) {
  const cookieToken = req.cookies.get("edutoken")?.value;
  if (cookieToken) return cookieToken;

  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  return null;
}

export async function GET(req) {
  try {
    const token = getToken(req);
    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    if (!process.env.TOKEN_SECRET) {
      return NextResponse.json({ message: "Server misconfigured" }, { status: 500 });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.TOKEN_SECRET);
    } catch {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
    }

    const id = payload.id || payload._id || null;
    const email = payload.email || null;

    if (!id && !email) {
      return NextResponse.json({ message: "Token missing subject" }, { status: 400 });
    }

    const query = id ? { _id: id } : { email };
    const userDoc = await User.findOne(query).lean();

    if (!userDoc) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { password, forgotPasswordToken, forgotPasswordTokenExpiry, ...safe } = userDoc;

    return NextResponse.json(
      {
        message: "OK",
        data: {
          user: safe, 
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
