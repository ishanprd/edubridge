'use client'

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Video, Users, Calendar, Clock, Play, Pause, User, BookOpen, CheckCircle, Filter } from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';

export default function AdminLiveSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [activeFilter, sessions]);

  const isLive = (s) => {
    const now = Date.now();
    const start = new Date(s.startDate).getTime();
    const end = s.endDate ? new Date(s.endDate).getTime() : null;
    if (Number.isNaN(start)) return false;
    if (end) return now >= start && now <= end;
    return now >= start;
  };

  const isEnded = (s) => {
    const now = Date.now();
    const end = s.endDate ? new Date(s.endDate).getTime() : null;
    return !!end && now > end;
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/live-sessions');

      const data = response.data.data || [];
      setSessions(data);
      setFilteredSessions(data);

      const total = data.length;
      const active = data.filter(isLive).length;
      const inactive = data.filter(isEnded).length;
      setStats({ total, active, inactive });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = [...sessions];

    if (activeFilter === 'active') {
      filtered = filtered.filter(isLive);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(isEnded);
    }

    setFilteredSessions(filtered);
  };

  const handleDelete = (sessionId) => {
    if (confirm('Are you sure you want to delete this session?')) {
      setSessions(sessions.filter(s => s._id !== sessionId));
      console.log('Delete session:', sessionId);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getDuration = (start, end) => {
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    if (!startDate || Number.isNaN(startDate)) return 'Not available';
    if (!endDate || Number.isNaN(endDate)) return 'Ongoing';

    const diff = endDate - startDate;
    if (!Number.isFinite(diff) || diff <= 0) return 'Ongoing';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
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
          <p className="mt-4 text-slate-600">Loading live sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <Alert variant="destructive">
          <AlertDescription>Error loading sessions: {error}</AlertDescription>
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
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Live Sessions</h1>
          <p className="text-slate-600">Manage and monitor all live sessions on the platform</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
        >
          <Card 
            className={`cursor-pointer transition-all duration-300 border-2 ${
              activeFilter === 'all' 
                ? 'border-blue-500 bg-blue-50/50 shadow-md' 
                : 'border-transparent bg-white/80 hover:shadow-lg'
            }`}
            onClick={() => setActiveFilter('all')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Sessions</CardTitle>
              <Video className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-300 border-2 ${
              activeFilter === 'active' 
                ? 'border-green-500 bg-green-50/50 shadow-md' 
                : 'border-transparent bg-white/80 hover:shadow-lg'
            }`}
            onClick={() => setActiveFilter('active')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Sessions</CardTitle>
              <Play className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-300 border-2 ${
              activeFilter === 'inactive' 
                ? 'border-slate-500 bg-slate-50/50 shadow-md' 
                : 'border-transparent bg-white/80 hover:shadow-lg'
            }`}
            onClick={() => setActiveFilter('inactive')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Ended Sessions</CardTitle>
              <Pause className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-600">{stats.inactive}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Card className="border-0 bg-white/80 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Filter className="h-4 w-4" />
                <span>Showing {filteredSessions.length} of {sessions.length} sessions</span>
                {activeFilter !== 'all' && (
                  <span className="text-blue-600 font-medium">
                    ({activeFilter === 'active' ? 'Active' : 'Ended'} only)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {filteredSessions.map((session) => {
            const live = isLive(session);
            const ended = isEnded(session);
            const participants = Array.isArray(session.participants) ? session.participants : [];
            const courseTitle = session.courseId?.title || 'Unknown course';
            const hostFirst = session.createdBy?.firstName || 'Unknown';
            const hostLast = session.createdBy?.lastName || '';
            const startDateText = session.startDate ? formatDate(session.startDate) : 'Date not set';
            const startTimeText = session.startDate ? formatTime(session.startDate) : '';
            const durationText = session.startDate ? getDuration(session.startDate, session.endDate) : 'Not scheduled';
            const createdDateText = session.createdAt ? formatDate(session.createdAt) : 'Unknown date';
            const canJoin = live && session.roomId;

            return (
              <motion.div key={session._id} variants={itemVariants}>
                <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur overflow-hidden">
                  <div className={`h-2 ${
                    live
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                      : ended
                        ? 'bg-gradient-to-r from-slate-300 to-slate-400'
                        : 'bg-gradient-to-r from-blue-300 to-blue-400' 
                  }`}></div>
                  
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-bold text-slate-800">{session.title}</h3>
                              {live ? (
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1 animate-pulse">
                                  <Play className="h-3 w-3" />
                                  Live Now
                                </span>
                              ) : ended ? (
                                <span className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-medium rounded-full flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Ended
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Scheduled
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 mb-3">{session.description}</p>
                            
                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                              <BookOpen className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">{courseTitle}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                              <User className="h-4 w-4 text-purple-600" />
                              <span>
                                Hosted by {hostFirst} {hostLast}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                              <Calendar className="h-4 w-4 text-orange-600" />
                              <span>{startDateText}{startTimeText ? ` at ${startTimeText}` : ''}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Clock className="h-4 w-4 text-cyan-600" />
                              <span>Duration: {durationText}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t flex flex-col gap-4">
                          {canJoin && (
                            <div className="flex flex-wrap items-center gap-3">
                              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                                <Link href={`/live-session/${session.roomId}`}>
                                  Join as Admin
                                </Link>
                              </Button>
                              <span className="text-sm text-green-700 flex items-center gap-2">
                                <Play className="h-4 w-4" /> Live session is active
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mb-3">
                            <Users className="h-4 w-4 text-slate-600" />
                            <span className="text-sm font-medium text-slate-700">
                              Participants ({participants.length})
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {participants.slice(0, 6).map((participant) => {
                              const firstInitial = participant.firstName?.[0] || '';
                              const lastInitial = participant.lastName?.[0] || '';
                              const initials = `${firstInitial}${lastInitial}`.trim() || '?';

                              return (
                              <div
                                key={participant._id}
                                className="px-3 py-2 bg-slate-100 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors"
                              >
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                  {initials}
                                </div>
                                <span className="text-slate-700">
                                  {participant.firstName || 'Unknown'} {participant.lastName || ''}
                                </span>
                              </div>
                              );
                            })}
                            {participants.length > 6 && (
                              <div className="px-3 py-2 bg-slate-200 rounded-lg text-sm text-slate-600 font-medium">
                                +{participants.length - 6} more
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 flex items-center gap-4 text-xs text-slate-500">
                          <span>Room ID: {session.roomId}</span>
                          <span>•</span>
                          <span>Created {createdDateText}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {filteredSessions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <Video className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No sessions found</h3>
            <p className="text-slate-500">
              {activeFilter === 'active' && 'No active sessions at the moment'}
              {activeFilter === 'inactive' && 'No ended sessions found'}
              {activeFilter === 'all' && 'No sessions available'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
