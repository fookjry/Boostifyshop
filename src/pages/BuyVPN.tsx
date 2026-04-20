import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, increment, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Server, Zap, Shield, Check, Loader2, AlertTriangle, Wifi, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function BuyVPN({ user, profile }: { user: any; profile: any }) {
  const navigate = useNavigate();
  const [servers, setServers] = useState<any[]>([]);
  const [networks, setNetworks] = useState<any[]>([]);
  const [allVpns, setAllVpns] = useState<any[]>([]);
  const [vpns, setVpns] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null);
  const [duration, setDuration] = useState<number>(30);
  const [deviceCount, setDeviceCount] = useState<number>(1);
  const [deviceOptions, setDeviceOptions] = useState<any[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialSuccess, setTrialSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [linkvertiseEnabled, setLinkvertiseEnabled] = useState(true);

  const canUseTrial = () => {
    if (!profile?.lastTrialAt) return true;
    const lastTrialTime = new Date(profile.lastTrialAt).getTime();
    const now = new Date().getTime();
    const hoursSinceLastTrial = (now - lastTrialTime) / (1000 * 60 * 60);
    return hoursSinceLastTrial >= 24;
  };

  useEffect(() => {
    const path = 'servers';
    const unsubscribe = onSnapshot(collection(db, path), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServers(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    const unsubNetworks = onSnapshot(collection(db, 'networks'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNetworks(list.filter((n: any) => n.status === 'open'));
    });

    const unsubDeviceOptions = onSnapshot(collection(db, 'device_options'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const activeOptions = list.filter((o: any) => o.status === true).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
      setDeviceOptions(activeOptions);
      if (activeOptions.length > 0) {
        setDeviceCount(activeOptions[0].count);
      }
    });

    // Load user's VPNs for dashboard/config
    const unsubVpns = onSnapshot(query(collection(db, 'vpns'), where('userId', '==', user.uid)), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVpns(list);
    });

    const unsubGlobal = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setLinkvertiseEnabled(doc.data().linkvertiseEnabled !== false);
      }
    });

    return () => {
      unsubscribe();
      unsubNetworks();
      unsubVpns();
      unsubGlobal();
    };
  }, []);

  const handlePurchase = async () => {
    if (!selectedServer || !selectedServer.prices) return;
    
    // Check server capacity using currentUsers field on server document
    const activeUsers = selectedServer.currentUsers || 0;
    if (selectedServer.maxUsers && activeUsers >= selectedServer.maxUsers) {
      setError('เซิร์ฟเวอร์นี้เต็มแล้ว กรุณาเลือกเซิร์ฟเวอร์อื่น (Server is full)');
      return;
    }

    const basePrice = selectedServer.prices[duration] || 0;
    const devicePrice = deviceOptions.find(o => o.count === deviceCount)?.price || 0;
    const totalPrice = basePrice + devicePrice;
    
    setShowConfirmModal(false);
    setLoading(true);
    setError('');

    try {
      // 1. Call backend to create VPN config in 3x-ui
      const token = await user.getIdToken();
      const response = await axios.post('/api/vpn/purchase', {
        userId: user.uid,
        userEmail: user.email,
        server: selectedServer, // Send full server object with credentials
        inboundId: selectedNetwork.inboundId,
        days: duration,
        price: totalPrice,
        network: selectedNetwork.name,
        deviceCount
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFreeTrial = async () => {
    if (!canUseTrial()) {
      setError('คุณใช้งานทดลองฟรีไปแล้วในวันนี้ กรุณารอ 24 ชั่วโมงเพื่อทดลองใหม่อีกครั้ง');
      return;
    }
    if (!selectedServer) return;
    
    if (selectedServer.status !== 'online') {
      setError('ขออภัย เซิร์ฟเวอร์นี้ปิดปรับปรุงชั่วคราว (Server is offline)');
      return;
    }

    setTrialLoading(true);
    setError('');

    try {
      // 1. Call backend to create trial VPN
      const token = await user.getIdToken();
      const response = await axios.post('/api/vpn/trial', {
        userId: user.uid,
        userEmail: user.email,
        server: selectedServer,
        inboundId: selectedNetwork.inboundId,
        network: selectedNetwork.name
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // 5. Auto-copy config
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(response.data.vpn.config);
          } else {
            const textArea = document.createElement("textarea");
            textArea.value = response.data.vpn.config;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
              document.execCommand('copy');
            } catch (err) {
              console.warn('Fallback copy failed');
            }
            textArea.remove();
          }
        } catch (e) {
          console.warn("Failed to copy config automatically, user can copy it manually later.");
        }

        setTrialSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setTrialLoading(false);
    }
  };

  const handleAdClaim = async () => {
    if (!selectedServer || !selectedNetwork) {
      setError('กรุณาเลือกเซิร์ฟเวอร์และเครือข่ายก่อนรับ Config ฟรี');
      return;
    }
    
    setTrialLoading(true);
    setError('');

    try {
      const token = await user.getIdToken();
      const response = await axios.post('/api/linkvertise/init', {
        serverId: selectedServer.id,
        network: selectedNetwork.name
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        localStorage.setItem('pending_lv_token', response.data.token);
        window.location.href = response.data.targetUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setTrialLoading(false);
    }
  };

  const prePurchaseCheck = () => {
    if (!selectedServer) return;
    
    // Check server capacity
    const activeUsers = allVpns.filter(v => v.serverId === selectedServer.id && new Date(v.expireAt) > new Date()).length;
    if (selectedServer.maxUsers && activeUsers >= selectedServer.maxUsers) {
      setError('ขออภัย เซิร์ฟเวอร์นี้เต็มแล้ว (Server is full)');
      return;
    }

    if (selectedServer.status !== 'online') {
      setError('ขออภัย เซิร์ฟเวอร์นี้ปิดปรับปรุงชั่วคราว (Server is offline)');
      return;
    }

    const basePrice = selectedServer.prices[duration] || 0;
    const devicePrice = deviceOptions.find(o => o.count === deviceCount)?.price || 0;
    const totalPrice = basePrice + devicePrice;

    if (profile.balance < totalPrice) {
      setError('ยอดเงินคงเหลือไม่เพียงพอ กรุณาเติมเงินก่อนทำรายการ (Insufficient balance)');
      return;
    }

    setError('');
    setShowConfirmModal(true);
  };

  const availableDurations = selectedServer?.prices 
    ? Object.entries(selectedServer.prices)
        .filter(([_, price]) => (price as number) > 0)
        .map(([days]) => Number(days))
        .sort((a, b) => a - b)
    : [];

  useEffect(() => {
    if (selectedServer?.prices && !selectedServer.prices[duration]) {
      setDuration(availableDurations[0]);
    }
  }, [selectedServer, availableDurations]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-md">ซื้อ VPN</h1>
        <p className="text-slate-300">เลือกเซิร์ฟเวอร์และเครือข่ายที่คุณต้องการ</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          {/* Server Selection */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow-sm">
              <Server className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              1. เลือกเซิร์ฟเวอร์
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {servers.length > 0 ? servers.map((s) => (
                <button 
                  key={s.id}
                  onClick={() => setSelectedServer(s)}
                  className={`p-4 rounded-2xl border text-left transition-all backdrop-blur-md ${selectedServer?.id === s.id ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/20'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-white drop-shadow-sm">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        ผู้ใช้งาน: {s.currentUsers || 0} / {s.maxUsers || '∞'}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${s.status === 'online' ? 'bg-emerald-400 text-emerald-400' : 'bg-red-400 text-red-400'}`} />
                  </div>
                  {s.description && (
                    <p className="text-[10px] text-slate-400 line-clamp-1 mb-3">{s.description}</p>
                  )}

                  <div className="flex flex-col gap-3">
                    {/* Supported Apps */}
                    {s.supportedAppIcons && s.supportedAppIcons.filter(Boolean).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Supported Apps</p>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                          {s.supportedAppIcons.filter(Boolean).map((icon: string, idx: number) => (
                            <div key={idx} className="w-6 h-6 rounded-md bg-white/5 border border-white/10 p-1 flex-shrink-0">
                              <img src={icon} alt="App" className="w-full h-full object-contain" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* General Usage */}
                    {s.generalUsageIcons && s.generalUsageIcons.filter(Boolean).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[8px] uppercase font-black text-slate-500 tracking-widest">General Usage</p>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                          {s.generalUsageIcons.filter(Boolean).map((icon: string, idx: number) => (
                            <div key={idx} className="w-6 h-6 rounded-md bg-white/5 border border-white/10 p-1 flex-shrink-0">
                              <img src={icon} alt="Usage" className="w-full h-full object-contain" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              )) : (
                <div className="col-span-full p-8 glass-panel text-center text-slate-400 italic">
                  ไม่มีเซิร์ฟเวอร์ที่พร้อมใช้งาน กรุณาติดต่อแอดมิน
                </div>
              )}
            </div>
          </section>

          {/* Network Selection */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow-sm">
              <Wifi className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              2. เลือกเครือข่าย
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {networks.map((n) => {
                const isActive = selectedNetwork?.id === n.id;
                const color = n.color || 'emerald';
                
                const colorClasses: Record<string, string> = {
                  emerald: isActive ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'bg-black/20 border-white/10 text-slate-400 hover:border-emerald-500/50 hover:bg-white/5',
                  red: isActive ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-black/20 border-white/10 text-slate-400 hover:border-red-500/50 hover:bg-white/5',
                  blue: isActive ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-black/20 border-white/10 text-slate-400 hover:border-blue-500/50 hover:bg-white/5',
                  orange: isActive ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-black/20 border-white/10 text-slate-400 hover:border-orange-500/50 hover:bg-white/5',
                  purple: isActive ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-black/20 border-white/10 text-slate-400 hover:border-purple-500/50 hover:bg-white/5',
                  pink: isActive ? 'bg-pink-500/20 border-pink-500/50 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'bg-black/20 border-white/10 text-slate-400 hover:border-pink-500/50 hover:bg-white/5',
                  indigo: isActive ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-black/20 border-white/10 text-slate-400 hover:border-indigo-500/50 hover:bg-white/5',
                  amber: isActive ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-black/20 border-white/10 text-slate-400 hover:border-amber-500/50 hover:bg-white/5',
                };

                return (
                  <button 
                    key={n.id}
                    onClick={() => setSelectedNetwork(n)}
                    className={`p-6 rounded-2xl border font-bold text-xl transition-all backdrop-blur-md ${colorClasses[color] || colorClasses.emerald}`}
                  >
                    {n.name}
                  </button>
                );
              })}
              {networks.length === 0 && (
                <div className="col-span-full p-8 glass-panel text-center text-slate-400 italic">
                  ไม่มีเครือข่ายที่พร้อมใช้งาน
                </div>
              )}
            </div>

            {/* Free Trial Section */}
            <div className="mt-6 p-6 rounded-3xl glass-panel relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/20 transition-colors" />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                    <Gift className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold drop-shadow-sm">ทดลองใช้งานฟรี 1 ชั่วโมง</h4>
                    <p className="text-slate-300 text-xs">เลือกเซิร์ฟเวอร์และเครือข่ายที่ต้องการแล้วเริ่มทดลองได้ทันที</p>
                  </div>
                </div>
                
                {!canUseTrial() ? (
                  <div className="text-amber-400/70 text-sm font-bold bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20 backdrop-blur-sm">
                    ใช้สิทธิ์สำหรับวันนี้ไปแล้ว (รับใหม่ได้พรุ่งนี้)
                  </div>
                ) : trialSuccess ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/20 px-6 py-3 rounded-2xl border border-emerald-500/30 animate-bounce shadow-[0_0_15px_rgba(52,211,153,0.3)] backdrop-blur-sm">
                    <Check className="w-5 h-5" />
                    ทดลองใช้งานพร้อมแล้ว!
                  </div>
                ) : (
                  <button 
                    onClick={handleFreeTrial}
                    disabled={trialLoading || !selectedServer || !selectedNetwork}
                    className="w-full sm:w-auto bg-amber-500/90 hover:bg-amber-400 disabled:bg-white/5 disabled:text-slate-500 disabled:border-white/10 text-slate-950 px-8 py-3 rounded-2xl font-black transition-all shadow-[0_0_15px_rgba(251,191,36,0.4)] active:scale-95 flex items-center justify-center gap-2 border border-amber-400/50 backdrop-blur-md"
                  >
                    {trialLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'เริ่มทดลองใช้งาน'}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Duration Selection */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow-sm">
              <Zap className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              3. เลือกระยะเวลา
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {availableDurations.map((d) => (
                <button 
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`p-4 rounded-2xl border transition-all backdrop-blur-md ${duration === d ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/5'}`}
                >
                  <p className="text-2xl font-black drop-shadow-sm">{d}</p>
                  <p className="text-[10px] uppercase font-bold opacity-80">วัน</p>
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <p className="text-sm font-bold text-white drop-shadow-sm">
                      {selectedServer?.prices?.[d] || 0} ฿
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Device Count Selection */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow-sm">
              <Shield className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              4. จำนวนอุปกรณ์ที่ใช้งานได้
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {deviceOptions.map((opt) => (
                <button 
                  key={opt.count}
                  onClick={() => setDeviceCount(opt.count)}
                  className={`p-4 rounded-2xl border text-left transition-all backdrop-blur-md ${deviceCount === opt.count ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-black/20 border-white/10 hover:border-white/20 hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${deviceCount === opt.count ? 'border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'border-slate-500'}`}>
                      {deviceCount === opt.count && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                    </div>
                    <div>
                      <p className={`font-bold drop-shadow-sm ${deviceCount === opt.count ? 'text-blue-400' : 'text-white'}`}>
                        {opt.count} เครื่อง
                      </p>
                      <p className="text-xs text-slate-300 mt-1">
                        {opt.price === 0 ? 'ฟรี' : `+${opt.price} บาท`}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-8 sticky top-24 space-y-6">
            <h3 className="text-xl font-bold text-white drop-shadow-md">สรุปการสั่งซื้อ</h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">เซิร์ฟเวอร์</span>
                <span className="text-white font-medium drop-shadow-sm">{selectedServer?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">เครือข่าย</span>
                <span className="text-white font-medium drop-shadow-sm">{selectedNetwork?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ระยะเวลา</span>
                <span className="text-white font-medium drop-shadow-sm">{duration} วัน</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">จำนวนอุปกรณ์</span>
                <span className="text-white font-medium drop-shadow-sm">
                  {deviceCount} เครื่อง {deviceOptions.find(o => o.count === deviceCount)?.price === 0 ? '(ฟรี)' : `(+${deviceOptions.find(o => o.count === deviceCount)?.price} บาท)`}
                </span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between items-end">
                <span className="text-slate-400">ราคารวม</span>
                <span className="text-3xl font-black text-white drop-shadow-md">
                  {(selectedServer?.prices?.[duration] || 0) + (deviceOptions.find(o => o.count === deviceCount)?.price || 0)} ฿
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-1">
                <input 
                  type="checkbox" 
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="peer appearance-none w-5 h-5 border-2 border-slate-500 rounded bg-black/20 checked:bg-blue-500/80 checked:border-blue-400 transition-all backdrop-blur-sm"
                />
                <Check className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none drop-shadow-md" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed group-hover:text-white transition-colors">
                ฉันยอมรับเงื่อนไขการใช้งาน โดยสามารถใช้ config ได้ตามจำนวนอุปกรณ์ที่เลือกไว้ หากตรวจพบการใช้งานเกินกว่าที่กำหนด ทางระบบมีสิทธิ์ระงับการใช้งาน หรือแบนบัญชีโดยไม่ต้องแจ้งให้ทราบล่วงหน้า
              </p>
            </label>

            <button 
              disabled={loading || !selectedServer || !selectedNetwork || !acceptedTerms || (selectedServer.maxUsers && (selectedServer.currentUsers || 0) >= selectedServer.maxUsers)}
              onClick={prePurchaseCheck}
              className="w-full glass-button py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 
               (!selectedServer || !selectedNetwork) ? 'เลือกเซิร์ฟเวอร์และเครือข่าย' :
               !acceptedTerms ? 'โปรดยอมรับเงื่อนไข' :
               (selectedServer?.maxUsers && (selectedServer.currentUsers || 0) >= selectedServer.maxUsers) ? 'เซิร์ฟเวอร์เต็ม' : 'ยืนยันการสั่งซื้อ'}
            </button>

            {canUseTrial() && (
              <button 
                onClick={handleFreeTrial}
                disabled={trialLoading || loading || !selectedServer || !selectedNetwork || !acceptedTerms || (selectedServer.maxUsers && (selectedServer.currentUsers || 0) >= selectedServer.maxUsers)}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 py-3 rounded-xl font-bold transition-all backdrop-blur-md flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                {trialLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : trialSuccess ? <Check className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
                {trialSuccess ? 'รับสิทธิ์สำเร็จ!' : 'ทดลองใช้ฟรี 1 ชั่วโมง'}
              </button>
            )}

            {linkvertiseEnabled && (
              <button 
                onClick={handleAdClaim}
                disabled={trialLoading || loading || !selectedServer || !selectedNetwork || !acceptedTerms || (selectedServer.maxUsers && (selectedServer.currentUsers || 0) >= selectedServer.maxUsers)}
                className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 py-3 rounded-xl font-bold transition-all backdrop-blur-md flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                {trialLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                รับ Config ฟรี 6 ชั่วโมง (ดูโฆษณา)
              </button>
            )}

            <p className="text-center text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-4">
              เปิดใช้งานระบบติดตั้งอัตโนมัติ
            </p>
          </div>
        </div>
      </div>

      {/* Purchase Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => setShowConfirmModal(false)}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative glass-panel p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <Shield className="w-8 h-8 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              </div>
              <h3 className="text-2xl font-bold text-white drop-shadow-md">ยืนยันการสั่งซื้อ</h3>
              <p className="text-slate-300">กรุณาตรวจสอบรายละเอียดก่อนยืนยัน</p>
            </div>

            <div className="bg-black/20 rounded-2xl p-4 space-y-3 border border-white/10 backdrop-blur-sm">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">เซิร์ฟเวอร์:</span>
                <span className="text-white font-bold drop-shadow-sm">{selectedServer?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">เครือข่าย:</span>
                <span className="text-white font-bold drop-shadow-sm">{selectedNetwork?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">ระยะเวลา:</span>
                <span className="text-white font-bold drop-shadow-sm">{duration} วัน</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">จำนวนอุปกรณ์:</span>
                <span className="text-white font-bold drop-shadow-sm">{deviceCount} เครื่อง</span>
              </div>
              <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                <span className="text-slate-400">ยอดชำระ:</span>
                <span className="text-xl font-black text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">{(selectedServer?.prices?.[duration] || 0) + (deviceOptions.find(o => o.count === deviceCount)?.price || 0)} ฿</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-bold transition-all border border-white/10 backdrop-blur-sm"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handlePurchase}
                className="flex-1 glass-button py-4"
              >
                ยืนยันการซื้อ
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
