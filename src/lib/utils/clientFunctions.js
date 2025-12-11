'use client'

import { AxiosError } from "axios"
import toast from "react-hot-toast"

export const DefaultErrorMessage = () => {
  return "Something went wrong. Try again in a while."
}

export const handleAxiosError = (error)=>{
    if(error instanceof AxiosError){
        toast.error(error.response?.data.message || DefaultErrorMessage())
    }else{
        toast.error(DefaultErrorMessage())
    }
} 
