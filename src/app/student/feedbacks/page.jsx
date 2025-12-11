'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, Calendar, ChevronRight, BookOpen, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { handleAxiosError } from '@/lib/utils/clientFunctions';
import { useRouter } from 'next/navigation';

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my/ratings', { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch feedbacks');
      }
      
      const result = await response.json();
      setFeedbacks(result.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      handleAxiosError(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`w-5 h-5 ${
          index < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-gray-200 text-gray-200'
        }`}
      />
    ));
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = feedback.courseId?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          feedback.review?.toLowerCase().includes(searchQuery.toLowerCase());
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

  const averageRating = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-yellow-50">
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
            My Course Feedbacks
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-orange-100 max-w-2xl"
          >
            View and manage all your course reviews and ratings in one place.
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
          <Card className="bg-white border-l-4 border-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
                  <p className="text-3xl font-bold text-orange-600">{feedbacks.length}</p>
                </div>
                <MessageSquare className="w-12 h-12 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-l-4 border-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                  <p className="text-3xl font-bold text-yellow-600">{averageRating}</p>
                </div>
                <Star className="w-12 h-12 text-yellow-600 opacity-20" />
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
                placeholder="Search by course name or review..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{filteredFeedbacks.length} feedback{filteredFeedbacks.length !== 1 ? 's' : ''} found</span>
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
                  <Skeleton className="h-20 w-full mt-4" />
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
              {filteredFeedbacks.map((feedback) => (
                <motion.div
                  key={feedback._id}
                  variants={itemVariants}
                  layout
                  whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all bg-white border-l-4 border-orange-500">
                    <div className="flex flex-col lg:flex-row">
                      <div className="flex-1 p-6">
                        <div className="mb-4">
                          {feedback.courseId && (
                            <Badge variant="outline" className="text-sm mb-3">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {feedback.courseId.title}
                            </Badge>
                          )}
                          
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex gap-1">
                              {renderStars(feedback.rating)}
                            </div>
                            <span className="text-lg font-bold text-gray-900">
                              {feedback.rating}.0
                            </span>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <p className="text-gray-700 leading-relaxed">
                              "{feedback.review}"
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>Reviewed on {formatDate(feedback.createdAt)}</span>
                            {feedback.updatedAt !== feedback.createdAt && (
                              <span className="text-gray-400">
                                (Updated {formatDate(feedback.updatedAt)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 lg:w-64">
                        <div className="text-center space-y-3 w-full">
                          <Button
                            size="lg"
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => router.push(`/student/courses/${feedback.courseId?._id}`)}
                          >
                            View Course
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {!loading && filteredFeedbacks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchQuery ? 'No feedbacks found' : 'No feedbacks yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery 
                ? 'Try adjusting your search' 
                : 'Start reviewing courses to see your feedbacks here'}
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