import type { AppProps } from 'next/app'
import Layout from '@/components/Layout'
import { useThemeStore } from '@/utils/theme'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }: AppProps) {
  const { isDarkMode } = useThemeStore()
  const router = useRouter()

  useEffect(() => {
    // Apply dark mode class to html element
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Don't wrap payment pages with Layout
  if (router.pathname.startsWith('/payment/')) {
    return <Component {...pageProps} />
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
} 