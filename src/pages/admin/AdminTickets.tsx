import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Link } from 'react-router-dom';
import { MessageSquare, Search, Clock, CheckCircle2, AlertCircle, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export function AdminTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredTickets = tickets.filter(t => {
    const matchSearch = t.id.toLowerCase().includes(search.toLowerCase()) || 
                        t.title.toLowerCase().includes(search.toLowerCase()) || 
                        t.userEmail.toLowerCase().includes(search.toLowerCase());
    if (filter === 'all') return matchSearch;
    return matchSearch && t.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 w-max"><AlertCircle className="w-2.5 h-2.5" /> ใหม่</span>;
      case 'waiting': return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 w-max"><Clock className="w-2.5 h-2.5" />รอลูกค้าตอบ</span>;
      case 'answered': return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 w-max"><CheckCircle2 className="w-2.5 h-2.5" />ตอบแล้ว</span>;
      case 'closed': return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 w-max"><CheckCircle2 className="w-2.5 h-2.5" /> ปิดแล้ว</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-md flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            ระบบตอบกลับลูกค้า
          </h1>
          <p className="text-sm text-slate-400 mt-1">จัดการ Support Tickets ทั้ังหมด</p>
        </div>
      </div>

      <div className="glass-panel p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="ค้นหา Tracking ID, หัวข้อ, อีเมลผู้ใช้..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-blue-500/50 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 mx-2" />
          {['all', 'open', 'waiting', 'answered', 'closed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border ${filter === f ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              {f === 'all' ? 'ทั้งหมด' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel p-4">
        {loading ? (
          <div className="text-center py-8 text-slate-400">กำลังโหลด...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-8 text-slate-500">ไม่พบข้อมูล Ticket</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking ID</th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ข้อมูลผู้ใช้</th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">หัวข้อ</th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะ</th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">อัปเดตล่าสุด</th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTickets.map(t => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-3">
                      <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">{t.id.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="p-3">
                      <p className="text-xs text-slate-300 font-mono truncate max-w-[150px]">{t.userEmail}</p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm text-white font-medium truncate max-w-[200px]">{t.title}</p>
                    </td>
                    <td className="p-3">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="p-3">
                      <p className="text-xs text-slate-400 font-mono">{new Date(t.updatedAt).toLocaleString('th-TH')}</p>
                    </td>
                    <td className="p-3">
                      <Link 
                        to={`/tickets/${t.id}`}
                        className="bg-blue-600/80 hover:bg-blue-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors shadow-sm inline-flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> เปิด
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
