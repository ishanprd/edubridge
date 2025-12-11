'use client'

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import React from 'react'

const NotFound = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <motion.div 
        className="bg-white rounded-2xl p-12 max-w-md w-full text-center" 
        style={{
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{
          background: '#fef5e7',
          color: '#d97706'
        }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-sm font-medium">404 Error</span>
        </div>
        
        <h1 className="text-3xl font-bold mb-3 text-gray-900">Page Not Found</h1>
        <p className="text-base text-gray-600 leading-relaxed mb-8">
          Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or the URL might be incorrect.
        </p>
        
        <div className="flex gap-3 justify-center flex-wrap">
          <motion.button 
            onClick={() => router.back()}
            className="px-7 py-3.5 text-white rounded-lg font-semibold text-base"
            style={{
              background: '#4a5568',
              boxShadow: '0 4px 12px rgba(74, 85, 104, 0.3)'
            }}
            whileHover={{ 
              y: -2,
              background: '#2d3748',
              boxShadow: '0 6px 20px rgba(74, 85, 104, 0.4)'
            }}
            whileTap={{ y: 0 }}
            transition={{ duration: 0.2 }}
          >
            Go Back
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default NotFound