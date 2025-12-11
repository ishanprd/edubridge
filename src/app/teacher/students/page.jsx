'use client'

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Search, BookOpen, Calendar, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { handleAxiosError } from '@/lib/utils/clientFunctions';

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [removingId, setRemovingId] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/teacher/students', { withCredentials: true });
      setStudents(Array.isArray(data?.data) ? data.data : []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load students');
      handleAxiosError(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return students.filter((s) => {
      const hay = `${s.firstName} ${s.lastName} ${s.email} ${s.courseTitle}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, query]);

  const handleRemove = async (student) => {
    if (!student?.courseId || !student?.id) return;
    const key = `${student.id}-${student.courseId}`;
    try {
      setRemovingId(key);
      await axios.delete(`/api/teacher/courses/${student.courseId}/students`, {
        withCredentials: true,
        data: { userId: student.id },
      });
      setStudents((prev) => prev.filter((s) => !(s.id === student.id && s.courseId === student.courseId)));
      setManageOpen(false);
    } catch (err) {
      handleAxiosError(err);
    } finally {
      setRemovingId('');
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedStudent?.id) return;
    try {
      setDeletingAccount(true);
      await axios.delete(`/api/teacher/students/${selectedStudent.id}`, { withCredentials: true });
      setStudents((prev) => prev.filter((s) => s.id !== selectedStudent.id));
      setManageOpen(false);
    } catch (err) {
      handleAxiosError(err);
    } finally {
      setDeletingAccount(false);
    }
  };

  const total = students.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-slate-200 rounded" />
            <div className="h-40 bg-slate-200 rounded" />
            <div className="h-10 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Students</h1>
          <p className="text-slate-600">Overview of students enrolled in your courses.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-slate-600 text-center">Total Students</CardTitle>
            </CardHeader>
            <CardContent className="text-4xl font-bold text-slate-900 flex items-center justify-center gap-2">
              <Users className="w-7 h-7 text-blue-600" />
              {total}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or course"
              className="pl-9"
            />
          </div>
          <p className="text-sm text-slate-600">{filtered.length} results</p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-12 bg-slate-100 text-xs font-semibold text-slate-700 uppercase tracking-wide">
              <div className="col-span-3 p-3">Student</div>
              <div className="col-span-3 p-3">Email</div>
              <div className="col-span-3 p-3">Course</div>
              <div className="col-span-2 p-3">Joined</div>
              <div className="col-span-1 p-3 text-right">Action</div>
            </div>
            <div className="divide-y">
              {filtered.length === 0 && (
                <div className="p-6 text-center text-slate-500">No students found.</div>
              )}
              {filtered.map((student, idx) => (
                <motion.div
                  key={`${student.id}-${student.courseId}-${idx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-12 items-center text-sm"
                >
                  <div className="col-span-3 p-3 flex items-center gap-2">
                    <Badge variant="secondary">{idx + 1}</Badge>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {student.firstName} {student.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-3 p-3 text-slate-700 truncate">{student.email}</div>
                  <div className="col-span-3 p-3 text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="truncate">{student.courseTitle}</span>
                  </div>
                  <div className="col-span-2 p-3 text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>
                      {student.subscribedAt
                        ? new Date(student.subscribedAt).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-1 p-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        setSelectedStudent(student);
                        setManageOpen(true);
                      }}
                    >
                      Manage
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog
          open={manageOpen}
          onOpenChange={(open) => {
            setManageOpen(open);
            if (!open) {
              setSelectedStudent(null);
              setDeletingAccount(false);
              setRemovingId('');
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Student</DialogTitle>
              <DialogDescription>
                View details or take actions on this student.
              </DialogDescription>
            </DialogHeader>

            {selectedStudent && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Student</Badge>
                  <span className="font-semibold">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </span>
                </div>
                <p className="text-slate-700">Email: {selectedStudent.email}</p>
                <p className="text-slate-700">Course: {selectedStudent.courseTitle}</p>
                <p className="text-slate-700">
                  Joined: {selectedStudent.subscribedAt ? new Date(selectedStudent.subscribedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => selectedStudent && handleRemove(selectedStudent)}
                disabled={!!removingId}
              >
                {removingId ? 'Removing...' : 'Remove from Course'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || !selectedStudent}
              >
                {deletingAccount ? 'Deleting...' : 'Delete Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
