'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Calendar, Clock, Users, Radio, Search, Filter, ChevronRight, PlayCircle, AlertCircle, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { handleAxiosError } from '@/lib/utils/clientFunctions';
import { useRouter } from 'next/navigation';

export default function LiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchLiveSessions();
  }, []);

  const fetchLiveSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my/live-sessions', { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch live sessions');
      }
      
      const result = await response.json();
      setSessions(result.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      handleAxiosError(err);
    } finally {
      setLoading(false);
    }
  };

  const getSessionStatus = (session) => {
    const now = Date.now();
    const start = new Date(session.startDate).getTime();
    const end = session.endDate ? new Date(session.endDate).getTime() : null;

    if (Number.isNaN(start)) return 'upcoming';
    if (session.isActive && start <= now && (!end || now <= end)) return 'live';
    if (start > now) return 'upcoming';
    if (end && now > end) return 'ended';
    if (!session.isActive && now > start) return 'ended';
    return 'upcoming';
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntilStart = (startDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const diffMs = start - now;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `Starts in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `Starts in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffMins > 0) return `Starts in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    return 'Starting soon';
  };

  const getDuration = (startDate, endDate, isActive) => {
    if (!endDate) return isActive ? 'Ongoing' : 'Ended';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          session.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          session.courseId?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getSessionStatus(session);
    const matchesFilter = filterStatus === 'all' || status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  const liveCount = sessions.filter(s => getSessionStatus(s) === 'live').length;
  const endedCount = sessions.filter(s => getSessionStatus(s) === 'ended').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-16 px-4"
      >
        <div className="max-w-7xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-bold mb-4"
          >
            My Live Sessions
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-purple-100 max-w-2xl"
          >
            Join live sessions, interact with instructors, and learn with your peers in real-time.
          </motion.p>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          <Card className="bg-white border-l-4 border-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Live Now</p>
                  <p className="text-3xl font-bold text-red-600">{liveCount}</p>
                </div>
                <Radio className="w-12 h-12 text-red-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-gray-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Past Sessions</p>
                  <p className="text-3xl font-bold text-gray-600">{endedCount}</p>
                </div>
                <Video className="w-12 h-12 text-gray-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 space-y-4"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white shadow-sm"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
              >
                All Sessions
              </Button>
              <Button
                variant={filterStatus === 'live' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('live')}
                className="gap-2"
              >
                <Radio className="w-4 h-4" />
                Live
              </Button>
              <Button
                variant={filterStatus === 'ended' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('ended')}
              >
                Ended
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} found</span>
          </div>

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </motion.div>

        {loading && (
          <div className="grid gap-6 grid-cols-1">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {!loading && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <AnimatePresence>
              {filteredSessions.map((session) => {
                const status = getSessionStatus(session);
                const isLive = status === 'live';
                const isUpcoming = status === 'upcoming';
                const isEnded = status === 'ended';

                return (
                  <motion.div
                    key={session._id}
                    variants={itemVariants}
                    layout
                    whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                  >
                    <Card className={`overflow-hidden hover:shadow-xl transition-all ${
                      isLive ? 'border-l-4 border-red-500 bg-red-50' : 
                      isUpcoming ? 'border-l-4 border-blue-500 bg-white' : 
                      'border-l-4 border-gray-300 bg-gray-50'
                    }`}>
                      <div className="flex flex-col lg:flex-row">
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                {isLive && (
                                  <Badge className="bg-red-500 text-white animate-pulse gap-1">
                                    <Radio className="w-3 h-3" />
                                    LIVE
                                  </Badge>
                                )}
                                {isEnded && (
                                  <Badge variant="outline" className="text-gray-600 gap-1">
                                    Ended
                                  </Badge>
                                )}
                                {session.courseId && (
                                  <Badge variant="outline" className="text-xs">
                                    <BookOpen className="w-3 h-3 mr-1" />
                                    {session.courseId.title}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-2xl font-bold mb-2 text-gray-900">{session.title}</h3>
                              <p className="text-gray-600 mb-4">{session.description}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4 text-purple-600" />
                              <div>
                                <p className="font-medium text-gray-900">Start Time</p>
                                <p>{formatDateTime(session.startDate)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="w-4 h-4 text-purple-600" />
                              <div>
                                <p className="font-medium text-gray-900">Duration</p>
                                <p>{getDuration(session.startDate, session.endDate, session.isActive)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Users className="w-4 h-4 text-purple-600" />
                              <div>
                                <p className="font-medium text-gray-900">Participants</p>
                                <p>{session.participants?.length || 0} joined</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 lg:w-64">
                          <div className="text-center space-y-3 w-full">
                            {isLive && (
                              <Button
                                size="lg"
                                className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
                                onClick={() => router.push(`/live-session/${session.roomId}`)}
                              >
                                <PlayCircle className="w-5 h-5" />
                                Join Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {!loading && filteredSessions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <Video className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchQuery || filterStatus !== 'all' ? 'No sessions found' : 'No live sessions yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Live sessions you join will appear here'}
            </p>
            <Button onClick={() => { 
              setSearchQuery(''); 
              setFilterStatus('all'); 
            }}>
              {searchQuery || filterStatus !== 'all' ? 'Clear Filters' : 'Browse Courses'}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
