"use client"

import { useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

export default function AxiosInterceptor() {
  const { logout } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // If we get a 401, it means the token is invalid or expired
        if (error.response?.status === 401) {
          console.warn("Unauthorized access - Redirecting to login")
          logout()
          // Use window.location to ensure a hard refresh of the auth state if needed,
          // or just router.push
          router.push('/login')
        }
        return Promise.reject(error)
      }
    )

    return () => {
      axios.interceptors.response.eject(interceptor)
    }
  }, [logout, router])

  return null
}
