import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { MessageSquare, ArrowLeft, Send, X, Loader2, AlertCircle, Clock, CheckCircle2, ShieldCheck, User } from 'lucide-react';

export function TicketDetail({ user, profile }: { user: any, profile: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicketData = async () => {
    try {
      const res = await axios.get(`/api/tickets/${id}`);
      setTicket(res.data.ticket);
      setMessages(res.data.messages);
      setLoading(false);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Failed to fetch ticket data:', err);
      if (err.response?.status === 404) navigate('/tickets');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchTicketData();
    const interval = setInterval(fetchTicketData, 5000); // Poll every 5s for chat-like experience
    return () => clearInterval(interval);
  }, [id, navigate]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setReplying(true);
    setError('');

    try {
      const token = await user.getIdToken();
      await axios.post(`/api/tickets/${id}/reply`, {
        content: replyContent,
        role: profile.role
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReplyContent('');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setReplying(false);
    }
  };

  const handleClose = async () => {
    setClosing(true);
    setError('');
    try {
      const token = await user.getIdToken();
      await axios.post(`/api/tickets/${id}/close`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowConfirmClose(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setClosing(false);
    }
  };

  if (loading || !ticket) {
    return <div className="text-center py-20 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> เปิดใช้งาน</span>;
      case 'waiting': return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> รอการตอบกลับ</span>;
      case 'answered': return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> แอดมินตอบแล้ว</span>;
      case 'closed': return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> ปิดปัญหาแล้ว</span>;
      default: return null;
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isOwner = ticket.userId === user.uid;
  const isTicketClosed = ticket.status === 'closed';
  const canClose = !isTicketClosed && (isOwner || isAdmin);

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex-shrink-0 glass-panel p-4 mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={isAdmin ? "/admin/tickets" : "/tickets"} className="bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors border border-white/10 shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-white tracking-tight drop-shadow-md truncate">{ticket.subject}</h1>
            <p className="text-xs text-slate-400 font-mono">Ticket #{ticket.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block">{getStatusBadge(ticket.status)}</div>
          {canClose && (
            <div className="relative">
              {showConfirmClose ? (
                <div className="flex items-center gap-2 bg-slate-900 border border-white/10 p-1.5 rounded-xl absolute right-0 top-0 z-50 shadow-2xl min-w-[140px] whitespace-nowrap">
                  <span className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-tighter">ยืนยันปิด?</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={handleClose}
                      disabled={closing}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors"
                    >
                      {closing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'ยืนยัน'}
                    </button>
                    <button 
                      onClick={() => setShowConfirmClose(false)}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors"
                    >
                      ไม่
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowConfirmClose(true)}
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  ปิดงาน
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6 no-scrollbar">
        {messages.map((msg, idx) => {
          const isMe = msg.userId === user.uid;
          const msgRole = msg.role;
          const isSystemInfo = isAdmin && msgRole === 'user'; // If admin looking at user msg
          
          return (
            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                {msgRole === 'admin' ? (
                  <><ShieldCheck className="w-3 h-3 text-emerald-400" /><span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Admin Support</span></>
                ) : (
                  <><User className="w-3 h-3 text-blue-400" /><span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{isMe ? 'Me' : ticket.userEmail}</span></>
                )}
                <span className="text-[10px] text-slate-500 font-mono">{new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              <div className={`max-w-[85%] rounded-2xl p-4 ${isMe ? 'bg-blue-600/20 border border-blue-500/30 text-white rounded-tr-sm' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm'}`}>
                {msg.content && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Box */}
      {!isTicketClosed ? (
        <form onSubmit={handleReply} className="flex-shrink-0 glass-panel p-3">
          {error && <div className="text-xs text-red-400 mb-2 px-2 bg-red-400/10 py-1 rounded inline-block">{error}</div>}

          <div className="flex items-end gap-2 px-1">
            <div className="flex-1 bg-black/20 border border-white/10 rounded-xl flex items-center overflow-hidden focus-within:border-blue-500/50 transition-colors shadow-inner">
              <textarea 
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="พิมพ์ข้อความตอบกลับ..."
                className="w-full bg-transparent p-3 text-sm text-white resize-none outline-none min-h-[44px] max-h-[120px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if(replyContent.trim()) handleReply(e);
                  }
                }}
              />
            </div>
            <button 
              type="submit" 
              disabled={replying || !replyContent.trim()}
              className="p-3 bg-blue-500 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors shadow-lg shrink-0 mb-1 lg:mb-0"
            >
              {replying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex-shrink-0 glass-panel p-4 text-center">
          <p className="text-sm text-slate-400 font-bold bg-white/5 py-3 rounded-xl border border-white/10 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Ticket นี้ถูกปิดเรียบร้อยแล้วเมื่อ {new Date(ticket.updatedAt).toLocaleString('th-TH')}
          </p>
        </div>
      )}
    </div>
  );
}
