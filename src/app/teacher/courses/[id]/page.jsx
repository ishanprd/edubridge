"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import axios from "axios"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"
import { Video, Clock, Users, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Plus, Edit, Trash2, FileText, BookOpen, User, Calendar, Tag, CheckCircle2, Upload, X } from "lucide-react"
import { handleAxiosError } from "@/lib/utils/clientFunctions"
import CustomAlertDialog from "@/components/common/CustomAlertDialog"
import Link from "next/link"

export default function CourseViewPage() {
  const { id } = useParams()
  const courseId = useMemo(() => (Array.isArray(id) ? id[0] : id), [id])

  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState(null)
    const [openDeleteModal,setOpenDeleteModal] = useState(false)

  const [deleteId,setDeleteId] = useState(null)
  const [contents, setContents] = useState([])

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    courseId: "",
    title: "",
    description: "",
    whatToLearnText: "",
    pdf: null,
    pdfName: "",
  })
  const [liveSessions, setLiveSessions] = useState([])
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [sessionForm, setSessionForm] = useState({
    roomId: "",
    title: "",
    description: "",
    startDate: "",
    isActive: false,
  })
  const [endingSession, setEndingSession] = useState(false)
  const [deleteSessionId, setDeleteSessionId] = useState(null)
  const [openDeleteSessionModal, setOpenDeleteSessionModal] = useState(false)
  const [enrolledStudents, setEnrolledStudents] = useState([])
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false)

  const fetchLiveSessions = async (cid) => {
  try {
    const { data } = await axios.get(`/api/live-sessions/${cid}`, {
      withCredentials: true,
    })
    const sessions = Array.isArray(data?.data?.sessions) ? data.data.sessions : []
    setLiveSessions(sessions)
  } catch (err) {
    setLiveSessions([])
    handleAxiosError(err)
  }
}

  const fetchEnrolledStudents = async (cid) => {
    try {
      const { data } = await axios.get(`/api/teacher/courses/${cid}/students`, {
        withCredentials: true,
      })
      const list = Array.isArray(data?.data) ? data.data : []
      setEnrolledStudents(list)
    } catch (err) {
      setEnrolledStudents([])
      handleAxiosError(err)
    }
  }

  const fetchContents = async (cid) => {
  try {
    const { data } = await axios.get("/api/contents", {
      params: { courseId: cid, sort: "position,createdAt" },
      withCredentials: true,
    })
    const items = Array.isArray(data?.data) ? data.data : []
    const normalized = items.map((it) => ({
      id: it.id || it._id,
      courseId: String(it.courseId || cid || ""),
      title: it.title ?? "",
      description: it.description ?? "",
      whatToLearn: Array.isArray(it.whatToLearn) ? it.whatToLearn : [],
      pdf: it.pdfUrl || null,
      pdfName: it.pdfName || "",
    }))
    setContents(normalized)
  } catch (err) {
    setContents([])
    handleAxiosError(err)
  }
}

