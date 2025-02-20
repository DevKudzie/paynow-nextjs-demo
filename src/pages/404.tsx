import Link from 'next/link';
import { HomeIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-dark-400">404</h1>
        <p className="mt-4 text-xl text-dark-300">Page not found</p>
        <Link 
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-blue-500 hover:text-blue-400"
        >
          <HomeIcon className="h-5 w-5" />
          Return Home
        </Link>
      </div>
    </div>
  );
} 