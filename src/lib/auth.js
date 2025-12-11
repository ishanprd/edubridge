
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export function requireAuth() {
  const token = cookies().get("edutoken")?.value;
  if (!token) throw new Error("Not authenticated");
  if (!process.env.TOKEN_SECRET) throw new Error("Server misconfigured");
  try {
    return jwt.verify(token, process.env.TOKEN_SECRET);
  } catch {
    throw new Error("Invalid token");
  }
}
