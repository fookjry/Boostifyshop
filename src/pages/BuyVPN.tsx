import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, increment, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Server, Zap, Shield, Check, Loader2, AlertTriangle, Wifi, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';

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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const hasUsedTrial = () => {
    return !!profile?.hasUsedTrial;
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

    // Load ALL VPNs for capacity check
    const unsubAllVpns = onSnapshot(collection(db, 'vpns'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllVpns(list);
    });

    return () => {
      unsubscribe();
      unsubNetworks();
      unsubVpns();
      unsubAllVpns();
    };
  }, []);

  const verifyTurnstile = async (token: string) => {
    try {
      const response = await axios.post('/api/verify-turnstile', { token });
      return response.data.success;
    } catch (err) {
      return false;
    }
  };

  const handlePurchase = async () => {
    if (!selectedServer || !selectedServer.prices) return;
    if (!turnstileToken) {
      setError('กรุณายืนยันตัวตนผ่าน CAPTCHA');
      return;
    }

    const isVerified = await verifyTurnstile(turnstileToken);
    if (!isVerified) {
      setError('CAPTCHA ไม่ถูกต้อง กรุณาลองใหม่');
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      return;
    }
    
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
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  };

  const handleFreeTrial = async () => {
    if (hasUsedTrial()) return;
    if (!selectedServer) return;
    if (!turnstileToken) {
      setError('กรุณายืนยันตัวตนผ่าน CAPTCHA');
      return;
    }

    const isVerified = await verifyTurnstile(turnstileToken);
    if (!isVerified) {
      setError('CAPTCHA ไม่ถูกต้อง กรุณาลองใหม่');
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      return;
    }
    
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
      turnstileRef.current?.reset();
      setTurnstileToken(null);
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
        <h1 className="text-4xl font-bold text-white mb-2">ซื้อ VPN</h1>
        <p className="text-slate-400">เลือกเซิร์ฟเวอร์และเครือข่ายที่คุณต้องการ</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          {/* Server Selection */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              1. เลือกเซิร์ฟเวอร์
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {servers.length > 0 ? servers.map((s) => (
                <button 
                  key={s.id}
                  onClick={() => setSelectedServer(s)}
                  className={`p-4 rounded-2xl border text-left transition-all ${selectedServer?.id === s.id ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-white">{s.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                        ผู้ใช้งาน: {allVpns.filter(v => v.serverId === s.id && new Date(v.expireAt) > new Date()).length} / {s.maxUsers || '∞'}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${s.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </div>
                  {s.description && (
                    <p className="text-[10px] text-slate-500 line-clamp-1">{s.description}</p>
                  )}
                </button>
              )) : (
                <div className="col-span-full p-8 bg-slate-900 rounded-2xl border border-slate-800 text-center text-slate-500 italic">
                  ไม่มีเซิร์ฟเวอร์ที่พร้อมใช้งาน กรุณาติดต่อแอดมิน
                </div>
              )}
            </div>
          </section>

          {/* Network Selection */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wifi className="w-5 h-5 text-blue-500" />
              2. เลือกเครือข่าย
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {networks.map((n) => {
                const isActive = selectedNetwork?.id === n.id;
                const color = n.color || 'emerald';
                
                const colorClasses: Record<string, string> = {
                  emerald: isActive ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-emerald-500/50',
                  red: isActive ? 'bg-red-500/10 border-red-500 text-red-500 shadow-lg shadow-red-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-red-500/50',
                  blue: isActive ? 'bg-blue-500/10 border-blue-500 text-blue-500 shadow-lg shadow-blue-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-blue-500/50',
                  orange: isActive ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-lg shadow-orange-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-orange-500/50',
                  purple: isActive ? 'bg-purple-500/10 border-purple-500 text-purple-500 shadow-lg shadow-purple-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-purple-500/50',
                  pink: isActive ? 'bg-pink-500/10 border-pink-500 text-pink-500 shadow-lg shadow-pink-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-pink-500/50',
                  indigo: isActive ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-indigo-500/50',
                  amber: isActive ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-amber-500/50',
                };

                return (
                  <button 
                    key={n.id}
                    onClick={() => setSelectedNetwork(n)}
                    className={`p-6 rounded-2xl border font-bold text-xl transition-all ${colorClasses[color] || colorClasses.emerald}`}
                  >
                    {n.name}
                  </button>
                );
              })}
              {networks.length === 0 && (
                <div className="col-span-full p-8 bg-slate-900 rounded-2xl border border-slate-800 text-center text-slate-500 italic">
                  ไม่มีเครือข่ายที่พร้อมใช้งาน
                </div>
              )}
            </div>

            {/* Free Trial Section */}
            <div className="mt-6 p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                    <Gift className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">ทดลองใช้งานฟรี 1 ชั่วโมง</h4>
                    <p className="text-slate-500 text-xs">เลือกเซิร์ฟเวอร์และเครือข่ายที่ต้องการแล้วเริ่มทดลองได้ทันที</p>
                  </div>
                </div>
                
                {hasUsedTrial() ? (
                  <div className="text-amber-500/50 text-sm font-bold bg-amber-500/5 px-4 py-2 rounded-xl border border-amber-500/10">
                    คุณใช้สิทธิ์ทดลองแล้ว
                  </div>
                ) : trialSuccess ? (
                  <div className="flex items-center gap-2 text-emerald-500 font-bold bg-emerald-500/10 px-6 py-3 rounded-2xl border border-emerald-500/20 animate-bounce">
                    <Check className="w-5 h-5" />
                    ทดลองใช้งานพร้อมแล้ว!
                  </div>
                ) : (
                  <button 
                    onClick={handleFreeTrial}
                    disabled={trialLoading || !selectedServer || !selectedNetwork}
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 px-8 py-3 rounded-2xl font-black transition-all shadow-lg shadow-amber-500/10 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {trialLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'เริ่มทดลองใช้งาน'}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Duration Selection */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              3. เลือกระยะเวลา
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {availableDurations.map((d) => (
                <button 
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`p-4 rounded-2xl border transition-all ${duration === d ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  <p className="text-2xl font-black">{d}</p>
                  <p className="text-[10px] uppercase font-bold opacity-60">วัน</p>
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <p className="text-sm font-bold text-white">
                      {selectedServer?.prices?.[d] || 0} ฿
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Device Count Selection */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              4. จำนวนอุปกรณ์ที่ใช้งานได้
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {deviceOptions.map((opt) => (
                <button 
                  key={opt.count}
                  onClick={() => setDeviceCount(opt.count)}
                  className={`p-4 rounded-2xl border text-left transition-all ${deviceCount === opt.count ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${deviceCount === opt.count ? 'border-blue-500' : 'border-slate-600'}`}>
                      {deviceCount === opt.count && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <div>
                      <p className={`font-bold ${deviceCount === opt.count ? 'text-blue-500' : 'text-white'}`}>
                        {opt.count} เครื่อง
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
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
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 sticky top-24 space-y-6">
            <h3 className="text-xl font-bold text-white">สรุปการสั่งซื้อ</h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">เซิร์ฟเวอร์</span>
                <span className="text-white font-medium">{selectedServer?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">เครือข่าย</span>
                <span className="text-white font-medium">{selectedNetwork?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ระยะเวลา</span>
                <span className="text-white font-medium">{duration} วัน</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">จำนวนอุปกรณ์</span>
                <span className="text-white font-medium">
                  {deviceCount} เครื่อง {deviceOptions.find(o => o.count === deviceCount)?.price === 0 ? '(ฟรี)' : `(+${deviceOptions.find(o => o.count === deviceCount)?.price} บาท)`}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-4 flex justify-between items-end">
                <span className="text-slate-500">ราคารวม</span>
                <span className="text-3xl font-black text-white">
                  {(selectedServer?.prices?.[duration] || 0) + (deviceOptions.find(o => o.count === deviceCount)?.price || 0)} ฿
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="py-2 w-full overflow-hidden">
              {import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY ? (
                <Turnstile 
                  ref={turnstileRef}
                  siteKey={import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => {
                    setError('CAPTCHA error');
                    setTurnstileToken(null);
                  }}
                  onExpire={() => setTurnstileToken(null)}
                />
              ) : (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                  CAPTCHA configuration error
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-1">
                <input 
                  type="checkbox" 
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="peer appearance-none w-5 h-5 border-2 border-slate-600 rounded bg-slate-900 checked:bg-blue-500 checked:border-blue-500 transition-all"
                />
                <Check className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                ฉันยอมรับเงื่อนไขการใช้งาน โดยสามารถใช้ config ได้ตามจำนวนอุปกรณ์ที่เลือกไว้ หากตรวจพบการใช้งานเกินกว่าที่กำหนด ทางระบบมีสิทธิ์ระงับการใช้งาน หรือแบนบัญชีโดยไม่ต้องแจ้งให้ทราบล่วงหน้า
              </p>
            </label>

            <button 
              disabled={loading || !selectedServer || !selectedNetwork || !acceptedTerms || (selectedServer.maxUsers && allVpns.filter(v => v.serverId === selectedServer.id && new Date(v.expireAt) > new Date()).length >= selectedServer.maxUsers)}
              onClick={prePurchaseCheck}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 
               (!selectedServer || !selectedNetwork) ? 'เลือกเซิร์ฟเวอร์และเครือข่าย' :
               (selectedServer?.maxUsers && allVpns.filter(v => v.serverId === selectedServer.id && new Date(v.expireAt) > new Date()).length >= selectedServer.maxUsers) ? 'เซิร์ฟเวอร์เต็ม' : 'ยืนยันการสั่งซื้อ'}
            </button>

            <p className="text-center text-[10px] text-slate-600 uppercase font-bold tracking-widest">
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
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            onClick={() => setShowConfirmModal(false)}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative bg-slate-900 p-8 rounded-[40px] border border-slate-800 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white">ยืนยันการสั่งซื้อ</h3>
              <p className="text-slate-400">กรุณาตรวจสอบรายละเอียดก่อนยืนยัน</p>
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-4 space-y-3 border border-slate-800">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">เซิร์ฟเวอร์:</span>
                <span className="text-white font-bold">{selectedServer?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">เครือข่าย:</span>
                <span className="text-white font-bold">{selectedNetwork?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ระยะเวลา:</span>
                <span className="text-white font-bold">{duration} วัน</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">จำนวนอุปกรณ์:</span>
                <span className="text-white font-bold">{deviceCount} เครื่อง</span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between items-end">
                <span className="text-slate-500">ยอดชำระ:</span>
                <span className="text-xl font-black text-blue-500">{(selectedServer?.prices?.[duration] || 0) + (deviceOptions.find(o => o.count === deviceCount)?.price || 0)} ฿</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handlePurchase}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold transition-colors"
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
