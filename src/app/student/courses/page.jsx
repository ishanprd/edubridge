'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, Clock, Users, Filter, Grid, List, ChevronRight, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { handleAxiosError } from '@/lib/utils/clientFunctions';
import { useRouter } from 'next/navigation';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const router = useRouter()
  

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/courses');
      
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      
      const result = await response.json();
      setCourses(result.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      handleAxiosError(err)
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses
    .filter(course => {
      const matchesSearch = course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })

  const categories = ['all', ...new Set(courses.map(c => c.category).filter(Boolean))];

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
            Explore Our Courses
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-blue-100 max-w-2xl"
          >
            Discover world-class courses taught by industry experts. Learn at your own pace and advance your career.
          </motion.p>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 py-8">
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
                placeholder="Search courses..."
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
            <span>{filteredCourses.length} courses found</span>
            {error && (
              <Alert className="mb-4 bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800">
                  Using demo data. Update the API endpoint in fetchCourses()
                </AlertDescription>
              </Alert>
            )}
          </div>
        </motion.div>

        {loading && (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardHeader>
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
              {filteredCourses.map((course) => (
                <motion.div
                  key={course._id}
                  variants={itemVariants}
                  layout
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                >
                  <Card className="h-full overflow-hidden hover:shadow-xl transition-shadow bg-white">
                    {viewMode === 'grid' ? (
                      <>
                        {course.thumbnail && (
                          <div className="relative h-48 overflow-hidden">
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                            {course.level && (
                              <Badge className="absolute top-3 right-3 bg-white text-blue-600">
                                {course.level}
                              </Badge>
                            )}
                          </div>
                        )}
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              {course.category || 'General'}
                            </Badge>
                            {course.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{course.rating}</span>
                              </div>
                            )}
                          </div>
                          <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {course.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm text-gray-600">
                            {course.instructor && (
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                <span>{course.instructor}</span>
                              </div>
                            )}
                            {course.duration && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{course.duration}</span>
                              </div>
                            )}
                            {course.students && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>{course.students.toLocaleString()} students</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="flex items-center justify-between">
                          {course.price !== undefined && (
                            <span className="text-2xl font-bold text-blue-600">
                              ${course.price}
                            </span>
                          )}
                          <Button 
                          onClick={()=>router.push(`/student/courses/${course._id}`)}
                          className="ml-auto">
                            View
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </CardFooter>
                      </>
                    ) : (
                      <div className="flex flex-col md:flex-row">
                        {course.thumbnail && (
                          <div className="relative w-full md:w-64 h-48 overflow-hidden">
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline">{course.category || 'General'}</Badge>
                            {course.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{course.rating}</span>
                              </div>
                            )}
                          </div>
                          <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                          <p className="text-gray-600 mb-4">{course.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                            {course.instructor && (
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                <span>{course.instructor}</span>
                              </div>
                            )}
                            {course.duration && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{course.duration}</span>
                              </div>
                            )}
                            {course.students && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>{course.students.toLocaleString()} students</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            {course.price !== undefined && (
                              <span className="text-2xl font-bold text-blue-600">
                                ${course.price}
                              </span>
                            )}
                            <Button
                                onClick={()=>router.push(`/student/courses/${course._id}`)}
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
              ))}
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
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No courses found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
            <Button onClick={() => { setSearchQuery(''); }}>
              Clear Filters
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}