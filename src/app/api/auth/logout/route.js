
import { NextResponse } from "next/server";

export async function POST() {
    
    const res = NextResponse.json({
      message : 'Logout Successful'
    });
    
    res.cookies.set("edutoken", '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return res;
}