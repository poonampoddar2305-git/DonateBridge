import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/GlobalStateContext';
import { useRealDB } from '../hooks/useRealDB';
import { getApiError, ngoAPI } from '../api/index';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import DonationCard from '../components/ui/DonationCard';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import { useToast } from '../components/ui/Toast';
import LeafletMap from '../components/ui/LeafletMap';
import { 
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  ShieldCheck, Package, Clock, AlertTriangle, Plus, MapPin, 
  BarChart3, Activity, Trash2, Zap, Radar, CheckCircle2, Truck,
  Sparkles, TrendingUp, Radio, Building2, RefreshCw, Send,
  ShieldAlert, ArrowRight, Check, Leaf, Sun, Layers, Globe, Award, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NgoConsole() {
  const { user } = useAuth();
  const {
    myNgo, needs, donations, fetchNeeds, fetchDonations,
    addNeed, deleteNeed, claimDonation, updateDonation,
    getSmartMatchesForNgo
  } = useRealDB();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('incoming');
  const [smartMatches, setSmartMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Need posting form states
  const [needCategory, setNeedCategory] = useState('Clothing');
  const [needItem, setNeedItem] = useState('');
  const [needQty, setNeedQty] = useState('');
  const [needUrgency, setNeedUrgency] = useState('Medium');
  const [needDescription, setNeedDescription] = useState('');
  const [submittingNeed, setSubmittingNeed] = useState(false);

  useEffect(() => {
    if (myNgo === false) {
      toast.error('Please complete your NGO profile registration first.');
      navigate('/ngo-register');
    }
  }, [myNgo, navigate, toast]);

  // Active NGO Hub Info
  const currentNgo = myNgo || {
    id: null, name: user?.name || 'NGO Partner Hub', lat: 12.9716, lng: 77.5946,
    trustScore: 70, responseTime: '--', successRate: '--',
    verificationStatus: user?.verificationStatus || 'pending',
    rejectionReason: user?.rejectionReason || ''
  };

  // NGO-specific data
  const ngoNeeds = needs.filter(n => 
    String(n.ngoId) === String(currentNgo.id) || 
    String(n.ngo_id) === String(currentNgo.id) || 
    String(n.ngo) === String(currentNgo.id)
  );
  
  const isTargetNgo = (d) => {
    if (!currentNgo?.id) return false;
    let targetId = null;

    if (typeof d.matched_ngo === 'object' && d.matched_ngo !== null) {
      targetId = d.matched_ngo.id;
    } else if (typeof d.matched_ngo_details === 'object' && d.matched_ngo_details !== null) {
      targetId = d.matched_ngo_details.id;
    } else if (typeof d.matchedNgoId === 'object' && d.matchedNgoId !== null) {
      targetId = d.matchedNgoId.id;
    } else if (d.matched_ngo) {
      targetId = d.matched_ngo;
    } else if (d.matchedNgoId) {
      targetId = d.matchedNgoId;
    }

    if (!targetId) return false;
    return String(targetId) === String(currentNgo.id);
  };

  const allPledges = donations.filter(d => isTargetNgo(d));
  const activeIncoming = donations.filter(d => isTargetNgo(d) && d.status === 'MATCHED');
  const deliveredDonations = donations.filter(d => isTargetNgo(d) && d.status === 'DELIVERED');
  const totalReceived = deliveredDonations.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  const totalInTransit = activeIncoming.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  const activeNeedsCount = ngoNeeds.length;

  useEffect(() => {
    const loadAllData = () => {
      fetchNeeds({ all: 'true' });
      fetchDonations({ all_statuses: 'true' });
      if (currentNgo?.verificationStatus === 'approved') {
        getSmartMatchesForNgo()
          .then(matches => setSmartMatches(matches || []))
          .catch(() => setSmartMatches([]));
      }
    };

    loadAllData();
    const interval = setInterval(loadAllData, 4000); // Live 4s network sync
    return () => clearInterval(interval);
  }, [currentNgo?.id, currentNgo?.verificationStatus, fetchNeeds, fetchDonations, getSmartMatchesForNgo]);

  useEffect(() => {
    if (activeTab === 'analytics' && currentNgo?.id) {
      setLoadingAnalytics(true);
      ngoAPI.getAnalytics()
        .then(res => {
          setMonthlyData(res.data.monthly || []);
          setCategoryData((res.data.categories || []).map((c, i) => ({
            ...c,
            color: ['#2E5B3D', '#4A7C59', '#6B9976', '#88B090', '#3B6647'][i % 5]
          })));
        })
        .catch(() => toast.error('Failed to load analytics'))
        .finally(() => setLoadingAnalytics(false));
    }
  }, [activeTab, currentNgo?.id]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchNeeds({ all: 'true' }),
      fetchDonations({ all_statuses: 'true' })
    ]);
    if (currentNgo?.verificationStatus === 'approved') {
      try {
        const matches = await getSmartMatchesForNgo();
        setSmartMatches(matches || []);
      } catch {}
    }
    toast.success('Data synchronized with network');
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handlePostNeed = async (e) => {
    e.preventDefault();
    const qtyNum = parseInt(needQty, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.error('Quantity needed must be a positive integer greater than zero.');
      return;
    }
    setSubmittingNeed(true);
    try {
      await addNeed({
        category: needCategory,
        item: needItem,
        quantity: qtyNum,
        urgency: needUrgency,
        description: needDescription,
        lat: currentNgo.lat || 0,
        lng: currentNgo.lng || 0,
      });

      setNeedItem('');
      setNeedQty('');
      setNeedDescription('');
      toast.success('Demand broadcasted successfully!');
      setActiveTab('needs');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setSubmittingNeed(false);
    }
  };

  const handleClaimDonation = async (donationId) => {
    try {
      await claimDonation(donationId);
      fetchMatches();
      toast.success('Logistics match claimed! Shipment scheduled.');
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const handleDeleteNeed = async (id) => {
    try {
      await deleteNeed(id);
      toast.success('Demand broadcast removed.');
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const verStatus = currentNgo?.verification_status || currentNgo?.verificationStatus || 'pending';
  const rejReason = currentNgo?.rejection_reason || currentNgo?.rejectionReason || '';

  // Screen for Changes Requested by Admin
  if (verStatus === 'changes_requested') {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAF7] text-[#1E2923] font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 pt-28">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg bg-white border border-indigo-200 p-8 md:p-10 rounded-3xl shadow-sm text-center space-y-6"
          >
            <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 shadow-2xs">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display font-bold text-2xl text-[#1E2923]">Action Required: Changes Requested</h1>
              <p className="text-[#64748B] text-sm leading-relaxed max-w-md mx-auto">
                Platform administrators reviewed your NGO documents and requested revisions before approving your organization.
              </p>
            </div>
            <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 text-left space-y-1.5">
              <p className="font-bold text-indigo-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-indigo-600" /> Administrator Remarks
              </p>
              <p className="text-[#1E2923] text-xs font-medium leading-relaxed">
                {rejReason || 'Please upload updated registration certificate and PAN card copy.'}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="primary" onClick={() => navigate('/ngo-register')} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 h-11 text-xs font-semibold">
                Update Documents & Resubmit
              </Button>
              <Button variant="secondary" onClick={() => navigate('/chat')} className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl px-5 h-11 text-xs font-semibold">
                Contact Admin Support
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Screen for Rejected NGOs
  if (verStatus === 'rejected') {
    return (
      <div className="min-h-screen flex flex-col bg-[#F3F0EA] text-[#1C1B18] font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 pt-28">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg bg-[#EAE4DC] border border-[#DCD4C8] p-8 md:p-10 rounded-3xl shadow-xs text-center space-y-6"
          >
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif font-bold text-2xl text-[#1C1B18]">NGO Access Restricted</h1>
              <p className="text-[#666157] text-sm leading-relaxed max-w-md mx-auto">
                Your NGO registration requires official audit verification before you can claim matches and broadcast demands.
              </p>
            </div>
            <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 text-left space-y-1.5">
              <p className="font-bold text-rose-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Audit Feedback
              </p>
              <p className="text-[#1C1B18] text-xs font-medium leading-relaxed">
                {rejReason || 'Invalid registration license number or missing certificate verification.'}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => navigate('/ngo-register')} className="rounded-full bg-[#1C1B18] text-white hover:bg-[#C48B3F] px-6 py-2.5 text-xs font-medium transition-all">
                Update Documents & Re-apply
              </button>
              <button onClick={() => navigate('/chat')} className="rounded-full bg-rose-700 hover:bg-rose-800 text-white px-6 py-2.5 text-xs font-medium">
                Contact Support
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Pre-configured markers array for LeafletMap component
  const incomingMarkers = activeIncoming.map(item => ({
    lat: item.location?.lat || (currentNgo.lat + 0.015),
    lng: item.location?.lng || (currentNgo.lng + 0.015),
    popupContent: `<strong>Shipment ${item.id}</strong><br/>${item.title || item.category}<br/>Qty: ${item.quantity}`
  }));

  const mapMarkers = [
    { lat: currentNgo.lat, lng: currentNgo.lng, popupContent: `<strong>${currentNgo.name} (Headquarters)</strong>` },
    ...incomingMarkers
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] text-[#1C1B18] font-sans antialiased">
      <Navbar />

      {/* SEAMLESS TOP HERO BANNER */}
      <div className="bg-[#EAE4DC] border-b border-[#DCD4C8] pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        {verStatus === 'pending' && (
          <div className="max-w-6xl mx-auto mb-6 bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">Verification Pending Administrative Audit</h4>
                <p className="text-xs text-amber-700 mt-0.5">Your organization filings and legal documents have been submitted and are currently queued for manual inspection.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/ngo-register')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shrink-0"
            >
              Review & Update Filings
            </button>
          </div>
        )}
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left NGO Identity */}
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0 font-extrabold text-2xl shadow-xs">
              {currentNgo.name ? currentNgo.name.charAt(0).toUpperCase() : 'N'}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                  verStatus === 'approved' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {verStatus === 'approved' ? 'Verified Organization' : 'Pending Audit'}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {currentNgo.city || currentNgo.district || 'Regional Zone'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {currentNgo.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 max-w-xl font-normal leading-relaxed">
                Direct physical supply logistics, real-time demand ledger & AI-driven spatial donor matching.
              </p>
            </div>
          </div>

          {/* Right Status Badges & Quick Action */}
          <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="flex items-center gap-2">
              <button 
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Sync Network
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer"
              >
                Hub Settings
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
              <span>Trust Score: <strong className="text-emerald-700 font-bold">{currentNgo.trustScore || 95}%</strong></span>
              <span>&bull;</span>
              <span>Response Time: <strong className="text-slate-800 font-semibold">{currentNgo.responseTime || '2 hrs'}</strong></span>
            </div>
          </div>

        </div>
      </div>

      <main className="grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* 4 ELEGANT KPI METRIC CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EDE9] shadow-2xs space-y-3 hover:border-[#2E5B3D]/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Inventory Received</span>
              <div className="w-9 h-9 rounded-xl bg-[#EBF3EE] text-[#2E5B3D] flex items-center justify-center">
                <Package className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-[#1E2923] tracking-tight">{totalReceived}</span>
                <span className="text-xs text-[#64748B]">units</span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">Verified & fulfilled supplies</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EDE9] shadow-2xs space-y-3 hover:border-[#2E5B3D]/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Cargo In-Transit</span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-sky-800 tracking-tight">{totalInTransit}</span>
                <span className="text-xs text-[#64748B]">units</span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">Active shipment dispatches</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EDE9] shadow-2xs space-y-3 hover:border-[#2E5B3D]/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Active Demands</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Radio className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-amber-800 tracking-tight">{activeNeedsCount}</span>
                <span className="text-xs text-[#64748B]">broadcasts</span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">Registered demand specs</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EDE9] shadow-2xs space-y-3 hover:border-[#2E5B3D]/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Spatial Match Rate</span>
              <div className="w-9 h-9 rounded-xl bg-[#EBF3EE] text-[#2E5B3D] flex items-center justify-center">
                <Radar className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-[#2E5B3D] tracking-tight">98.4%</span>
                <span className="text-xs text-[#64748B]">accuracy</span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">Within 4km local radius</p>
            </div>
          </div>

        </section>

        {/* ELEGANT SEGMENTED NAVIGATION TABS */}
        <div className="flex justify-center pt-2">
          <div className="inline-flex p-1.5 bg-white border border-[#E8EDE9] rounded-2xl shadow-2xs max-w-full overflow-x-auto gap-1">
            {[
              { id: 'incoming', label: `Incoming Pledges (${allPledges.length})`, icon: Truck },
              { id: 'matches', label: `AI Smart Matches (${smartMatches.length})`, icon: Zap },
              { id: 'needs', label: `Broadcast Demands (${ngoNeeds.length})`, icon: Radio },
              { id: 'geo', label: `Coverage Map`, icon: Radar },
              { id: 'analytics', label: `Analytics & Impact`, icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-xs rounded-xl transition-all duration-150 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#2E5B3D] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#1E2923] hover:bg-[#F3F6F4]'
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-white' : 'text-[#64748B]'}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB CONTENTS */}
        <AnimatePresence mode="wait">

          {/* TAB 0: INCOMING PLEDGES & LOGISTICS */}
          {activeTab === 'incoming' && (
            <motion.div
              key="incoming"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8EDE9] shadow-2xs">
                <div>
                  <h3 className="font-display font-bold text-[#1E2923] text-base flex items-center gap-2">
                    <Truck className="w-5 h-5 text-[#2E5B3D]" /> Incoming Pledges & Logistics Stream
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5 font-medium">Real-time dispatches pledged by donors for your non-profit demands.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#2E5B3D] bg-[#EBF3EE] px-3.5 py-1.5 rounded-xl border border-emerald-200">
                  <Activity className="w-3.5 h-3.5 animate-pulse text-[#2E5B3D]" />
                  <span>{activeIncoming.length} Active Shipments in Transit</span>
                </div>
              </div>

              {allPledges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allPledges.map(pledge => {
                    const isDelivered = pledge.status === 'DELIVERED';
                    return (
                      <div key={pledge.id} className="bg-white border border-[#E8EDE9] rounded-2xl p-5 space-y-4 shadow-2xs hover:border-[#2E5B3D]/30 transition-all flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-slate-400">ID: {pledge.id}</span>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                              isDelivered ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isDelivered ? 'bg-emerald-600' : 'bg-sky-600 animate-ping'}`}></span>
                              {isDelivered ? 'Delivered & Verified' : 'In Transit / Matched'}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-display font-bold text-slate-900 text-base">{pledge.title || pledge.item || pledge.category}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#2E5B3D] font-bold text-[10px]">
                                {pledge.category}
                              </span>
                              <span className="text-xs font-semibold text-slate-600">
                                Quantity: <strong className="text-slate-900">{pledge.quantity || 1}x</strong>
                              </span>
                              {pledge.condition && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  {pledge.condition}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                            <div className="flex items-center justify-between">
                              <span>Donor Name:</span>
                              <strong className="text-slate-800">{pledge.donorName || pledge.donor?.username || 'Verified Donor'}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Pickup Location:</span>
                              <strong className="text-slate-800 text-right truncate max-w-[200px]">{pledge.pickupAddress || pledge.address || 'Address provided on request'}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                          <button
                            onClick={() => navigate(`/tracking/${pledge.id}`)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          >
                            Track Stream <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          {!isDelivered && (
                            <button
                              onClick={async () => {
                                try {
                                  await updateDonation(pledge.id, { status: 'DELIVERED' });
                                  toast.success('Delivery verified & tax certificate issued!');
                                } catch (err) {
                                  toast.error('Failed to update delivery status');
                                }
                              }}
                              className="px-4 py-2 bg-[#2E5B3D] hover:bg-[#23472E] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verify Delivery
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-[#E8EDE9] rounded-2xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-[#2E5B3D] rounded-full flex items-center justify-center mx-auto">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h4 className="font-display font-bold text-slate-900 text-base">No Incoming Pledges Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">When donors fulfill your broadcast demands or pledge surplus items to your hub, they will appear here for tracking and delivery verification.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 1: SMART MATCHES */}
          {activeTab === 'matches' && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-6"
            >
              {/* Quick Hub Guidance Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Highlight Card 1 */}
                <div className="bg-linear-to-br from-[#2E5B3D] to-[#1E3B27] text-white p-6 rounded-2xl space-y-3 shadow-2xs md:col-span-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Spatial Proximity Engine
                    </span>
                    <span className="bg-white/10 text-white text-[11px] px-2.5 py-0.5 rounded-full border border-white/15">4km Radius</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-white">Recommended Donor Dispatches</h3>
                    <p className="text-emerald-100 text-xs mt-1 max-w-lg leading-relaxed font-normal">
                      Listings submitted by local donors that match your active demand specifications are automatically ranked by distance and item category compatibility.
                    </p>
                  </div>
                </div>

                {/* Highlight Card 2 */}
                <div className="bg-white p-6 rounded-2xl border border-[#E8EDE9] space-y-3 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Demand Broadcasting</span>
                    <h3 className="font-bold text-lg text-[#1E2923]">Need More Supplies?</h3>
                    <p className="text-[#64748B] text-xs leading-relaxed">Broadcast specific category needs to attract nearby donors.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('needs')}
                    className="inline-flex items-center justify-center gap-1 text-xs font-semibold bg-[#EBF3EE] hover:bg-[#2E5B3D] text-[#2E5B3D] hover:text-white border border-[#2E5B3D]/15 px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                  >
                    Post New Demand <Plus className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>

              </div>

              {/* Match List */}
              {loadingMatches ? (
                <div className="bg-white border border-[#E8EDE9] rounded-2xl p-12 text-center text-xs font-semibold text-[#64748B]">
                  Calculating spatial proximity matrix...
                </div>
              ) : verStatus === 'approved' && smartMatches.length === 0 ? (
                <div className="space-y-6">
                  {donations.filter(d => d.status === 'VERIFIED' || d.status === 'PENDING').length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#2E5B3D]" />
                          <h4 className="font-bold text-sm text-[#1E2923]">Available Surplus Supplies in Region</h4>
                        </div>
                        <span className="text-xs text-[#64748B] font-medium">
                          {donations.filter(d => d.status === 'VERIFIED' || d.status === 'PENDING').length} listings open for claim
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {donations.filter(d => d.status === 'VERIFIED' || d.status === 'PENDING').slice(0, 4).map(donation => (
                          <div key={donation.id} className="bg-white border border-[#E8EDE9] rounded-2xl p-4 space-y-3 shadow-2xs hover:border-[#2E5B3D]/30 transition-all flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2.5 py-0.5 rounded-md bg-[#EBF3EE] text-[#2E5B3D] font-bold text-[11px]">
                                  {donation.category}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {donation.condition || 'Good'}
                                </span>
                              </div>
                              <h5 className="font-bold text-[#1E2923] text-sm">{donation.title || donation.itemName}</h5>
                              <p className="text-xs text-[#64748B] flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {donation.pickup_address || donation.location?.address || 'Local Region'}
                              </p>
                              {donation.description && (
                                <p className="text-xs text-slate-600 line-clamp-2">{donation.description}</p>
                              )}
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-bold text-slate-800">{donation.quantity} units</span>
                              <Button
                                variant="primary"
                                onClick={() => handleClaimDonation(donation.id)}
                                className="bg-[#2E5B3D] hover:bg-[#1E3B27] text-white text-xs h-8 px-3.5 rounded-lg font-semibold"
                              >
                                Claim Supply
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#E8EDE9] rounded-2xl p-10 text-center space-y-3 shadow-2xs">
                      <div className="w-12 h-12 rounded-2xl bg-[#EBF3EE] text-[#2E5B3D] flex items-center justify-center mx-auto">
                        <Zap className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-[#1E2923]">No active match recommendations</p>
                      <p className="text-xs text-[#64748B] max-w-sm mx-auto">Broadcast a new demand specification to trigger automated spatial matching.</p>
                      <Button variant="primary" onClick={() => setActiveTab('needs')} className="bg-[#2E5B3D] hover:bg-[#1E3B27] text-white text-xs h-10 px-5 rounded-xl font-semibold">
                        Create Demand Broadcast
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {smartMatches.map(({ donation, need, scoreBreakdown }) => (
                    <div key={donation.id} className="bg-white border border-[#E8EDE9] rounded-2xl overflow-hidden shadow-2xs hover:border-[#2E5B3D]/30 transition-all">
                      <DonationCard
                        donation={donation}
                        matchScoreDetails={scoreBreakdown}
                        onClaim={() => handleClaimDonation(donation.id)}
                        actions={
                          <span className="font-mono text-[#2E5B3D] bg-[#EBF3EE] px-3 py-1 rounded-lg border border-[#2E5B3D]/15 text-xs font-semibold">
                            Matched Demand: {need.item}
                          </span>
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: BROADCAST DEMANDS */}
          {activeTab === 'needs' && (
            <motion.div
              key="needs"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Needs Table */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[#E8EDE9] shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-[#1E2923]">Active Demand Ledger</h3>
                  <span className="text-xs font-medium text-[#64748B]">{ngoNeeds.length} items registered</span>
                </div>
                
                {ngoNeeds.length === 0 ? (
                  <p className="text-xs text-[#64748B] text-center py-12 border border-dashed border-[#E8EDE9] rounded-xl bg-[#FAFAF8]">
                    No demand specs broadcasted yet. Use the form to post new supply needs.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-[#E8EDE9] rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8EDE9] bg-[#F8FAF8] text-[#64748B] font-semibold">
                          <th className="p-3.5">Category</th>
                          <th className="p-3.5">Item Specification</th>
                          <th className="p-3.5 text-center">Qty</th>
                          <th className="p-3.5">Urgency</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EDE9]">
                        {ngoNeeds.map(need => (
                          <tr key={need.id} className="hover:bg-[#F8FAF8] transition-colors">
                            <td className="p-3.5 font-semibold text-[#2E5B3D]">{need.category}</td>
                            <td className="p-3.5 font-bold text-[#1E2923]">{need.item}</td>
                            <td className="p-3.5 text-center font-mono font-bold text-[#1E2923]">{need.quantity}</td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                need.urgency === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 
                                need.urgency === 'Medium' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                'bg-slate-50 text-slate-700 border border-slate-200'
                              }`}>
                                {need.urgency}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button 
                                onClick={() => handleDeleteNeed(need.id)} 
                                className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer"
                                title="Remove Demand"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Need Poster Form */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#E8EDE9] shadow-2xs space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-[#1E2923]">Broadcast New Demand</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Post supply specifications to be indexed by spatial donor matching.</p>
                </div>

                <form onSubmit={handlePostNeed} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#64748B]">Supply Category</label>
                    <select
                      value={needCategory}
                      onChange={(e) => setNeedCategory(e.target.value)}
                      className="w-full bg-[#F8FAF8] border border-[#E8EDE9] p-3 rounded-xl text-xs font-medium text-[#1E2923] focus:border-[#2E5B3D] outline-none"
                    >
                      {['Clothing', 'Food', 'Books', 'Furniture', 'Electronics', 'Medical Equipment'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <InputField
                    label="Item Title & Specs"
                    id="item-name"
                    placeholder="e.g. Warm Blankets (Double Bed)"
                    value={needItem}
                    onChange={(e) => setNeedItem(e.target.value)}
                    required
                    className="bg-[#F8FAF8]! border-[#E8EDE9] text-xs rounded-xl"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Quantity Needed"
                      id="qty"
                      type="number"
                      min="1"
                      placeholder="50"
                      value={needQty}
                      onChange={(e) => setNeedQty(e.target.value)}
                      required
                      className="bg-[#F8FAF8]! border-[#E8EDE9] text-xs rounded-xl"
                    />

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#64748B]">Urgency Level</label>
                      <select
                        value={needUrgency}
                        onChange={(e) => setNeedUrgency(e.target.value)}
                        className="w-full bg-[#F8FAF8] border border-[#E8EDE9] p-3 rounded-xl text-xs font-medium text-[#1E2923] focus:border-[#2E5B3D] outline-none"
                      >
                        <option value="High">High Urgency</option>
                        <option value="Medium">Medium Urgency</option>
                        <option value="Low">Low Urgency</option>
                      </select>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={submittingNeed}
                    className="w-full h-11 bg-[#2E5B3D] hover:bg-[#1E3B27] text-white text-xs font-semibold rounded-xl shadow-2xs"
                  >
                    {submittingNeed ? 'Broadcasting Spec...' : 'Broadcast Demand Spec'}
                  </Button>
                </form>
              </div>
            </motion.div>
          )}

          {/* TAB 3: COVERAGE MAP */}
          {activeTab === 'geo' && (
            <motion.div
              key="geo"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="bg-white p-5 rounded-2xl border border-[#E8EDE9] shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-[#1E2923]">Headquarters & Spatial Matching Radius</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">4km radius active spatial coverage for donor pickups.</p>
                </div>
                <span className="text-xs text-[#2E5B3D] bg-[#EBF3EE] px-3 py-1 rounded-full font-semibold border border-[#2E5B3D]/15">
                  ● Active 4km Radius
                </span>
              </div>
              <div className="h-120 w-full rounded-xl overflow-hidden border border-[#E8EDE9]">
                <LeafletMap
                  center={[currentNgo.lat, currentNgo.lng]}
                  zoom={13}
                  markers={mapMarkers}
                  circles={[{ lat: currentNgo.lat, lng: currentNgo.lng, radius: 4000, color: '#2E5B3D', fillColor: '#2E5B3D', fillOpacity: 0.12 }]}
                  className="h-full w-full border-none"
                />
              </div>
            </motion.div>
          )}

          {/* TAB 4: ANALYTICS */}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <div className="bg-white p-6 rounded-2xl border border-[#E8EDE9] shadow-2xs space-y-4">
                <h4 className="font-bold text-sm text-[#1E2923]">Monthly Supply Inbound Trajectory</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: '12px', border: '1px solid #E8EDE9', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                      <Line type="monotone" dataKey="received" stroke="#2E5B3D" strokeWidth={2.5} dot={{ r: 4, fill: '#2E5B3D' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#E8EDE9] shadow-2xs space-y-4">
                <h4 className="font-bold text-sm text-[#1E2923]">Supply Category Distribution</h4>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">
                        {categoryData.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: '12px', border: '1px solid #E8EDE9', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* BOTTOM ELEGANT TRUST FOOTER */}
        <div className="pt-6 border-t border-[#E8EDE9] flex flex-wrap items-center justify-center gap-6 text-xs text-[#64748B] font-medium">
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#2E5B3D]" /> Real-time network sync</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#2E5B3D]" /> Direct spatial donor matching</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#2E5B3D]" /> Verified NGO audit network</span>
        </div>

      </main>
      <Footer />
    </div>
  );
}
