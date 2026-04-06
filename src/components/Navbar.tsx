import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { LogOut, User as UserIcon, Wallet, ShieldCheck, LayoutDashboard, ChevronDown, Users, CreditCard, Server, Activity, BookOpen, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Navbar({ user, profile, settings }: { user: any; profile: any; settings: any }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const adminLinks = [
    { to: '/admin', label: 'หน้าแรกแอดมิน', icon: LayoutDashboard },
    { to: '/admin/users', label: 'จัดการผู้ใช้', icon: Users },
    { to: '/admin/servers', label: 'จัดการเซิร์ฟเวอร์', icon: Server },
    { to: '/admin/networks', label: 'จัดการเครือข่าย', icon: Wifi },
    { to: '/admin/transactions', label: 'รายการธุรกรรม', icon: CreditCard },
  ];

  const navLinks = [
    { to: '/dashboard', label: 'VPN ของฉัน', icon: LayoutDashboard },
    { to: '/buy', label: 'ซื้อ VPN', icon: Server },
    { to: '/topup', label: 'เติมเงิน', icon: Wallet },
    { to: '/tutorial', label: 'คู่มือการใช้งาน', icon: BookOpen },
  ];

  const siteName = settings?.siteName || 'VPNSaaS';
  const logoUrl = settings?.logoUrl;

  return (
    <>
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="w-8 h-8 object-contain" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            )}
            <span className="hidden sm:inline">{siteName}</span>
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
                        className={`transition-colors ${isActive ? 'text-blue-400' : 'text-slate-300 hover:text-white'}`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                  
                  {profile?.role === 'admin' && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowAdminMenu(!showAdminMenu)}
                      className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      แอดมิน <ChevronDown className={`w-4 h-4 transition-transform ${showAdminMenu ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showAdminMenu && (
                        <>
                          <div className="fixed inset-0 z-0" onClick={() => setShowAdminMenu(false)} />
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-10"
                          >
                            {adminLinks.map(link => (
                              <Link 
                                key={link.to}
                                to={link.to}
                                onClick={() => setShowAdminMenu(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                              >
                                <link.icon className="w-4 h-4" />
                                {link.label}
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
                  <Link to="/topup" className="flex items-center gap-2 bg-slate-800 px-2 sm:px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-emerald-400 text-xs sm:text-sm">{profile?.balance?.toLocaleString()} ฿</span>
                  </Link>
                  
                  <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <Link to="/login" className="bg-blue-600 hover:bg-blue-500 text-white px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base">
                เริ่มต้นใช้งาน
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom Navigation for Mobile */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 pb-safe">
          <div className="flex items-center justify-around h-16">
            {navLinks.map(link => {
              const isActive = location.pathname === link.to;
              return (
                <Link 
                  key={link.to} 
                  to={link.to} 
                  className={`flex flex-col items-center justify-center gap-1 transition-colors px-2 ${isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{link.label}</span>
                </Link>
              );
            })}
            {profile?.role === 'admin' && (
              <Link 
                to="/admin" 
                className={`flex flex-col items-center justify-center gap-1 transition-colors px-2 ${location.pathname.startsWith('/admin') ? 'text-amber-400' : 'text-slate-500 hover:text-amber-300'}`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span className="text-[10px] font-medium">แอดมิน</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
