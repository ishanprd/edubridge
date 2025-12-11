'use client'

import React, { useEffect, useState } from 'react'
import {
  BookOpen,
  Download,
  Palette,
  MessageSquare,
  Home,
  Settings,
  LogOut,
  Menu,
  X,
  Monitor,
  User,
} from "lucide-react"
import {motion} from 'framer-motion'
import Link from 'next/link'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useLogout } from '@/lib/logout'
import { handleAxiosError } from '@/lib/utils/clientFunctions'
import axios from 'axios'

const Sidebar = () => {

  const router = useRouter()
  const [activeSection, setActiveSection] = useState("overview")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [profileInfo,setProfileInfo] = useState()
  const { logout, isLoggingOut } = useLogout();

  
    const getMe = async()=>{
      try{
        const response = await axios.get('/api/auth/me', {
					withCredentials: true
				})
        setProfileInfo(response.data.data.user)
      }catch(error){
        handleAxiosError(error)
      }
    }

  useEffect(()=>{
    getMe()
  },[])

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: Home, href:'/admin'},
    { id: "courses", label: "Courses", icon: BookOpen, href:'/admin/courses'},
    { id: "live", label: "Live Sessions", icon: Monitor, href:'/admin/live-sessions'},
    { id: "users", label: "Users", icon: User, href:'/admin/users'},
    { id: "feedback", label: "Feedback", icon: MessageSquare, href:'/admin/feedbacks'},
  ]

  const handleNavigation = (item) => {
    setActiveSection(item.id)
    router.push(item.href)
    setIsSidebarOpen(false)
  }
  
  const slideInLeft = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3 },
  }

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-card-foreground">EduBridge</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle menu"
        >
          {isSidebarOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </header>

      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30 mt-14"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <motion.div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 mt-14 md:mt-0`}
        variants={slideInLeft}
        initial="initial"
        animate="animate"
      >
        <div className="flex flex-col h-full">
          <div className="hidden md:block p-6 border-b border-border">
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-card-foreground">EduBridge</span>
            </Link>
          </div>

          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={"/placeholder.svg"} />
                <AvatarFallback>
                  {profileInfo?.firstName?.charAt(0)}{profileInfo?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-card-foreground">{profileInfo?.firstName} {profileInfo?.lastName}</h3>
                <p className="text-sm text-muted-foreground">{profileInfo?.role}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {sidebarItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-card-foreground hover:bg-muted/50"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-border">
            <Button
            onClick={logout}
            disabled={isLoggingOut}
            variant="ghost" className="w-full justify-start text-muted-foreground hover:text-card-foreground">
              <LogOut className="h-5 w-5 mr-3" />
              {isLoggingOut ? 'Logging out' : 'Logout'}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  )
}

export default Sidebar