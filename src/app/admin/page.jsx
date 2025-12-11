'use client'

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, BookOpen, Star, Video, UserCheck, GraduationCap, FileText, TrendingUp } from 'lucide-react';
import axios from 'axios';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/dashboard');
      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <Alert variant="destructive">
          <AlertDescription>Error loading dashboard: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = data?.stats || {};
  const charts = data?.charts || {};

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500', change: '+12%' },
    { title: 'Students', value: stats.totalStudents, icon: GraduationCap, color: 'bg-green-500', change: '+8%' },
    { title: 'Teachers', value: stats.totalTeachers, icon: UserCheck, color: 'bg-purple-500', change: '+5%' },
    { title: 'Courses', value: stats.totalCourses, icon: BookOpen, color: 'bg-orange-500', change: '+15%' },
    { title: 'Course Content', value: stats.totalContents, icon: FileText, color: 'bg-pink-500', change: '+20%' },
    { title: 'Ratings', value: stats.totalRatings, icon: Star, color: 'bg-yellow-500', change: '+18%' },
    { title: 'Subscriptions', value: stats.totalSubscriptions, icon: TrendingUp, color: 'bg-cyan-500', change: '+25%' },
    { title: 'Live Sessions', value: stats.totalLiveSessions, icon: Video, color: 'bg-red-500', change: '+10%' }
  ];

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
      opacity: 1
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">Overview of your platform analytics</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {statCards.map((stat, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="hover:shadow-lg transition-shadow duration-300 border-0 bg-white/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">{stat.value?.toLocaleString()}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle>User Growth (Last 30 Days)</CardTitle>
                <CardDescription>Daily new user registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={charts.usersByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="_id" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }} />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-0 bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Course Creation Trend</CardTitle>
                <CardDescription>New courses added daily</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts.coursesByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="_id" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="count" fill="#f97316" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className='mb-10'
          >
            <Card className="border-0 bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-cyan-500" />
                  Most Subscribed Courses
                </CardTitle>
                <CardDescription>Popular courses by enrollment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {charts.mostSubscribed?.map((course, index) => (
                    <div key={course.courseId} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <p className="font-medium text-slate-800">{course.title}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-cyan-100 px-3 py-1 rounded-full">
                        <Users className="h-4 w-4 text-cyan-600" />
                        <span className="font-bold text-cyan-700">{course.subs}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Latest platform activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.recentActivities?.slice(0, 8).map((activity) => {
                  const getActivityIcon = () => {
                    if (activity.type === 'course_created') return <BookOpen className="h-4 w-4" />;
                    if (activity.type === 'rating_received') return <Star className="h-4 w-4" />;
                    return <Video className="h-4 w-4" />;
                  };

                  const getActivityColor = () => {
                    if (activity.type === 'course_created') return 'bg-blue-100 text-blue-600';
                    if (activity.type === 'rating_received') return 'bg-yellow-100 text-yellow-600';
                    return 'bg-red-100 text-red-600';
                  };

                  return (
                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className={`p-2 rounded-lg ${getActivityColor()}`}>
                        {getActivityIcon()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          {activity.type === 'course_created' && `New course: ${activity.title}`}
                          {activity.type === 'rating_received' && `Received ${activity.rating} star rating`}
                          {activity.type === 'session_created' && `Live session: ${activity.title}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(activity.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}