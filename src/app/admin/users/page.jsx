'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Users, Plus, RefreshCw, Search, Mail, User as UserIcon, KeyRound, Trash, Settings2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageUser, setManageUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [manageError, setManageError] = useState(null);
  const [manageSuccess, setManageSuccess] = useState(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (role) => {
    try {
      setLoading(true);
      setError(null);
      const url = role ? `/api/admin/users?role=${role}` : '/api/admin/users';
      const res = await axios.get(url);
      setUsers(res.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const visibleUsers = useMemo(() => {
    let list = [...users];
    if (roleFilter !== 'all') {
      list = list.filter(u => u.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, roleFilter, search]);

  const resetForm = () => {
    setForm({ firstName: '', lastName: '', email: '', password: '' });
    setFormError(null);
    setFormSuccess(null);
  };

  const resetManageState = () => {
    setManageError(null);
    setManageSuccess(null);
    setNewPassword('');
  };

  const handleAddTeacher = async () => {
    setFormError(null);
    setFormSuccess(null);

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setFormError('All fields are required.');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post('/api/admin/users', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      setFormSuccess('Teacher created successfully.');
      if (roleFilter === 'teacher') await fetchUsers('teacher');
      else await fetchUsers();
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 600);
    } catch (e) {
      setFormError(e?.response?.data?.message || e?.message || 'Failed to create teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const openManageDialog = (user) => {
    setManageUser(user);
    resetManageState();
    setManageOpen(true);
  };

  const closeManageDialog = () => {
    setManageOpen(false);
    setManageUser(null);
    resetManageState();
  };

  const handlePasswordUpdate = async () => {
    if (!manageUser) return;
    if (!newPassword.trim()) {
      setManageError('Password is required.');
      return;
    }
    try {
      setManageLoading(true);
      setManageError(null);
      setManageSuccess(null);
      await axios.patch(`/api/admin/users/${manageUser._id}`, { password: newPassword.trim() });
      setManageSuccess('Password updated successfully.');
      setNewPassword('');
    } catch (e) {
      setManageError(e?.response?.data?.message || e?.message || 'Failed to update password');
    } finally {
      setManageLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!manageUser) return;
    try {
      setDeleteLoading(true);
      setManageError(null);
      setManageSuccess(null);
      await axios.delete(`/api/admin/users/${manageUser._id}`);
      setManageSuccess('User deleted successfully.');
      const role = roleFilter === 'all' ? undefined : roleFilter;
      await fetchUsers(role);
      setTimeout(() => {
        closeManageDialog();
      }, 400);
    } catch (e) {
      setManageError(e?.response?.data?.message || e?.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const initials = (u) =>
    `${(u.firstName || '?')[0] || ''}${(u.lastName || '?')[0] || ''}`.toUpperCase();

  const roleBadge = (role) => {
    const map = {
      admin: 'bg-purple-100 text-purple-700',
      teacher: 'bg-blue-100 text-blue-700',
      student: 'bg-emerald-100 text-emerald-700',
    };
    const label = role?.[0]?.toUpperCase() + role?.slice(1);
    return <Badge className={`${map[role]} font-medium`}>{label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Users</h1>
            <p className="text-slate-600">View all users and add new teachers.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => (roleFilter === 'all' ? fetchUsers() : fetchUsers(roleFilter))}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>

            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Teacher
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a new teacher</DialogTitle>
                  <DialogDescription>
                    Create a teacher account. Role will be set to <strong>teacher</strong>.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      placeholder="Jane"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane.doe@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                </div>

                {formError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                {formSuccess && (
                  <Alert className="mt-4">
                    <AlertDescription>{formSuccess}</AlertDescription>
                  </Alert>
                )}

                <DialogFooter className="mt-4">
                  <Button variant="secondary" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTeacher} disabled={submitting} className="gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Teacher
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-4 mb-6"
        >
          <Card className="border-0 bg-white/80 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-600" />
                  <span className="text-sm text-slate-600">
                    Showing <span className="font-medium text-slate-800">{visibleUsers.length}</span> of{' '}
                    <span className="font-medium text-slate-800">{users.length}</span> users
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-9 w-64"
                      placeholder="Search name or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <Select
                    value={roleFilter}
                    onValueChange={(v) => {
                      setRoleFilter(v);
                    }}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading users...
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-4"
          >
            <Card className="border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-4">
              <CardTitle className="text-lg text-slate-700">All Users</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="hidden md:block">
                <div className="min-w-[840px]">
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr_minmax(120px,auto)_auto] gap-4 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    <div> </div>
                    <div>Name</div>
                    <div>Email</div>
                    <div>Role</div>
                    <div className="pl-1">Joined</div>
                    <div className="text-right pr-1">Actions</div>
                  </div>
                  <div className="divide-y">
                    {visibleUsers.map((u) => (
                      <div key={u._id} className="grid grid-cols-[auto_1fr_1fr_1fr_minmax(120px,auto)_auto] gap-4 items-center px-4 py-3 hover:bg-slate-50/70">
                        <div className="pr-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-slate-200 text-slate-700">
                              {initials(u)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="text-slate-800 font-medium flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-slate-400" />
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-slate-700 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {u.email}
                        </div>
                        <div>{roleBadge(u.role)}</div>
                        <div className="text-slate-500 pl-1">{formatDate(u.createdAt)}</div>
                        <div className="flex justify-end pr-1">
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => openManageDialog(u)}>
                            <Settings2 className="h-4 w-4" />
                            Manage
                          </Button>
                        </div>
                      </div>
                    ))}
                    {visibleUsers.length === 0 && (
                      <div className="px-4 py-10 text-center text-slate-500">
                        No users match your filters.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:hidden space-y-3">
                {visibleUsers.map((u) => (
                  <div key={u._id} className="rounded-lg border bg-white/70 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-slate-200 text-slate-700">
                          {initials(u)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-slate-800 font-semibold flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-slate-400" />
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="text-xs text-slate-500">{formatDate(u.createdAt)}</div>
                        </div>
                        <div className="mt-1 text-sm text-slate-700 flex items-center gap-2 break-all">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {u.email}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div>{roleBadge(u.role)}</div>
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => openManageDialog(u)}>
                            <Settings2 className="h-4 w-4" />
                            Manage
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {visibleUsers.length === 0 && (
                  <div className="px-2 py-6 text-center text-slate-500 text-sm">
                    No users match your filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        )}

        <Dialog open={manageOpen} onOpenChange={(o) => (o ? setManageOpen(true) : closeManageDialog())}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage user</DialogTitle>
              <DialogDescription>
                Update password or delete this account. Actions apply to{' '}
                <strong>{manageUser?.firstName} {manageUser?.lastName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div className="font-medium text-slate-800">Name</div>
                <div>{manageUser ? `${manageUser.firstName} ${manageUser.lastName}` : '-'}</div>
                <div className="font-medium text-slate-800">Email</div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {manageUser?.email || '-'}
                </div>
                <div className="font-medium text-slate-800">Role</div>
                <div>{manageUser ? roleBadge(manageUser.role) : '-'}</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                  New password
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter a new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button onClick={handlePasswordUpdate} disabled={manageLoading} className="gap-2 whitespace-nowrap">
                    {manageLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <KeyRound className="h-4 w-4" />
                    Update
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Set a new password for this user. It will take effect immediately.
                </p>
              </div>

              <div className="border rounded-lg p-3 bg-red-50 border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-red-700">Delete user</p>
                    <p className="text-xs text-red-600">This action permanently removes the account.</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-2" disabled={deleteLoading}>
                        {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        <Trash className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This cannot be undone. The user and their access will be removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deleteLoading}
                          className="bg-red-600 hover:bg-red-700"
                          onClick={handleDeleteUser}
                        >
                          {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          Delete user
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>

            {manageError && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>{manageError}</AlertDescription>
              </Alert>
            )}
            {manageSuccess && (
              <Alert className="mt-2">
                <AlertDescription>{manageSuccess}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="secondary" onClick={closeManageDialog}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
