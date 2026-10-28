import React, { useState, useEffect, Component } from 'react';
import axios from 'axios';
import {
  Printer, FileText, Settings, Clock, CheckCircle,
  Zap, QrCode, LogIn, LogOut, User,
  Phone, Lock, Shield, CreditCard, IndianRupee,
  AlertCircle, Eye, EyeOff, X, Check,
  Sun, Moon, Plus, Minus, RefreshCw, Key, CheckCheck,
  Hash, Search, Filter, CheckSquare, Square, XCircle, Download,
  Layers, ChevronRight, Copy, UploadCloud, Sliders,
  Check as CheckIcon, CircleDot, AlertTriangle, ArrowRight,
  Sparkles, File, HardDrive
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';
const ACCEPTED_FILE_TYPES = '.pdf,.png,.jpg,.jpeg,.webp,.bmp';

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary caught error:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0B111E]">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded-lg p-6 max-w-md w-full shadow-sm text-center">
            <div className="w-10 h-10 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-200 dark:border-rose-900/40">
              <AlertCircle size={20} />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Application Error</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-mono bg-slate-50 dark:bg-[#0B111E] p-2.5 rounded border border-slate-200 dark:border-[#1E2D4A] text-left overflow-auto max-h-28">
              {this.state.error.message}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="w-full bg-[#4169E1] hover:bg-[#3457C7] text-white font-medium py-2 rounded-md text-xs transition-colors cursor-pointer"
            >
              Reload Interface
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
          phone: res.data.phone,
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

  const handleLogin = async (phone, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { phone, password }, { withCredentials: true });
    const u = {
      id: res.data.user_id,
      phone: res.data.phone,
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

  const handleRegister = async (phone, password, full_name, usn) => {
    const res = await axios.post(`${API_BASE}/auth/register`, { phone, password, full_name, usn }, { withCredentials: true });
    const u = {
      id: res.data.user_id,
      phone: res.data.phone,
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B111E]">
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500">
          <RefreshCw size={14} className="animate-spin text-[#4169E1]" />
          <span>Initializing PrintQ workstation...</span>
        </div>
      </div>
    );
  }

  const isShopOpen = Boolean(state.settings?.shop_open);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B111E] text-slate-800 dark:text-slate-200 antialiased">

        {/* ── Top Navigation / Workstation Header ── */}
        <header className="sticky top-0 z-40 bg-white dark:bg-[#0E1728] border-b border-slate-200 dark:border-[#1E2D4A] shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

            {/* Left: Product Brand & Station Context */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[#4169E1] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Printer size={16} strokeWidth={2.2} className="text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-[#182B49] dark:text-white">Print<span className="text-[#4169E1] dark:text-[#6092FA]">Q</span></span>
                <span className="text-slate-300 dark:text-slate-700 font-light">/</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Station 1</span>
              </div>
            </div>

            {/* Center: Workstation View Tabs (for Staff / Admin) */}
            {user && (user.role === 'shopkeeper' || user.role === 'admin') ? (
              <nav className="flex items-center bg-slate-100 dark:bg-[#111A2E] p-0.5 rounded-md border border-slate-200/80 dark:border-[#1E2D4A] text-xs font-medium">
                <button
                  onClick={() => setView('student')}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    view === 'student'
                      ? 'bg-white dark:bg-[#182B49] text-[#182B49] dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Student Portal
                </button>
                <button
                  onClick={() => setView('shop')}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    view === 'shop'
                      ? 'bg-[#4169E1] text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Shop Terminal
                </button>
                {user.role === 'admin' && (
                  <button
                    onClick={() => setView('admin')}
                    className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                      view === 'admin'
                        ? 'bg-[#182B49] text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Admin
                  </button>
                )}
              </nav>
            ) : (
              /* Center: Status readout for students */
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className={`w-2 h-2 rounded-full ${isShopOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className={isShopOpen ? 'text-slate-700 dark:text-slate-200 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                    {isShopOpen ? 'Counter Open' : 'Counter Closed'}
                  </span>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>Wait: <strong className="text-slate-800 dark:text-slate-200 font-mono">~{state.stats?.est_wait_mins || 0}m</strong></span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>Queue: <strong className="text-slate-800 dark:text-slate-200 font-mono">{state.stats?.active_orders || 0} jobs</strong></span>
              </div>
            )}

            {/* Right: Actions, Theme Toggle & User Info */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="w-8 h-8 rounded-md flex items-center justify-center bg-white dark:bg-[#111A2E] hover:bg-slate-100 dark:hover:bg-[#152238] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1E2D4A] transition-colors cursor-pointer"
              >
                {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-600" />}
              </button>

              {user ? (
                <div className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800/80 dark:to-slate-800/80 px-4 py-2 rounded-xl border border-indigo-200/60 dark:border-slate-700 shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-sm"></span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden md:inline max-w-[140px] truncate">
                    {user.full_name || user.phone || user.email}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase px-1 py-0.2 rounded bg-slate-100 dark:bg-[#1E2D4A]">
                    {user.role}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowAuthModal(true); setAuthTab('login'); }}
                  className="inline-flex items-center gap-1.5 bg-[#4169E1] hover:bg-[#3457C7] text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer shadow-xs"
                >
                  <LogIn size={13} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Main View Workspace ── */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
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

        {/* ── Minimal Footer ── */}
        <footer className="border-t border-slate-200 dark:border-[#1E2D4A] py-3 px-4 text-xs text-slate-400 dark:text-slate-500 pb-16 sm:pb-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>PrintQ Campus Fulfillment System • Central Library Station 1</span>
            <span className="font-mono text-[11px]">B&W ₹2.00/pg • Stapled +₹5 • Spiral +₹30</span>
          </div>
        </footer>

        {/* ── Mobile View Tabs (Staff only) ── */}
        {user && (user.role === 'shopkeeper' || user.role === 'admin') && (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0E1728]/95 backdrop-blur border-t border-slate-200 dark:border-[#1E2D4A] flex z-50 py-1 px-2">
            <button
              onClick={() => setView('student')}
              className={`flex-1 py-1.5 text-center text-[11px] font-medium flex flex-col items-center gap-0.5 ${view === 'student' ? 'text-[#4169E1]' : 'text-slate-500'}`}
            >
              <User size={15} /> Student
            </button>
            <button
              onClick={() => setView('shop')}
              className={`flex-1 py-1.5 text-center text-[11px] font-medium flex flex-col items-center gap-0.5 ${view === 'shop' ? 'text-[#4169E1]' : 'text-slate-500'}`}
            >
              <Printer size={15} /> Terminal
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => setView('admin')}
                className={`flex-1 py-1.5 text-center text-[11px] font-medium flex flex-col items-center gap-0.5 ${view === 'admin' ? 'text-[#182B49] dark:text-white' : 'text-slate-500'}`}
              >
                <Shield size={15} /> Admin
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Authentication Modal ── */}
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
// Student Portal (Document Ordering & Live Ticket Tracking)
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
  const [copiedPinId, setCopiedPinId] = useState(null);

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

  const copyPin = (pin, id) => {
    navigator.clipboard?.writeText(pin);
    setCopiedPinId(id);
    setTimeout(() => setCopiedPinId(null), 2000);
  };

  const myActiveOrders = state.orders.filter(o => myOrderIds.includes(o.id));
  const isShopOpen = Boolean(state.settings?.shop_open);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

      {/* ── Left Column: Document Staging & Print Setup ── */}
      <div className="lg:col-span-7 space-y-4">

        {/* Guest Warning */}
        {!user && (
          <div className="bg-white dark:bg-[#111A2E] border border-amber-200 dark:border-amber-900/40 rounded-lg p-3.5 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Sign in to print: </span>
              <span className="text-slate-500 dark:text-slate-400">Configure your print specifications freely below. Sign in when ready to generate your queue ticket.</span>
            </div>
            <button
              type="button"
              onClick={onLoginRequired}
              className="text-xs text-[#4169E1] font-semibold hover:underline shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}

          {/* Student Profile Ribbon */}
          {user && (user.full_name || user.usn) && (
            <div className="bg-gradient-to-r from-indigo-50/60 to-violet-50/60 dark:from-slate-800/60 dark:to-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-600/30 ring-1 ring-white/20">
                  {(user.full_name || user.phone || user.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">{user.full_name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tracking-wide">{user.usn} • {user.phone || user.email}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 px-2.5 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800/70 shadow-sm">
                Verified
              </span>
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">{user.full_name || user.email}</span>
                {user.usn && <span className="text-slate-400 font-mono ml-2">({user.usn})</span>}
              </div>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/80">
              Verified Student
            </span>
          </div>
        )}

        {/* Section 1: File Uploader */}
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-[#1E2D4A]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Document Upload
            </h2>
            <span className="text-[11px] text-slate-400">PDF, PNG, JPG, WEBP</span>
          </div>

          <div className={`border border-dashed rounded-md p-5 text-center relative transition-colors ${
            fileData
              ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'border-slate-300 dark:border-[#1E2D4A] hover:border-[#4169E1] bg-slate-50/50 dark:bg-[#0B111E]'
          }`}>
            <input
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            {fileData ? (
              <div className="flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={fileData.original_filename}>
                      {fileData.original_filename}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {fileData.total_pages} {fileData.total_pages === 1 ? 'page' : 'pages'} • {fileData.file_type.toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFileData(null);
                    setForm(f => ({ ...f, range: 'All', start: 1, end: 1 }));
                  }}
                  className="relative z-20 text-xs text-rose-600 dark:text-rose-400 font-medium hover:underline cursor-pointer shrink-0"
                >
                  Replace
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-2">
                <UploadCloud size={24} className="text-[#4169E1] mb-1.5" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Click to choose file or drag document here
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Maximum file size: 50MB</p>
              </div>
            )}

            {loading && (
              <div className="mt-2 text-xs text-[#4169E1] font-medium flex items-center justify-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" /> Analyzing page count...
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Print Specifications */}
        <form onSubmit={handleCreateOrder} className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1E2D4A]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Print Specifications
            </h2>
            <span className="text-[11px] text-slate-500">Standard: B&W ₹2/pg</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Page Range */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Page Range
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, range: 'All' }))}
                  className={`h-8 px-2.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                    form.range === 'All'
                      ? 'bg-[#182B49] text-white border-[#182B49] dark:bg-[#4169E1] dark:border-[#4169E1]'
                      : 'bg-white dark:bg-[#0B111E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E2D4A] hover:bg-slate-50'
                  }`}
                >
                  All ({fileData ? fileData.total_pages : 1})
                </button>
                <button
                  type="button"
                  disabled={!fileData || fileData.total_pages <= 1}
                  onClick={() => setForm(f => ({ ...f, range: 'Custom' }))}
                  className={`h-8 px-2.5 rounded text-xs font-medium border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    form.range === 'Custom'
                      ? 'bg-[#182B49] text-white border-[#182B49] dark:bg-[#4169E1] dark:border-[#4169E1]'
                      : 'bg-white dark:bg-[#0B111E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E2D4A] hover:bg-slate-50'
                  }`}
                >
                  Custom
                </button>
              </div>

              {form.range === 'Custom' && fileData && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-slate-500">From</span>
                  <input
                    type="number"
                    min="1"
                    max={fileData.total_pages}
                    value={form.start}
                    onChange={e => setForm(f => ({ ...f, start: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-14 h-7 text-center font-mono font-bold bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-[#1E2D4A] rounded outline-none focus:border-[#4169E1]"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="number"
                    min={form.start}
                    max={fileData.total_pages}
                    value={form.end}
                    onChange={e => setForm(f => ({ ...f, end: Math.min(fileData.total_pages, parseInt(e.target.value) || form.start) }))}
                    className="w-14 h-7 text-center font-mono font-bold bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-[#1E2D4A] rounded outline-none focus:border-[#4169E1]"
                  />
                  <span className="text-[11px] text-[#4169E1] font-mono ml-auto">
                    {Math.max(1, form.end - form.start + 1)} pgs
                  </span>
                </div>
              )}
            </div>

            {/* Print Sides */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Print Sides
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Single', 'Double'].map(side => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, sides: side }))}
                    className={`h-8 px-2.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                      form.sides === side
                        ? 'bg-[#182B49] text-white border-[#182B49] dark:bg-[#4169E1] dark:border-[#4169E1]'
                        : 'bg-white dark:bg-[#0B111E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E2D4A] hover:bg-slate-50'
                    }`}
                  >
                    {side === 'Single' ? '1-Sided' : 'Duplex (2-Sided)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies Stepper */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Copies
              </label>
              <div className="flex items-center bg-white dark:bg-[#0B111E] border border-slate-200 dark:border-[#1E2D4A] rounded h-8 px-1">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, copies: Math.max(1, f.copies - 1) }))}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <Minus size={12} />
                </button>
                <span className="flex-1 text-center font-mono font-semibold text-xs text-slate-800 dark:text-slate-200">
                  {form.copies}
                </span>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, copies: Math.min(50, f.copies + 1) }))}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {/* Finishing & Binding */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Finishing / Binding
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'None', label: 'None', extra: '₹0' },
                  { id: 'Stapled', label: 'Staple', extra: '+₹5' },
                  { id: 'Spiral', label: 'Spiral', extra: '+₹30', disabled: !state.settings?.spiral_enabled }
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={b.disabled}
                    onClick={() => setForm(f => ({ ...f, binding: b.id }))}
                    className={`h-8 px-2 rounded text-xs border transition-colors cursor-pointer flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed ${
                      form.binding === b.id
                        ? 'bg-[#182B49] text-white border-[#182B49] dark:bg-[#4169E1] dark:border-[#4169E1] font-semibold'
                        : 'bg-white dark:bg-[#0B111E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E2D4A] hover:bg-slate-50'
                    }`}
                  >
                    <span>{b.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">{b.extra}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, payment: 'upi' }))}
                className={`p-2.5 rounded border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                  form.payment === 'upi'
                    ? 'border-[#4169E1] bg-blue-50/40 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#0B111E] hover:border-slate-300'
                }`}
              >
                <CreditCard size={16} className={form.payment === 'upi' ? 'text-[#4169E1]' : 'text-slate-400'} />
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">UPI QR Code</div>
                  <div className="text-[10px] text-slate-400">Scan & print immediately</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, payment: 'cash' }))}
                className={`p-2.5 rounded border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                  form.payment === 'cash'
                    ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#0B111E] hover:border-slate-300'
                }`}
              >
                <IndianRupee size={16} className={form.payment === 'cash' ? 'text-emerald-600' : 'text-slate-400'} />
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Cash on Collection</div>
                  <div className="text-[10px] text-slate-400">Pay at Station 1 counter</div>
                </div>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Right Column: Order Summary & Active Tickets ── */}
      <div className="lg:col-span-5 space-y-4">

        {/* Order Summary & Submit Card */}
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded-lg p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1E2D4A] mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Order Summary
            </h2>
            <span className="text-[11px] font-mono text-slate-500">Station 1</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Document Pages</span>
              <span className="font-mono">{fileData ? fileData.total_pages : 0}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Selected Pages</span>
              <span className="font-mono">{pageCount}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Copies × Base Rate</span>
              <span className="font-mono">{form.copies} × ₹2.00</span>
            </div>
            {form.binding !== 'None' && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Binding ({form.binding})</span>
                <span className="font-mono">+{form.binding === 'Spiral' ? '₹30' : '₹5'}</span>
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-[#1E2D4A] flex justify-between items-baseline">
              <span className="font-semibold text-slate-900 dark:text-white">Total Amount</span>
              <span className="text-xl font-bold font-mono text-[#182B49] dark:text-[#4169E1]">
                ₹{calcPrice()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={!fileData || loading || !isShopOpen || !user}
            className={`w-full mt-4 py-2.5 rounded font-medium text-xs transition-colors cursor-pointer shadow-xs ${
              !fileData || loading || !isShopOpen || !user
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-[#4169E1] hover:bg-[#3457C7] text-white font-semibold'
            }`}
          >
            {loading
              ? 'Generating Queue Ticket...'
              : !user
              ? 'Sign In to Place Order'
              : !fileData
              ? 'Upload Document to Continue'
              : !isShopOpen
              ? 'Counter Currently Closed'
              : 'Generate Print Ticket'}
          </button>
        </div>

        {/* Active Pickup Tickets Card */}
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded-lg p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1E2D4A] mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock size={13} className="text-[#4169E1]" />
              <span>Active Pickup Tickets</span>
            </h2>
            <span className="text-xs font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#1E2D4A] text-slate-600 dark:text-slate-300">
              {myActiveOrders.length}
            </span>
          </div>

          {!user ? (
            <p className="text-xs text-slate-400 text-center py-6">
              Sign in to view your live tickets and pickup PINs.
            </p>
          ) : myActiveOrders.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              No active tickets. Upload a document to join the queue.
            </p>
          ) : (
            <div className="space-y-3">
              {myActiveOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-[#1E2D4A] rounded p-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#182B49] dark:text-[#4169E1]">
                          {order.token || 'PQ-PENDING'}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-1 truncate max-w-[200px]" title={order.original_filename}>
                        {order.original_filename}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">₹{order.amount}</span>
                      <p className="text-[10px] font-mono text-slate-400">{order.sliced_pages}p × {order.copies}c</p>
                    </div>
                  </div>

                  {/* 4-Digit Pickup PIN Banner */}
                  {order.status !== 'Awaiting Payment' && order.status !== 'Collected' && order.status !== 'Refunded' && (
                    <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded p-2 flex items-center justify-between mt-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Pickup PIN
                        </span>
                        <p className="text-[11px] text-slate-500">Provide to counter clerk</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-base font-bold text-[#182B49] dark:text-[#4169E1] tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-[#0B111E] border border-slate-200 dark:border-[#1E2D4A]">
                          {order.otp}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyPin(order.otp, order.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title="Copy PIN"
                        >
                          {copiedPinId === order.id ? <CheckIcon size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded-lg p-5 max-w-sm w-full text-center shadow-lg">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {checkoutData.token ? 'Ticket Generated' : 'UPI Payment Required'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Order #{checkoutData.order_id} • Amount: ₹{checkoutData.amount}
            </p>

            {checkoutData.token ? (
              <div className="space-y-3 text-left">
                <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold mb-1">
                    <CheckCircle size={14} />
                    <span>Cash on Collection</span>
                  </div>
                  <p className="text-emerald-700/90 dark:text-emerald-400/90 text-[11px]">
                    Pay ₹{checkoutData.amount} at Station 1 counter upon collecting your document.
                  </p>
                  <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex justify-between text-xs font-mono">
                    <span>Token: <strong>{checkoutData.token}</strong></span>
                    <span>PIN: <strong>{checkoutData.otp}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const updated = [checkoutData.order_id, ...myOrderIds];
                    setMyOrderIds(updated);
                    localStorage.setItem('myOrders', JSON.stringify(updated));
                    setCheckoutData(null);
                    setFileData(null);
                    fetchState();
                  }}
                  className="w-full bg-[#4169E1] hover:bg-[#3457C7] text-white font-medium py-2 rounded text-xs transition-colors cursor-pointer"
                >
                  View Active Ticket
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white p-2.5 rounded border border-slate-200 inline-block shadow-xs">
                  <QrCode size={160} className="text-slate-900 mx-auto" />
                </div>
                <p className="text-[11px] text-slate-500">Scan via GPay, PhonePe, Paytm, or BHIM</p>

                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={loading}
                  className="w-full bg-[#4169E1] hover:bg-[#3457C7] text-white font-medium py-2 rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verifying payment...' : `I Have Paid ₹${checkoutData.amount}`}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setCheckoutData(null)}
              className="mt-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
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
// Shopkeeper Terminal (Operational Workstation)
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

  const handlePrintOrder = async (order) => {
    setPrintingOrderId(order.id);
    try {
      await axios.post(`${API_BASE}/orders/${order.id}/status`, { status: 'Printing' }, { withCredentials: true });
      fetchState();

      const res = await axios.get(`${API_BASE}/orders/${order.id}/print-file`, {
        withCredentials: true,
        responseType: 'blob'
      });

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
        const a = document.createElement('a');
        a.href = url;
        a.download = `print_${order.token || order.id}.pdf`;
        a.click();
        alert('Popup was blocked. Sliced PDF has been downloaded for printing.');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch print file.');
    }
    setPrintingOrderId(null);
  };

  // Status Filter Counts
  const countByStatus = (s) => state.orders.filter(o => o.status === s).length;

  const STATUS_TABS = [
    { label: 'All Jobs', key: 'All', count: state.orders.length },
    { label: 'In Queue', key: 'In Queue', count: countByStatus('In Queue') },
    { label: 'Printing', key: 'Printing', count: countByStatus('Printing') },
    { label: 'Ready for Pickup', key: 'Ready for Pickup', count: countByStatus('Ready for Pickup') },
    { label: 'Collected', key: 'Collected', count: countByStatus('Collected') },
  ];

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

  const allFilteredIds = new Set(filteredOrders.map(o => o.id));
  const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.has(o.id));
  const someSelected = filteredOrders.some(o => selectedIds.has(o.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
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

  return (
    <div className="space-y-4">

      {/* ── Operational Command Bar (Station Metadata & Hardware Toggles) ── */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded-lg p-3 sm:px-4 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">Station 1 Workstation</h1>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs text-slate-500 font-mono">Central Library Counter</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Queue: <strong className="text-slate-700 dark:text-slate-300 font-mono">{state.stats?.active_orders || 0} active</strong> • Est wait: <strong className="text-slate-700 dark:text-slate-300 font-mono">~{state.stats?.est_wait_mins || 0}m</strong>
          </p>
        </div>

        {/* Clear, properly aligned station status toggles */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-[#1E2D4A]">
          <ColourToggle
            label="Accepting Orders"
            active={state.settings?.shop_open}
            onChange={v => toggleSetting('shop_open', v)}
          />
          <ColourToggle
            label="Printer Online"
            active={state.settings?.bw_enabled}
            onChange={v => toggleSetting('bw_enabled', v)}
          />
          <ColourToggle
            label="Spiral Stock"
            active={state.settings?.spiral_enabled}
            onChange={v => toggleSetting('spiral_enabled', v)}
          />
        </div>
      </div>

      {/* ── Queue Management Workstation (Filters & Action Strip) ── */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded-lg shadow-xs overflow-hidden">

        {/* Integrated Filter Tabs & Search Strip */}
        <div className="border-b border-slate-200 dark:border-[#1E2D4A]">
          {/* Status Tabs */}
          <div className="flex overflow-x-auto text-xs font-medium px-2 pt-1 border-b border-slate-100 dark:border-[#1E2D4A]/60">
            {STATUS_TABS.map(tab => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 border-b-2 -mb-px transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? 'border-[#4169E1] text-[#4169E1] font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-950 text-[#4169E1]'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Bulk Operations Strip */}
          <div className="p-2.5 sm:px-3.5 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/60 dark:bg-[#0E1728]/60">
            {/* Search Input */}
            <div className="flex-1 min-w-[220px] max-w-md relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket, student, USN, filename..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 bg-white dark:bg-[#0B111E] border border-slate-200 dark:border-[#1E2D4A] rounded pl-8 pr-7 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#4169E1]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <XCircle size={13} />
                </button>
              )}
            </div>

            {/* Quick Action / Refresh Indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] font-mono text-slate-400">
                {filteredOrders.length} of {state.orders.length} jobs
              </span>
              <button
                type="button"
                onClick={fetchState}
                title="Refresh Queue"
                className="h-8 px-2.5 rounded border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#0B111E] hover:bg-slate-50 dark:hover:bg-[#152238] text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw size={12} />
                <span className="text-[11px]">Refresh</span>
              </button>
            </div>
          </div>

          {/* Bulk Operations Bar (Conditional) */}
          {someSelected && (
            <div className="bg-blue-50/80 dark:bg-blue-950/40 border-t border-blue-200 dark:border-blue-900/60 px-3 py-1.5 flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedIds.size} selected
              </span>

              {selectedInQueue.length > 0 && (
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction('Printing')}
                  className="h-7 px-2.5 bg-[#4169E1] hover:bg-[#3457C7] text-white rounded text-xs font-medium cursor-pointer flex items-center gap-1"
                >
                  <Printer size={12} /> Print {selectedInQueue.length}
                </button>
              )}

              {selectedPrinting.length > 0 && (
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction('Ready for Pickup')}
                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium cursor-pointer flex items-center gap-1"
                >
                  <CheckCheck size={12} /> Mark {selectedPrinting.length} Ready
                </button>
              )}

              <button
                type="button"
                onClick={clearSelection}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs ml-auto cursor-pointer"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* ── High-Density Data Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-[#0E1728] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#1E2D4A]">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {allSelected ? <CheckSquare size={14} className="text-[#4169E1]" /> : someSelected ? <Minus size={14} className="text-[#4169E1]" /> : <Square size={14} />}
                  </button>
                </th>
                <th className="py-2.5 px-3">TICKET</th>
                <th className="py-2.5 px-3">STUDENT & USN</th>
                <th className="py-2.5 px-3">DOCUMENT</th>
                <th className="py-2.5 px-3">PAGES & SPECS</th>
                <th className="py-2.5 px-3">FINISHING</th>
                <th className="py-2.5 px-3">PAYMENT</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E2D4A]/60">
              {filteredOrders.map(order => (
                <tr
                  key={order.id}
                  className={`transition-colors ${
                    selectedIds.has(order.id)
                      ? 'bg-blue-50/50 dark:bg-blue-950/20'
                      : 'hover:bg-slate-50/70 dark:hover:bg-[#152238]/40'
                  }`}
                >
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      onClick={() => toggleSelect(order.id)}
                      className="flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {selectedIds.has(order.id)
                        ? <CheckSquare size={14} className="text-[#4169E1]" />
                        : <Square size={14} />
                      }
                    </button>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-mono font-bold text-xs text-[#182B49] dark:text-[#4169E1]">
                      {order.token || 'PQ-PENDING'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 ml-1.5">St.{order.printing_station}</span>
                  </td>
                  <td className="py-2 px-3">
                    <p className="font-medium text-slate-900 dark:text-white leading-tight">
                      {order.student_name}
                    </p>
                    <p className="font-mono text-[10px] text-slate-400">{order.usn}</p>
                  </td>
                  <td className="py-2 px-3">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[190px]" title={order.original_filename}>
                      {order.original_filename}
                    </p>
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    <span>{order.sliced_pages}p × {order.copies}c</span>
                    <span className="text-slate-400 ml-1">({order.sides === 'Double' ? 'Duplex' : '1-Side'})</span>
                  </td>
                  <td className="py-2 px-3">
                    {order.binding !== 'None' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {order.binding}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-bold font-mono text-slate-900 dark:text-white">₹{order.amount}</span>
                    <span className="text-[10px] text-slate-400 ml-1 capitalize">({order.payment_method})</span>
                  </td>
                  <td className="py-2 px-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {order.status === 'In Queue' && (
                        <button
                          type="button"
                          disabled={printingOrderId === order.id}
                          onClick={() => handlePrintOrder(order)}
                          className="h-7 px-2.5 bg-[#4169E1] hover:bg-[#3457C7] text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-xs"
                        >
                          {printingOrderId === order.id ? (
                            <><RefreshCw size={11} className="animate-spin" /> Slicing...</>
                          ) : (
                            <><Printer size={11} /> Print PDF</>
                          )}
                        </button>
                      )}
                      {order.status === 'Printing' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(order.id, 'Ready for Pickup')}
                          className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium cursor-pointer shadow-xs"
                        >
                          Mark Ready
                        </button>
                      )}
                      {order.status === 'Ready for Pickup' && (
                        <button
                          type="button"
                          onClick={() => setVerifyingOrder(order)}
                          className="h-7 px-2.5 bg-[#182B49] dark:bg-[#4169E1] hover:opacity-90 text-white rounded text-xs font-medium cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Key size={11} /> Handover (PIN)
                        </button>
                      )}
                      {order.status === 'Collected' && (
                        <span className="text-slate-400 text-xs flex items-center justify-end gap-1">
                          <CheckCheck size={13} className="text-emerald-500" /> Done
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 text-xs">
                    No orders match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Handover OTP Verification Dialog ── */}
      {verifyingOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded-lg p-5 max-w-xs w-full text-center shadow-lg">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Verify Student Pickup PIN</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Ticket: <strong className="font-mono text-[#182B49] dark:text-[#4169E1]">{verifyingOrder.token}</strong> ({verifyingOrder.student_name})
            </p>

            <input
              autoFocus
              type="text"
              maxLength="4"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-32 h-10 bg-slate-50 dark:bg-[#0B111E] border border-slate-300 dark:border-[#1E2D4A] rounded px-3 text-center text-xl tracking-widest font-mono mx-auto mb-4 outline-none focus:border-[#4169E1]"
              placeholder="••••"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVerifyingOrder(null)}
                className="flex-1 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyOTP}
                className="flex-1 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded cursor-pointer shadow-xs"
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
// Admin Panel (User Roles & Access Control)
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
      <div className="flex justify-center py-16">
        <RefreshCw size={18} className="animate-spin text-[#4169E1]" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded-lg shadow-xs overflow-hidden">
      <div className="p-3.5 border-b border-slate-200 dark:border-[#1E2D4A] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Shield size={16} className="text-[#4169E1]" />
            <span>User Account Roles</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Manage operator permissions for PrintQ campus workstations</p>
        </div>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-50 text-rose-700 text-xs border-b border-rose-100">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-[#0E1728] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#1E2D4A]">
            <tr>
              <th className="py-3 px-4">STUDENT NAME & USN</th>
              <th className="py-3 px-4">PHONE NUMBER</th>
              <th className="py-3 px-4">ROLE</th>
              <th className="py-3 px-4">JOINED DATE</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#1E2D4A]/60">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-[#152238]/40">
                <td className="py-2 px-3">
                  <p className="font-medium text-slate-900 dark:text-white">{u.full_name || '—'}</p>
                  <p className="font-mono text-slate-400 text-[10px]">{u.usn || '—'}</p>
                </td>
                <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">{u.phone || '—'}</td>
                <td className="py-3 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : u.role === 'shopkeeper' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="py-2 px-3 text-right">
                  {u.role === 'admin' ? (
                    <span className="text-[11px] text-slate-400">System Admin</span>
                  ) : u.role === 'student' ? (
                    <button
                      type="button"
                      disabled={actionLoading === u.id}
                      onClick={() => setRole(u.id, 'shopkeeper')}
                      className="h-7 px-2.5 bg-[#182B49] dark:bg-[#4169E1] hover:opacity-90 text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {actionLoading === u.id ? 'Updating...' : 'Promote to Shopkeeper'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading === u.id}
                      onClick={() => setRole(u.id, 'student')}
                      className="h-7 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50 shadow-xs"
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
// Authentication Modal (Sign In, Registration, & Demo Quick Login)
// ---------------------------------------------------------------------------
function AuthModal({ tab, setTab, onLogin, onRegister, onClose }) {
  const [fields, setFields] = useState({ phone: '', password: '', confirm: '', full_name: '', usn: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));
  const setPhone = (e) => setFields(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^[6-9]\d{9}$/.test(fields.phone)) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }

    if (tab === 'register') {
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
        await onLogin(fields.phone, fields.password);
      } else {
        await onRegister(fields.phone, fields.password, fields.full_name.trim(), fields.usn.trim().toUpperCase());
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    }
    setLoading(false);
  };

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setFields({ phone: '', password: '', confirm: '', full_name: '', usn: '' });
  };

  const fillAndSubmitDemo = (email, password) => {
    setFields(f => ({ ...f, email, password }));
    setLoading(true);
    setError('');
    onLogin(email, password).catch(err => {
      setError(err.response?.data?.error || 'Demo login failed');
      setLoading(false);
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-[#1E2D4A] rounded-lg w-full max-w-sm shadow-lg overflow-y-auto max-h-[92vh]">

        {/* Modal Header */}
        <div className="p-5 pb-0 text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
          <div className="w-10 h-10 rounded-lg bg-[#4169E1] text-white flex items-center justify-center mx-auto mb-2.5 shadow-xs">
            <Printer size={20} strokeWidth={2.2} className="text-white" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Print<span className="text-[#4169E1] dark:text-[#6092FA]">Q</span> Workstation Login
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Central Campus Printing System</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex mx-5 mt-3 bg-slate-100 dark:bg-slate-800 rounded p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`flex-1 py-1 rounded transition-colors cursor-pointer ${
              tab === 'login'
                ? 'bg-white dark:bg-[#182B49] text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`flex-1 py-1 rounded transition-colors cursor-pointer ${
              tab === 'register'
                ? 'bg-white dark:bg-[#182B49] text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Register Student
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && (
            <div className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs p-2.5 rounded flex items-center gap-2 border border-rose-200 dark:border-rose-900/60">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  value={fields.full_name}
                  onChange={set('full_name')}
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="w-full h-8 bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-[#1E2D4A] rounded px-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#4169E1]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  College USN
                </label>
                <input
                  value={fields.usn}
                  onChange={set('usn')}
                  type="text"
                  required
                  placeholder="e.g. 4NM20CS001"
                  className="w-full h-8 bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-[#1E2D4A] rounded px-2.5 text-xs font-mono uppercase text-slate-900 dark:text-white outline-none focus:border-[#4169E1]"
                />
              </div>
            </>
          )}

          {tab === 'login' && (
            <div className="bg-slate-100 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px]">
              <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 text-[10px] uppercase tracking-wider">Quick Demo Login:</span>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFields(f => ({ ...f, phone: '9777777777', password: 'student@netdotcom' }))}
                  className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-300 rounded-lg font-bold border border-slate-200 dark:border-slate-600 cursor-pointer text-[10px]"
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setFields(f => ({ ...f, phone: '9888888888', password: 'shopkeeper@netdotcom' }))}
                  className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-300 rounded-lg font-bold border border-slate-200 dark:border-slate-600 cursor-pointer text-[10px]"
                >
                  Shopkeeper
                </button>
                <button
                  type="button"
                  onClick={() => setFields(f => ({ ...f, phone: '9999999999', password: 'admin@netdotcom' }))}
                  className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg font-bold border border-slate-200 dark:border-slate-600 cursor-pointer text-[10px]"
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={fields.phone}
                onChange={setPhone}
                type="tel"
                required
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit phone number"
                placeholder="10-digit phone number"
                className="w-full bg-[#EAEFF5] dark:bg-[#0D1527] border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                value={fields.password}
                onChange={set('password')}
                type={showPwd ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                className="w-full h-8 bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-[#1E2D4A] rounded pl-2.5 pr-8 text-xs text-slate-900 dark:text-white outline-none focus:border-[#4169E1]"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  value={fields.confirm}
                  onChange={set('confirm')}
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Re-enter password"
                  className="w-full h-8 bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-[#1E2D4A] rounded pl-2.5 pr-8 text-xs text-slate-900 dark:text-white outline-none focus:border-[#4169E1]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-[#4169E1] hover:bg-[#3457C7] text-white font-medium py-2 rounded text-xs transition-colors cursor-pointer disabled:opacity-50 mt-1 shadow-xs"
          >
            {loading ? 'Authenticating...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        {tab === 'login' && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-[#1E2D4A]">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 text-center">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => fillAndSubmitDemo('student@netdotcom', 'student@netdotcom')}
                className="py-1 px-1 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-center cursor-pointer"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => fillAndSubmitDemo('shopkeeper@netdotcom', 'shopkeeper@netdotcom')}
                className="py-1 px-1 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-center cursor-pointer"
              >
                Shopkeeper
              </button>
              <button
                type="button"
                onClick={() => fillAndSubmitDemo('admin@netdotcom', 'admin@netdotcom')}
                className="py-1 px-1 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-center cursor-pointer"
              >
                Admin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Precision Status Badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }) {
  const styles = {
    'Awaiting Payment': 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    'In Queue': 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    'Printing': 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-900',
    'Ready for Pickup': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold',
    'Collected': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    'Refunded': 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900'
  };

  const dots = {
    'Awaiting Payment': 'bg-amber-500',
    'In Queue': 'bg-[#4169E1]',
    'Printing': 'bg-sky-500 animate-pulse',
    'Ready for Pickup': 'bg-emerald-500',
    'Collected': 'bg-slate-400',
    'Refunded': 'bg-rose-500'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${styles[status] || styles['Collected']}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[status] || 'bg-slate-400'}`} />
      <span>{status}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Compact Operational Switch Toggle
// ---------------------------------------------------------------------------
function ColourToggle({ label, active, onChange }) {
  const isChecked = Boolean(active);

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
      <input
        type="checkbox"
        className="sr-only"
        checked={isChecked}
        onChange={e => onChange(e.target.checked)}
      />
      <div
        className={`relative inline-flex items-center w-8 h-4.5 rounded-full transition-colors duration-150 ease-in-out border shrink-0 ${
          isChecked
            ? 'bg-[#4169E1] border-[#3457C7] dark:bg-[#4169E1] dark:border-[#5277EC]'
            : 'bg-slate-200 border-slate-300 dark:bg-slate-700 dark:border-slate-600'
        }`}
        style={{ width: '34px', height: '18px' }}
      >
        <span
          className="inline-block rounded-full bg-white shadow-xs transition-transform duration-150 ease-in-out"
          style={{
            width: '14px',
            height: '14px',
            transform: isChecked ? 'translateX(17px)' : 'translateX(2px)'
          }}
        />
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
        {label}
      </span>
    </label>
  );
}
