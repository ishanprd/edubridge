'use client'

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, BookOpen, User, Calendar, Tag, Filter, X, Users, Video, Clock } from 'lucide-react';
import axios from 'axios';

export default function AdminCoursesPage() {
  const [courses, setcourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [contents, setContents] = useState([]);
  const [editingCourse, setEditingCourse] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    subject: '',
    tags: '',
    thumbnail: '',
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, createdByFilter, courses]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/courses');

      setcourses(response.data.data);
      setFilteredCourses(response.data.data);
      
      const uniqueTeachers = [];
      const teacherIds = new Set();
      response.data.data.forEach(course => {
        if (course.createdBy && !teacherIds.has(course.createdBy._id)) {
          teacherIds.add(course.createdBy._id);
          uniqueTeachers.push(course.createdBy);
        }
      });
      setTeachers(uniqueTeachers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...courses];

    if (searchQuery) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (createdByFilter) {
      filtered = filtered.filter(course => course.createdBy._id === createdByFilter);
    }

    setFilteredCourses(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCreatedByFilter('');
  };

  const getSessionStatus = (session) => {
    const now = new Date();
    const start = new Date(session.startDate);
    const end = session.endDate ? new Date(session.endDate) : null;
    if (end && now > end) return 'past';
    if (now >= start && (!end || now <= end)) return 'live';
    return 'upcoming';
  };

  const openCourseDetails = (course) => {
    setSelectedCourse(course);
    setDetailOpen(true);
    if (course?._id) {
      loadCourseDetails(course._id);
    }
  };

  const loadCourseDetails = async (courseId) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const [courseRes, studentsRes, sessionsRes, contentsRes] = await Promise.all([
        axios.get(`/api/courses/${courseId}`, { withCredentials: true }),
        axios.get(`/api/teacher/courses/${courseId}/students`, { withCredentials: true }),
        axios.get(`/api/live-sessions/${courseId}`, { withCredentials: true }),
        axios.get('/api/contents', { params: { courseId, sort: 'position,createdAt' }, withCredentials: true }),
      ]);

      const courseData = courseRes?.data?.data;
      if (courseData) {
        setSelectedCourse(courseData);
        setEditForm({
          title: courseData.title || '',
          description: courseData.description || '',
          subject: courseData.subject || '',
          tags: Array.isArray(courseData.tags) ? courseData.tags.join(', ') : '',
          thumbnail: courseData.thumbnail || '',
        });
      }

      const studentList = Array.isArray(studentsRes?.data?.data) ? studentsRes.data.data : [];
      setStudents(studentList);

      const sessionList = Array.isArray(sessionsRes?.data?.data?.sessions)
        ? sessionsRes.data.data.sessions
        : [];
      setSessions(sessionList);

      const contentList = Array.isArray(contentsRes?.data?.data) ? contentsRes.data.data : [];
      setContents(
        contentList.map((c) => ({
          id: c._id || c.id,
          title: c.title || '',
          description: c.description || '',
          whatToLearn: Array.isArray(c.whatToLearn) ? c.whatToLearn : [],
          pdfName: c.pdfName || '',
          pdfUrl: c.pdfUrl || '',
        }))
      );
    } catch (err) {
      setDetailError(err.message || 'Failed to load course details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = (courseId) => {
    if (confirm('Are you sure you want to delete this course?')) {
      setcourses(courses.filter(c => c._id !== courseId));
      console.log('Delete course:', courseId);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <Alert variant="destructive">
          <AlertDescription>Error loading courses: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-800 mb-2">All Courses</h1>
          <p className="text-slate-600">Manage and view all courses on the platform</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card className="border-0 bg-white/80 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search courses by title, description, or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={createdByFilter}
                  onChange={(e) => setCreatedByFilter(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Teachers</option>
                  {teachers.map(teacher => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </select>

                {(searchQuery || createdByFilter) && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <Filter className="h-4 w-4" />
                <span>Showing {filteredCourses.length} of {courses.length} courses</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredCourses.map((course) => (
            <motion.div key={course._id} variants={itemVariants}>
              <Card
                className="hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur h-full flex flex-col overflow-hidden group cursor-pointer"
                onClick={() => openCourseDetails(course)}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-slate-700">
                    {course.subject}
                  </div>
                </div>

                <CardHeader className="flex-grow">
                  <CardTitle className="text-xl line-clamp-2">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-3 mt-2">
                    {course.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {course.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600 pt-3 border-t">
                    <User className="h-4 w-4" />
                    <span className="font-medium">
                      {course.createdBy.firstName} {course.createdBy.lastName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    <span>Created {new Date(course.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {filteredCourses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No courses found</h3>
            <p className="text-slate-500">Try adjusting your search or filters</p>
          </motion.div>
        )}
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedCourse(null);
            setStudents([]);
            setSessions([]);
            setContents([]);
            setDetailError('');
            setEditingCourse(false);
            setDeleteDialogOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.title || 'Course details'}</DialogTitle>
            <DialogDescription>
              Course overview, enrolled students, and available live sessions.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-600">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p>Loading course details...</p>
            </div>
          ) : detailError ? (
            <Alert variant="destructive">
              <AlertDescription>{detailError}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold text-slate-800">{selectedCourse?.title}</h3>
                      {selectedCourse?.subject && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedCourse.subject}
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {selectedCourse?.description || 'No description available for this course.'}
                    </p>
                  </div>
                  {selectedCourse?.thumbnail && (
                    <img
                      src={selectedCourse.thumbnail}
                      alt={selectedCourse.title}
                      className="w-32 h-20 rounded-lg object-cover border"
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setEditingCourse((v) => !v)}>
                    {editingCourse ? 'Cancel edit' : 'Edit course'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingCourse}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    {deletingCourse ? 'Deleting...' : 'Delete course'}
                  </Button>
                </div>

                {editingCourse && (
                  <div className="mt-4 p-4 border rounded-lg bg-white space-y-3">
                    <h4 className="font-semibold text-slate-800">Edit course details</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-title">Title</Label>
                        <Input
                          id="edit-title"
                          value={editForm.title}
                          onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-subject">Subject</Label>
                        <Input
                          id="edit-subject"
                          value={editForm.subject}
                          onChange={(e) => setEditForm((s) => ({ ...s, subject: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        rows={3}
                        value={editForm.description}
                        onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-tags">Tags (comma separated)</Label>
                      <Input
                        id="edit-tags"
                        value={editForm.tags}
                        onChange={(e) => setEditForm((s) => ({ ...s, tags: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-thumbnail">Thumbnail URL</Label>
                      <Input
                        id="edit-thumbnail"
                        value={editForm.thumbnail}
                        onChange={(e) => setEditForm((s) => ({ ...s, thumbnail: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        disabled={savingCourse}
                        onClick={async () => {
                          if (!selectedCourse?._id) return;
                          setSavingCourse(true);
                          try {
                            const payload = {
                              title: editForm.title.trim(),
                              subject: editForm.subject.trim(),
                              description: editForm.description.trim(),
                              tags: editForm.tags
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean),
                              thumbnail: editForm.thumbnail.trim(),
                            };
                            const { data } = await axios.patch(
                              `/api/courses/${selectedCourse._id}`,
                              payload,
                              { withCredentials: true }
                            );
                            const updated = data?.data;
                            if (updated) {
                              setSelectedCourse(updated);
                              setcourses((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
                              setFilteredCourses((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
                              setEditForm({
                                title: updated.title || '',
                                description: updated.description || '',
                                subject: updated.subject || '',
                                tags: Array.isArray(updated.tags) ? updated.tags.join(', ') : '',
                                thumbnail: updated.thumbnail || '',
                              });
                              setEditingCourse(false);
                            }
                          } catch (err) {
                            alert(err?.message || 'Failed to save course');
                          } finally {
                            setSavingCourse(false);
                          }
                        }}
                      >
                        {savingCourse ? 'Saving...' : 'Save changes'}
                      </Button>
                    </div>
                  </div>
                )}

                {Array.isArray(selectedCourse?.tags) && selectedCourse.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCourse.tags.map((tag, idx) => (
                      <Badge key={`${selectedCourse._id}-tag-${idx}`} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span>
                      Instructor:{' '}
                      <span className="font-medium text-slate-800">
                        {selectedCourse?.createdBy?.firstName} {selectedCourse?.createdBy?.lastName}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <span>
                      Created on{' '}
                      {selectedCourse?.createdAt
                        ? new Date(selectedCourse.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Users className="h-4 w-4" />
                    <span>Enrolled Students</span>
                  </div>
                  <Badge variant="secondary">{students.length} enrolled</Badge>
                </div>
                {students.length === 0 ? (
                  <div className="p-4 rounded-lg border bg-slate-50 text-slate-600 text-sm">
                    No students have enrolled in this course yet.
                  </div>
                ) : (
                  <div className="divide-y rounded-lg border bg-white">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div>
                          <p className="font-medium text-slate-800">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-sm text-slate-600">{student.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-slate-500">
                            Joined{' '}
                            {student.subscribedAt
                              ? new Date(student.subscribedAt).toLocaleString()
                              : 'N/A'}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={removingStudentId === student.id}
                            onClick={async () => {
                              if (!selectedCourse?._id) return;
                              try {
                                setRemovingStudentId(student.id);
                                await axios.delete(`/api/teacher/courses/${selectedCourse._id}/students`, {
                                  withCredentials: true,
                                  data: { userId: student.id },
                                });
                                setStudents((prev) => prev.filter((s) => s.id !== student.id));
                              } catch (err) {
                                alert(err?.message || 'Failed to remove student');
                              } finally {
                                setRemovingStudentId('');
                              }
                            }}
                          >
                            {removingStudentId === student.id ? 'Removing...' : 'Remove'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Video className="h-4 w-4" />
                    <span>Live Sessions</span>
                  </div>
                  <Badge variant="secondary">{sessions.length} sessions</Badge>
                </div>

                {sessions.length === 0 ? (
                  <div className="p-4 rounded-lg border bg-slate-50 text-slate-600 text-sm">
                    No live sessions have been scheduled for this course.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => {
                      const status = getSessionStatus(session);
                      return (
                        <div
                          key={session._id}
                          className="p-4 rounded-lg border bg-white flex flex-col gap-3"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg font-semibold text-slate-800">
                                  {session.title}
                                </h4>
                                <Badge
                                  variant={
                                    status === 'live'
                                      ? 'default'
                                      : status === 'upcoming'
                                        ? 'secondary'
                                        : 'outline'
                                  }
                                >
                                  {status === 'live'
                                    ? 'Live now'
                                    : status === 'upcoming'
                                      ? 'Upcoming'
                                      : 'Ended'}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 mt-1">
                                {session.description || 'No description'}
                              </p>
                            </div>
                            {(status === 'live' || status === 'upcoming') && (
                              <Link href={`/live-session/${session.roomId}`} target="_blank">
                                <Button size="sm" className="gap-2">
                                  <Video className="h-4 w-4" />
                                  Join
                                </Button>
                              </Link>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {session.startDate
                                  ? new Date(session.startDate).toLocaleString()
                                  : 'No start time'}
                              </span>
                            </div>
                            {session.participants?.length >= 0 && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>{session.participants.length || 0} participants</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <BookOpen className="h-4 w-4" />
                    <span>Course Content</span>
                  </div>
                  <Badge variant="secondary">{contents.length} modules</Badge>
                </div>

                {contents.length === 0 ? (
                  <div className="p-4 rounded-lg border bg-slate-50 text-slate-600 text-sm">
                    No content has been added to this course yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contents.map((c, idx) => (
                      <div key={c.id || idx} className="p-4 rounded-lg border bg-white space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">#{idx + 1}</Badge>
                              <h4 className="text-lg font-semibold text-slate-800">{c.title}</h4>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">
                              {c.description || 'No description'}
                            </p>
                          </div>
                          {c.pdfUrl && (
                            <Link href={c.pdfUrl} target="_blank" className="text-sm text-blue-600 hover:underline">
                              {c.pdfName || 'View PDF'}
                            </Link>
                          )}
                        </div>

                        {Array.isArray(c.whatToLearn) && c.whatToLearn.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-slate-500">What you will learn</p>
                            <div className="grid sm:grid-cols-2 gap-1">
                              {c.whatToLearn.map((item, i) => (
                                <div key={`${c.id}-learn-${i}`} className="text-sm text-slate-700 flex items-start gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this course?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the course and its visibility for everyone. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingCourse}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deletingCourse}
                onClick={async () => {
                  if (!selectedCourse?._id) return;
                  try {
                    setDeletingCourse(true);
                    await axios.delete(`/api/courses/${selectedCourse._id}`, { withCredentials: true });
                    setcourses((prev) => prev.filter((c) => c._id !== selectedCourse._id));
                    setFilteredCourses((prev) => prev.filter((c) => c._id !== selectedCourse._id));
                    setDetailOpen(false);
                  } catch (err) {
                    alert(err?.message || 'Failed to delete course');
                  } finally {
                    setDeletingCourse(false);
                    setDeleteDialogOpen(false);
                  }
                }}
              >
                {deletingCourse ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
