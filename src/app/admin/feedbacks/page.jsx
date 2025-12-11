
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Star, Search, TrendingUp, Users, BookOpen, MessageSquare, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminFeedbacksPage() {
  const [ratings, setRatings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  useEffect(() => {
    fetchRatings();
  }, [selectedCourse]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = selectedCourse 
        ? `/api/admin/ratings?courseId=${selectedCourse}`
        : '/api/admin/ratings';
      const response = await axios.get(url);
      setRatings(response.data.data || []);
      setSummary(response.data.summary || {});
    } catch (err) {
      console.error('Error fetching ratings:', err);
      setError(err.response?.data?.message || 'Failed to fetch ratings');
    } finally {
      setLoading(false);
    }
  };

  const filteredRatings = ratings.filter(rating => {
    const searchLower = searchTerm.toLowerCase();
    const courseName = rating.courseId?.title || '';
    const userName = `${rating.userId?.firstName || ''} ${rating.userId?.lastName || ''}`;
    const userEmail = rating.userId?.email || '';
    const review = rating.review || '';
    
    return (
      courseName.toLowerCase().includes(searchLower) ||
      userName.toLowerCase().includes(searchLower) ||
      userEmail.toLowerCase().includes(searchLower) ||
      review.toLowerCase().includes(searchLower)
    );
  });

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-500';
    if (rating >= 3.5) return 'text-blue-500';
    if (rating >= 2.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, delay }) => (
    <div
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </CardContent>
      </Card>
    </div>
  );

  const RatingStars = ({ rating }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Star className="h-8 w-8 text-yellow-400" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Feedback Dashboard</h1>
          <p className="text-slate-600">Monitor and analyze course ratings and reviews</p>
        </motion.div>

        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={MessageSquare}
              title="Total Feedbacks"
              value={summary.totalRatings || 0}
              subtitle="All time reviews"
            />
            <StatCard
              icon={TrendingUp}
              title="Average Rating"
              value={summary.avgRating || '0.0'}
              subtitle="Out of 5.0"
            />
            <StatCard
              icon={BookOpen}
              title="Courses Rated"
              value={summary.byCourse?.length || 0}
              subtitle="With reviews"
            />
            <StatCard
              icon={Users}
              title="Active Reviewers"
              value={new Set(ratings.map(r => r.userId?._id)).size}
              subtitle="Unique users"
            />
          </div>
        )}

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Feedbacks</TabsTrigger>
            <TabsTrigger value="byCourse">By Course</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search by course, user, email, or review..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredRatings.length === 0 ? (
                      <Alert>
                        <AlertDescription>
                          No feedbacks found matching your search criteria.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      filteredRatings.map((rating, index) => (
                        <motion.div
                          key={rating._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                              <div className="flex flex-col md:flex-row md:items-start gap-4">
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h3 className="font-semibold text-lg text-slate-900">
                                        {rating.courseId?.title || 'Unknown Course'}
                                      </h3>
                                      <p className="text-sm text-slate-600">
                                        by {rating.userId?.firstName} {rating.userId?.lastName}
                                        <span className="text-slate-400 ml-2">
                                          ({rating.userId?.email})
                                        </span>
                                      </p>
                                    </div>
                                    <Badge variant={rating.userId?.role === 'student' ? 'secondary' : 'outline'}>
                                      {rating.userId?.role || 'user'}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <RatingStars rating={rating.rating} />
                                    <span className="font-semibold text-slate-900">
                                      {rating.rating}.0
                                    </span>
                                  </div>

                                  {rating.review && (
                                    <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                      "{rating.review}"
                                    </p>
                                  )}

                                  <p className="text-xs text-slate-400">
                                    {new Date(rating.createdAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="byCourse" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Course Performance</CardTitle>
                  <CardDescription>
                    Average ratings and feedback count by course.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {summary?.byCourse?.length === 0 ? (
                      <Alert>
                        <AlertDescription>
                          No course ratings available yet.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      summary?.byCourse?.map((course, index) => (
                        <motion.div
                          key={course.courseId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card 
                            className="hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
                          >
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg text-slate-900 mb-2">
                                    {course.title}
                                  </h3>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <Star className={`h-5 w-5 fill-current ${getRatingColor(parseFloat(course.avgRating))}`} />
                                      <span className={`font-bold text-lg ${getRatingColor(parseFloat(course.avgRating))}`}>
                                        {course.avgRating}
                                      </span>
                                    </div>
                                    <Badge variant="secondary">
                                      {course.count} {course.count === 1 ? 'review' : 'reviews'}
                                    </Badge>
                                  </div>
                                </div>
                                {selectedCourse === course.courseId && (
                                  <Badge variant="default" className="ml-4">
                                    Filtered
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedCourse && filteredRatings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Filtered Feedbacks</CardTitle>
                        <button
                          onClick={() => setSelectedCourse('')}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Clear Filter
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {filteredRatings.map((rating, index) => (
                          <motion.div
                            key={rating._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className="hover:shadow-sm transition-shadow">
                              <CardContent className="pt-4">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <p className="text-sm text-slate-600">
                                      {rating.userId?.firstName} {rating.userId?.lastName}
                                      <span className="text-slate-400 ml-2">
                                        ({rating.userId?.email})
                                      </span>
                                    </p>
                                    <Badge variant="secondary" className="text-xs">
                                      {rating.userId?.role}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <RatingStars rating={rating.rating} />
                                    <span className="font-semibold">{rating.rating}.0</span>
                                  </div>

                                  {rating.review && (
                                    <p className="text-slate-700 text-sm bg-slate-50 p-2 rounded border border-slate-200">
                                      "{rating.review}"
                                    </p>
                                  )}

                                  <p className="text-xs text-slate-400">
                                    {new Date(rating.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}