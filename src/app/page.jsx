"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Users, Download, Palette, Globe } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const [isOnline, setIsOnline] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const redirectIfAuthenticated = async () => {
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const profileRes = await fetch("/__profile.json").catch(() => null)
          if (!profileRes?.ok) return
          const profile = await profileRes.json()
          if (cancelled) return
          const role = profile?.role
          if (!role) return
          const target = role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/student"
          router.replace(target)
          return
        }

        const res = await fetch("/api/auth/me", { credentials: "include" })
        if (!res.ok) return
        const body = await res.json()
        if (cancelled) return
        const role = body?.data?.user?.role
        if (!role) return
        const target = role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/student"
        router.replace(target)
      } catch {
        // best-effort redirect; ignore failures
      }
    }

    redirectIfAuthenticated()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  }

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const features = [
    {
      icon: Download,
      title: "Offline Access",
      description: "Study without internet connectivity",
    },
    {
      icon: Palette,
      title: "Interactive Whiteboard",
      description: "Collaborative learning with real-time drawing and sharing",
    },
    {
      icon: Users,
      title: "Teacher-Student Collaboration",
      description: "Direct communication and feedback between educators and learners",
    },
    {
      icon: Globe,
      title: "Community-Driven",
      description: "Built by and for Nepal's rural education community",
    },
  ]

  const stats = [
    { number: "500+", label: "Students Enrolled" },
    { number: "50+", label: "Expert Teachers" },
    { number: "25+", label: "Courses Available" },
    { number: "15+", label: "Rural Districts Served" },
  ]

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      <nav className="fixed w-full z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2"
            >
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">EduBridge</span>
            </motion.div>
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  className="flex items-center space-x-4"
>
  {isOnline ? (
    <>
      <Button
        asChild
        variant="outline"
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
      >
        <Link href="/auth/login">Login</Link>
      </Button>
      <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Link href="/auth/signup">Sign Up</Link>
      </Button>
    </>
  ) : (
    <button
  onClick={() => window.location.assign('/offline-content')}
  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
>
  Offline Content
</button>

  )}
</motion.div>
          </div>
        </div>
      </nav>

    <section className="relative h-screen flex items-center justify-center">
  <img
    src="/main.jpg"
    alt="Background"
    className="absolute inset-0 w-full h-full object-cover"
  />
  <div className="absolute inset-0 bg-black/50"></div>

  <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
    <motion.div
      className="text-center max-w-4xl mx-auto text-white"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
        Empowering Rural Education in Nepal
      </Badge>

      <h1 className="text-4xl md:text-6xl  mb-6 text-balance">
        Bridging the Educational Gap Through <span className="text-balance font-extrabold">ICT Innovation</span>
      </h1>

      <p className="text-xl mb-8 max-w-2xl mx-auto text-pretty">
        Connecting rural communities with quality education through offline-capable courses, interactive
        whiteboards, and collaborative learning experiences.
      </p>

    </motion.div>
  </div>
</section>


      <section id="about" className="py-20 bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Designed for Rural Nepal</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform addresses the unique challenges of rural education with innovative solutions
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full border-border hover:shadow-lg transition-shadow duration-300 bg-card">
                  <CardHeader className="text-center">
                    <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle className="text-card-foreground">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="impact" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Our Impact</h2>
            <p className="text-lg text-muted-foreground">Making a difference in rural education across Nepal</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div key={index} className="text-center" variants={fadeInUp}>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center max-w-3xl mx-auto" {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
              Ready to Transform Education?
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-8">
              Join thousands of students and teachers already using EduBridge to create better learning experiences in
              rural Nepal.
            </p>
            <div className="flex flex-col items-center justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90 px-8"
              >
                <Link href="/auth/signup">Start Learning Today</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold text-foreground">EduBridge</span>
            </div>
            <div className="text-muted-foreground text-sm">© 2025 EduBridge. Empowering rural education in Nepal.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
