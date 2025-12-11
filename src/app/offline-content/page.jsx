'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, FileText, Download, CheckCircle2, 
  Wifi, WifiOff, Loader2, AlertCircle,
  View
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

export default function OfflineContentPage() {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();
  const LAST_ONLINE_PATH_KEY = 'edubridge:last-online-path';

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

 useEffect(() => {
  loadCachedContents();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then(() => loadCachedContents())
      .catch(() => {});
  }
}, []);

  useEffect(() => {
    const redirectIfOnline = () => {
      if (!navigator.onLine) return;
      try {
        const target = localStorage.getItem(LAST_ONLINE_PATH_KEY) || '/';
        router.replace(target);
      } catch {
        router.replace('/');
      }
    };

    // If the user lands here while already back online, bounce them back immediately
    redirectIfOnline();

    window.addEventListener('online', redirectIfOnline);
    return () => {
      window.removeEventListener('online', redirectIfOnline);
    };
  }, [router]);

  const loadCachedContents = async () => {
    try {
      setLoading(true);
      const allContents = [];
      
      const cacheNames = await caches.keys();
      
      const apiCaches = cacheNames.filter(name => name.startsWith('api-'));
      
      for (const cacheName of apiCaches) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        const contentRequests = requests.filter(req => 
          req.url.includes('/api/contents?courseId=')
        );
        
        for (const request of contentRequests) {
          const response = await cache.match(request);
          if (response) {
            const data = await response.json();
            if (data?.data && Array.isArray(data.data)) {
              const url = new URL(request.url);
              const courseId = url.searchParams.get('courseId');
              
              allContents.push(...data.data.map(content => ({
                ...content,
                courseId: content.courseId || courseId
              })));
            }
          }
        }
      }
      
      const uniqueContents = allContents.filter((content, index, self) =>
        index === self.findIndex(c => c._id === content._id)
      );
      
      setContents(uniqueContents);
    } catch (err) {
      console.error('Error loading cached contents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOnline || !contents.length) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const pdfs = contents
      .map((c) => c?.pdfUrl || "")
      .filter((u) => typeof u === "string" && u.trim().length);

    if (!pdfs.length) return;

    navigator.serviceWorker.ready
      .then((reg) => {
        const target = navigator.serviceWorker.controller || reg.active;
        target?.postMessage({ type: "CACHE_PDFS", pdfs });
      })
      .catch(() => {});
  }, [contents, isOnline]);

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading cached contents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                <BookOpen className="w-8 h-8" />
                Offline Contents
              </h1>
              <p className="text-blue-100">
                Access your cached course materials
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge className="bg-green-500 text-white gap-2">
                  <Wifi className="w-4 h-4" />
                  Online
                </Badge>
              ) : (
                <Badge className="bg-orange-500 text-white gap-2">
                  <WifiOff className="w-4 h-4" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!isOnline && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <WifiOff className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">You're Offline</AlertTitle>
            <AlertDescription className="text-orange-700">
              Showing cached contents only. Connect to internet for updated materials.
            </AlertDescription>
          </Alert>
        )}

        {contents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No Cached Contents
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                Visit some courses while online to cache their contents for offline access.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Available Contents ({contents.length})
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {contents.map((content, index) => (
                  <motion.div
                    key={content._id}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="h-full hover:shadow-xl transition-all duration-300 border-border hover:border-blue-300 group">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <Badge variant="outline" className="text-xs">
                            Module {content.position || index + 1}
                          </Badge>
                          {content.pdfUrl && (
                            <FileText className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <CardTitle className="text-lg font-bold group-hover:text-blue-600 transition-colors">
                          {content.title}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {content.description && (
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {content.description}
                          </p>
                        )}

                        {content.whatToLearn && content.whatToLearn.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              What you'll learn
                            </h4>
                            <div className="space-y-1">
                              {content.whatToLearn.slice(0, 3).map((item, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                  <div className="mt-1.5 h-1 w-1 rounded-full bg-blue-600 flex-shrink-0" />
                                  <span className="line-clamp-1">{item}</span>
                                </div>
                              ))}
                              {content.whatToLearn.length > 3 && (
                                <p className="text-xs text-gray-500 pl-3">
                                  +{content.whatToLearn.length - 3} more
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {content.pdfUrl && content.pdfName && (
                          <div className="pt-4 border-t border-gray-200">
                            <a
                              href={content.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <Button 
                                variant="outline" 
                                className="w-full group-hover:bg-blue-50 group-hover:border-blue-300 transition-colors"
                                size="sm"
                              >
                                <View className="w-4 h-4 mr-2" />
                                {content.pdfName}
                              </Button>
                            </a>
                          </div>
                        )}

                        {content.createdAt && (
                          <div className="text-xs text-gray-400 pt-2">
                            Added {new Date(content.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
