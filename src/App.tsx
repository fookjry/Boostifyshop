import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { BuyVPN } from './pages/BuyVPN';
import { Topup } from './pages/Topup';
import { Tutorial } from './pages/Tutorial';
import { Admin } from './pages/Admin';
import { UserManagement } from './pages/admin/UserManagement';
import { ServerManagement } from './pages/admin/ServerManagement';
import { Transactions } from './pages/admin/Transactions';
import { NetworkManagement } from './pages/admin/NetworkManagement';
import { AdminDeviceOptions } from './pages/AdminDeviceOptions';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';

import { handleFirestoreError, OperationType } from './lib/firestore-errors';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>({ siteName: 'VPNSaaS', logoUrl: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSettings(data);
        
        // Update document title
        if (data.siteName) {
          document.title = data.siteName;
        }
        
        // Update favicon
        if (data.logoUrl) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = data.logoUrl;
        }
      }
    });

    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      // Clean up previous profile listener if it exists
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      setUser(u);
      if (u) {
        const userDoc = doc(db, 'users', u.uid);
        try {
          const snap = await getDoc(userDoc);
          if (!snap.exists()) {
            const newProfile = {
              email: u.email,
              balance: 0,
              role: u.email === 'jry.fook@gmail.com' ? 'admin' : 'user',
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(userDoc, newProfile);
              setProfile(newProfile);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${u.uid}`);
            }
          } else {
            profileUnsub = onSnapshot(userDoc, (doc) => {
              setProfile(doc.data());
            }, (error) => {
              // Only report error if we are still authenticated as this user
              if (auth.currentUser?.uid === u.uid) {
                handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
              }
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubSettings();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
          <Navbar user={user} profile={profile} settings={settings} />
          <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
            <Routes>
              <Route path="/" element={<Home settings={settings} />} />
              <Route path="/login" element={!user ? <Login settings={settings} /> : <Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={user ? <Dashboard user={user} profile={profile} /> : <Navigate to="/login" />} />
              <Route path="/buy" element={user ? <BuyVPN user={user} profile={profile} /> : <Navigate to="/login" />} />
              <Route path="/topup" element={user ? <Topup user={user} profile={profile} /> : <Navigate to="/login" />} />
              <Route path="/tutorial" element={<Tutorial />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={profile?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
              <Route path="/admin/users" element={profile?.role === 'admin' ? <UserManagement /> : <Navigate to="/" />} />
              <Route path="/admin/servers" element={profile?.role === 'admin' ? <ServerManagement /> : <Navigate to="/" />} />
              <Route path="/admin/networks" element={profile?.role === 'admin' ? <NetworkManagement /> : <Navigate to="/" />} />
              <Route path="/admin/devices" element={profile?.role === 'admin' ? <AdminDeviceOptions /> : <Navigate to="/" />} />
              <Route path="/admin/transactions" element={profile?.role === 'admin' ? <Transactions /> : <Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}
