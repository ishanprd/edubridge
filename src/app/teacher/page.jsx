
'use client'

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  BookOpen, Star, Video, TrendingUp, Clock, Award,
  ChevronRight, Calendar, Activity, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalRatings: 0,
    liveSessionsHosted: 0,
    avgRating: '0.0'
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get('/api/teacher/dashboard');
      const { stats, recentActivities } = res.data || {};
      setStats({
        totalCourses: stats?.totalCourses || 0,
        totalRatings: stats?.totalRatings || 0,
        liveSessionsHosted: stats?.liveSessionsHosted || 0,
        avgRating: stats?.avgRating || '0.0'
      });
      setRecentActivities(recentActivities || []);

    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, change, loading }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-shadow border-l-4 border-blue-500">
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-full ${
                  color === 'blue' ? 'bg-blue-100' :
                  color === 'yellow' ? 'bg-yellow-100' :
                  color === 'green' ? 'bg-green-100' :
                  'bg-purple-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    color === 'blue' ? 'text-blue-600' :
                    color === 'yellow' ? 'text-yellow-600' :
                    color === 'green' ? 'text-green-600' :
                    'text-purple-600'
                  }`} />
                </div>
                {change && (
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {change}%
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
          <Skeleton className="h-96 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-6 h-6" />
                <div>
                  <h3 className="font-semibold">Error Loading Dashboard</h3>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <Button variant="outline" className="mt-4" onClick={fetchDashboardData}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Teacher Dashboard</h1>
          <p className="text-gray-600">Monitor your teaching impact and activity</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Courses Created" value={stats.totalCourses} icon={BookOpen} color="blue" loading={false} />
          <StatCard title="Ratings Received" value={stats.totalRatings} icon={Star} color="yellow" loading={false} />
          <StatCard title="Live Sessions Hosted" value={stats.liveSessionsHosted} icon={Video} color="green" loading={false} />
          <StatCard title="Average Course Rating" value={stats.avgRating} icon={Award} color="purple" loading={false} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  Recent Activities
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/activity')}>
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent activities</p>
                  <Button variant="outline" className="mt-4" onClick={() => router.push('/teacher/courses')}>
                    Create a Course
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((activity, index) => {
                    const iconMap = {
                      course_created: BookOpen,
                      rating_received: Star,
                      session_created: Video
                    };
                    const Icon = iconMap[activity.type] || Activity;
                    const colorMap = {
                      course_created: 'bg-blue-100 text-blue-600',
                      rating_received: 'bg-yellow-100 text-yellow-600',
                      session_created: 'bg-green-100 text-green-600'
                    };

                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className={`p-2 rounded-full ${colorMap[activity.type] || 'bg-gray-100 text-gray-600'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {activity.type === 'course_created' && 'Created '}
                            {activity.type === 'rating_received' && 'Received rating for '}
                            {activity.type === 'session_created' && 'Hosted '}
                            <span className="text-gray-600">{activity.title}</span>
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(activity.date).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(activity.date).toLocaleTimeString('en-US', {
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        {activity.rating && (
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < activity.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
