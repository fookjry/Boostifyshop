import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Megaphone } from 'lucide-react';

export function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setAnnouncement(doc.data().announcement || '');
      }
    });
    return () => unsub();
  }, []);

  if (!announcement) return null;

  return (
    <div className="bg-blue-600/20 border-b border-blue-500/30 backdrop-blur-md py-2 overflow-hidden relative z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">
        <div className="flex-shrink-0 bg-blue-500/20 p-1.5 rounded-lg border border-blue-400/30">
          <Megaphone className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="whitespace-nowrap animate-marquee inline-block">
            <span className="text-sm font-medium text-blue-100 px-4">
              {announcement}
            </span>
            {/* Duplicate for seamless loop */}
            <span className="text-sm font-medium text-blue-100 px-4">
              {announcement}
            </span>
            <span className="text-sm font-medium text-blue-100 px-4">
              {announcement}
            </span>
            <span className="text-sm font-medium text-blue-100 px-4">
              {announcement}
            </span>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />
    </div>
  );
}
