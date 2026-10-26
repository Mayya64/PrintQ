import React, { useState, useEffect, Component } from 'react';
import axios from 'axios';
import {
  Printer, FileText, Settings, Clock, CheckCircle,
  Zap, QrCode, LogIn, LogOut, User,
  Mail, Lock, Shield, CreditCard, IndianRupee,
  AlertCircle, Eye, EyeOff, X, Check,
  Sun, Moon, Plus, Minus, RefreshCw, Key, CheckCheck,
  Hash, Search, Filter, CheckSquare, Square, XCircle, Download
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';
const ACCEPTED_FILE_TYPES = '.pdf,.png,.jpg,.jpeg,.webp,.bmp';

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#E7ECF3] dark:bg-[#0A0F1D]">
          <div className="bg-[#F3F6FA] dark:bg-[#111A2E] border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-2">
              <AlertCircle size={22} />
              <h2 className="text-base font-bold">Application Error</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              Reload View
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Main App Component
// ---------------------------------------------------------------------------
export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('printq_theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('student'); // 'student' | 'shop' | 'admin'
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [state, setState] = useState({ settings: {}, stats: {}, orders: [], user: null });
  const [myOrderIds, setMyOrderIds] = useState(() => JSON.parse(localStorage.getItem('myOrders') || '[]'));

  // Theme Sync
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('printq_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const checkAuth = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/me`, { withCredentials: true });
      if (res.data.authenticated) {
        setUser({
          id: res.data.user_id,
          email: res.data.email,
          role: res.data.role,
          full_name: res.data.full_name,
          usn: res.data.usn
        });
      }
    } catch {
      setUser(null);
    }
    setAuthLoading(false);
  };

  const fetchState = async () => {
    try {
      const res = await axios.get(`${API_BASE}/state`, { withCredentials: true });
      setState(res.data);
    } catch {
      console.error('Failed to fetch state');
    }
  };

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 4000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password }, { withCredentials: true });
    const u = {
      id: res.data.user_id,
      email: res.data.email,
      role: res.data.role,
      full_name: res.data.full_name,
      usn: res.data.usn
    };
    setUser(u);
    setShowAuthModal(false);
    if (u.role === 'shopkeeper' || u.role === 'admin') setView('shop');
    else setView('student');
    fetchState();
  };

  const handleRegister = async (email, password, full_name, usn) => {
    const res = await axios.post(`${API_BASE}/auth/register`, { email, password, full_name, usn }, { withCredentials: true });
    const u = {
      id: res.data.user_id,
      email: res.data.email,
      role: res.data.role,
      full_name: res.data.full_name,
      usn: res.data.usn
    };
    setUser(u);
    setShowAuthModal(false);
    setView('student');
    fetchState();
  };

  const handleLogout = async () => {
    try { await axios.post(`${API_BASE}/auth/logout`, {}, { withCredentials: true }); } catch {}
    setUser(null);
    setView('student');
    setMyOrderIds([]);
    localStorage.removeItem('myOrders');
    fetchState();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E7ECF3] dark:bg-[#0A0F1D]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Loading PrintQ...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#F0F4F8] via-[#E7ECF3] to-[#D1D9E6] dark:from-[#0A0F1D] dark:via-[#0F172A] dark:to-[#111827] text-slate-800 dark:text-slate-100 transition-colors duration-500">

        {/* ── Top Navigation ── */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-17 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/50 dark:ring-white/10">
                <Printer size={20} strokeWidth={2.2} />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">Print<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Q</span></span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-100 to-violet-100 text-indigo-700 dark:from-indigo-950/80 dark:to-violet-950/80 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-800 shadow-sm">
                  Campus
                </span>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Terminal View Switcher */}
              {user && (user.role === 'shopkeeper' || user.role === 'admin') && (
                <div className="hidden sm:flex items-center bg-[#E5EBF2] dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <button
                    onClick={() => setView('student')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${view === 'student' ? 'bg-[#F3F6FA] dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                  >
                    Student
                  </button>
                  <button
                    onClick={() => setView('shop')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${view === 'shop' ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                  >
                    Shop Terminal
                  </button>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => setView('admin')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${view === 'admin' ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/30' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                    >
                      Admin
                    </button>
                  )}
                </div>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#E5EBF2] hover:bg-[#DDE4EE] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 transition-colors cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun size={17} className="text-amber-400" />
                ) : (
                  <Moon size={17} className="text-indigo-600" />
                )}
              </button>

              {/* Account / Login */}
              {user ? (
                <div className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800/80 dark:to-slate-800/80 px-4 py-2 rounded-xl border border-indigo-200/60 dark:border-slate-700 shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-sm"></span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden md:inline max-w-[140px] truncate">
                    {user.full_name || user.email}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20">
                    {user.role}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="text-slate-400 hover:text-rose-400 hover:rotate-90 ml-1 p-0.5 transition-all duration-300 cursor-pointer rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowAuthModal(true); setAuthTab('login'); }}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:shadow-indigo-600/40 hover:-translate-y-0.5 ring-1 ring-white/20 dark:ring-white/10"
                >
                  <LogIn size={16} strokeWidth={2} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Status Ticker ── */}
        <section className="bg-gradient-to-r from-indigo-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-b border-indigo-200/50 dark:border-indigo-900/50 py-3 px-4 text-xs font-medium shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${state.settings?.shop_open ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-rose-400 to-pink-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 shadow-lg ${state.settings?.shop_open ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-rose-500 to-pink-500'}`}></span>
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300 tracking-wide">
                Counter Status
              </span>
              <span className={`font-bold px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider shadow-sm ${state.settings?.shop_open ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 dark:from-emerald-950/80 dark:to-teal-950/80 dark:text-emerald-300' : 'bg-gradient-to-r from-rose-100 to-pink-100 text-rose-800 dark:from-rose-950/80 dark:to-pink-950/80 dark:text-rose-300'}`}>
                {state.settings?.shop_open ? 'Open & Ready' : 'Closed'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-indigo-200/60 dark:border-slate-700 shadow-sm">
                <Clock size={14} className="text-amber-500" strokeWidth={2} />
                <span>Wait: <strong className="text-slate-900 dark:text-white">~{state.stats?.est_wait_mins || 0}m</strong></span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-indigo-200/60 dark:border-slate-700 shadow-sm">
                <Zap size={14} className="text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
                <span>Queue: <strong className="text-slate-900 dark:text-white">{state.stats?.active_orders || 0}</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Main View Area ── */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {view === 'admin' && user?.role === 'admin' ? (
            <AdminPanel />
          ) : view === 'shop' && user && (user.role === 'shopkeeper' || user.role === 'admin') ? (
            <ShopkeeperDashboard state={state} fetchState={fetchState} user={user} />
          ) : (
            <StudentPortal
              state={state}
              myOrderIds={myOrderIds}
              setMyOrderIds={setMyOrderIds}
              fetchState={fetchState}
              user={user}
              onLoginRequired={() => { setShowAuthModal(true); setAuthTab('login'); }}
            />
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-indigo-200/40 dark:border-indigo-900/40 py-6 px-4 text-center text-xs text-indigo-500 dark:text-indigo-400 pb-20 sm:pb-6">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <span className="text-sm">Built with</span>
            <span className="text-xl animate-pulse">💙</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-300">Team idk</span>
          </p>
        </footer>

        {/* ── Mobile bottom tabs (Shopkeeper / Admin only) ── */}
        {user && (user.role === 'shopkeeper' || user.role === 'admin') && (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#F3F6FA]/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex z-50 py-1">
            <button
              onClick={() => setView('student')}
              className={`flex-1 py-2 text-center text-[11px] font-bold flex flex-col items-center gap-0.5 ${view === 'student' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
            >
              <User size={16} /> Student
            </button>
            <button
              onClick={() => setView('shop')}
              className={`flex-1 py-2 text-center text-[11px] font-bold flex flex-col items-center gap-0.5 ${view === 'shop' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
            >
              <Printer size={16} /> Shop
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => setView('admin')}
                className={`flex-1 py-2 text-center text-[11px] font-bold flex flex-col items-center gap-0.5 ${view === 'admin' ? 'text-amber-500' : 'text-slate-400'}`}
              >
                <Shield size={16} /> Admin
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Auth Modal ── */}
      {showAuthModal && (
        <AuthModal
          tab={authTab}
          setTab={setAuthTab}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Student Portal
// ---------------------------------------------------------------------------
function StudentPortal({ state, myOrderIds, setMyOrderIds, fetchState, user, onLoginRequired }) {
  const [form, setForm] = useState({
    sides: 'Single',
    binding: 'None',
    copies: 1,
    range: 'All',
    start: 1,
    end: 1,
    payment: 'upi'
  });

  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);

  const pageCount = fileData
    ? (form.range === 'Custom' ? Math.max(1, form.end - form.start + 1) : fileData.total_pages)
    : 1;

  const calcPrice = () => {
    const base = 2; // ₹2/page
    const bind = form.binding === 'Stapled' ? 5 : form.binding === 'Spiral' ? 30 : 0;
    return (pageCount * form.copies * base) + (bind * form.copies);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!user) {
      onLoginRequired();
      e.target.value = '';
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post(`${API_BASE}/analyze-pdf`, fd, { withCredentials: true });
      setFileData(res.data);
      setForm(f => ({ ...f, start: 1, end: res.data.total_pages, range: 'All' }));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not read file. Please upload a valid PDF or image.');
    }
    setLoading(false);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!user) { onLoginRequired(); return; }
    if (!fileData) { alert('Please upload a document or image first.'); return; }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/orders/create`, {
        original_filename: fileData.original_filename,
        tmp_filename: fileData.tmp_filename,
        total_doc_pages: fileData.total_pages,
        start_page: form.range === 'Custom' ? form.start : 1,
        end_page: form.range === 'Custom' ? form.end : fileData.total_pages,
        color_mode: 'B&W',
        sides: form.sides,
        copies: form.copies,
        binding: form.binding,
        printing_station: 1,
        payment_method: form.payment
      }, { withCredentials: true });
      setCheckoutData(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating order');
    }
    setLoading(false);
  };

  const handleConfirmPayment = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/orders/${checkoutData.order_id}/confirm-payment`, {
        utr: 'UPI-' + Math.random().toString().slice(2, 8)
      }, { withCredentials: true });
      const updated = [checkoutData.order_id, ...myOrderIds];
      setMyOrderIds(updated);
      localStorage.setItem('myOrders', JSON.stringify(updated));
      setCheckoutData(null);
      setFileData(null);
      fetchState();
    } catch {
      alert('Payment confirmation failed');
    }
    setLoading(false);
  };

  const myActiveOrders = state.orders.filter(o => myOrderIds.includes(o.id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-start animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* ── Left Column: Order Form ── */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/70 rounded-3xl p-5 sm:p-7 shadow-lg shadow-slate-200/60 dark:shadow-slate-900/60 ring-1 ring-white/40 dark:ring-white/5">
          {/* Guest Sign-in prompt */}
          {!user && (
            <div className="bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-200/60 dark:border-indigo-800/40 rounded-2xl p-4 sm:p-5 mb-5 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30 ring-1 ring-white/20">
                <AlertCircle size={18} className="text-white" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-slate-900 dark:text-white font-bold tracking-wide">Sign in to place print orders</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Preview configuration and prices freely. Sign in when ready to generate a queue ticket.</p>
                <button
                  onClick={onLoginRequired}
                  className="mt-3 text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/30 cursor-pointer ring-1 ring-white/20"
                >
                  Sign In / Create Account
                </button>
              </div>
            </div>
          )}

          {/* Student Profile Ribbon */}
          {user && (user.full_name || user.usn) && (
            <div className="bg-gradient-to-r from-indigo-50/60 to-violet-50/60 dark:from-slate-800/60 dark:to-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-600/30 ring-1 ring-white/20">
                  {(user.full_name || user.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">{user.full_name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tracking-wide">{user.usn} • {user.email}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 px-2.5 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800/70 shadow-sm">
                Verified
              </span>
            </div>
          )}

          <form onSubmit={handleCreateOrder} className="space-y-6">
            {/* Upload Box */}
            <div className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all relative ${fileData ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-indigo-200/70 dark:border-slate-700/70 hover:border-indigo-400 bg-gradient-to-br from-indigo-50/30 to-violet-50/30 dark:from-indigo-950/20 dark:to-violet-950/20'}`}>
              <input
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              {fileData ? (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 text-white flex items-center justify-center mb-2 shadow-lg shadow-emerald-400/30 ring-1 ring-white/30">
                    <CheckCircle size={26} strokeWidth={2.2} />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white max-w-sm truncate">{fileData.original_filename}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 dark:from-emerald-900/60 dark:to-teal-900/60 dark:text-emerald-300 ring-1 ring-emerald-200/60">
                      {fileData.total_pages} {fileData.total_pages === 1 ? 'Page' : 'Pages'}
                    </span>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold font-mono uppercase tracking-wide ring-1 ring-indigo-200/60 px-2 py-1 rounded-lg">
                      {fileData.file_type === 'image' ? 'Image' : 'PDF'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileData(null);
                      setForm(f => ({ ...f, range: 'All', start: 1, end: 1 }));
                    }}
                    className="relative z-20 mt-3 text-xs text-slate-500 hover:text-rose-500 font-bold tracking-wide transition-all cursor-pointer hover:underline decoration-rose-500 decoration-2 underline-offset-3"
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 dark:text-indigo-400 dark:from-indigo-900/60 dark:to-violet-900/60 flex items-center justify-center mb-3 shadow-lg ring-1 ring-indigo-200/60">
                    <Printer size={26} strokeWidth={2} />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">Click or drag document to upload</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Accepts PDF, PNG, JPG, JPEG, WEBP</p>
                </div>
              )}

              {loading && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
                  <RefreshCw size={14} className="animate-spin" strokeWidth={2} /> Processing document...
                </div>
              )}
            </div>

            {/* Print Options Card */}
            <div className="bg-[#E9EEF5] dark:bg-[#0D1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Print Options</h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Station 1 • B&W ₹2/pg
                </span>
              </div>

              {/* 1. Page Range */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Pages Selection</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, range: 'All' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${form.range === 'All' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25' : 'bg-[#F3F6FA] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                  >
                    All Pages ({fileData ? fileData.total_pages : 1})
                  </button>
                  <button
                    type="button"
                    disabled={!fileData || fileData.total_pages <= 1}
                    onClick={() => setForm(f => ({ ...f, range: 'Custom' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${form.range === 'Custom' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25' : 'bg-[#F3F6FA] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                  >
                    Custom Range
                  </button>
                </div>

                {form.range === 'Custom' && fileData && (
                  <div className="mt-3 flex items-center gap-3 bg-[#F3F6FA] dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-500 font-medium">Pages:</span>
                    <input
                      type="number"
                      min="1"
                      max={fileData.total_pages}
                      value={form.start}
                      onChange={e => setForm(f => ({ ...f, start: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-16 text-center text-xs font-bold bg-[#EAEFF5] dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-1 text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="number"
                      min={form.start}
                      max={fileData.total_pages}
                      value={form.end}
                      onChange={e => setForm(f => ({ ...f, end: Math.min(fileData.total_pages, parseInt(e.target.value) || form.start) }))}
                      className="w-16 text-center text-xs font-bold bg-[#EAEFF5] dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-1 text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 ml-auto">
                      {Math.max(1, form.end - form.start + 1)} pages selected
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Sides & Copies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Print Sides */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Print Sides</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Single', 'Double'].map(side => (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, sides: side }))}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${form.sides === side ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25' : 'bg-[#F3F6FA] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                      >
                        {side === 'Single' ? '1-Sided' : '2-Sided (Duplex)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Copies Stepper */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Copies</label>
                  <div className="flex items-center bg-[#F3F6FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, copies: Math.max(1, f.copies - 1) }))}
                      className="w-8 h-8 rounded-lg bg-[#E5EBF2] dark:bg-slate-700 hover:bg-[#DDE4EE] text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-sm text-slate-800 dark:text-white">
                      {form.copies}
                    </span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, copies: Math.min(50, f.copies + 1) }))}
                      className="w-8 h-8 rounded-lg bg-[#E5EBF2] dark:bg-slate-700 hover:bg-[#DDE4EE] text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Binding Options */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Binding</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'None', label: 'No Binding', extra: '₹0', color: 'text-slate-400' },
                    { id: 'Stapled', label: 'Stapled', extra: '+₹5', color: 'text-teal-600 dark:text-teal-400 font-bold' },
                    { id: 'Spiral', label: 'Spiral Bound', extra: '+₹30', color: 'text-amber-600 dark:text-amber-400 font-bold', disabled: !state.settings?.spiral_enabled }
                  ].map(b => (
                    <button
                      key={b.id}
                      type="button"
                      disabled={b.disabled}
                      onClick={() => setForm(f => ({ ...f, binding: b.id }))}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${form.binding === b.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25' : 'bg-[#F3F6FA] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                    >
                      <div className="text-xs font-bold truncate">{b.label}</div>
                      <div className={`text-[10px] mt-0.5 ${form.binding === b.id ? 'text-white/80' : b.color}`}>
                        {b.disabled ? 'Out of stock' : b.extra}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Payment Option</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, payment: 'upi' }))}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${form.payment === 'upi' ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs' : 'bg-[#F3F6FA] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'}`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center shrink-0">
                      <CreditCard size={16} />
                    </div>
                    <div className="text-left leading-tight">
                      <div className="text-xs font-bold">UPI QR Code</div>
                      <div className="text-[10px] text-slate-400">Scan & print</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, payment: 'cash' }))}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${form.payment === 'cash' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs' : 'bg-[#F3F6FA] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'}`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <IndianRupee size={16} />
                    </div>
                    <div className="text-left leading-tight">
                      <div className="text-xs font-bold">Cash Counter</div>
                      <div className="text-[10px] text-slate-400">Pay on pickup</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Price & Submit CTA */}
            <div className="bg-[#E9EEF5] dark:bg-[#0D1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Estimated Total {form.payment === 'cash' && '(Pay at counter)'}
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">₹{calcPrice()}</span>
                  <span className="text-xs text-slate-500 font-medium">({pageCount * form.copies} pages total)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!fileData || loading || !state.settings?.shop_open || !user}
                className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer ${!fileData || loading || !state.settings?.shop_open || !user ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'}`}
              >
                {loading ? 'Processing...' : !user ? 'Sign in to Place Order' : !fileData ? 'Upload File to Continue' : !state.settings?.shop_open ? 'Shop Currently Closed' : 'Generate Queue Token'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Right Column: Live Pickup Tokens ── */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-[#F3F6FA] dark:bg-[#111A2E] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="text-indigo-600 dark:text-indigo-400" size={19} />
              <span>Active Pickup Tickets</span>
            </h2>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 font-mono bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
              {myActiveOrders.length} Active
            </span>
          </div>

          {!user ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <LogIn size={20} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Sign in to track orders</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Your queue tokens, 4-digit pickup PINs, and job statuses will appear here.</p>
            </div>
          ) : myActiveOrders.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Search size={20} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No active print orders</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Uploaded documents and live queue tokens will be displayed here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myActiveOrders.map(order => (
                <div key={order.id} className="bg-[#E9EEF5] dark:bg-[#0D1527] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                          {order.token || 'PQ-PENDING'}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 max-w-[200px] truncate" title={order.original_filename}>
                        {order.original_filename}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Station {order.printing_station}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {order.sliced_pages} pgs × {order.copies}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 mb-3">
                    <span className="px-2 py-0.5 rounded-lg bg-[#F3F6FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {order.sides}
                    </span>
                    {order.binding !== 'None' && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {order.binding}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-lg bg-[#F3F6FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 capitalize">
                      {order.payment_method} (₹{order.amount})
                    </span>
                  </div>

                  {/* Pickup PIN Block */}
                  {order.status !== 'Awaiting Payment' && order.status !== 'Collected' && order.status !== 'Refunded' && (
                    <div className="mt-1 bg-[#F3F6FA] dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pickup PIN</span>
                        <p className="text-[11px] text-slate-500">Show to shopkeeper</p>
                      </div>
                      <div className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-[0.25em] pl-2 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
                        {order.otp}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Checkout / QR / Confirmation Modal ── */}
      {checkoutData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F3F6FA] dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {checkoutData.token ? 'Order Placed!' : 'Scan UPI QR Code'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Order #{checkoutData.order_id} • Amount: ₹{checkoutData.amount}
            </p>

            {checkoutData.token ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <CheckCheck size={22} />
                  </div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Cash on Collection</p>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                    Pay ₹{checkoutData.amount} at the shop counter when picking up your print.
                  </p>
                  <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800/40 flex justify-between text-xs font-mono">
                    <span className="text-slate-600 dark:text-slate-400">Token: <strong className="text-slate-900 dark:text-white">{checkoutData.token}</strong></span>
                    <span className="text-slate-600 dark:text-slate-400">PIN: <strong className="text-slate-900 dark:text-white">{checkoutData.otp}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const updated = [checkoutData.order_id, ...myOrderIds];
                    setMyOrderIds(updated);
                    localStorage.setItem('myOrders', JSON.stringify(updated));
                    setCheckoutData(null);
                    setFileData(null);
                    fetchState();
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  View My Tickets
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 inline-block shadow-xs">
                  <QrCode size={180} className="text-slate-900" />
                </div>
                <p className="text-xs text-slate-500 font-medium">Scan using any UPI App (GPay, PhonePe, Paytm)</p>

                <button
                  onClick={handleConfirmPayment}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verifying payment...' : 'I Have Paid ₹' + checkoutData.amount}
                </button>
              </div>
            )}

            <button
              onClick={() => setCheckoutData(null)}
              className="mt-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium py-1 transition-colors cursor-pointer"
            >
              Cancel Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shopkeeper Terminal
// ---------------------------------------------------------------------------
function ShopkeeperDashboard({ state, fetchState, user }) {
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [printingOrderId, setPrintingOrderId] = useState(null);

  const toggleSetting = async (key, val) => {
    await axios.post(`${API_BASE}/settings`, { ...state.settings, [key]: val ? 1 : 0 }, { withCredentials: true });
    fetchState();
  };

  const updateStatus = async (id, status) => {
    await axios.post(`${API_BASE}/orders/${id}/status`, { status }, { withCredentials: true });
    fetchState();
  };

  const handleVerifyOTP = async () => {
    try {
      await axios.post(`${API_BASE}/orders/${verifyingOrder.id}/status`, { status: 'Collected', otp: pinInput }, { withCredentials: true });
      setVerifyingOrder(null);
      setPinInput('');
      fetchState();
    } catch {
      alert('Invalid PIN! Please check the student ticket PIN.');
    }
  };

  // ── Print: open the sliced PDF in a new tab and trigger browser print ──
  const handlePrintOrder = async (order) => {
    setPrintingOrderId(order.id);
    try {
      // First update status to Printing
      await axios.post(`${API_BASE}/orders/${order.id}/status`, { status: 'Printing' }, { withCredentials: true });
      fetchState();

      // Fetch the sliced PDF as a blob
      const res = await axios.get(`${API_BASE}/orders/${order.id}/print-file`, {
        withCredentials: true,
        responseType: 'blob'
      });

      // Open the PDF in a new tab and trigger window.print()
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
          }, 400);
        });
      } else {
        // If popup blocked, download it
        const a = document.createElement('a');
        a.href = url;
        a.download = `print_${order.token || order.id}.pdf`;
        a.click();
        alert('Popup was blocked. The PDF has been downloaded — open and print it manually.');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch print file. The file may have been purged.');
    }
    setPrintingOrderId(null);
  };

  // ── Filtering & Search ──
  const STATUS_OPTIONS = ['All', 'In Queue', 'Printing', 'Ready for Pickup', 'Awaiting Payment', 'Collected', 'Refunded'];

  const filteredOrders = state.orders.filter(order => {
    if (statusFilter !== 'All' && order.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesToken = (order.token || '').toLowerCase().includes(q);
      const matchesName = (order.student_name || '').toLowerCase().includes(q);
      const matchesUsn = (order.usn || '').toLowerCase().includes(q);
      const matchesFile = (order.original_filename || '').toLowerCase().includes(q);
      if (!matchesToken && !matchesName && !matchesUsn && !matchesFile) return false;
    }
    return true;
  });

  // ── Select All / Toggle ──
  const allFilteredIds = new Set(filteredOrders.map(o => o.id));
  const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.has(o.id));
  const someSelected = filteredOrders.some(o => selectedIds.has(o.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      // Deselect all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── Bulk Actions ──
  const selectedOrders = filteredOrders.filter(o => selectedIds.has(o.id));
  const selectedInQueue = selectedOrders.filter(o => o.status === 'In Queue');
  const selectedPrinting = selectedOrders.filter(o => o.status === 'Printing');

  const handleBulkAction = async (newStatus) => {
    const ids = selectedOrders.filter(o => {
      if (newStatus === 'Printing') return o.status === 'In Queue';
      if (newStatus === 'Ready for Pickup') return o.status === 'Printing';
      return false;
    }).map(o => o.id);

    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      await axios.post(`${API_BASE}/orders/bulk-status`, { order_ids: ids, status: newStatus }, { withCredentials: true });
      fetchState();
      clearSelection();
    } catch {
      alert('Bulk action failed');
    }
    setBulkLoading(false);
  };

  // Count summaries
  const countByStatus = (s) => state.orders.filter(o => o.status === s).length;

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-[#F3F6FA] dark:bg-[#111A2E] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span>Station Controls</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage live printer and paper supplies</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <ColourToggle
            label="Shop Accepting Orders"
            active={state.settings?.shop_open}
            onChange={v => toggleSetting('shop_open', v)}
            color="emerald"
          />
          <ColourToggle
            label="Printer Ready"
            active={state.settings?.bw_enabled}
            onChange={v => toggleSetting('bw_enabled', v)}
            color="indigo"
          />
          <ColourToggle
            label="Spiral Stock"
            active={state.settings?.spiral_enabled}
            onChange={v => toggleSetting('spiral_enabled', v)}
            color="amber"
          />
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'In Queue', count: countByStatus('In Queue'), color: 'indigo' },
          { label: 'Printing', count: countByStatus('Printing'), color: 'cyan' },
          { label: 'Ready for Pickup', count: countByStatus('Ready for Pickup'), color: 'emerald' },
          { label: 'Collected', count: countByStatus('Collected'), color: 'slate' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(statusFilter === s.label ? 'All' : s.label)}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${statusFilter === s.label
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
              : 'bg-[#F3F6FA] dark:bg-[#111A2E] border-slate-200 dark:border-slate-800 hover:border-indigo-300'
            }`}
          >
            <p className={`text-2xl font-extrabold ${statusFilter === s.label ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{s.count}</p>
            <p className={`text-[11px] font-bold mt-0.5 ${statusFilter === s.label ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-[#F3F6FA] dark:bg-[#111A2E] border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {/* Table Header: Search + Filter + Bulk Actions */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          {/* Row 1: Title + Count */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Queue & Print History</h3>
            <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
              {filteredOrders.length} / {state.orders.length} Jobs
            </span>
          </div>

          {/* Row 2: Search + Status Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="flex-1 min-w-[180px] relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by token, student, USN, or file..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#EAEFF5] dark:bg-[#0D1527] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-indigo-500 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative flex items-center gap-1.5">
              <Filter size={14} className="text-slate-500 dark:text-slate-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-[#EAEFF5] dark:bg-[#0D1527] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 cursor-pointer appearance-none pr-7"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {(statusFilter !== 'All' || searchQuery) && (
              <button
                onClick={() => { setStatusFilter('All'); setSearchQuery(''); }}
                className="text-xs text-slate-500 hover:text-indigo-600 font-bold cursor-pointer flex items-center gap-1"
              >
                <XCircle size={13} /> Clear
              </button>
            )}
          </div>

          {/* Row 3: Bulk Action Bar (only when items are selected) */}
          {someSelected && (
            <div className="flex flex-wrap items-center gap-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-2.5">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                {selectedIds.size} selected
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>

              {selectedInQueue.length > 0 && (
                <button
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction('Printing')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Printer size={13} /> Print {selectedInQueue.length} Jobs
                </button>
              )}
              {selectedPrinting.length > 0 && (
                <button
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction('Ready for Pickup')}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCheck size={13} /> Mark {selectedPrinting.length} Ready
                </button>
              )}

              <button
                onClick={clearSelection}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold cursor-pointer ml-auto flex items-center gap-1"
              >
                <X size={13} /> Deselect
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#E9EEF5] dark:bg-[#0D1527] text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                    title={allSelected ? 'Deselect all' : 'Select all'}
                  >
                    {allSelected ? <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" /> : someSelected ? <Minus size={16} className="text-indigo-400" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="py-3.5 px-4">TOKEN & STUDENT</th>
                <th className="py-3.5 px-4">FILE</th>
                <th className="py-3.5 px-4">OPTIONS</th>
                <th className="py-3.5 px-4">AMOUNT</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
              {filteredOrders.map(order => (
                <tr
                  key={order.id}
                  className={`transition-colors ${selectedIds.has(order.id) ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : 'hover:bg-[#EAEFF6] dark:hover:bg-slate-800/40'}`}
                >
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => toggleSelect(order.id)}
                      className="flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                    >
                      {selectedIds.has(order.id)
                        ? <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                        : <Square size={16} />
                      }
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">{order.token || '---'}</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{order.student_name}</p>
                    <p className="font-mono text-[11px] text-slate-400">{order.usn}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={order.original_filename}>
                      {order.original_filename}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5 font-mono">
                      {order.sliced_pages} pgs × {order.copies}
                      {order.sides === 'Double' && ' • Duplex'}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-[#F3F6FA] dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                        {order.sides}
                      </span>
                      {order.binding !== 'None' && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold">
                          {order.binding}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-800 dark:text-slate-200">₹{order.amount}</p>
                    <p className="capitalize text-[11px] font-medium text-slate-400 mt-0.5">{order.payment_method}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {order.status === 'In Queue' && (
                        <button
                          disabled={printingOrderId === order.id}
                          onClick={() => handlePrintOrder(order)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {printingOrderId === order.id ? (
                            <><RefreshCw size={12} className="animate-spin" /> Opening...</>
                          ) : (
                            <><Printer size={12} /> Print</>
                          )}
                        </button>
                      )}
                      {order.status === 'Printing' && (
                        <button
                          onClick={() => updateStatus(order.id, 'Ready for Pickup')}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Mark Ready
                        </button>
                      )}
                      {order.status === 'Ready for Pickup' && (
                        <button
                          onClick={() => setVerifyingOrder(order)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Handover (PIN)
                        </button>
                      )}
                      {order.status === 'Collected' && (
                        <span className="text-slate-400 text-xs font-medium flex items-center justify-end gap-1">
                          <CheckCheck size={14} className="text-emerald-500" /> Done
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={22} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-bold text-slate-400 dark:text-slate-500">
                        {state.orders.length === 0 ? 'No print jobs found.' : 'No orders match your filters.'}
                      </p>
                      {(statusFilter !== 'All' || searchQuery) && (
                        <button
                          onClick={() => { setStatusFilter('All'); setSearchQuery(''); }}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer mt-1"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OTP Handover Verification Modal */}
      {verifyingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F3F6FA] dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Key size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verify Pickup PIN</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Ask student for the 4-digit PIN for ticket <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{verifyingOrder.token}</strong>
            </p>

            <input
              autoFocus
              type="text"
              maxLength="4"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-36 bg-[#EAEFF5] dark:bg-[#0D1527] border-2 border-indigo-500 rounded-2xl px-4 py-3 text-slate-900 dark:text-white text-center text-3xl tracking-[0.25em] font-mono mx-auto mb-6 outline-none shadow-inner"
              placeholder="••••"
            />

            <div className="flex gap-2.5">
              <button
                onClick={() => setVerifyingOrder(null)}
                className="flex-1 py-2.5 text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOTP}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md cursor-pointer"
              >
                Verify & Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Panel
// ---------------------------------------------------------------------------
function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/users`, { withCredentials: true });
      setUsers(res.data.users);
    } catch {
      setError('Failed to load registered users');
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const setRole = async (userId, newRole) => {
    setActionLoading(userId);
    try {
      await axios.post(`${API_BASE}/admin/users/${userId}/role`, { role: newRole }, { withCredentials: true });
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user role');
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F6FA] dark:bg-[#111A2E] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield size={20} className="text-amber-500" />
          <span>User & Whitelist Management</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Promote students to shopkeeper or revoke access.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#E9EEF5] dark:bg-[#0D1527] text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">STUDENT NAME & USN</th>
              <th className="py-3 px-4">COLLEGE EMAIL</th>
              <th className="py-3 px-4">ROLE</th>
              <th className="py-3 px-4">JOINED DATE</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-[#EAEFF6] dark:hover:bg-slate-800/30">
                <td className="py-3 px-4">
                  <p className="font-bold text-slate-800 dark:text-slate-200">{u.full_name || '—'}</p>
                  <p className="font-mono text-slate-400 text-[11px]">{u.usn || '—'}</p>
                </td>
                <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">{u.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : u.role === 'shopkeeper' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                <td className="py-3 px-4 text-right">
                  {u.role === 'admin' ? (
                    <span className="text-[11px] font-bold text-slate-400">Protected</span>
                  ) : u.role === 'student' ? (
                    <button
                      disabled={actionLoading === u.id}
                      onClick={() => setRole(u.id, 'shopkeeper')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === u.id ? 'Updating...' : 'Make Shopkeeper'}
                    </button>
                  ) : (
                    <button
                      disabled={actionLoading === u.id}
                      onClick={() => setRole(u.id, 'student')}
                      className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === u.id ? 'Updating...' : 'Revoke Access'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auth Modal (Sign In & Registration)
// ---------------------------------------------------------------------------
function AuthModal({ tab, setTab, onLogin, onRegister, onClose }) {
  const [fields, setFields] = useState({ email: '', password: '', confirm: '', full_name: '', usn: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (tab === 'register') {
      const emailLower = fields.email.trim().toLowerCase();
      if (!emailLower.endsWith('@nmamit.in') && !emailLower.endsWith('@nitte.edu')) {
        setError('Please enter a valid college email address.');
        return;
      }
      if (fields.password !== fields.confirm) {
        setError('Passwords do not match.');
        return;
      }
      if (!fields.full_name.trim()) { setError('Full name is required.'); return; }
      if (!fields.usn.trim()) { setError('College USN is required.'); return; }
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        await onLogin(fields.email, fields.password);
      } else {
        await onRegister(fields.email, fields.password, fields.full_name.trim(), fields.usn.trim().toUpperCase());
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setFields({ email: '', password: '', confirm: '', full_name: '', usn: '' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#F3F6FA] dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-6 pb-0 text-center relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-indigo-600/25">
            <Printer size={22} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Print<span className="text-indigo-600 dark:text-indigo-400">Q</span></h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Campus Document Printing Portal</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex mx-6 mt-5 bg-[#E5EBF2] dark:bg-slate-800/80 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${tab === 'login' ? 'bg-[#F3F6FA] dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${tab === 'register' ? 'bg-[#F3F6FA] dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
          >
            New Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-medium p-3 rounded-xl flex items-center gap-2 border border-rose-200 dark:border-rose-900/60">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={fields.full_name}
                    onChange={set('full_name')}
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full bg-[#EAEFF5] dark:bg-[#0D1527] border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">College USN</label>
                <div className="relative">
                  <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={fields.usn}
                    onChange={set('usn')}
                    type="text"
                    required
                    placeholder="e.g. 4NM20CS001"
                    className="w-full bg-[#EAEFF5] dark:bg-[#0D1527] border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono uppercase font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={fields.email}
                onChange={set('email')}
                type="email"
                required
                placeholder={tab === 'register' ? 'XXXXXXXX@nmamit.in' : 'Email address'}
                className="w-full bg-[#EAEFF5] dark:bg-[#0D1527] border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={fields.password}
                onChange={set('password')}
                type={showPwd ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Min 6 characters"
                className="w-full bg-[#EAEFF5] dark:bg-[#0D1527] border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={fields.confirm}
                  onChange={set('confirm')}
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Re-enter password"
                  className="w-full bg-[#EAEFF5] dark:bg-[#0D1527] border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fields.confirm && fields.password !== fields.confirm && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">Passwords do not match</p>
              )}
              {fields.confirm && fields.password === fields.confirm && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-bold flex items-center gap-1 font-mono">
                  <Check size={12} /> Passwords match
                </p>
              )}
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/25 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Student Account'}
          </button>
        </form>

        <div className="px-6 pb-5 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Colourful Status Badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }) {
  const styles = {
    'Awaiting Payment': 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    'In Queue': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    'Printing': 'bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white animate-pulse border-indigo-500',
    'Ready for Pickup': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-bold',
    'Collected': 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    'Refunded': 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-900'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider inline-block border ${styles[status] || styles['Collected']}`}>
      {status}
    </span>
  );
}

function ColourToggle({ label, active, onChange, color = 'indigo' }) {
  const activeBg = color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-indigo-600';

  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div className={`relative w-9 h-5 rounded-full transition-colors ${active ? activeBg : 'bg-slate-300 dark:bg-slate-700'}`}>
        <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-xs ${active ? 'translate-x-4' : ''}`}></div>
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
      <input type="checkbox" className="hidden" checked={!!active} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}
