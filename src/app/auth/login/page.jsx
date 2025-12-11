"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { handleAxiosError } from "@/lib/utils/clientFunctions";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter()

  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      fetch("/__profile.json")
        .then(r => r.ok ? r.json() : {})
        .then(p => {
          const role = p?.role;
          if (role === "student") router.replace("/student");
          else if (role === "teacher") router.replace("/teacher");
          else if (role === "admin") router.replace("/admin");
        })
        .catch(() => {});
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        "/api/auth/login",
        { email: formData.email.trim(), password: formData.password },
        { withCredentials: true }
      );
      toast.success(response.data.message || 'Logged In Successfully!')
      try {
        const u = response.data?.data?.user;
        const uid = u?.id || u?._id || u?.email;
        const uidHash = btoa(String(uid));

        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "SET_USER", userIdHash: uidHash });
          navigator.serviceWorker.controller.postMessage({
            type: "SET_PROFILE",
            profile: { name: `${u.firstName} ${u.lastName}`, email: u.email, role: u.role }
          });
          navigator.serviceWorker.controller.postMessage({ type: "CACHE_URLS", urls: ["/student"] });
          await new Promise(r => setTimeout(r, 150));
        }


      } catch {  }
      const role = response.data?.data?.user?.role || "student";
      if (role === "student") router.push("/student");
      else if (role === "teacher") router.push("/teacher");
      else if (role === "admin") router.push("/admin");
      else router.push("/");
    } catch (err) {
      handleAxiosError(err)
    } finally {
      setLoading(false);
    }
  };

  const fadeInUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/" className="inline-flex items-center space-x-2 text-2xl font-bold text-primary hover:text-primary/80">
            <BookOpen className="h-8 w-8" />
            <span>EduBridge</span>
          </Link>
          <p className="text-muted-foreground mt-2">Welcome back to your learning journey</p>
        </motion.div>

        <motion.div {...fadeInUp}>
          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/auth/signup" className="text-primary hover:text-primary/80 font-medium">Sign up here</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="mt-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <p className="text-xs text-muted-foreground">By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </motion.div>
      </div>
    </div>
  );
}
