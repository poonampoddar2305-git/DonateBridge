import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../ui/Toast';
import { 
  Mail, Globe, ShieldCheck, 
  Sparkles, CheckCircle2, Users, HeartHandshake
} from 'lucide-react';

export default function Footer() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    toast.success('Subscribed to DonateBridge updates!');
    setEmail('');
  };

  return (
    <footer className="bg-[#0F0E0C] text-[#F3F0EA] border-t border-[#191815] mt-auto py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Editorial Headline */}
        <div className="border-b border-stone-800 pb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-mono tracking-widest text-[#C48B3F] uppercase font-bold">Empowering Communities</span>
            <h3 className="font-serif text-3xl sm:text-4xl text-white font-normal mt-1 max-w-xl leading-tight">
              Bridging generous donors with verified local NGO needs.
            </h3>
          </div>
          <Link 
            to="/discover"
            className="inline-flex items-center gap-2 rounded-full bg-[#C48B3F] text-white hover:bg-[#A6722E] px-7 py-3 text-sm font-medium transition-all shadow-xs shrink-0 self-start lg:self-auto"
          >
            Explore Active Needs
          </Link>
        </div>

        {/* Middle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-5">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#C48B3F] flex items-center justify-center text-white">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <span className="font-serif text-2xl font-bold text-white tracking-tight">
                DonateBridge
              </span>
            </Link>
            <p className="text-sm text-stone-400 leading-relaxed max-w-sm">
              Connecting individual donors with vetted non-profits in real time. Fostering transparency, efficient surplus item redistribution, and sustainable community care.
            </p>

            {/* Platform Status */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#191815] border border-stone-800 text-stone-300 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Systems Operational &bull; Smart Match Active</span>
            </div>

            {/* Trust Icons */}
            <div className="flex gap-3 text-stone-400 pt-1">
              <Link to="/discover" aria-label="Global Directory" className="w-9 h-9 rounded-full bg-[#191815] border border-stone-800 flex items-center justify-center text-stone-300 hover:text-white hover:border-[#C48B3F] transition-all">
                <Globe className="w-4 h-4" />
              </Link>
              <Link to="/about" aria-label="Security Assurance" className="w-9 h-9 rounded-full bg-[#191815] border border-stone-800 flex items-center justify-center text-stone-300 hover:text-white hover:border-[#C48B3F] transition-all">
                <ShieldCheck className="w-4 h-4" />
              </Link>
              <Link to="/about" aria-label="Community Network" className="w-9 h-9 rounded-full bg-[#191815] border border-stone-800 flex items-center justify-center text-stone-300 hover:text-white hover:border-[#C48B3F] transition-all">
                <Users className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Col 1: Platform Core */}
          <div className="space-y-4">
            <h4 className="font-mono text-xs uppercase tracking-widest text-[#C48B3F] font-bold">Platform</h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li><Link to="/discover" className="hover:text-white transition-colors">Discover Directory</Link></li>
              <li><Link to="/bridge" className="hover:text-white transition-colors">Bridge Workflows</Link></li>
              <li><Link to="/impact" className="hover:text-white transition-colors">Impact Analytics</Link></li>
              <li><Link to="/smart-match" className="hover:text-white transition-colors flex items-center gap-1.5">AI Smart Match <Sparkles className="w-3.5 h-3.5 text-[#C48B3F]" /></Link></li>
            </ul>
          </div>

          {/* Col 2: Organization */}
          <div className="space-y-4">
            <h4 className="font-mono text-xs uppercase tracking-widest text-[#C48B3F] font-bold">Organization</h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link to="/brand" className="hover:text-white transition-colors">Brand Identity</Link></li>
              <li><Link to="/auth?tab=register&role=ngo" className="hover:text-white transition-colors">Register NGO</Link></li>
            </ul>
          </div>

          {/* Col 3: Newsletter */}
          <div className="space-y-4">
            <h4 className="font-mono text-xs uppercase tracking-widest text-[#C48B3F] font-bold">Newsletter</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Get weekly updates on local NGO demands and community redistribution metrics.
            </p>

            {subscribed ? (
              <div className="p-3 bg-[#191815] border border-stone-700 text-stone-200 rounded-xl text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#C48B3F] shrink-0" />
                <span>Subscribed to updates!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2.5">
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-800 rounded-full text-xs bg-[#191815] text-white placeholder-stone-500 focus:outline-none focus:border-[#C48B3F]"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#C48B3F] hover:bg-[#A6722E] text-white font-medium text-xs rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5" /> Subscribe
                </button>
              </form>
            )}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-stone-500">
          <p>&copy; {new Date().getFullYear()} DonateBridge Platform. All rights reserved.</p>

          <div className="flex items-center gap-6">
            <Link to="/contact" className="hover:text-stone-300 transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-stone-300 transition-colors">Terms of Service</Link>
            <Link to="/contact" className="hover:text-stone-300 transition-colors">Support</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