useEffect(() => {
  const fetchCourse = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/courses/${courseId}`, { withCredentials: true })
      setCourse(data?.data || null)
      await Promise.all([
        fetchContents(courseId),
        fetchLiveSessions(courseId),
        fetchEnrolledStudents(courseId)
      ])
    } catch (err) {
      handleAxiosError(err)
    } finally {
      setLoading(false)
    }
  }
  if (courseId) fetchCourse()
}, [courseId])

  const openStudentsDialog = () => {
    if (courseId) {
      fetchEnrolledStudents(courseId)
    }
    setStudentsDialogOpen(true)
  }

  const startAdd = () => {
    setEditingId(null)
    setForm({
      courseId: courseId || "",
      title: "",
      description: "",
      whatToLearnText: "",
      pdf: null,
      pdfName: "",
    })
    setOpen(true)
  }

const startEdit = (c) => {
  setEditingId(c.id)
  setForm({
    courseId: c.courseId || courseId || "",
    title: c.title || "",
    description: c.description || "",
    whatToLearnText: (c.whatToLearn || []).join(", "),
    pdf: null, 
    pdfName: c.pdfName || "", 
  })
  setOpen(true)
}


  const handlePdfChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== "application/pdf") {
      toast.error("Please upload a PDF file.")
      return
    }
    setForm((s) => ({ ...s, pdf: f, pdfName: f.name }))
  }

  const handleSave = async (e) => {
  e.preventDefault()
  setSubmitting(true)
  try {
    const parts = form.whatToLearnText
      .split(/[,|\n]/g)
      .map((t) => t.trim())
      .filter(Boolean)

    if (!form.title.trim()) {
      toast.error("Title is required")
      setSubmitting(false)
      return
    }

    if (editingId) {
      const fd = new FormData()
      fd.append("title", form.title.trim())
      fd.append("description", form.description.trim())
      if (parts.length) fd.append("whatToLearnText", parts.join("\n"))

      const isFile = typeof File !== "undefined" && form.pdf instanceof File
      if (isFile) {
        fd.append("pdf", form.pdf)
      } else {
        if (!form.pdf && form.pdfName === "") {
          fd.append("removePdf", "true")
        }
      }

      const { data } = await axios.patch(`/api/contents/${editingId}`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      })

      const updated = data?.data || {}
      setContents((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                title: updated.title ?? form.title.trim(),
                description: updated.description ?? form.description.trim(),
                whatToLearn: Array.isArray(updated.whatToLearn)
                  ? updated.whatToLearn
                  : parts,
                pdf: updated.pdfUrl ?? (isFile ? c.pdf : null),
                pdfName:
                  typeof updated.pdfName === "string"
                    ? updated.pdfName
                    : isFile
                      ? form.pdfName
                      : "",
              }
            : c
        )
      )
      toast.success("Content updated")
      setOpen(false)
    } else {
      const fd = new FormData()
      fd.append("courseId", form.courseId)
      fd.append("title", form.title.trim())
      fd.append("description", form.description.trim())
      if (parts.length) fd.append("whatToLearnText", parts.join("\n"))
      if (form.pdf) fd.append("pdf", form.pdf)

      const { data } = await axios.post("/api/contents", fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      })

      const created = data?.data || {}
      const newItem = {
        id: created.id || created._id || crypto.randomUUID(),
        courseId: String(created.courseId || form.courseId),
        title: created.title ?? form.title.trim(),
        description: created.description ?? form.description.trim(),
        whatToLearn: Array.isArray(created.whatToLearn) ? created.whatToLearn : parts,
        pdf: created.pdfUrl || null,
        pdfName: created.pdfName || form.pdfName,
      }

      setContents((prev) => [newItem, ...prev])
      toast.success("Content added")
      setOpen(false)
    }
  } catch (err) {
    handleAxiosError(err)
  } finally {
    setSubmitting(false)
  }
}

const deleteContent = async () => {
  try {
    await axios.delete(`/api/contents/${deleteId}`, { withCredentials: true })
    setContents((prev) => prev.filter((c) => c.id !== deleteId))
    toast.success("Content deleted")
    setOpenDeleteModal(false);
    setDeleteId(null);
  } catch (err) {
    handleAxiosError(err)
  }
}

const startAddSession = () => {
  setEditingSessionId(null)
  setSessionForm({
    roomId: `room-${Date.now()}`,
    title: "",
    description: "",
    startDate: "",
    isActive: false,
  })
  setSessionDialogOpen(true)
}

const startEditSession = (session) => {
  setEditingSessionId(session._id)
  setSessionForm({
    roomId: session.roomId || "",
    title: session.title || "",
    description: session.description || "",
    startDate: session.startDate ? new Date(session.startDate).toISOString().slice(0, 16) : "",
    isActive: session.isActive || false,
  })
  setSessionDialogOpen(true)
}

const handleSaveSession = async (e) => {
  e.preventDefault()
  setSubmitting(true)
  try {
    if (!sessionForm.title.trim()) {
      toast.error("Title is required")
      setSubmitting(false)
      return
    }

    if (editingSessionId) {
      const { data } = await axios.patch(
        `/api/live-sessions/${editingSessionId}`,
        {
          title: sessionForm.title.trim(),
          description: sessionForm.description.trim(),
          startDate: sessionForm.startDate || undefined,
          isActive: sessionForm.isActive,
        },
        { withCredentials: true }
      )
      
      setLiveSessions((prev) =>
        prev.map((s) => (s._id === editingSessionId ? data.data.session : s))
      )
      toast.success("Session updated")
    } else {
      const { data } = await axios.post(
        "/api/live-sessions",
        {
          roomId: sessionForm.roomId,
          courseId: courseId,
          title: sessionForm.title.trim(),
          description: sessionForm.description.trim(),
          startDate: sessionForm.startDate || undefined,
          isActive: sessionForm.isActive,
        },
        { withCredentials: true }
      )
      
      setLiveSessions((prev) => [data.data.session, ...prev])
      toast.success("Session created")
    }
    setSessionDialogOpen(false)
  } catch (err) {
    handleAxiosError(err)
  } finally {
    setSubmitting(false)
  }
}

const handleEndSession = async () => {
  if (!editingSessionId) return
  setEndingSession(true)
  try {
    const now = new Date().toISOString()
    const { data } = await axios.patch(
      `/api/live-sessions/${editingSessionId}`,
      { isActive: false, endDate: now },
      { withCredentials: true }
    )
    const updated = data?.data?.session
    if (updated) {
      setLiveSessions((prev) => prev.map((s) => (s._id === editingSessionId ? updated : s)))
    }
    toast.success("Session ended")
    setSessionDialogOpen(false)
  } catch (err) {
    handleAxiosError(err)
  } finally {
    setEndingSession(false)
  }
}

const deleteSession = async () => {
  try {
    await axios.delete(`/api/live-sessions/${deleteSessionId}`, { withCredentials: true })
    setLiveSessions((prev) => prev.filter((s) => s._id !== deleteSessionId))
    toast.success("Session deleted")
    setOpenDeleteSessionModal(false)
    setDeleteSessionId(null)
  } catch (err) {
    handleAxiosError(err)
  }
}

const getSessionStatus = (session) => {
  const now = new Date()
  const start = new Date(session.startDate)
  const end = session.endDate ? new Date(session.endDate) : null
  
  if (end && now > end) return "past"
  if (now >= start && (!end || now <= end)) return "live"
  return "upcoming"
}


  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  }

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div 
          {...fadeInUp} 
          className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-primary/10"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-primary/10 backdrop-blur-sm">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Course Management</h1>
                <p className="text-muted-foreground">Manage your course content and materials</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-0" />
        </motion.div>

        <motion.div {...fadeInUp} className="mb-10">
          <div className="flex justify-end mb-3">
            <Button variant="outline" onClick={openStudentsDialog}>
              View Enrolled Students
            </Button>
          </div>
          <Card className="border-border overflow-hidden group transition-all duration-500">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-4 text-muted-foreground">Loading course details...</p>
              </div>
            ) : (
              <>
                <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
                  {course?.thumbnail && (
                    <img
                      src={course.thumbnail}
                      alt={course?.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                  
                  <div className="absolute bottom-6 left-8 right-8">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-3xl font-bold text-foreground mb-2 drop-shadow-sm">
                          {course?.title || "Course"}
                        </h2>
                        {course?.subject && (
                          <Badge variant="secondary" className="text-sm px-3 py-1">
                            <Tag className="h-3 w-3 mr-1" />
                            {course.subject}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="p-8">
                  <div className="grid lg:grid-cols-[300px,1fr] gap-8">
                    <div className="space-y-6">
                      <div className="relative group/img">
                        {course?.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course?.title}
                            className="w-full aspect-video object-cover rounded-xl border-2 border-border shadow-lg group-hover/img:shadow-xl transition-all"
                          />
                        ) : (
                          <div className="w-full aspect-video rounded-xl border-2 border-dashed border-border flex items-center justify-center text-sm text-muted-foreground bg-muted/30">
                            <div className="text-center p-4">
                              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-20" />
                              <p>No thumbnail</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {course?.user && (
                          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Instructor</p>
                                <p className="font-semibold text-foreground truncate">
                                  {course.user.firstName} {course.user.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{course.user.email}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Timeline</p>
                              <p className="text-xs text-foreground">
                                <span className="font-medium">Created:</span> {new Date(course?.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="text-xs text-foreground mt-1">
                                <span className="font-medium">Updated:</span> {new Date(course?.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-primary" />
                          Description
                        </h3>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                          {course?.description || "No description available for this course."}
                        </p>
                      </div>

                      {Array.isArray(course?.tags) && course.tags.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-primary" />
                            Tags
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {course.tags.map((t, i) => (
                              <Badge key={`tag-${i}`} variant="outline" className="px-3 py-1 text-sm">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-border">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-4 rounded-lg bg-primary/5">
                            <p className="text-2xl font-bold text-primary">{contents.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">Content Modules</p>
                          </div>
                          <div className="p-4 rounded-lg bg-primary/5">
                            <p className="text-2xl font-bold text-primary">
                              {contents.reduce((acc, c) => acc + (c.whatToLearn?.length || 0), 0)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Learning Points</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </motion.div>

        <motion.div {...fadeInUp} className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <div className="h-8 w-1 bg-primary rounded-full" />
                Live Sessions
              </h2>
              <p className="text-muted-foreground mt-1 ml-7">Schedule and manage live classroom sessions</p>
            </div>

            <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={startAddSession} 
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Session
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl">
                    {editingSessionId ? "Edit Live Session" : "Create Live Session"}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    {editingSessionId 
                      ? "Update the live session details." 
                      : "Schedule a new live session for your course."}
                  </DialogDescription>
                </DialogHeader>

                <form className="space-y-6 mt-4" onSubmit={handleSaveSession}>
                  <div className="space-y-2">
                    <Label htmlFor="session-title" className="text-sm font-semibold">Session Title *</Label>
                    <Input
                      id="session-title"
                      placeholder="e.g., Week 1 Live Q&A"
                      value={sessionForm.title}
                      onChange={(e) => setSessionForm((s) => ({ ...s, title: e.target.value }))}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session-description" className="text-sm font-semibold">Description</Label>
                    <Textarea
                      id="session-description"
                      placeholder="Describe what will be covered in this session..."
                      rows={3}
                      value={sessionForm.description}
                      onChange={(e) => setSessionForm((s) => ({ ...s, description: e.target.value }))}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-start" className="text-sm font-semibold">Start Date & Time</Label>
                      <Input
                        id="session-start"
                        type="datetime-local"
                        value={sessionForm.startDate}
                        onChange={(e) => setSessionForm((s) => ({ ...s, startDate: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="session-active"
                      checked={sessionForm.isActive}
                      onChange={(e) => setSessionForm((s) => ({ ...s, isActive: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="session-active" className="text-sm font-medium">
                      Mark as active session
                    </Label>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    {editingSessionId && (
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={endingSession}
                        onClick={handleEndSession}
                        className="h-11"
                      >
                        {endingSession ? "Ending..." : "End Session"}
                      </Button>
                    )}
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSessionDialogOpen(false)}
                        className="h-11"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting} className="h-11 min-w-[140px]">
                        {submitting 
                          ? (editingSessionId ? "Saving…" : "Creating…") 
                          : (editingSessionId ? "Save Changes" : "Create Session")}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <AnimatePresence mode="popLayout">
            {liveSessions.length === 0 ? (
              <motion.div key="empty-sessions" {...cardVariants} transition={{ duration: 0.3 }}>
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <div className="rounded-full bg-primary/10 p-8 mb-6">
                      <Video className="h-16 w-16 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No live sessions scheduled</h3>
                    <p className="text-muted-foreground mb-8 text-center max-w-md">
                      Create your first live session to interact with students in real-time.
                    </p>
                    <Button onClick={startAddSession} size="lg">
                      <Plus className="h-5 w-5 mr-2" />
                      Schedule First Session
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div className="space-y-4" variants={staggerContainer} initial="initial" animate="animate">
                {liveSessions
                  .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
                  .map((session) => {
                    const status = getSessionStatus(session)
                    return (
                      <motion.div key={session._id} variants={cardVariants} transition={{ duration: 0.3 }} layout>
                        <Card className="border-border hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row gap-6">
                              <div className="lg:w-24 flex lg:flex-col items-center lg:items-start gap-3 lg:gap-2">
                                {status === "live" && (
                                  <Badge className="bg-green-500 text-white">
                                    <div className="h-2 w-2 bg-white rounded-full mr-2 animate-pulse" />
                                    Live Now
                                  </Badge>
                                )}
                                {status === "upcoming" && (
                                  <Badge variant="secondary">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Upcoming
                                  </Badge>
                                )}
                                {status === "past" && (
                                  <Badge variant="outline">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Past
                                  </Badge>
                                )}
                              </div>

                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <div className="flex-1">
                                    <h3 className="text-xl font-bold text-foreground mb-2">{session.title}</h3>
                                    <p className="text-muted-foreground text-sm">{session.description || "No description"}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    {(status === "live" || status === "upcoming") && (
                                      <Link href={`/live-session/${session.roomId}`}>
                                        <Button size="sm" className="bg-green-500 hover:bg-green-600">
                                          <Video className="h-4 w-4 mr-1.5" /> Join
                                        </Button>
                                      </Link>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => startEditSession(session)}
                                    >
                                      <Edit className="h-4 w-4 mr-1.5" /> Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setDeleteSessionId(session._id)
                                        setOpenDeleteSessionModal(true)
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                      {new Date(session.startDate).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                  {session.endDate && (
                                    <div className="flex items-center gap-2">
                                      <span>→</span>
                                      <span>
                                        {new Date(session.endDate).toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                  )}
                                  {session.participants?.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      <span>{session.participants.length} participants</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div {...fadeInUp} className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <div className="h-8 w-1 bg-primary rounded-full" />
                Course Content
              </h2>
              <p className="text-muted-foreground mt-1 ml-7">Manage your learning modules and materials</p>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={startAdd} 
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Content
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl">{editingId ? "Edit Content" : "Add New Content"}</DialogTitle>
                  <DialogDescription className="text-base">
                    {editingId ? "Update this content module with new information." : "Create a new learning module for your course."}
                  </DialogDescription>
                </DialogHeader>

                <form className="space-y-6 mt-4" onSubmit={handleSave}>
                  <div className="space-y-2">
                    <Label htmlFor="courseId" className="text-sm font-semibold">Course ID</Label>
                    <Input 
                      id="courseId" 
                      value={form.courseId} 
                      readOnly 
                      className="bg-muted/50 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold">Module Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Introduction to ..."
                      value={form.title}
                      onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this module covers..."
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatToLearn" className="text-sm font-semibold">Learning Outcomes</Label>
                    <Textarea
                      id="whatToLearn"
                      placeholder="Enter learning outcomes (one per line or comma-separated)"
                      rows={4}
                      value={form.whatToLearnText}
                      onChange={(e) => setForm((s) => ({ ...s, whatToLearnText: e.target.value }))}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">Separate multiple items with commas or new lines</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pdf" className="text-sm font-semibold">Course Material (PDF)</Label>
                    <div className="relative">
                      <Input
                        id="pdf"
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfChange}
                        className="h-11 cursor-pointer"
                      />
                    </div>
                    {form.pdfName && (
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{form.pdfName}</p>
                          <p className="text-xs text-muted-foreground">PDF document attached</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setForm(s => ({ ...s, pdf: null, pdfName: "" }))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      className="h-11"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="h-11 min-w-[140px]">
                      {submitting ? (editingId ? "Saving…" : "Adding…") : (editingId ? "Save Changes" : "Add Content")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <AnimatePresence mode="popLayout">
            {contents.length === 0 ? (
              <motion.div
                key="empty"
                {...cardVariants}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <div className="rounded-full bg-primary/10 p-8 mb-6">
                      <BookOpen className="h-16 w-16 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No content modules yet</h3>
                    <p className="text-muted-foreground mb-8 text-center max-w-md">
                      Start building your course by adding your first content module. Each module can include learning outcomes and PDF materials.
                    </p>
                    <Button onClick={startAdd} size="lg">
                      <Plus className="h-5 w-5 mr-2" />
                      Create First Module
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div 
                className="space-y-4"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {contents.map((c, index) => (
                  <motion.div
                    key={c.id}
                    variants={cardVariants}
                    transition={{ duration: 0.3 }}
                    layout
                  >
                    <Card className="border-border hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden group">
                      <CardContent className="p-0">
                        <div className="flex flex-col lg:flex-row">
                          <div className="lg:w-20 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-6 lg:p-0">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-primary">{String(index + 1).padStart(2, '0')}</div>
                              <div className="text-xs text-muted-foreground hidden lg:block">Module</div>
                            </div>
                          </div>

                          <div className="flex-1 p-6 lg:p-8">
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                  {c.title}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                  {c.description || "No description provided"}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 border-primary/20 hover:border-primary hover:bg-primary hover:text-primary-foreground"
                                  onClick={() => startEdit(c)}
                                >
                                  <Edit className="h-4 w-4 mr-1.5" /> Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-9"
                                   onClick={() => 
                            {
                                setDeleteId(c.id)
                                setOpenDeleteModal(true)
                            }
                        }
                                >
                                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                                </Button>
                              </div>
                            </div>

                            {Array.isArray(c.whatToLearn) && c.whatToLearn.length > 0 && (
                              <div className="mb-4">
                                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                  What you'll learn
                                </h4>
                                <div className="grid sm:grid-cols-2 gap-2">
                                  {c.whatToLearn.map((w, i) => (
                                    <div key={`${c.id}-w-${i}`} className="flex items-start gap-2 text-sm">
                                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                      <span className="text-foreground">{w}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50">
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="font-mono text-xs">
                                  ID: {c.courseId.slice(-8)}
                                </Badge>
                              </div>
                              
                              {c.pdfName ? (
                                <Link
                                href={`${c.pdf}`}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium text-foreground">{c.pdfName}</span>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Upload className="h-4 w-4" />
                                  <span>No material attached</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      
      {
        openDeleteModal && 
        <CustomAlertDialog 
            open={openDeleteModal}
            onOpenChange={setOpenDeleteModal}
            title={'Do you want to delete this course?'}
            buttons={[{
                title:'Delete',
                function:deleteContent,
                color: 'bg-destructive text-white'
            }]}
        />
      }

      <Dialog open={studentsDialogOpen} onOpenChange={setStudentsDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enrolled Students</DialogTitle>
            <DialogDescription>Students subscribed to this course</DialogDescription>
          </DialogHeader>

          {enrolledStudents.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No students have enrolled yet.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span>Total</span>
                <Badge variant="secondary" className="px-2 py-1">{enrolledStudents.length} enrolled</Badge>
              </div>
              <div className="divide-y rounded-lg border">
                {enrolledStudents.map((stu) => (
                  <div key={stu.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{stu.firstName} {stu.lastName}</p>
                      <p className="text-sm text-muted-foreground">{stu.email}</p>
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-right">
                      Subscribed: {stu.subscribedAt ? new Date(stu.subscribedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
