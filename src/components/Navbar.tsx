import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { LogOut, User as UserIcon, Wallet, ShieldCheck, LayoutDashboard, ChevronDown, Users, CreditCard, Server, Activity, BookOpen, Wifi, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';


export function Navbar({ user, profile, settings }: { user: any; profile: any; settings: any }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [pendingTopups, setPendingTopups] = useState(0);
  const [pendingTickets, setPendingTickets] = useState(0);

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      const fetchPending = async () => {
        try {
          const res = await axios.get('/api/admin/topup/manual/pending');
          setPendingTopups(res.data.length);

          const ticketRes = await axios.get('/api/admin/tickets/pending');
          setPendingTickets(ticketRes.data.length);
        } catch (e) {
          console.error(e);
        }
      };
      fetchPending();
      const interval = setInterval(fetchPending, 30000);
      return () => clearInterval(interval);
    }
  }, [user, profile?.role]);


  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const adminLinks = [
    { to: '/admin', label: 'หน้าแรกแอดมิน', icon: LayoutDashboard },
    { to: '/admin/users', label: 'จัดการผู้ใช้', icon: Users },
    { to: '/admin/servers', label: 'จัดการเซิร์ฟเวอร์', icon: Server },
    { to: '/admin/networks', label: 'จัดการเครือข่าย', icon: Wifi },
    { to: '/admin/transactions', label: 'กิจกรรมล่าสุด', icon: Activity },
    { to: '/admin/tickets', label: 'Support Tickets', icon: MessageSquare },
  ];

  const navLinks = [
    { to: '/dashboard', label: 'VPN ของฉัน', icon: LayoutDashboard },
    { to: '/buy', label: 'ซื้อ VPN', icon: Server },
    { to: '/topup', label: 'เติมเงิน', icon: Wallet },
    { to: '/tutorial', label: 'คู่มือการใช้งาน', icon: BookOpen },
    { to: '/tickets', label: 'แจ้งปัญหา', icon: MessageSquare },
  ];

  const siteName = settings?.siteName || 'VPNSaaS';
  const logoUrl = settings?.logoUrl;

  return (
    <>
      <nav className="glass-panel sticky top-0 z-50 border-b-0 border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="w-8 h-8 object-contain drop-shadow-lg" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            )}
            <span className="hidden sm:inline bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">{siteName}</span>
          </Link>

          <div className="flex items-center gap-6">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-4 text-sm font-medium">
                  {navLinks.map(link => {
                    const isActive = location.pathname === link.to;
                    return (
                      <Link 
                        key={link.to} 
                        to={link.to} 
                        className={`transition-all duration-300 ${isActive ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-slate-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                  
                  {profile?.role === 'admin' && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowAdminMenu(!showAdminMenu)}
                      className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-all drop-shadow-[0_0_8px_rgba(251,191,36,0.3)] relative"
                    >
                      แอดมิน <ChevronDown className={`w-4 h-4 transition-transform ${showAdminMenu ? 'rotate-180' : ''}`} />
                      {pendingTopups + pendingTickets > 0 && (
                        <span className="absolute -top-1.5 -right-3 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-black drop-shadow-md animate-pulse">
                          {pendingTopups + pendingTickets > 9 ? '9+' : pendingTopups + pendingTickets}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {showAdminMenu && (
                        <>
                          <div className="fixed inset-0 z-0" onClick={() => setShowAdminMenu(false)} />
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full right-0 mt-2 w-48 glass-panel rounded-xl overflow-hidden z-10"
                          >
                            {adminLinks.map(link => (
                              <Link 
                                key={link.to}
                                to={link.to}
                                onClick={() => setShowAdminMenu(false)}
                                className="flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <link.icon className="w-4 h-4" />
                                  {link.label}
                                </div>
                                {link.to === '/admin/transactions' && pendingTopups > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                                    {pendingTopups}
                                  </span>
                                )}
                                {link.to === '/admin/tickets' && pendingTickets > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                                    {pendingTickets}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

                <div className="flex items-center gap-2 sm:gap-4">
                  <Link to="/topup" className="flex items-center gap-2 bg-black/20 px-2 sm:px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-all backdrop-blur-md">
                    <Wallet className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="font-bold text-emerald-400 text-xs sm:text-sm drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">{profile?.balance?.toLocaleString()} ฿</span>
                  </Link>
                  
                  <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white transition-all hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <Link to="/login" className="glass-button px-4 sm:px-6 py-2 text-sm sm:text-base">
                เริ่มต้นใช้งาน
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom Navigation for Mobile */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 z-50 safe-area-bottom">
          <div className="flex items-center justify-around h-16">
            {navLinks.map(link => {
              const isActive = location.pathname === link.to;
              // Shorten labels for mobile
              const label = link.label === 'คู่มือการใช้งาน' ? 'คู่มือ' : 
                          link.label === 'VPN ของฉัน' ? 'VPN' : link.label;
              
              return (
                <Link 
                  key={link.to} 
                  to={link.to} 
                  className={`flex flex-col items-center justify-center gap-1 transition-all px-1 flex-1 min-w-0 ${isActive ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-slate-400 hover:text-white'}`}
                >
                  <link.icon className="w-5 h-5 shrink-0" />
                  <span className="text-[9px] font-medium truncate w-full text-center">{label}</span>
                </Link>
              );
            })}
            {profile?.role === 'admin' && (
              <Link 
                to="/admin" 
                className={`flex flex-col items-center justify-center gap-1 transition-all px-1 flex-1 min-w-0 relative ${location.pathname.startsWith('/admin') ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-400 hover:text-amber-300'}`}
              >
                <div className="relative">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  {pendingTopups + pendingTickets > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-black animate-pulse border border-slate-950">
                      {pendingTopups + pendingTickets > 9 ? '9+' : pendingTopups + pendingTickets}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-medium truncate w-full text-center">แอดมิน</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
