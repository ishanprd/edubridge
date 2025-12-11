'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, Clock, Users, Grid, List, ChevronRight, Star, PlayCircle, CheckCircle, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { handleAxiosError } from '@/lib/utils/clientFunctions';
import { useRouter } from 'next/navigation';

export default function MyCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const router = useRouter();

  useEffect(() => {
    fetchSubscribedCourses();
  }, []);

  const fetchSubscribedCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my/course-subscriptions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscribed courses');
      }
      
      const result = await response.json();
      setCourses(result.data || []);
      console.log(result.data)
      setError(null);
    } catch (err) {
      setError(err.message);
      handleAxiosError(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.courseId.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.courseId.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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

  const getProgressPercentage = (course) => {
    if (!course.progress) return 0;
    return Math.round(course.progress);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
            My Courses
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-blue-100 max-w-2xl"
          >
            Continue your learning journey.
          </motion.p>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 gap-4 mb-8"
        >
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Courses</p>
                  <p className="text-3xl font-bold text-blue-600">{courses.length}</p>
                </div>
                <BookOpen className="w-12 h-12 text-blue-600 opacity-20" />
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
                placeholder="Search your courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white shadow-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{filteredCourses.length} courses enrolled</span>
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
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card className={''} key={i}>
                <CardHeader className={''}>
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-6 w-3/4 mt-4" />
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
            className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
          >
            <AnimatePresence>
              {filteredCourses.map((course) => {
                const progress = getProgressPercentage(course);
                const isCompleted = progress === 100;
                
                return (
                  <motion.div
                    key={course.courseId._id}
                    variants={itemVariants}
                    layout
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  >
                    <Card className="h-full overflow-hidden hover:shadow-xl transition-shadow bg-white">
                      {viewMode === 'grid' ? (
                        <>
                          {course.courseId.thumbnail && (
                            <div className="relative h-48 overflow-hidden">
                              <img
                                src={course.courseId.thumbnail}
                                alt={course.courseId.title}
                                className="w-full h-full object-cover"
                              />
                              {isCompleted && (
                                <Badge variant={'default'} className="absolute top-3 right-3 bg-green-500 text-white">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                              {course.courseId.level && !isCompleted && (
                                <Badge variant={'default'} className="absolute top-3 right-3 bg-white text-blue-600">
                                  {course.courseId.level}
                                </Badge>
                              )}
                            </div>
                          )}
                          <CardHeader className={''}>
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="outline" className="text-xs">
                                Subscribed
                              </Badge>
                            </div>
                            <CardTitle className="line-clamp-2">{course.courseId.title}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {course.courseId.description}
                            </CardDescription>
                          </CardHeader>
                          <CardFooter className="flex items-center justify-between">
                            <Button 
                              onClick={() => router.push(`/student/courses/${course.courseId._id}`)}
                              className="ml-auto"
                            >View
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </CardFooter>
                        </>
                      ) : (
                        <div className="flex flex-col md:flex-row">
                          {course.courseId.thumbnail && (
                            <div className="relative w-full md:w-64 h-48 overflow-hidden">
                              <img
                                src={course.courseId.thumbnail}
                                alt={course.courseId.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 p-6">
                            <div className="flex items-start justify-between mb-2">
                              <Badge className={''} variant="outline">Subscribed</Badge>
                            </div>
                            <h3 className="text-xl font-bold mb-2">{course.courseId.title}</h3>
                            <p className="text-gray-600 mb-4 line-clamp-2">{course.courseId.description}</p>

                            <div className="flex items-center justify-between">
                              <Button
                                onClick={() => router.push(`/student/courses/${course.courseId._id}`)}
                              >
                                View
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {!loading && filteredCourses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchQuery ? 'No courses found' : 'No enrolled courses yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Start learning by enrolling in a course'}
            </p>
            <Button onClick={() => {
              if (searchQuery) {
                setSearchQuery('');
              } else {
                router.push('/student/courses');
              }
            }}>
              {searchQuery ? 'Clear Search' : 'Browse Courses'}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}