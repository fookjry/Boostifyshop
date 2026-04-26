import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, setDoc, getDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Server, Users, CreditCard, Activity, ShieldAlert, ChevronRight, TrendingUp, DollarSign, MessageSquare, Save, Loader2, Wifi, Upload, Globe, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import axios from 'axios';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function Admin() {
  const [stats, setStats] = useState({ totalUsers: 0, totalRevenue: 0, activeConfigs: 0, serverCount: 0, onlineServers: 0, serversStats: [] as any[] });
  const [userMap, setUserMap] = useState<{ [key: string]: string }>({});
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [discordInvite, setDiscordInvite] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [linkvertiseUrl, setLinkvertiseUrl] = useState('');
  const [linkvertiseEnabled, setLinkvertiseEnabled] = useState(true);
  const [siteName, setSiteName] = useState('VPNSaaS');
  const [announcement, setAnnouncement] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [renewDiscountPercent, setRenewDiscountPercent] = useState(0);
  const [trueMoneyNumber, setTrueMoneyNumber] = useState('');
  const [paymentQrUrl, setPaymentQrUrl] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [minTopup, setMinTopup] = useState(50);
  const [easySlipApiKey, setEasySlipApiKey] = useState('');
  const [rdcwClientId, setRdcwClientId] = useState('');
  const [rdcwClientSecret, setRdcwClientSecret] = useState('');
  const [slipProvider, setSlipProvider] = useState('easyslip');
  const [darkxApiKey, setDarkxApiKey] = useState('');
  const [paymentMethods, setPaymentMethods] = useState({ promptpay: 'open', truemoney: 'open', manual: 'open' });
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [pendingTopups, setPendingTopups] = useState(0);
  const [pendingTickets, setPendingTickets] = useState(0);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 500KB for base64 storage in Firestore
    if (file.size > 500 * 1024) {
      alert('ไฟล์มีขนาดใหญ่เกินไป (จำกัด 500KB)');
      return;
    }

    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setLogoUrl(base64String);
        await axios.post('/api/admin/settings/global', { 
          discordInvite, discordWebhookUrl, linkvertiseUrl, linkvertiseEnabled, siteName, announcement, logoUrl: base64String 
        });
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Logo upload error:', error);
      setUploadingLogo(false);
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, settingsRes, manualRes, recentTxRes, usersRes, ticketsPendingRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/settings'),
        axios.get('/api/admin/topup/manual/pending'),
        axios.get('/api/admin/transactions'),
        axios.get('/api/admin/users'),
        axios.get('/api/admin/tickets/pending')
      ]);
      
      setStats({
        totalUsers: statsRes.data.totalUsers,
        totalRevenue: statsRes.data.totalTransactions,
        activeConfigs: statsRes.data.totalVpns,
        serverCount: statsRes.data.totalServers || 0,
        onlineServers: statsRes.data.onlineServers || 0,
        serversStats: statsRes.data.serversStats || []
      });

      const settings = settingsRes.data;
      if (settings.global) {
        const data = settings.global;
        setDiscordInvite(data.discordInvite || '');
        setDiscordWebhookUrl(data.discordWebhookUrl || '');
        setLinkvertiseUrl(data.linkvertiseUrl || '');
        setLinkvertiseEnabled(data.linkvertiseEnabled !== false);
        setSiteName(data.siteName || 'VPNSaaS');
        setAnnouncement(data.announcement || '');
        setLogoUrl(data.logoUrl || '');
        setRenewDiscountPercent(Number(data.renewDiscountPercent) || 0);
      }

      if (settings.payment) {
        const data = settings.payment;
        setTrueMoneyNumber(data.trueMoneyNumber || '');
        setPaymentQrUrl(data.paymentQrUrl || '');
        setBankHolder(data.bankHolder || '');
        setMinTopup(data.minTopup || 50);
      }

      if (settings.payment_keys) {
        const data = settings.payment_keys;
        setEasySlipApiKey(data.easySlipApiKey || '');
        setDarkxApiKey(data.darkxApiKey || '');
        setRdcwClientId(data.rdcwClientId || '');
        setRdcwClientSecret(data.rdcwClientSecret || '');
        setSlipProvider(data.slipProvider || 'easyslip');
      }

      if (settings.payment_methods) {
        const data = settings.payment_methods;
        setPaymentMethods({
          promptpay: data.promptpay || 'open',
          truemoney: data.truemoney || 'open',
          manual: data.manual || 'open'
        });
      }

      setRecentTransactions(recentTxRes.data);
      setPendingTopups(manualRes.data.length);
      setPendingTickets(ticketsPendingRes.data.length);

      const mapping: { [key: string]: string } = {};
      usersRes.data.forEach((u: any) => {
        mapping[u.uid] = u.email || 'Unknown';
      });
      setUserMap(mapping);

    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGlobalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGlobal(true);
    try {
      await axios.post('/api/admin/settings/global', {
        discordInvite, discordWebhookUrl, linkvertiseUrl, linkvertiseEnabled, siteName, announcement, logoUrl, renewDiscountPercent
      });
      fetchData();
    } catch (error) {
      console.error('Failed to save global settings:', error);
    }
    setSavingGlobal(false);
  };

  const handlePaymentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      await Promise.all([
        axios.post('/api/admin/settings/payment', {
          trueMoneyNumber, paymentQrUrl, bankHolder, minTopup
        }),
        axios.post('/api/admin/settings/payment_keys', {
          easySlipApiKey, darkxApiKey, rdcwClientId, rdcwClientSecret, slipProvider
        }),
        axios.post('/api/admin/settings/payment_methods', paymentMethods)
      ]);
      fetchData();
    } catch (error) {
       console.error('Failed to save payment settings:', error);
    }
    setSavingPayment(false);
  };

  const menuItems = [
    { to: '/admin/users', label: 'จัดการผู้ใช้', desc: 'จัดการยอดเงินและ VPN ของผู้ใช้', icon: Users, color: 'blue' },
    { to: '/admin/servers', label: 'จัดการเซิร์ฟเวอร์', desc: 'ตั้งค่าเซิร์ฟเวอร์และราคา', icon: Server, color: 'amber' },
    { to: '/admin/networks', label: 'จัดการเครือข่าย', desc: 'ตั้งค่าเครือข่ายและ Inbound ID', icon: Wifi, color: 'indigo' },
    { to: '/admin/devices', label: 'จัดการจำนวนอุปกรณ์', desc: 'ตั้งค่าตัวเลือกและราคา', icon: Server, color: 'pink' },
    { to: '/admin/transactions', label: 'กิจกรรมล่าสุด', desc: 'ตรวจสอบสลิปและประวัติ', icon: Activity, color: 'emerald' },
    { to: '/admin/tickets', label: 'Support Tickets', desc: 'ตอบกลับปัญหาลูกค้า', icon: MessageSquare, color: 'purple' },
  ];

  return (
    <div className="space-y-12 pb-24">
      <header>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 drop-shadow-md">
          <ShieldAlert className="w-8 h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> แผงควบคุมแอดมิน
        </h1>
        <p className="text-slate-300">ภาพรวมระบบและทางลัดการจัดการ</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'ผู้ใช้ทั้งหมด', value: stats.totalUsers, icon: Users, color: 'blue' },
          { label: ' Config ทั้งหมด', value: stats.activeConfigs, icon: Activity, color: 'purple' },
          { label: 'เซิร์ฟเวอร์ออนไลน์', value: `${stats.onlineServers} / ${stats.serverCount}`, icon: Server, color: 'amber' },
          { label: 'บันทึกล่าสุด', value: recentTransactions.length, icon: CreditCard, color: 'emerald', to: '/admin/transactions' }
        ].map((s, i) => {
          const Content = (
            <>
              <s.icon className={`w-6 h-6 md:w-8 md:h-8 text-${s.color}-400 mb-3 md:mb-4 drop-shadow-[0_0_8px_rgba(currentColor,0.5)]`} />
              <p className="text-[10px] md:text-xs text-slate-400 uppercase font-bold tracking-wider">{s.label}</p>
              <p className="text-xl md:text-2xl font-bold text-white drop-shadow-sm">{s.value}</p>
            </>
          );

          if (s.to) {
            return (
              <Link key={i} to={s.to} className="glass-panel p-4 md:p-6 hover:bg-white/5 transition-all block group">
                {Content}
              </Link>
            );
          }

          return (
            <div key={i} className="glass-panel p-4 md:p-6">
              {Content}
            </div>
          );
        })}
      </div>

      {/* Server Users */}
      {stats.serversStats && stats.serversStats.length > 0 && (
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Server className="w-6 h-6 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> สถิติผู้ใช้งานแต่ละเซิร์ฟเวอร์
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stats.serversStats.map(s => (
              <div key={s.id} className="bg-black/20 p-4 rounded-xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 pl-2 truncate">{s.name}</p>
                <p className="text-xl font-black text-white drop-shadow-sm pl-2">
                  {s.currentUsers} <span className="text-xs text-slate-500 font-normal">/ {s.maxUsers || '∞'}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Management Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {menuItems.map((item, i) => (
          <Link 
            key={i} 
            to={item.to}
            className="group glass-panel p-6 md:p-8 hover:border-blue-500/50 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:bg-white/5 relative"
          >
            {item.to === '/admin/transactions' && pendingTopups > 0 && (
              <span className="absolute top-4 right-4 bg-red-500 text-white text-[12px] w-6 h-6 flex items-center justify-center rounded-full font-black drop-shadow-md animate-bounce">
                {pendingTopups > 9 ? '9+' : pendingTopups}
              </span>
            )}
            {item.to === '/admin/tickets' && pendingTickets > 0 && (
              <span className="absolute top-4 right-4 bg-blue-500 text-white text-[12px] w-6 h-6 flex items-center justify-center rounded-full font-black drop-shadow-md animate-bounce">
                {pendingTickets > 9 ? '9+' : pendingTickets}
              </span>
            )}
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-${item.color}-500/20 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform border border-${item.color}-500/30 shadow-[0_0_10px_rgba(currentColor,0.2)]`}>
              <item.icon className={`w-6 h-6 md:w-7 md:h-7 text-${item.color}-400 drop-shadow-[0_0_8px_rgba(currentColor,0.5)]`} />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 flex items-center justify-between drop-shadow-sm">
              {item.label}
              <ChevronRight className="w-4 h-4 md:w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </h3>
            <p className="text-slate-300 text-xs md:text-sm">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Global Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass-panel p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-indigo-500/20 p-3 rounded-2xl border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              <MessageSquare className="w-6 h-6 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white drop-shadow-sm">ตั้งค่าทั่วไป</h3>
              <p className="text-slate-300 text-sm">ตั้งค่าพารามิเตอร์ทั่วทั้งแอปพลิเคชัน</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ชื่อเว็บไซต์</label>
              <input 
                placeholder="VPNSaaS" 
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">โลโก้เว็บไซต์</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-black/20 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden backdrop-blur-sm shadow-inner">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                  ) : (
                    <Globe className="w-8 h-8 text-slate-500 drop-shadow-sm" />
                  )}
                </div>
                <label className="flex-1">
                  <div className="bg-black/20 border border-white/10 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all backdrop-blur-sm">
                    {uploadingLogo ? (
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 mb-1 drop-shadow-sm" />
                        <span className="text-xs text-slate-400">คลิกเพื่ออัปโหลดโลโก้</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ข้อความประกาศ (ตัวอักษรวิ่ง)</label>
              <textarea 
                placeholder="ยินดีต้อนรับสู่ VPNSaaS..." 
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                rows={2}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ลิงก์เชิญ Discord</label>
              <input 
                placeholder="https://discord.gg/..." 
                value={discordInvite}
                onChange={e => setDiscordInvite(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ส่วนลดการต่ออายุ (%)</label>
              <input 
                type="number"
                min="0"
                max="100"
                placeholder="0" 
                value={renewDiscountPercent}
                onChange={e => setRenewDiscountPercent(Number(e.target.value))}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm flex justify-between items-center">
                Linkvertise URL (ดูโฆษณารับ config ทันที)
                <button 
                  onClick={() => setLinkvertiseEnabled(!linkvertiseEnabled)}
                  className={`px-3 py-1 rounded-full text-[9px] font-black transition-all ${linkvertiseEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
                >
                  {linkvertiseEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </button>
              </label>
              <input 
                placeholder="https://link-hub.net/xxxx" 
                value={linkvertiseUrl}
                onChange={e => setLinkvertiseUrl(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
              />
              <p className="text-[10px] text-slate-500 mt-1">ตั้งค่าปลายทางของ Linkvertise ไปที่: <span className="text-white font-mono">{window.location.origin}/unlock</span></p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">Discord Webhook URL (สำหรับแจ้งเตือนแอดมิน)</label>
              <input 
                placeholder="https://discord.com/api/webhooks/..." 
                value={discordWebhookUrl}
                onChange={e => setDiscordWebhookUrl(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
              />
              <p className="text-[10px] text-slate-500 mt-1">แจ้งเตือนเมื่อมีลูกค้าเปิด-ปิด Ticket</p>
            </div>

            <button 
              onClick={async () => {
                setSavingGlobal(true);
                try {
                  await axios.post('/api/admin/settings/global', { discordInvite, discordWebhookUrl, linkvertiseUrl, linkvertiseEnabled, siteName, announcement, logoUrl, renewDiscountPercent });
                  fetchData();
                } catch (error) {
                  console.error('Failed to save global settings', error);
                } finally {
                  setSavingGlobal(false);
                }
              }}
              disabled={savingGlobal}
              className="w-full mt-6 bg-indigo-600/80 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-slate-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] backdrop-blur-md"
            >
              {savingGlobal ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              บันทึกการตั้งค่าทั้งหมด
            </button>
          </div>
        </section>

        <section className="glass-panel p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
              <CreditCard className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white drop-shadow-sm">ตั้งค่าการชำระเงิน</h3>
              <p className="text-slate-300 text-sm">ตั้งค่าช่องทางการรับเงิน</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">เบอร์ TrueMoney</label>
                <input 
                  value={trueMoneyNumber}
                  onChange={e => setTrueMoneyNumber(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">ชื่อเจ้าของบัญชี</label>
                <input 
                  value={bankHolder}
                  onChange={e => setBankHolder(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">URL รูปภาพ QR Code (PromptPay)</label>
              <input 
                value={paymentQrUrl}
                onChange={e => setPaymentQrUrl(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">Provider ตรวจสอบสลิปออโต้</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSlipProvider('easyslip')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      slipProvider === 'easyslip' 
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                        : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    EasySlip
                  </button>
                  <button
                    onClick={() => setSlipProvider('rdcw')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      slipProvider === 'rdcw' 
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                        : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    RDCW
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">DarkX API Key (TrueMoney อั่งเปา)</label>
                <input 
                  type="password"
                  value={darkxApiKey}
                  onChange={e => setDarkxApiKey(e.target.value)}
                  placeholder="API Key จาก DarkX"
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
                />
              </div>
            </div>

            {slipProvider === 'easyslip' && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">EasySlip API Key (PromptPay)</label>
                <input 
                  type="password"
                  value={easySlipApiKey}
                  onChange={e => setEasySlipApiKey(e.target.value)}
                  placeholder="v1_xxxxxxxxxxxx"
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
                />
              </div>
            )}

            {slipProvider === 'rdcw' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">RDCW Client ID</label>
                  <input 
                    type="text"
                    value={rdcwClientId}
                    onChange={e => setRdcwClientId(e.target.value)}
                    placeholder="Client ID"
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">RDCW Client Secret</label>
                  <input 
                    type="password"
                    value={rdcwClientSecret}
                    onChange={e => setRdcwClientSecret(e.target.value)}
                    placeholder="Client Secret"
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest drop-shadow-sm">เติมเงินขั้นต่ำ (บาท)</label>
                <input 
                  type="number"
                  value={minTopup}
                  onChange={e => setMinTopup(Number(e.target.value))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all backdrop-blur-sm shadow-inner"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-6">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block drop-shadow-sm">ตั้งค่าสถานะช่องทางชำระเงิน</label>
              
              <div className="space-y-4">
                {/* TrueMoney Settings */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-300 font-bold">TrueMoney (อั่งเปา)</p>
                  <div className="flex gap-2">
                    {['open', 'closed', 'maintenance'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          const newMethods = { ...paymentMethods, truemoney: mode };
                          setPaymentMethods(newMethods);
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                          paymentMethods.truemoney === mode 
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)]' 
                            : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'
                        }`}
                      >
                        {mode === 'open' ? 'เปิด' : mode === 'closed' ? 'ปิด' : 'ปรับปรุง'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PromptPay Settings */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-300 font-bold">PromptPay (สลิป)</p>
                  <div className="flex gap-2">
                    {['open', 'closed', 'maintenance'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          const newMethods = { ...paymentMethods, promptpay: mode };
                          setPaymentMethods(newMethods);
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                          paymentMethods.promptpay === mode 
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)]' 
                            : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'
                        }`}
                      >
                        {mode === 'open' ? 'เปิด' : mode === 'closed' ? 'ปิด' : 'ปรับปรุง'}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Manual Settings */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-300 font-bold">แจ้งโอนเงิน (สำรอง)</p>
                  <div className="flex gap-2">
                    {['open', 'closed', 'maintenance'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          const newMethods = { ...paymentMethods, manual: mode };
                          setPaymentMethods(newMethods);
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                          paymentMethods.manual === mode 
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)]' 
                            : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'
                        }`}
                      >
                        {mode === 'open' ? 'เปิด' : mode === 'closed' ? 'ปิด' : 'ปรับปรุง'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <button 
                    onClick={async () => {
                      setSavingPayment(true);
                      try {
                        await Promise.all([
                          axios.post('/api/admin/settings/payment', { trueMoneyNumber, paymentQrUrl, bankHolder, minTopup }),
                          axios.post('/api/admin/settings/payment_keys', { easySlipApiKey, darkxApiKey, rdcwClientId, rdcwClientSecret, slipProvider }),
                          axios.post('/api/admin/settings/payment_methods', paymentMethods)
                        ]);
                        fetchData();
                      } catch (error) {
                        console.error('Failed to save payment settings', error);
                      } finally {
                        setSavingPayment(false);
                      }
                    }}
                    disabled={savingPayment}
                    className="w-full bg-emerald-600/80 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-slate-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.3)] backdrop-blur-md"
                  >
                    {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    บันทึกการรับเงิน
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Activity Mini-Table */}
      <section className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="text-lg font-bold text-white drop-shadow-sm">กิจกรรมล่าสุด</h3>
          <Link to="/admin/transactions" className="text-blue-400 text-xs font-bold hover:underline drop-shadow-sm">ดูทั้งหมด</Link>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/40 text-slate-400 uppercase text-[10px] font-black tracking-widest backdrop-blur-md">
              <tr>
                <th className="px-6 py-4">ผู้ใช้</th>
                <th className="px-6 py-4">ประเภท</th>
                <th className="px-6 py-4">จำนวนเงิน</th>
                <th className="px-6 py-4">วันที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentTransactions.map(tx => {
                const amount = typeof tx.amount === 'object' ? tx.amount.amount : tx.amount;
                return (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-slate-300 font-medium truncate max-w-[150px]">
                    {tx.userEmail || userMap[tx.userId] || tx.userId}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${tx.type === 'topup' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-bold drop-shadow-sm ${amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {amount > 0 ? `+${amount}` : amount} ฿
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Mobile List */}
        <div className="md:hidden divide-y divide-white/5">
          {recentTransactions.map(tx => {
            const amount = typeof tx.amount === 'object' ? tx.amount.amount : tx.amount;
            return (
              <div key={tx.id} className="p-4 space-y-3 hover:bg-white/5 transition-colors">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-slate-300 font-medium truncate max-w-[200px]">
                    {tx.userEmail || userMap[tx.userId] || tx.userId}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${tx.type === 'topup' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                    {tx.type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-400">{new Date(tx.timestamp).toLocaleString()}</p>
                  <p className={`font-bold drop-shadow-sm ${amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {amount > 0 ? `+${amount}` : amount} ฿
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
