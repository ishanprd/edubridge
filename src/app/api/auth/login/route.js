import { Connect } from '@/dbConfig/dbConfig';
import User from '@/models/userModel';
import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

await Connect();

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: "email and password required" }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) return NextResponse.json({ message: "User does not exist" }, { status: 400 });

    const ok = await bcryptjs.compare(password, user.password);
    if (!ok) return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });

    if (!process.env.TOKEN_SECRET) {
      return NextResponse.json({ message: "Server misconfigured" }, { status: 500 });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      process.env.TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    const res = NextResponse.json({
      message: "Logged in successfully",
      success: true,
      data: {
        token,
        user:{ id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }
      }
    });

    res.cookies.set("edutoken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
