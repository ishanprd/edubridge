"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, Plus, Trash2, Image as ImageIcon, Tag, CalendarClock, Filter, X, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { handleAxiosError } from "@/lib/utils/clientFunctions";
import axios from "axios";
import CustomAlertDialog from "@/components/common/CustomAlertDialog";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-muted/40 before:to-transparent";

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    subject: "",
    tags: "",
    thumbnailBase64: "",
  });

  const router = useRouter();

  useEffect(() => {
    const getCourses = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get("/api/courses/my", { withCredentials: true });
        setCourses(data.data || []);
      } catch (error) {
        handleAxiosError(error);
      } finally {
        setLoading(false);
      }
    };
    getCourses();
  }, []);

  async function fileToBase64(file) {
    return await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(String(reader.result));
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  const handleThumbChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const b64 = await fileToBase64(f);
    setCourseForm((s) => ({ ...s, thumbnailBase64: b64 }));
  };

  const resetForm = () => {
    setCourseForm({ title: "", description: "", subject: "", tags: "", thumbnailBase64: "" });
    setEditingId(null);
  };

  const refreshCourses = async () => {
    const { data } = await axios.get("/api/courses/my", { withCredentials: true });
    setCourses(data.data || []);
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: courseForm.title.trim(),
        description: courseForm.description.trim(),
        subject: courseForm.subject.trim(),
        tags: courseForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        thumbnail: courseForm.thumbnailBase64,
      };

      if (editingId) {
        await axios.patch(`/api/courses/${editingId}`, payload, { withCredentials: true });
        toast.success("Course updated");
      } else {
        const { data } = await axios.post("/api/courses", payload, { withCredentials: true });
        toast.success(data?.message || "Course created");
      }

      await refreshCourses();
      setOpen(false);
      resetForm();
    } catch (err) {
      handleAxiosError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const startCreate = () => {
    resetForm();
    setOpen(true);
  };

  const startEdit = (c) => {
    setEditingId(c._id);
    setCourseForm({
      title: c.title || "",
      description: c.description || "",
      subject: c.subject || "",
      tags: Array.isArray(c.tags) ? c.tags.join(", ") : "",
      thumbnailBase64: c.thumbnail || "",
    });
    setOpen(true);
  };

  const deleteCourse = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/courses/${deleteId}`, { withCredentials: true });
      toast.success("Deleted");
      setCourses((prev) => prev.filter((c) => c._id !== deleteId));
      setOpenDeleteModal(false);
      setDeleteId(null);
    } catch (err) {
      handleAxiosError(err);
    }
  };

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = courses.filter((c) => {
      const hay = `${c.title} ${c.subject} ${c.description} ${(c.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });

    return list.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "subject") return (a.subject || "").localeCompare(b.subject || "");
      const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bt - at;
    });
  }, [courses, query, sortBy]);

  const fadeInUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: "easeOut" },
  };

  return (
    <motion.div className="space-y-6 p-4" {...fadeInUp}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Courses</h2>
          <p className="text-muted-foreground text-sm">Create, organize, and manage your courses with style.</p>
        </div>

        <div className="flex w-full md:w-auto items-center gap-2">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, subject, or tags"
              className="pl-9"
            />
            {query && (
              <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQuery("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /> Sort</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v)}>
                <DropdownMenuRadioItem value="recent">Most recent</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="title">Title (ASC)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="subject">Subject (ASC)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreate} className="gap-2">
                <Plus className="h-4 w-4" /> New Course
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Course" : "Create New Course"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Update the course details." : "Fill in the details to create a new course."}
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4" onSubmit={handleSubmitCourse}>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm((s) => ({ ...s, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={courseForm.description}
                    onChange={(e) => setCourseForm((s) => ({ ...s, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g. Computer Science"
                    value={courseForm.subject}
                    onChange={(e) => setCourseForm((s) => ({ ...s, subject: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    placeholder="digital, beginner, rural"
                    value={courseForm.tags}
                    onChange={(e) => setCourseForm((s) => ({ ...s, tags: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    {courseForm.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .slice(0, 6)
                      .map((t, i) => (
                        <Badge key={`${t}-${i}`} variant="secondary" className="border">
                          <Tag className="h-3 w-3 mr-1" /> {t}
                        </Badge>
                      ))}
                  </div>
                </div>

                {!editingId && (
                  <div className="space-y-2">
                    <Label htmlFor="thumb">Thumbnail (image, stored as base64)</Label>
                    <Input id="thumb" type="file" accept="image/*" onChange={handleThumbChange} />
                    {!!courseForm.thumbnailBase64 && (
                      <div className="mt-2">
                        <img
                          src={courseForm.thumbnailBase64}
                          alt="preview"
                          className="h-28 w-44 object-cover rounded-md border"
                        />
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingId ? (submitting ? "Saving…" : "Save Changes") : (submitting ? "Creating…" : "Create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Courses</div>
            <div className="text-2xl font-semibold">{courses.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Showing</div>
            <div className="text-2xl font-semibold">{filteredSorted.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Sort</div>
            <div className="text-sm font-medium capitalize">{sortBy === "recent" ? "Most recent" : sortBy}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Search</div>
            <div className="text-sm font-medium truncate">{query || "—"}</div>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {loading && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className={`border-border ${shimmer}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-48 h-32 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 w-2/3 bg-muted rounded" />
                        <div className="h-4 w-full bg-muted rounded" />
                        <div className="h-4 w-5/6 bg-muted rounded" />
                        <div className="h-4 w-1/3 bg-muted rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {!loading && filteredSorted.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No courses found</h3>
              <p className="text-muted-foreground text-sm">Try adjusting your search or create a new course.</p>
            </div>
            <Button onClick={startCreate} className="gap-2"><Plus className="h-4 w-4" /> Create your first course</Button>
          </CardContent>
        </Card>
      )}

      {!loading && filteredSorted.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSorted.map((course) => (
            <motion.div key={course._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <Card className="group border-border hover:shadow-xl transition-all duration-300">
                <CardHeader className="p-0">
                  <div className="relative">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-40 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-40 grid place-items-center bg-muted rounded-t-lg">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardHeader>

                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <CardTitle className="text-base leading-tight line-clamp-1">{course.title}</CardTitle>
                      {course.subject && (
                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" /> {course.subject}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => router.push(`/teacher/courses/${course._id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => startEdit(course)}>
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              size="icon"
                              className="h-8 w-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => {
                                setDeleteId(course._id);
                                setOpenDeleteModal(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                  )}

                  {Array.isArray(course.tags) && course.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {course.tags.slice(0, 5).map((tag, i) => (
                        <Badge key={`${course._id}-tag-${i}`} variant="secondary" className="border">
                          {tag}
                        </Badge>
                      ))}
                      {course.tags.length > 5 && (
                        <Badge variant="outline" className="text-xs">+{course.tags.length - 5} more</Badge>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Last updated: {course.updatedAt ? new Date(course.updatedAt).toLocaleString() : "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {openDeleteModal && (
        <CustomAlertDialog
          open={openDeleteModal}
          onOpenChange={setOpenDeleteModal}
          title={"Do you want to delete this course?"}
          buttons={[
            {
              title: "Delete",
              function: deleteCourse,
              color: "bg-destructive text-white",
            },
          ]}
        />
      )}
    </motion.div>
  );
}
