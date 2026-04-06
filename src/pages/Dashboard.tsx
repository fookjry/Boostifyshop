import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Copy, QrCode, Clock, Server, Globe, CheckCircle2, AlertCircle, MessageSquare, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { Link } from 'react-router-dom';

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function Dashboard({ user, profile }: { user: any; profile: any }) {
  const [vpns, setVpns] = useState<any[]>([]);
  const [selectedVpn, setSelectedVpn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [discordInvite, setDiscordInvite] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setDiscordInvite(doc.data().discordInvite || '');
      }
    });

    const path = 'vpns';
    const q = query(collection(db, path), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVpns(list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => {
      unsubscribe();
      unsubSettings();
    };
  }, [user.uid]);

  const allFilteredVpns = vpns.filter(v => {
    const expireDate = new Date(v.expireAt);
    const now = new Date();
    const isExpired = expireDate <= now;
    
    // Hide if expired more than 48 hours
    const hoursSinceExpired = (now.getTime() - expireDate.getTime()) / (1000 * 60 * 60);
    if (isExpired && hoursSinceExpired > 48) return false;

    if (filter === 'active') return !isExpired;
    if (filter === 'expired') return isExpired;
    return true;
  });

  const totalPages = Math.ceil(allFilteredVpns.length / itemsPerPage);
  const filteredVpns = allFilteredVpns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">แดชบอร์ด VPN ของฉัน</h1>
          <p className="text-slate-400">จัดการการตั้งค่าและการใช้งานของคุณ</p>
        </div>
        <div className="flex items-center gap-4">
          {discordInvite && (
            <a 
              href={discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-4 rounded-2xl flex items-center gap-3 font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              <MessageSquare className="w-6 h-6 fill-white" />
              <span>ติดต่อ Discord</span>
            </a>
          )}
          <div className="bg-slate-900 px-6 py-4 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-xl">
              <Shield className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">การตั้งค่าที่ใช้งานอยู่</p>
              <p className="text-2xl font-bold text-white">{vpns.filter(v => new Date(v.expireAt).getTime() > Date.now()).length}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex p-1 bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-md">
        {[
          { id: 'all', label: 'ทั้งหมด' },
          { id: 'active', label: 'ใช้งานอยู่' },
          { id: 'expired', label: 'หมดอายุ' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              filter === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-900 rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredVpns.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVpns.map((vpn) => (
            <motion.div 
              key={vpn.id}
              layoutId={vpn.id}
              onClick={() => setSelectedVpn(vpn)}
              className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${vpn.network === 'AIS' ? 'bg-lime-500/10 text-lime-500' : 'bg-red-500/10 text-red-500'}`}>
                  {vpn.network}
                </div>
                <div className="flex items-center gap-2">
                  {vpn.isTrial && (
                    <div className="bg-amber-500/20 text-amber-500 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1">
                      <Gift className="w-3 h-3" /> ทดลองใช้งาน
                    </div>
                  )}
                  {(() => {
                    const isExpired = new Date(vpn.expireAt) <= new Date();
                    return (
                      <div className={`flex items-center gap-1 text-xs font-bold ${!isExpired ? 'text-emerald-500' : 'text-red-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${!isExpired ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        {!isExpired ? 'ใช้งานอยู่' : 'หมดอายุ'}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-500" />
                {vpn.serverName || 'Singapore Premium'}
              </h3>

              <div className="space-y-2 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {(() => {
                    const expireDate = new Date(vpn.expireAt);
                    const now = new Date();
                    const isExpired = expireDate <= now;
                    const hoursSinceExpired = (now.getTime() - expireDate.getTime()) / (1000 * 60 * 60);

                    if (isExpired && hoursSinceExpired > 12) {
                      return <span>หมดอายุ จะถูกลบข้อมูลในไม่ช้า</span>;
                    }
                    return <span>หมดอายุ {formatDistanceToNow(expireDate, { addSuffix: true, locale: th })}</span>;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>{vpn.uuid.substring(0, 8)}...</span>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(vpn.config); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> คัดลอก
                </button>
                <button className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors">
                  <QrCode className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
          <Shield className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">ไม่พบ VPN</h3>
          <p className="text-slate-500 mb-8 text-sm">คุณยังไม่ได้ซื้อการตั้งค่า VPN ใดๆ</p>
          <Link to="/buy" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all">
            ซื้อ VPN ตัวแรกของคุณ
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-10 h-10 rounded-xl font-bold transition-all ${
                currentPage === page
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedVpn && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVpn(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-800 p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white">การตั้งค่า VPN</h2>
                  <p className="text-slate-400 text-sm">นำเข้านี้ไปยังแอป V2Ray/V2Box ของคุณ</p>
                </div>
                <button onClick={() => setSelectedVpn(null)} className="text-slate-500 hover:text-white">
                  <AlertCircle className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-8">
                <div className="bg-white p-4 rounded-2xl shadow-xl">
                  <QRCodeSVG value={selectedVpn.config} size={200} />
                </div>

                <div className="w-full space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 break-all text-xs font-mono text-blue-400 relative group">
                    {selectedVpn.config}
                    <button 
                      onClick={() => copyToClipboard(selectedVpn.config)}
                      className="absolute top-2 right-2 bg-slate-800 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">เครือข่าย</p>
                      <p className="text-white font-bold">{selectedVpn.network}</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">หมดอายุใน</p>
                      <p className="text-white font-bold">
                        {(() => {
                          const expireDate = new Date(selectedVpn.expireAt);
                          const now = new Date();
                          const isExpired = expireDate <= now;
                          const hoursSinceExpired = (now.getTime() - expireDate.getTime()) / (1000 * 60 * 60);

                          if (isExpired && hoursSinceExpired > 12) {
                            return "หมดอายุ จะถูกลบข้อมูลในไม่ช้า";
                          }
                          return formatDistanceToNow(expireDate, { locale: th });
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Copy Toast Notification */}
      <AnimatePresence>
        {showCopyToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>คัดลอกการตั้งค่าไปยังคลิปบอร์ดแล้ว!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
