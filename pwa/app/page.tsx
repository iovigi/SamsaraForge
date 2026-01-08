'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from './landing/page';

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, []);

  // While checking, or if not logged in, show Landing Page.
  // Ideally, we might want to check token validity, but for now existence is enough for redirect.
  // If not logged in, we render LandingPage (which is now a component we can reuse or just import the page content).
  // Note: Importing page from another route is tricky in Next.js app dir if it's default export.
  // It's better to render the Landing UI here if not logged in.
  // But since I moved it to `app/landing/page.tsx`, I can import it if it's exported as a component.
  // However, next.js pages are server components by default (though this one is 'use client').

  if (!isClient) return null; // Avoid hydration mismatch

  if (localStorage.getItem('token')) {
    return <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', color: 'white' }}>Loading Dashboard...</div>;
  }

  return <LandingPage />;
}
