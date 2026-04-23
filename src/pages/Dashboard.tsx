import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Copy, QrCode, Clock, Server, Globe, CheckCircle2, AlertCircle, MessageSquare, Gift, ChevronLeft, ChevronRight, Settings, Key, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import axios from 'axios';

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

  const fetchData = async () => {
    try {
      const [vpnsRes, settingsRes] = await Promise.all([
        axios.get('/api/my-vpns').catch(err => ({ data: [] })),
        axios.get('/api/settings/global').catch(err => ({ data: {} }))
      ]);
      setVpns(Array.isArray(vpnsRes.data) ? vpnsRes.data : []);
      setDiscordInvite(settingsRes.data.discordInvite || '');
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh interval every 30 seconds if we want "sort of" real-time
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

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
          <h1 className="text-3xl font-bold text-white drop-shadow-md">แดชบอร์ด VPN ของฉัน</h1>
          <p className="text-slate-300">จัดการการตั้งค่าและการใช้งานของคุณ</p>
        </div>
        <div className="flex items-center gap-4">
          {discordInvite && (
            <a 
              href={discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#5865F2]/80 hover:bg-[#5865F2] text-white px-6 py-4 rounded-2xl flex items-center gap-3 font-bold transition-all shadow-[0_0_15px_rgba(88,101,242,0.3)] backdrop-blur-md border border-[#5865F2]/50"
            >
              <MessageSquare className="w-6 h-6 fill-white" />
              <span>ติดต่อ Discord</span>
            </a>
          )}
          <div className="glass-panel px-6 py-4 flex items-center gap-4">
            <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/30">
              <Shield className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">การตั้งค่าที่ใช้งานอยู่</p>
              <p className="text-2xl font-bold text-white drop-shadow-md">{vpns.filter(v => new Date(v.expireAt).getTime() > Date.now()).length}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex p-1 glass-panel w-full max-w-md">
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
                ? 'bg-blue-600/80 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-blue-500/50 backdrop-blur-md' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 glass-panel animate-pulse" />)}
        </div>
      ) : filteredVpns.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVpns.map((vpn) => (
            <motion.div 
              key={vpn.id}
              layoutId={vpn.id}
              onClick={() => setSelectedVpn(vpn)}
              className="glass-card p-6 cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${vpn.network === 'AIS' ? 'bg-lime-500/20 text-lime-400 border-lime-500/30 shadow-[0_0_8px_rgba(132,204,22,0.3)]' : 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.3)]'}`}>
                  {vpn.network}
                </div>
                <div className="flex items-center gap-2">
                  {vpn.isTrial && (
                    <div className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-amber-500/30 shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                      <Gift className="w-3 h-3" /> ทดลองใช้งาน
                    </div>
                  )}
                  {(() => {
                    const isExpired = new Date(vpn.expireAt) <= new Date();
                    return (
                      <div className={`flex items-center gap-1 text-xs font-bold ${!isExpired ? 'text-emerald-400' : 'text-red-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${!isExpired ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
                        {!isExpired ? 'ใช้งานอยู่' : 'หมดอายุ'}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2 drop-shadow-sm">
                <Server className="w-4 h-4 text-blue-400" />
                {vpn.serverName || 'Singapore Premium'}
              </h3>

              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
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
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>{vpn.uuid.substring(0, 8)}...</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>{vpn.deviceCount || 1} อุปกรณ์</span>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(vpn.config); }}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/10 backdrop-blur-sm"
                >
                  <Copy className="w-4 h-4" /> คัดลอก
                </button>
                <button className="glass-button p-2 rounded-lg">
                  <QrCode className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 glass-panel border-dashed">
          <Shield className="w-16 h-16 text-slate-500 mx-auto mb-4 drop-shadow-md" />
          <h3 className="text-xl font-bold text-white drop-shadow-md">ไม่พบ VPN</h3>
          <p className="text-slate-400 mb-8 text-sm">คุณยังไม่ได้ซื้อการตั้งค่า VPN ใดๆ</p>
          <Link to="/buy" className="glass-button px-8 py-3">
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
            className="p-2 rounded-xl glass-panel text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-10 h-10 rounded-xl font-bold transition-all ${
                currentPage === page
                  ? 'bg-blue-600/80 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-blue-500/50 backdrop-blur-md'
                  : 'glass-panel text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl glass-panel text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative glass-panel w-full max-w-lg p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">การตั้งค่า VPN</h2>
                  <p className="text-slate-300 text-sm">นำเข้านี้ไปยังแอป V2Ray/V2Box ของคุณ</p>
                </div>
                <button onClick={() => setSelectedVpn(null)} className="text-slate-400 hover:text-white transition-colors">
                  <AlertCircle className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-8">
                <div className="bg-white/90 p-4 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/20">
                  <QRCodeSVG value={selectedVpn.config} size={200} />
                </div>

                <div className="w-full space-y-4">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/10 break-all text-xs font-mono text-blue-300 relative group backdrop-blur-md shadow-inner">
                    {selectedVpn.config}
                    <button 
                      onClick={() => copyToClipboard(selectedVpn.config)}
                      className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                    >
                      <Copy className="w-3 h-3 text-white" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                      <p className="text-xs text-slate-400 uppercase font-bold mb-1">เครือข่าย</p>
                      <p className="text-white font-bold drop-shadow-sm">{selectedVpn.network}</p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                      <p className="text-xs text-slate-400 uppercase font-bold mb-1">หมดอายุใน</p>
                      <p className="text-white font-bold drop-shadow-sm">
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
                    <div className="bg-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                      <p className="text-xs text-slate-400 uppercase font-bold mb-1">จำนวนอุปกรณ์</p>
                      <p className="text-white font-bold drop-shadow-sm">{selectedVpn.deviceCount || 1} เครื่อง</p>
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(52,211,153,0.4)] flex items-center gap-3 font-bold border border-emerald-400/50"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>คัดลอกการตั้งค่าไปยังคลิปบอร์ดแล้ว!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
