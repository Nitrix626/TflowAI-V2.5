import React, { useState, useRef, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate,
  useLocation
} from 'react-router-dom';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Plus, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Sparkles,
  Play,
  Zap,
  Code,
  FlaskConical,
  CheckCircle2,
  Github,
  ArrowRight,
  Globe,
  Cpu,
  Layers,
  LogIn,
  ShieldCheck,
  History,
  Trash2,
  Image as ImageIcon,
  Mail,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { tflowAI, Message } from './services/tflowAIService.ts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types & Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "Une erreur est survenue.";
      try {
        const errObj = JSON.parse(this.state.error.message);
        if (errObj.error.includes("Missing or insufficient permissions")) {
          message = "Erreur de permission Firestore. Veuillez vérifier votre accès.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-zinc-900 border border-white/10 p-8 rounded-[2rem] shadow-2xl">
            <ShieldCheck size={48} className="text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Oups !</h2>
            <p className="text-zinc-400 mb-8">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Constants ---
const GUEST_LIMIT = 999;
const GUEST_TIME_LIMIT = 30 * 60 * 1000; // 30 minutes in ms
const FOUNDER_EMAIL = "bounebabdelmalek@gmail.com";
const FOUNDER_PASSWORD = "nononono1337";

// --- Components ---

const Navbar = ({ user, onLogout, isFounder }: { user: FirebaseUser | null, onLogout: () => void, isFounder: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isChat = location.pathname === '/chat';

  // Hide global navbar on chat page to use the sidebar layout
  if (isChat) return null;

  const navLinks = [
    { label: "Fonctionnalités", href: "#features" },
    { label: "Tarifs", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b border-emerald-500/10 z-50 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <Logo />
          <span className="font-black text-2xl tracking-tighter text-emerald-950 uppercase">Tflow<span className="text-emerald-600">AI</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-emerald-950 uppercase tracking-widest">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-emerald-600 transition-colors">{link.label}</a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <div className="flex items-center gap-2">
                  {isFounder && (
                    <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-md tracking-tighter">Founder</span>
                  )}
                  <span className="text-xs font-bold text-emerald-900">{user.displayName}</span>
                </div>
                <button onClick={onLogout} className="text-[10px] text-red-500 font-bold uppercase tracking-widest hover:underline">Déconnexion</button>
              </div>
              <img src={user.photoURL || ''} alt="Profile" className="w-10 h-10 rounded-full border border-emerald-100" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/chat')}
                className="hidden sm:flex px-6 py-3 border-2 border-emerald-600 text-emerald-600 rounded-full text-sm font-black uppercase tracking-widest hover:bg-emerald-50 transition-all active:scale-95"
              >
                Se connecter
              </button>
              <button 
                onClick={() => navigate('/chat')}
                className="hidden sm:flex px-6 py-3 bg-emerald-600 text-white rounded-full text-sm font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 items-center gap-2"
              >
                Essayer l'IA
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-emerald-950 hover:bg-emerald-50 rounded-xl transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 top-20 bg-white z-40 md:hidden p-6 flex flex-col gap-8"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <a 
                  key={link.href} 
                  href={link.href} 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-3xl font-black text-emerald-950 uppercase tracking-tighter hover:text-emerald-600 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-auto pb-12">
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/chat');
                }}
                className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-emerald-600/20"
              >
                Démarrer l'IA
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="p-8 bg-white border border-emerald-500/5 rounded-3xl hover:border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group">
    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
      <Icon size={24} />
    </div>
    <h3 className="text-xl font-bold mb-3 text-emerald-900">{title}</h3>
    <p className="text-emerald-900/50 text-sm leading-relaxed">{description}</p>
  </div>
);

const Step = ({ number, title, description }: { number: string, title: string, description: string }) => (
  <div className="flex gap-6 items-start">
    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-lg shadow-emerald-600/10">
      {number}
    </div>
    <div>
      <h4 className="text-lg font-bold mb-2 text-emerald-900">{title}</h4>
      <p className="text-emerald-900/50 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

const Logo = ({ className }: { className?: string }) => (
  <div className={cn("relative group", className)}>
    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full group-hover:bg-emerald-500/40 transition-all duration-500" />
    <div className="relative w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transform group-hover:rotate-12 transition-transform duration-500">
      <Zap size={20} fill="white" className="text-white" />
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm">
        <Sparkles size={6} className="text-emerald-600" />
      </div>
    </div>
  </div>
);

const FounderDashboard = ({ onClose }: { onClose: () => void }) => {
  const [stats, setStats] = useState<{ totalUsers: number, totalMessages: number, onlineUsers: number }>({ totalUsers: 0, totalMessages: 0, onlineUsers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        let messageCount = 0;
        usersSnap.docs.forEach(doc => {
          messageCount += (doc.data().messageCount || 0);
        });
        setStats({
          totalUsers: usersSnap.size,
          totalMessages: messageCount,
          onlineUsers: 1
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="relative bg-zinc-950 border border-white/10 rounded-[3rem] p-8 md:p-12 max-w-4xl w-full shadow-[0_0_100px_rgba(16,185,129,0.1)] overflow-hidden"
      >
        {/* Futuristic Grid Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="absolute -top-48 -right-48 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full" />

        <div className="relative flex items-center justify-between mb-16">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center shadow-inner">
              <ShieldCheck size={32} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-2">zAI Command</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-emerald-500/60 text-[10px] font-black uppercase tracking-[0.4em]">Système de Contrôle Alpha</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-emerald-500/40 text-[10px] font-black uppercase tracking-widest animate-pulse">Synchronisation des données...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] relative group hover:bg-white/[0.07] transition-all">
              <div className="absolute top-6 right-6 text-emerald-500/20 group-hover:text-emerald-500/40 transition-colors">
                <UserIcon size={40} />
              </div>
              <div className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Utilisateurs</div>
              <div className="text-6xl font-black text-white tracking-tighter italic mb-2">{stats.totalUsers}</div>
              <div className="text-emerald-500 text-[10px] font-bold">+12% ce mois</div>
            </div>

            <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] relative group hover:bg-white/[0.07] transition-all">
              <div className="absolute top-6 right-6 text-emerald-500/20 group-hover:text-emerald-500/40 transition-colors">
                <MessageSquare size={40} />
              </div>
              <div className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Messages</div>
              <div className="text-6xl font-black text-white tracking-tighter italic mb-2">{stats.totalMessages}</div>
              <div className="text-emerald-500 text-[10px] font-bold">Activité Stable</div>
            </div>

            <div className="p-8 bg-emerald-500 text-black rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-black/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="text-black/40 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Status Serveur</div>
                <div className="text-4xl font-black tracking-tighter leading-none mb-4">OPÉRATIONNEL</div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/10 rounded-full w-fit">
                  <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">99.9% Uptime</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-3 p-10 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-white/10 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/40 blur-xl rounded-full animate-pulse" />
                  <img 
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Abdelmalek" 
                    className="w-20 h-20 rounded-2xl border-2 border-emerald-500 relative z-10" 
                    alt="Founder" 
                  />
                </div>
                <div>
                  <div className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em] mb-1">Fondateur Suprême</div>
                  <div className="text-3xl font-black text-white tracking-tighter">Abdelmalek Bouneb</div>
                  <div className="text-zinc-500 text-xs font-medium">CEO & Visionnaire zAI</div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Session</div>
                  <div className="text-emerald-400 font-black tracking-widest">ACTIVE</div>
                </div>
                <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Niveau</div>
                  <div className="text-white font-black tracking-widest">ALPHA</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 flex items-center justify-between">
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
            © 2026 zAI GLOBAL TECHNOLOGIES
          </p>
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 active:scale-95"
          >
            Quitter le terminal
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const LoginModal = ({ onClose, onLoginSuccess }: { onClose: () => void, onLoginSuccess: () => void }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      onLoginSuccess();
      onClose();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || "Une erreur est survenue avec Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 max-w-md w-full shadow-2xl overflow-hidden"
      >
        {/* Futuristic Background Elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 blur-[80px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 blur-[80px] rounded-full" />

        <div className="relative text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/20 rotate-3 hover:rotate-0 transition-transform duration-500">
            <Zap size={40} fill="currentColor" />
          </div>
          <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">
            Accès TflowAI
          </h3>
          <p className="text-zinc-400 text-sm font-medium">
            Connectez-vous pour accéder à la puissance de zAI
          </p>
        </div>

        <div className="relative space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 text-red-400 text-xs font-bold rounded-2xl border border-red-500/20 flex items-center gap-3">
              <X size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 shadow-xl shadow-white/5"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Globe size={20} />
                Continuer avec Google
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
            Sécurisé par Firebase & zAI
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// --- Pages ---

const PricingCard = ({ title, price, features, highlighted = false, cta, onCtaClick }: { title: string, price: string, features: string[], highlighted?: boolean, cta: string, onCtaClick: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className={cn(
      "p-8 md:p-12 rounded-[3rem] flex flex-col h-full transition-all duration-500",
      highlighted 
        ? "bg-emerald-600 text-white shadow-[0_30px_60px_rgba(16,185,129,0.3)] scale-105 z-10" 
        : "bg-white border-2 border-emerald-50 text-emerald-950 hover:border-emerald-200"
    )}
  >
    <div className="mb-8">
      <h3 className={cn("text-xl font-black uppercase tracking-widest mb-2", highlighted ? "text-emerald-200" : "text-emerald-600")}>{title}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-5xl md:text-6xl font-black tracking-tighter">{price}</span>
        <span className={cn("text-sm font-bold", highlighted ? "text-emerald-200" : "text-emerald-900/40")}>/toujours</span>
      </div>
    </div>
    <ul className="space-y-4 mb-12 flex-1">
      {features.map((feature, i) => (
        <li key={i} className="flex items-center gap-3 font-medium">
          <CheckCircle2 size={20} className={highlighted ? "text-emerald-300" : "text-emerald-500"} />
          <span className={highlighted ? "text-emerald-50" : "text-emerald-900/70"}>{feature}</span>
        </li>
      ))}
    </ul>
    <button 
      onClick={onCtaClick}
      className={cn(
        "w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all active:scale-95",
        highlighted 
          ? "bg-white text-emerald-600 hover:bg-emerald-50" 
          : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
      )}
    >
      {cta}
    </button>
  </motion.div>
);

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-emerald-100 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-8 flex items-center justify-between text-left group"
      >
        <span className="text-xl md:text-2xl font-black text-emerald-950 group-hover:text-emerald-600 transition-colors">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          className="text-emerald-400"
        >
          <Plus size={32} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-8 text-lg text-emerald-900/60 font-medium leading-relaxed max-w-3xl">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const contactEmail = "bounebabdelmalek@gmail.com";
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${contactEmail}`;

  return (
    <div className="pt-20 bg-white selection:bg-emerald-100 selection:text-emerald-900">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-32 pb-24 md:pb-48 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
        {/* Animated Background Elements */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[800px] bg-emerald-100/40 rounded-full blur-[120px] -z-10" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            x: [0, 50, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[200px] md:w-[600px] h-[200px] md:h-[600px] bg-emerald-200/20 rounded-full blur-[100px] -z-10" 
        />
        
        <div className="text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-8 border border-emerald-100 shadow-sm"
          >
            <Sparkles size={14} className="text-emerald-500" />
            L'Intelligence Artificielle Redéfinie
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-[140px] font-black tracking-[-0.05em] mb-8 leading-[0.85] text-emerald-950"
          >
            TFLOW<span className="text-emerald-600">AI</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg md:text-3xl text-emerald-900/60 max-w-4xl mx-auto mb-16 leading-tight font-medium tracking-tight"
          >
            Plus qu'un simple chat. Une extension de votre esprit. 
            Rapide, visuel et incroyablement intelligent.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <button 
              onClick={() => navigate('/chat')}
              className="w-full sm:w-auto px-12 py-7 bg-emerald-600 text-white rounded-[2.5rem] font-black text-xl md:text-2xl hover:bg-emerald-700 transition-all shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center justify-center gap-4 active:scale-95 group"
            >
              Lancer TflowAI
              <ArrowRight className="group-hover:translate-x-2 transition-transform" size={24} />
            </button>
            <a 
              href="#features"
              className="w-full sm:w-auto px-12 py-7 bg-white text-emerald-950 border-2 border-emerald-100 rounded-[2.5rem] font-black text-xl md:text-2xl hover:bg-emerald-50 transition-all flex items-center justify-center gap-4 active:scale-95"
            >
              Découvrir
            </a>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 border-y border-emerald-100 bg-emerald-50/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-24">
          {[
            { label: "Modèles IA", value: "3+" },
            { label: "Latence", value: "< 0.8s" },
            { label: "Précision", value: "99.9%" },
            { label: "Actifs", value: "15k+" }
          ].map((stat, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-6xl font-black text-emerald-900 mb-2 tracking-tighter italic">{stat.value}</div>
              <div className="text-[10px] md:text-xs font-black text-emerald-600/40 uppercase tracking-[0.3em]">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bento Features Section */}
      <section id="features" className="py-32 md:py-48 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-8xl font-black mb-8 tracking-tighter text-emerald-950 leading-none"
          >
            L'IA SANS <br className="md:hidden" /> COMPROMIS.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg md:text-2xl text-emerald-900/40 max-w-2xl mx-auto font-medium"
          >
            Une suite d'outils puissants intégrés dans une interface minimaliste et ultra-fluide.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          {/* Large Feature Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="md:col-span-8 p-8 md:p-12 bg-emerald-950 text-white rounded-[3rem] overflow-hidden relative group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[100px] group-hover:bg-emerald-500/30 transition-colors" />
            <Bot size={64} className="text-emerald-400 mb-12" />
            <h3 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">Intelligence Multimodale</h3>
            <p className="text-xl text-emerald-100/60 max-w-md leading-relaxed">
              Envoyez des images, demandez des analyses complexes ou générez du code. TflowAI comprend le monde visuel et textuel avec une précision inégalée.
            </p>
          </motion.div>

          {/* Small Feature Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="md:col-span-4 p-8 md:p-12 bg-emerald-50 border border-emerald-100 rounded-[3rem] flex flex-col justify-between group"
          >
            <Zap size={48} className="text-emerald-600 mb-12 group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="text-2xl md:text-3xl font-black mb-4 tracking-tight text-emerald-950">Vitesse Flash</h3>
              <p className="text-emerald-900/50 font-medium">Réponses en temps réel, sans attente. L'IA à la vitesse de votre pensée.</p>
            </div>
          </motion.div>

          {/* Another Small Feature Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="md:col-span-4 p-8 md:p-12 bg-white border-2 border-emerald-50 rounded-[3rem] flex flex-col justify-between group"
          >
            <ShieldCheck size={48} className="text-emerald-600 mb-12 group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="text-2xl md:text-3xl font-black mb-4 tracking-tight text-emerald-950">Confidentialité</h3>
              <p className="text-emerald-900/50 font-medium">Vos données sont chiffrées et ne sont jamais utilisées pour l'entraînement.</p>
            </div>
          </motion.div>

          {/* Medium Feature Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="md:col-span-8 p-8 md:p-12 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-[3rem] relative overflow-hidden group"
          >
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/20 blur-3xl" />
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="flex-1">
                <h3 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Historique Cloud</h3>
                <p className="text-emerald-50/80 text-lg font-medium">
                  Retrouvez vos conversations sur tous vos appareils. Synchronisation instantanée et sécurisée via Firestore.
                </p>
              </div>
              <History size={80} className="opacity-20 group-hover:rotate-12 transition-transform" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 md:py-48 bg-white px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter text-emerald-950">CHOISISSEZ <br /> VOTRE FORCE.</h2>
            <p className="text-lg md:text-2xl text-emerald-900/40 max-w-2xl mx-auto font-medium">
              Commencez gratuitement et débloquez la puissance illimitée en un clic.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <PricingCard 
              title="Essai Gratuit"
              price="0€"
              features={[
                "Messages illimités",
                "Limite de 30 minutes",
                "Modèle Gemini Flash",
                "Support standard",
                "Sans compte requis"
              ]}
              cta="Essayer l'IA"
              onCtaClick={() => navigate('/chat')}
            />
            <PricingCard 
              title="Membre Tflow"
              price="Gratuit"
              highlighted
              features={[
                "Messages illimités",
                "Temps illimité",
                "Historique sauvegardé",
                "Analyse d'images",
                "Accès aux nouveaux modèles",
                "Support prioritaire"
              ]}
              cta="Se connecter"
              onCtaClick={() => navigate('/chat')}
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32 md:py-48 bg-emerald-50/30 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col lg:flex-row gap-24 items-center">
            <div className="lg:w-1/3">
              <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter text-emerald-950 leading-none">ILS NOUS <br /> FONT <br /> CONFIANCE.</h2>
              <p className="text-xl text-emerald-900/40 font-medium">Rejoignez des milliers d'utilisateurs qui ont déjà transformé leur manière de travailler.</p>
            </div>
            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { name: "Thomas R.", role: "Développeur Fullstack", text: "TflowAI est devenu mon copilote quotidien. Sa capacité à comprendre le code complexe est bluffante." },
                { name: "Sarah L.", role: "Designer UX", text: "L'interface est d'une fluidité rare. C'est un plaisir de l'utiliser pour mes recherches créatives." },
                { name: "Marc D.", role: "Entrepreneur", text: "Le gain de productivité est immédiat. Je ne peux plus m'en passer pour mes emails et rapports." },
                { name: "Léa M.", role: "Étudiante", text: "Parfait pour réviser et comprendre des concepts difficiles en quelques secondes." }
              ].map((t, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm"
                >
                  <p className="text-emerald-900/70 mb-6 font-medium italic">"{t.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-black">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="font-black text-emerald-950">{t.name}</div>
                      <div className="text-xs font-bold text-emerald-600/40 uppercase tracking-widest">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 md:py-48 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter text-emerald-950">DES QUESTIONS ?</h2>
          <p className="text-xl text-emerald-900/40 font-medium">Tout ce que vous devez savoir sur TflowAI.</p>
        </div>
        <div className="space-y-2">
          <FAQItem 
            question="Est-ce vraiment gratuit ?" 
            answer="Oui ! TflowAI propose un essai gratuit de 30 minutes sans compte. En vous connectant avec votre compte Google, vous débloquez un accès illimité et gratuit à toutes nos fonctionnalités de base." 
          />
          <FAQItem 
            question="Mes données sont-elles sécurisées ?" 
            answer="Absolument. Nous utilisons Firebase pour le stockage sécurisé et le chiffrement de vos données. Vos conversations sont privées et ne sont jamais partagées ou utilisées pour entraîner nos modèles." 
          />
          <FAQItem 
            question="Quels modèles utilisez-vous ?" 
            answer="Nous utilisons les derniers modèles Gemini de Google (Flash et Pro) pour garantir les meilleures performances, une latence minimale et une compréhension multimodale avancée." 
          />
          <FAQItem 
            question="Puis-je utiliser TflowAI sur mobile ?" 
            answer="Oui, TflowAI est entièrement responsive et conçu pour fonctionner parfaitement sur smartphones, tablettes et ordinateurs. L'expérience est fluide sur tous vos appareils." 
          />
        </div>
      </section>

      {/* Interactive Contact Section */}
      <section id="contact" className="py-32 md:py-48 bg-emerald-950 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.1),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-6xl md:text-9xl font-black mb-12 tracking-tighter leading-[0.8]">
                PARLONS <br />
                <span className="text-emerald-400 italic">DEMAIN.</span>
              </h2>
              <p className="text-xl md:text-2xl text-emerald-100/60 mb-16 max-w-lg leading-relaxed font-medium">
                Vous avez un projet, une idée ou juste envie de dire bonjour ? Notre équipe est prête à vous répondre.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-colors">
                  <Mail className="text-emerald-400 mb-4" size={32} />
                  <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Email</div>
                  <div className="text-lg font-bold break-all">{contactEmail}</div>
                </div>
                <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-colors">
                  <MessageCircle className="text-emerald-400 mb-4" size={32} />
                  <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Support</div>
                  <div className="text-lg font-bold italic">24/7 Assistance</div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white p-8 md:p-16 rounded-[4rem] text-emerald-950 shadow-[0_50px_100px_rgba(0,0,0,0.3)]"
            >
              <h3 className="text-3xl md:text-4xl font-black mb-8 tracking-tight">Contact Rapide</h3>
              <p className="text-emerald-900/50 mb-12 text-lg font-medium leading-relaxed">
                Utilisez Gmail pour nous envoyer un message structuré en un clic. Nous traitons chaque demande avec soin.
              </p>
              <a 
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-8 bg-emerald-600 text-white rounded-[2rem] font-black text-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-emerald-600/20 active:scale-95 group"
              >
                <Mail size={32} />
                Ouvrir Gmail
                <ExternalLink size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </a>
              <div className="mt-12 text-center">
                <span className="text-sm font-black text-emerald-900/20 uppercase tracking-[0.3em]">Ou par mail direct</span>
                <a href={`mailto:${contactEmail}`} className="block mt-4 text-xl font-black text-emerald-600 hover:underline">{contactEmail}</a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-32 md:py-48 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="bg-emerald-50 rounded-[4rem] p-8 md:p-24 flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2">
            <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-emerald-600/20">
              <Cpu className="text-white w-10 h-10" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter text-emerald-950 leading-none">LA VISION <br /> DU FONDATEUR.</h2>
            <p className="text-xl text-emerald-900/60 font-medium leading-relaxed mb-8">
              "TflowAI n'est pas né d'une simple envie de créer un outil de plus. C'est le résultat d'une frustration : celle de voir l'IA rester complexe et distante. J'ai voulu créer une interface qui s'efface devant l'intelligence, un espace où la pensée devient action instantanément."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center font-black text-emerald-700">AB</div>
              <div>
                <div className="font-black text-emerald-950">Abdelmalek Bouneb</div>
                <div className="text-xs font-bold text-emerald-600/40 uppercase tracking-widest">Fondateur & CEO</div>
              </div>
            </div>
          </div>
          <div className="lg:w-1/2 relative">
            <div className="absolute inset-0 bg-emerald-600/10 blur-[100px] rounded-full" />
            <div className="relative bg-white p-8 rounded-[3rem] border border-emerald-100 shadow-2xl">
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <div className="text-sm font-bold text-emerald-900">Innovation continue</div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.2s]" />
                  <div className="text-sm font-bold text-emerald-900">Éthique & Transparence</div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.4s]" />
                  <div className="text-sm font-bold text-emerald-900">Accessibilité universelle</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 md:py-64 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto bg-emerald-600 rounded-[4rem] md:rounded-[6rem] p-12 md:p-32 text-center text-white relative overflow-hidden shadow-[0_50px_100px_rgba(16,185,129,0.2)]">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-[100px] font-black mb-12 relative z-10 tracking-tighter leading-[0.85]">
              VOTRE FUTUR <br />
              <span className="italic opacity-50">COMMENCE ICI.</span>
            </h2>
            <p className="text-emerald-50 text-xl md:text-3xl mb-16 max-w-2xl mx-auto relative z-10 font-medium tracking-tight">
              Rejoignez l'élite des utilisateurs de TflowAI et transformez votre productivité.
            </p>
            <button 
              onClick={() => navigate('/chat')}
              className="px-16 py-8 bg-white text-emerald-600 rounded-[2.5rem] font-black text-2xl md:text-3xl hover:scale-105 transition-all shadow-2xl shadow-white/20 relative z-10 active:scale-95"
            >
              🚀 ESSAYER MAINTENANT
            </button>
          </motion.div>
        </div>
      </section>

      <footer className="py-24 border-t border-emerald-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-16">
          <div className="flex flex-col items-center md:items-start gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-600/20">
                <Globe className="text-white w-6 h-6" />
              </div>
              <span className="font-black text-3xl tracking-tighter text-emerald-950 uppercase">TflowAI</span>
            </div>
            <p className="text-lg text-emerald-900/40 font-bold max-w-xs text-center md:text-left leading-tight">
              L'IA qui repousse les limites de l'imagination.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-12 md:gap-20 text-xs md:text-sm font-black text-emerald-950 uppercase tracking-[0.3em]">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-emerald-600 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-emerald-600 transition-colors">Contact</a>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4">
            <p className="text-[10px] md:text-xs text-emerald-900/20 font-black uppercase tracking-[0.4em]">
              © 2026 TflowAI • Abdelmalek Bouneb
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-emerald-900/20 hover:text-emerald-600 transition-colors transform hover:scale-125 transition-transform"><Github size={24} /></a>
              <a href={gmailUrl} className="text-emerald-900/20 hover:text-emerald-600 transition-colors transform hover:scale-125 transition-transform"><Mail size={24} /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const AdminSettings = ({ onClose }: { onClose: () => void }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(doc => doc.data()));
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-emerald-950/60 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white rounded-[3rem] p-8 md:p-12 max-w-4xl w-full h-[80vh] shadow-2xl border border-emerald-100 flex flex-col"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-3xl font-black text-emerald-950 tracking-tighter">LISTE DES UTILISATEURS</h3>
            <p className="text-emerald-600/60 text-sm font-bold uppercase tracking-widest">Détails des comptes enregistrés</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-emerald-50 rounded-2xl transition-colors text-emerald-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((u, i) => (
                <div key={i} className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={u.photoURL} className="w-12 h-12 rounded-full border border-emerald-200" alt="" />
                    <div>
                      <div className="font-black text-emerald-950">{u.displayName}</div>
                      <div className="text-xs text-emerald-600/60 font-medium">{u.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Messages</div>
                    <div className="text-xl font-black text-emerald-950">{u.messageCount || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const ChatPage = ({ user, onLogin, onLogout, isFounder }: { user: FirebaseUser | null, onLogin: () => void, onLogout: () => void, isFounder: boolean }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview");
  const [guestCount, setGuestCount] = useState(() => {
    const saved = localStorage.getItem('tflow_guest_count');
    return saved ? parseInt(saved) : 0;
  });
  const [guestStartTime, setGuestStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('tflow_guest_start_time');
    return saved ? parseInt(saved) : null;
  });
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showFounderDashboard, setShowFounderDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [limitReason, setLimitReason] = useState<"count" | "time">("count");
  const [isClearing, setIsClearing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string, preview: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner une image.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      setSelectedImage({
        data: base64Data,
        mimeType: file.type,
        preview: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    localStorage.setItem('tflow_guest_count', guestCount.toString());
  }, [guestCount]);

  useEffect(() => {
    if (guestStartTime) {
      localStorage.setItem('tflow_guest_start_time', guestStartTime.toString());
    }
  }, [guestStartTime]);

  // Timer check for guests
  useEffect(() => {
    if (user || !guestStartTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      const elapsed = now - guestStartTime;
      if (elapsed >= GUEST_TIME_LIMIT) {
        setLimitReason("time");
        setShowLimitModal(true);
      }
    }, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, [user, guestStartTime]);

  // Load messages from Firestore for logged in users
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map(doc => ({
        role: doc.data().role as "user" | "model",
        text: doc.data().text,
        image: doc.data().image
      }));
      setMessages(loadedMessages);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/messages`);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    if (!user) {
      // Check count limit
      if (guestCount >= GUEST_LIMIT) {
        setLimitReason("count");
        setShowLimitModal(true);
        return;
      }
      // Check time limit
      if (guestStartTime && (Date.now() - guestStartTime >= GUEST_TIME_LIMIT)) {
        setLimitReason("time");
        setShowLimitModal(true);
        return;
      }
      // Start timer on first message if not started
      if (!guestStartTime) {
        setGuestStartTime(Date.now());
      }
    }

    const userMessage: Message = { 
      role: 'user', 
      text: input || (selectedImage ? "Analyse cette image" : ""),
      ...(selectedImage ? { image: { data: selectedImage.data, mimeType: selectedImage.mimeType } } : {})
    };
    
    if (!user) setMessages(prev => [...prev, userMessage]);
    
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      if (user) {
        await addDoc(collection(db, 'users', user.uid, 'messages'), {
          ...userMessage,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/messages`);
    }

    try {
      const responseText = await tflowAI.sendMessage([...messages, userMessage], selectedModel);
      const modelMessage: Message = { role: 'model', text: responseText };

      if (user) {
        await addDoc(collection(db, 'users', user.uid, 'messages'), {
          ...modelMessage,
          createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'users', user.uid), { messageCount: increment(1) });
      } else {
        setMessages(prev => [...prev, modelMessage]);
        setGuestCount(prev => prev + 1);
      }
    } catch (error) {
      if (user && error instanceof Error && error.message.includes("Missing or insufficient permissions")) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
      console.error("Error sending message:", error);
      const errorMessage: Message = { role: 'model', text: "Désolé, une erreur est survenue." };
      if (!user) setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClearHistory = async () => {
    if (!user || isClearing) return;
    if (!window.confirm("Effacer tout l'historique ?")) return;
    setIsClearing(true);
    try {
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'messages'));
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error("Error clearing history:", error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className={cn(
      "flex h-screen overflow-hidden transition-colors duration-700",
      isFounder ? "bg-zinc-950 text-white" : "bg-white text-neutral-900"
    )}>
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className={cn(
          "border-r flex flex-col h-full relative z-40 overflow-hidden transition-colors duration-700",
          isFounder ? "bg-black border-white/5" : "bg-emerald-50/30 border-emerald-100"
        )}
      >
        <div className="p-4 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-8 px-2 cursor-pointer" onClick={() => navigate('/')}>
              <Logo />
              <span className={cn(
                "font-black text-xl tracking-tighter uppercase",
                isFounder ? "text-white" : "text-emerald-950"
              )}>TflowAI</span>
            </div>

          <button 
            onClick={() => setMessages([])}
            className={cn(
              "flex items-center gap-3 w-full p-3 rounded-xl transition-all text-sm font-bold mb-4 border",
              isFounder 
                ? "bg-white/5 border-white/10 text-white hover:bg-white/10" 
                : "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            )}
          >
            <Plus size={18} />
            Nouvelle discussion
          </button>

          <div className="flex-1 overflow-y-auto space-y-1">
            <div className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-3 mb-2",
              isFounder ? "text-white/20" : "text-emerald-800/40"
            )}>Historique</div>
            {user ? (
              <div className={cn(
                "px-3 py-2 text-xs italic",
                isFounder ? "text-zinc-500" : "text-emerald-600/60"
              )}>Vos discussions sont sauvegardées</div>
            ) : (
              <div className={cn(
                "px-3 py-2 text-xs",
                isFounder ? "text-zinc-500" : "text-emerald-600/60"
              )}>Connectez-vous pour sauvegarder</div>
            )}
            
            {isFounder && (
              <div className={cn(
                "mt-8 pt-4 border-t",
                isFounder ? "border-white/5" : "border-emerald-100/50"
              )}>
                <div className={cn(
                  "text-[10px] font-bold uppercase tracking-widest px-3 mb-2",
                  isFounder ? "text-emerald-500/40" : "text-emerald-800/40"
                )}>Administration</div>
                <button 
                  onClick={() => setShowFounderDashboard(true)}
                  className={cn(
                    "flex items-center gap-3 w-full p-3 rounded-xl transition-all text-sm font-bold group",
                    isFounder 
                      ? "text-emerald-400 hover:bg-emerald-500 hover:text-black" 
                      : "text-emerald-700 hover:bg-emerald-600 hover:text-white"
                  )}
                >
                  <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />
                  Tableau de bord
                </button>
                <button 
                  onClick={() => setShowSettings(true)}
                  className={cn(
                    "flex items-center gap-3 w-full p-3 rounded-xl transition-all text-sm font-bold group mt-1",
                    isFounder 
                      ? "text-emerald-400 hover:bg-emerald-500 hover:text-black" 
                      : "text-emerald-700 hover:bg-emerald-600 hover:text-white"
                  )}
                >
                  <Settings size={18} className="group-hover:rotate-90 transition-transform" />
                  Paramètres Admin
                </button>
              </div>
            )}
          </div>

          <div className={cn(
            "mt-auto pt-4 border-t space-y-2",
            isFounder ? "border-white/5" : "border-emerald-100"
          )}>
            {user ? (
              <div className={cn(
                "flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer group",
                isFounder ? "hover:bg-white/5" : "hover:bg-emerald-100"
              )}>
                <img src={user.photoURL || ''} className={cn(
                  "w-8 h-8 rounded-full border",
                  isFounder ? "border-white/10" : "border-emerald-200"
                )} alt="User" />
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "text-sm font-bold truncate",
                      isFounder ? "text-white" : "text-emerald-900"
                    )}>{user.displayName}</div>
                    {isFounder && (
                      <span className="px-1.5 py-0.5 bg-emerald-500 text-black text-[8px] font-black uppercase rounded-md tracking-tighter">Founder</span>
                    )}
                  </div>
                  <button onClick={onLogout} className="text-[10px] text-zinc-500 group-hover:text-red-500 transition-colors">Déconnexion</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className={cn(
                  "flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-sm font-bold",
                  isFounder ? "text-white hover:bg-white/5" : "text-emerald-700 hover:bg-emerald-100"
                )}
              >
                <LogIn size={18} />
                Se connecter
              </button>
            )}
            {user && (
              <button 
                onClick={handleClearHistory}
                disabled={isClearing}
                className={cn(
                  "flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-sm font-bold",
                  isFounder 
                    ? "text-zinc-600 hover:bg-red-500/10 hover:text-red-500" 
                    : "text-emerald-600/60 hover:bg-red-50 hover:text-red-600"
                )}
              >
                <Trash2 size={18} />
                Effacer l'historique
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      <main className={cn(
        "flex-1 flex flex-col h-full relative transition-colors duration-700",
        isFounder ? "bg-zinc-950" : "bg-white"
      )}>
        <header className={cn(
          "h-14 border-b flex items-center px-4 md:px-6 justify-between shrink-0 transition-colors duration-700",
          isFounder ? "bg-black/50 border-white/5 backdrop-blur-md" : "bg-white border-emerald-50"
        )}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isFounder ? "hover:bg-white/5 text-zinc-400" : "hover:bg-emerald-50 text-emerald-700"
            )}
          >
            <Menu size={20} />
          </button>
          <div className={cn(
            "text-sm font-black uppercase tracking-widest",
            isFounder ? "text-emerald-500" : "text-emerald-900"
          )}>TflowAI <span className="opacity-50">v2.5</span></div>
          <div className="flex items-center gap-2">
            {isFounder && (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Founder Mode</span>
              </div>
            )}
            <div className="w-10" />
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-3xl mx-auto w-full py-12 px-4 md:px-0">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center pt-20">
                <Logo className="scale-150 mb-12" />
                <h2 className={cn(
                  "text-4xl font-black mb-8 tracking-tighter uppercase",
                  isFounder ? "text-white" : "text-emerald-950"
                )}>
                  {isFounder ? "Bienvenue, Abdelmalek." : "Comment puis-je vous aider ?"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                  {[
                    "Analyse stratégique de zAI",
                    "Optimisation des algorithmes Tflow",
                    "Vision futuriste de l'IA",
                    "Rapport de performance global"
                  ].map((hint, i) => (
                    <button 
                      key={i}
                      onClick={() => setInput(hint)}
                      className={cn(
                        "p-6 text-left border rounded-3xl transition-all text-sm font-bold group flex items-center justify-between",
                        isFounder 
                          ? "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white" 
                          : "bg-white border-emerald-100 text-emerald-800 hover:bg-emerald-50"
                      )}
                    >
                      {hint}
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {messages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex gap-4 md:gap-8",
                    msg.role === 'user' ? "flex-row-reverse" : ""
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-lg",
                      msg.role === 'user' 
                        ? (isFounder ? "bg-white/5 border border-white/10 text-white" : "bg-emerald-50 border border-emerald-100 text-emerald-600")
                        : (isFounder ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-black" : "bg-emerald-600 text-white")
                    )}>
                      {msg.role === 'user' ? <UserIcon size={18} /> : <Zap size={18} fill="currentColor" />}
                    </div>
                    <div className={cn(
                      "flex-1 text-[15px] leading-relaxed",
                      msg.role === 'user' ? "text-right" : "text-left"
                    )}>
                      <div className={cn(
                        "inline-block max-w-full",
                        msg.role === 'user' 
                          ? (isFounder ? "bg-white/5 px-6 py-4 rounded-[2rem] border border-white/10 text-white" : "bg-emerald-50/50 px-6 py-4 rounded-[2rem] shadow-sm border border-emerald-100/50 text-neutral-800")
                          : (isFounder ? "text-zinc-300" : "text-neutral-800")
                      )}>
                        <div className={cn(
                          "markdown-content prose max-w-none",
                          isFounder ? "prose-invert prose-emerald" : "prose-emerald"
                        )}>
                          {msg.image && (
                            <img 
                              src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                              alt="User upload" 
                              className="max-w-xs rounded-2xl mb-4 border border-white/10 shadow-2xl"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <Markdown>{msg.text}</Markdown>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-4 md:gap-8">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-lg",
                      isFounder ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-black" : "bg-emerald-600 text-white"
                    )}>
                      <Zap size={18} fill="currentColor" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className={cn(
                        "text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                        isFounder ? "text-emerald-500" : "text-emerald-600"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full animate-pulse",
                          isFounder ? "bg-emerald-500" : "bg-emerald-500"
                        )} />
                        TflowAI génère une réponse...
                      </div>
                      <div className={cn(
                        "flex gap-1.5 p-4 rounded-2xl w-fit",
                        isFounder ? "bg-white/5 border border-white/10" : "bg-emerald-50"
                      )}>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className={cn(
          "p-4 md:p-10 transition-colors duration-700",
          isFounder ? "bg-zinc-950" : "bg-gradient-to-t from-white via-white to-transparent"
        )}>
          <div className="max-w-3xl mx-auto w-full relative">
            {selectedImage && (
              <div className="mb-4 relative inline-block group">
                <img src={selectedImage.preview} className="h-24 w-24 object-cover rounded-2xl border-2 border-emerald-500 shadow-2xl" alt="Preview" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className={cn(
              "relative flex items-end gap-2 p-2 border rounded-[2.5rem] transition-all shadow-2xl",
              isFounder 
                ? "bg-white/5 border-white/10 focus-within:border-emerald-500/50 shadow-emerald-500/5" 
                : "bg-white border-emerald-100 focus-within:border-emerald-500 shadow-emerald-600/5"
            )}>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-4 rounded-full transition-colors",
                  isFounder ? "hover:bg-white/5 text-zinc-500" : "hover:bg-emerald-50 text-emerald-600"
                )}
              >
                <ImageIcon size={20} />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isFounder ? "Ordre direct au système..." : "Posez votre question..."}
                className={cn(
                  "flex-1 bg-transparent border-none focus:ring-0 py-4 px-2 text-[15px] resize-none max-h-40 font-medium",
                  isFounder ? "text-white placeholder:text-zinc-600" : "text-neutral-900 placeholder:text-neutral-400"
                )}
                rows={1}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className={cn(
                  "p-4 rounded-full transition-all shadow-lg active:scale-90 disabled:opacity-30 disabled:grayscale",
                  isFounder ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                <Send size={20} />
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*" 
            />
            <p className={cn(
              "text-center text-[10px] mt-4 font-bold uppercase tracking-widest",
              isFounder ? "text-zinc-600" : "text-neutral-400"
            )}>
              TflowAI peut faire des erreurs. Vérifiez les informations importantes.
            </p>
          </div>
        </div>
      </main>

      {/* Limit Modal */}
      <AnimatePresence>
        {showLimitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
              onClick={() => setShowLimitModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-[2rem] p-10 max-w-md w-full text-center shadow-2xl border border-emerald-100"
            >
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-emerald-900">Limite atteinte</h3>
              <p className="text-emerald-600/60 mb-8 text-sm leading-relaxed">
                {limitReason === "count" 
                  ? "Vous avez utilisé vos messages gratuits. Connectez-vous pour continuer sans limites."
                  : "Votre session de 30 minutes est terminée. Connectez-vous pour continuer à utiliser TflowAI sans limites."}
              </p>
              <div className="space-y-3">
                <button 
                  onClick={onLogin}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  <LogIn size={18} />
                  Se connecter
                </button>
                <button 
                  onClick={() => setShowLimitModal(false)}
                  className="w-full py-3.5 bg-white border border-emerald-200 rounded-xl font-bold text-emerald-400 hover:bg-emerald-50 transition-all text-sm"
                >
                  Plus tard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Founder Dashboard Modal */}
      <AnimatePresence>
        {showFounderDashboard && (
          <FounderDashboard onClose={() => setShowFounderDashboard(false)} />
        )}
      </AnimatePresence>

      {/* Admin Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <AdminSettings onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogin = () => setShowLoginModal(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Founder singleton check for Google Login
        if (firebaseUser.email === FOUNDER_EMAIL) {
          try {
            const founderRef = doc(db, 'system', 'founder');
            const founderSnap = await getDoc(founderRef);
            
            if (founderSnap.exists()) {
              const data = founderSnap.data();
              const lastActive = data.lastActive?.toMillis() || 0;
              const now = Date.now();
              
              // If founder is online and was active in the last 2 minutes AND it's not the same UID
              if (data.isOnline && (now - lastActive < 120000) && data.uid !== firebaseUser.uid) {
                await signOut(auth);
                alert("Une session fondateur est déjà active sur un autre appareil.");
                setIsAuthReady(true);
                return;
              }
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'system/founder');
          }

          // Set founder as online
          try {
            await setDoc(doc(db, 'system', 'founder'), {
              isOnline: true,
              lastActive: serverTimestamp(),
              uid: firebaseUser.uid
            }, { merge: true });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'system/founder');
          }
        }

        // Check if user exists in Firestore, if not create
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              messageCount: 0,
              createdAt: serverTimestamp()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }

        // Founder heartbeat
        if (firebaseUser.email === FOUNDER_EMAIL) {
          const heartbeat = setInterval(async () => {
            try {
              await updateDoc(doc(db, 'system', 'founder'), {
                lastActive: serverTimestamp(),
                isOnline: true
              });
            } catch (error) {
              console.error("Heartbeat error:", error);
            }
          }, 60000);
          setUser(firebaseUser);
          setIsAuthReady(true);
          return () => clearInterval(heartbeat);
        }

        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      if (user?.email === FOUNDER_EMAIL) {
        await updateDoc(doc(db, 'system', 'founder'), {
          isOnline: false,
          lastActive: serverTimestamp()
        });
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isFounder = user?.email === FOUNDER_EMAIL;

  if (!isAuthReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center animate-bounce">
            <Zap className="text-white w-6 h-6" />
          </div>
          <div className="h-1 w-24 bg-emerald-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 animate-[loading_1.5s_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-white selection:bg-emerald-600 selection:text-white">
        <Navbar user={user} onLogout={handleLogout} isFounder={isFounder} />
        
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/chat" element={<ChatPage user={user} onLogin={handleLogin} onLogout={handleLogout} isFounder={isFounder} />} />
        </Routes>
      </div>
      <AnimatePresence>
        {showLoginModal && (
          <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />
        )}
      </AnimatePresence>
    </Router>
  );
}
