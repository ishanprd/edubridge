'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function useLogout() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'LOGOUT'
        });
      }

      router.push('/');
      router.refresh();
      
    } catch (error) {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'LOGOUT'
        });
      }
      router.push('/');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}