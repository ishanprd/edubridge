'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Video, Clock as ClockIcon } from 'lucide-react';
import { 
  BookOpen, Clock, Users, Star, CheckCircle, Play, 
  FileText, Download, ChevronRight, Award, TrendingUp,
  Calendar, User, Lock, Unlock, AlertCircle,
  Edit,
  CheckCircle2,
  CircleArrowLeft
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { handleAxiosError } from '@/lib/utils/clientFunctions';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CourseDetailPage() {
  const [course, setCourse] = useState(null);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentsLoading, setContentsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [hasRated, setHasRated] = useState(false);
  const [liveSessions, setLiveSessions] = useState([]);
const [sessionsLoading, setSessionsLoading] = useState(false);
  
  const router = useRouter()
  
  const params = useParams();
  const { courseId } = params;

  const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  }

  useEffect(() => {
  if (courseId) {
    fetchCourse();
    fetchContents();
    checkSubscription();
    fetchUserRating();
  }
}, [courseId]);

useEffect(() => {
  if (isSubscribed) {
    fetchLiveSessions();
  }
}, [isSubscribed]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/courses/${courseId}`);
      setCourse(response.data.data);
      setError(null);
    } catch (err) {
      setError(err?.message ?? '')
      handleAxiosError(err)
    } finally {
      setLoading(false);
    }
  };

  const fetchContents = async () => {
    try {
      setContentsLoading(true);
      
      const response = await axios.get(`/api/contents`, {
        params: { courseId }
      });
      
      const items = Array.isArray(response.data?.data) ? response.data.data : [];
      
      const normalized = items.map((it, index) => ({
        _id: it._id || it.id,
        courseId: String(it.courseId || courseId || ""),
        title: it.title ?? "",
        description: it.description ?? "",
        whatToLearn: Array.isArray(it.whatToLearn) ? it.whatToLearn : [],
        pdfUrl: it.pdfUrl || null,
        pdfName: it.pdfName || "",
        position: it.position || index + 1,
        createdAt: it.createdAt || new Date().toISOString()
      }));
      
      setContents(normalized);
      maybePrefetchPdfs(normalized);
    } catch (err) {
      setContents([]);
      console.error('Error fetching contents:', err);
      setError(err?.message ?? '')
      handleAxiosError(err)
    } finally {
      setContentsLoading(false);
    }
  };

  const checkSubscription = async () => {
    try {
      const response = await axios.get(`/api/course-subscriptions`, {
        params: { courseId }
      });
      setIsSubscribed(response.data.subscribed || false);
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const fetchUserRating = async () => {
    try {
      const response = await axios.get(`/api/ratings/${courseId}`);
      if (response.data.hasRated && response.data.data) {
        setUserRating(response.data.data);
        setHasRated(true);
        setSelectedRating(response.data.data.rating);
        setReviewText(response.data.data.review || '');
      }
    } catch (err) {
      console.error('Error fetching user rating:', err);
    }
  };

  const fetchLiveSessions = async () => {
  if (!isSubscribed) return; 
  
  try {
    setSessionsLoading(true);
    const response = await axios.get(`/api/live-sessions/${courseId}`);
    const sessions = Array.isArray(response.data?.data?.sessions) ? response.data.data.sessions : [];
    setLiveSessions(sessions);
  } catch (err) {
    setLiveSessions([]);
    console.error('Error fetching live sessions:', err);
  } finally {
    setSessionsLoading(false);
  }
};

const maybePrefetchPdfs = (items = []) => {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!navigator.onLine) return;

  const urls = items
    .map((it) => it?.pdfUrl || "")
    .filter((u) => typeof u === "string" && u.trim().length);

  if (!urls.length) return;

  navigator.serviceWorker.ready
    .then((reg) => {
      const target = navigator.serviceWorker.controller || reg.active;
      if (!target) return;
      target.postMessage({ type: "CACHE_PDFS", pdfs: urls });
    })
    .catch(() => {});
};

const getSessionStatus = (session) => {
  const now = new Date();
  const start = new Date(session.startDate);
  const end = session.endDate ? new Date(session.endDate) : null;
  
  if (end && now > end) return "past";
  if (now >= start && (!end || now <= end)) return "live";
  return "upcoming";
};

const handleJoinSession = async (sessionId,roomId) => {
  try {
    await axios.post('/api/live-sessions/join', {sessionId});
    router.push(`/live-session/${roomId}`)
  } catch (err) {
    toast.error("Failed to join the session");
    console.error(err);
  }
};


  const handleSubscribe = async () => {
    try {
      setSubscriptionLoading(true);
      
      if (isSubscribed) {
        await axios.delete(`/api/course-subscriptions`, {
          data: { courseId }
        });
        setIsSubscribed(false);
      } else {
        await axios.post(`/api/course-subscriptions`, {
          courseId
        });
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error('Subscription error:', err);
      handleAxiosError(err)
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (selectedRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setSubmittingRating(true);
      
      const method = hasRated ? 'put' : 'post';
      const response = await axios[method]('/api/ratings', {
        courseId,
        rating: selectedRating,
        review: reviewText.trim()
      });

      if (response.data.success) {
        setHasRated(true);
        setUserRating(response.data.data);
        setRatingDialogOpen(false);
        toast.success(hasRated ? 'Rating updated successfully!' : 'Rating submitted successfully!');
      }
    } catch (err) {
      handleAxiosError(err)
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleRatingDialogOpen = () => {
    if (hasRated && userRating) {
      setSelectedRating(userRating.rating);
      setReviewText(userRating.review || '');
    }
    setRatingDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-96 w-full mb-8" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Skeleton className="h-64 w-full" />
            </div>
            <div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 flex items-center justify-center">
        <Alert className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Course</AlertTitle>
          <AlertDescription>
            {error}. Using demo data for preview.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden"
      >
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          
              <div
              onClick={()=>router.push('/student/courses')}
              className='mb-3 flex items-center gap-2 text-lg cursor-pointer'>
                <CircleArrowLeft size={20}/> Back
              </div>
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2"
            >
              <div className="flex items-center gap-3 mb-4">
                {
                    course.tags.map((item,i)=>{
                        return(
                <Badge key={i} className="bg-white text-blue-600 hover:bg-white">
                  {item}
                </Badge>)
                    })
                }
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {course?.title}
              </h1>

              <p className="text-xl text-blue-100 mb-6 leading-relaxed">
                {course?.description}
              </p>

              <div className="flex flex-wrap gap-6 text-sm">
                {course?.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{course.rating}</span>
                    <span className="text-blue-200">
                      ({course.totalRatings?.toLocaleString()} ratings)
                    </span>
                  </div>
                )}
                {course?.studentsEnrolled && (
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span>{course.studentsEnrolled.toLocaleString()} students</span>
                  </div>
                )}
                {course?.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>{course.duration}</span>
                  </div>
                )}
              </div>

              {course?.createdBy && (
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-200">Created by</p>
                    <p className="font-semibold">
                      {course.createdBy.firstName} {course.createdBy.lastName}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white shadow-2xl sticky top-4">
                <CardContent className="space-y-4">
                  <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full h-12"
                        onClick={handleRatingDialogOpen}
                      >
                        <Star className="w-5 h-5 mr-2" />
                        {hasRated ? 'Update Rating' : 'Rate This Course'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Rate This Course</DialogTitle>
                        <DialogDescription>
                          {hasRated ? 'Update your rating and review' : 'Share your experience with this course'}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setSelectedRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="transition-transform hover:scale-110"
                              >
                                <Star
                                  className={`w-10 h-10 ${
                                    star <= (hoverRating || selectedRating)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          {selectedRating > 0 && (
                            <p className="text-sm text-gray-600">
                              You rated {selectedRating} out of 5 stars
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Review (Optional)
                          </label>
                          <Textarea
                            placeholder="Share your thoughts about this course..."
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            className="resize-none"
                          />
                          <p className="text-xs text-gray-500 text-right">
                            {reviewText.length}/1000
                          </p>
                        </div>

                        <Button
                          onClick={handleRatingSubmit}
                          disabled={submittingRating || selectedRating === 0}
                          className="w-full"
                        >
                          {submittingRating ? (
                            'Submitting...'
                          ) : hasRated ? (
                            'Update Rating'
                          ) : (
                            'Submit Rating'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    onClick={handleSubscribe}
                    disabled={subscriptionLoading}
                    className="w-full h-12 text-lg"
                    variant={isSubscribed ? 'outline' : 'default'}
                  >
                    {subscriptionLoading ? (
                      <>Loading...</>
                    ) : isSubscribed ? (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Subscribed
                      </>
                    ) : (
                      <>
                        <Award className="w-5 h-5 mr-2" />
                        Subscribe Now
                      </>
                    )}
                  </Button>
                  {hasRated && userRating && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600 mb-2">Your Rating:</p>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= userRating.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm font-semibold">{userRating.rating}/5</span>
                      </div>
                      {userRating.review && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          "{userRating.review}"
                        </p>
                      )}
                    </div>
                  )}

                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Join Live session</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Subscribe to Support Teacher</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Email Notification on Content Updates and live sessions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="md:col-span-2 space-y-8"
          >

{isSubscribed && (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Video className="w-6 h-6 text-green-600" />
          Live Sessions
        </CardTitle>
        {liveSessions.length > 0 && (
          <Badge variant="outline">
            {liveSessions.length} {liveSessions.length === 1 ? 'Session' : 'Sessions'}
          </Badge>
        )}
      </div>
      <CardDescription>
        Join live sessions with your instructor
      </CardDescription>
    </CardHeader>
    <CardContent>
      {sessionsLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : liveSessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No live sessions scheduled yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {liveSessions
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
            .map((session) => {
              const status = getSessionStatus(session);
              
              return (
                <motion.div
                  key={session._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg border transition-all ${
                    status === 'live' 
                      ? 'border-green-200 bg-green-50' 
                      : status === 'past'
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{session.title}</h4>
                        {status === 'live' && (
                          <Badge className="bg-green-500 text-white text-xs">
                            <div className="h-1.5 w-1.5 bg-white rounded-full mr-1 animate-pulse" />
                            Live
                          </Badge>
                        )}
                        {status === 'past' && (
                          <Badge variant="outline" className="text-xs">
                            Past
                          </Badge>
                        )}
                        {status === 'upcoming' && (
                          <Badge variant="secondary" className="text-xs">
                            Upcoming
                          </Badge>
                        )}
                      </div>
                      {session.description && (
                        <p className="text-xs text-gray-600 mb-2">{session.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(session.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {new Date(session.startDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {(status === 'live' || status === 'upcoming') && (
                        <Button
                        onClick={()=>handleJoinSession(session._id,session.roomId)}
                        size="sm" className="bg-green-500 hover:bg-green-600">
                          <Video className="w-3 h-3 mr-1" />
                          Join
                        </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}
    </CardContent>
  </Card>
)}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    Course Contents
                  </CardTitle>
                  <Badge variant="outline">
                    {contents.length} {contents.length === 1 ? 'Lesson' : 'Lessons'}
                  </Badge>
                </div>
                <CardDescription>
                  Access all course materials and resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : contents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No content available yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                        
                {contents.map((c, index) => (
                  <motion.div
                    key={index}
                    variants={cardVariants}
                    transition={{ duration: 0.3 }}
                    layout
                  >
                    <Card className="border-border hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden group">
                      <CardContent className="p-0">
                        <div className="flex flex-col lg:flex-row">
                          <div className="lg:w-20 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-6 lg:p-0">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-primary">{String(index + 1).padStart(2, '0')}</div>
                              <div className="text-xs text-muted-foreground hidden lg:block">Module</div>
                            </div>
                          </div>

                          <div className="flex-1 p-6 lg:p-8">
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                  {c.title}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                  {c.description || "No description provided"}
                                </p>
                              </div>
                            </div>

                            {Array.isArray(c.whatToLearn) && c.whatToLearn.length > 0 && (
                              <div className="mb-4">
                                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                  What you'll learn
                                </h4>
                                <div className="grid sm:grid-cols-2 gap-2">
                                  {c.whatToLearn.map((w, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm">
                                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                      <span className="text-foreground">{w}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50">
                              
                              {c.pdfName && (
                                <Link
                                href={`${c.pdfUrl}`}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium text-foreground">{c.pdfName}</span>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-semibold">0%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
                
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Lessons</span>
                    <span className="font-semibold">{contents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-semibold">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Remaining</span>
                    <span className="font-semibold">{contents.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Share This Course</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Share this course with your friends and colleagues
                </p>
                <Button variant="outline" className="w-full">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Share Course
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
