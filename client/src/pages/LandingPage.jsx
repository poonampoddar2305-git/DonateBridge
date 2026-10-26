import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/GlobalStateContext';
import { useRealDB } from '../hooks/useRealDB';
import {
  Search, ShieldCheck, MapPin, Heart, HeartHandshake, ArrowRight, Star, Award, Leaf,
  Users, ChevronRight, Check, BookOpen, Clock, Gift, Activity, ArrowUpRight,
  TrendingUp, Sparkles, Building, Calendar, Info, Sliders, Truck, AlertTriangle,
  Plus, Minus, RefreshCw, Loader2, Navigation
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { motion } from 'framer-motion';

const CATEGORY_IMAGES = {
  Food: "https://images.unsplash.com/photo-1599059813005-11265ba4b2e9?auto=format&fit=crop&q=80&w=600",
  Books: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600",
  Clothing: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=600",
  Medical: "https://images.unsplash.com/photo-1584308666744-24d59ce3618d?auto=format&fit=crop&q=80&w=600",
};

const TRACKER_STAGES = [
  {
    title: '1. Pledged',
    status: 'COMPLETED',
    time: '10:15 AM (Today)',
    log: '[SYSTEM] Item verified by AI inspection & match confirmed for Hope Foundation Hub.'
  },
  {
    title: '2. Dispatched',
    status: 'COMPLETED',
    time: '11:30 AM (Today)',
    log: '[COURIER] Express Partner #DB-990 picked up supplies from donor location.'
  },
  {
    title: '3. In-Transit',
    status: 'ACTIVE',
    time: '12:45 PM (Active)',
    log: '[GPS] Live spatial routing active (4.2km from recipient NGO facility).'
  },
  {
    title: '4. Verified',
    status: 'PENDING',
    time: 'Est. 1:15 PM',
    log: '[DELIVERY] Awaiting QR verification token scan at NGO doorstep.'
  }
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { ngos, donations, needs, loadingNeeds } = useRealDB();
  const navigate = useNavigate();
  const [emailSub, setEmailSub] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Immersive Hero Simulator States
  const [simCategory, setSimCategory] = useState('Food');
  const [simQty, setSimQty] = useState(25);
  const [simCondition, setSimCondition] = useState('Like New');

  // Interactive Sandbox state
  const [sandboxTab, setSandboxTab] = useState('match');

  // Match Simulator state (No predefined location)
  const [matchCategory, setMatchCategory] = useState('Books');
  const [matchLocation, setMatchLocation] = useState('');
  const [matchCoords, setMatchCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [manualLocationInput, setManualLocationInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Impact Estimator state
  const [impactCategory, setImpactCategory] = useState('Food');
  const [impactQuantity, setImpactQuantity] = useState(100);

  const getImpactMetrics = () => {
    const qty = parseInt(impactQuantity, 10) || 1;
    let beneficiaries = qty;
    let beneficiaryLabel = 'People Fed';
    let co2Factor = 2.5;

    if (impactCategory === 'Food') {
      beneficiaries = qty * 2;
      beneficiaryLabel = 'Meals Served';
      co2Factor = 1.8;
    } else if (impactCategory === 'Clothing') {
      beneficiaries = Math.round(qty * 0.8);
      beneficiaryLabel = 'Families Clothed';
      co2Factor = 5.2;
    } else if (impactCategory === 'Books') {
      beneficiaries = qty;
      beneficiaryLabel = 'Students Educated';
      co2Factor = 3.1;
    } else if (impactCategory === 'Medical') {
      beneficiaries = Math.round(qty * 1.5);
      beneficiaryLabel = 'Patients Supported';
      co2Factor = 4.0;
    }

    return {
      beneficiaries: beneficiaries.toLocaleString(),
      beneficiaryLabel,
      co2: (qty * co2Factor).toFixed(1)
    };
  };

  const impactMetrics = getImpactMetrics();
  const [trackerStep, setTrackerStep] = useState(2);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (emailSub) {
      setSubscribed(true);
      setEmailSub('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const handleTagClick = (tag) => {
    setSearchQuery(tag);
    navigate(`/discover?query=${encodeURIComponent(tag)}`);
  };

  const getHeroSimMatches = () => {
    const matchingNeed = needs.find(n => n.category.toLowerCase() === simCategory.toLowerCase());
    let ngoName = matchingNeed?.ngoName || (ngos.length > 0 ? ngos[0].name : "Community Partner NGO");
    let needItem = matchingNeed?.item || `${simCategory} Requirement`;
    let score = 95;
    let co2 = (simQty * 0.45).toFixed(1);
    return { ngoName, score, co2, needItem };
  };

  const heroSimOutput = getHeroSimMatches();

  const handlePullLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported. Please enter your location manually.');
      setShowManualInput(true);
      return;
    }
    setIsLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMatchCoords({ lat, lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const address = data.address;
          const locName = address
            ? (address.suburb || address.neighbourhood || address.city || address.town || address.village || (data.display_name ? data.display_name.split(',').slice(0, 2).join(',') : `${lat.toFixed(3)}, ${lng.toFixed(3)}`))
            : `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
          const fullLabel = address?.city && locName !== address.city
            ? `${locName}, ${address.city}`
            : locName;
          setMatchLocation(fullLabel);
          setShowManualInput(false);
        } catch {
          setMatchLocation(`Coordinates: ${lat.toFixed(3)}, ${lng.toFixed(3)}`);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setLocError('Could not detect location. Please check browser permissions or enter city manually.');
        setShowManualInput(true);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleManualLocationSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!manualLocationInput.trim()) return;
    setIsLocating(true);
    setLocError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(manualLocationInput.trim())}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        setMatchCoords({ lat, lng });
        setMatchLocation(item.display_name.split(',').slice(0, 2).join(','));
        setShowManualInput(false);
      } else {
        setLocError(`Location "${manualLocationInput}" not found. Try another city name.`);
      }
    } catch {
      setLocError('Network error searching for location.');
    } finally {
      setIsLocating(false);
    }
  };

  const getSimulationMatches = () => {
    // Strictly no results until the user pulls a location
    if (!matchCoords) {
      return [];
    }

    let dbCategory = matchCategory;
    if (matchCategory === 'Medical Equipment') dbCategory = 'Medical';
    if (matchCategory === 'Clothes') dbCategory = 'Clothing';

    const candidateNeeds = needs.filter(n => n.category.toLowerCase() === dbCategory.toLowerCase());

    const getDist = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const matches = candidateNeeds.map(need => {
      const ngo = ngos.find(o => o.id === need.ngoId) || {
        name: need.ngoName,
        lat: need.lat,
        lng: need.lng,
        trustScore: 85
      };

      const targetLat = need.lat || ngo.lat;
      const targetLng = need.lng || ngo.lng;
      if (!targetLat || !targetLng) return null;

      const distance = getDist(matchCoords.lat, matchCoords.lng, targetLat, targetLng);
      // Distance score: closer gives higher fit score
      const distanceScore = Math.max(0, 100 - (distance * 3));
      const totalScore = Math.round((100 * 0.35) + (distanceScore * 0.25) + ((ngo.trustScore || 80) * 0.40));

      return {
        ngo,
        need,
        distance: distance.toFixed(1),
        score: totalScore,
        rawDist: distance
      };
    }).filter(Boolean);

    // If demands exist in proximity (e.g. within 100 km), return top matches; otherwise empty
    const availableMatches = matches.filter(m => m.rawDist <= 100);
    availableMatches.sort((a, b) => b.score - a.score);
    return availableMatches.slice(0, 3);
  };

  const simulationResults = getSimulationMatches();

  return (
    <div className="min-h-screen bg-[#F3F0EA] font-sans text-[#1C1B18] flex flex-col">
      <Navbar />

      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden bg-[#F3F0EA] pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Column: Vision & Action */}
            <div className="lg:col-span-7 space-y-8 text-left">

              {/* Value proposition Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EAE4DC] border border-[#DCD4C8] text-[#C48B3F] text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Transparent Resource Exchange</span>
              </div>

              {/* Main Display Heading */}
              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#1C1B18] leading-[1.1]">
                Bridging kindness directly with <span className="italic text-[#C48B3F] font-normal">local community needs.</span>
              </h1>

              <p className="text-base sm:text-xl text-[#666157] font-normal leading-relaxed max-w-2xl">
                DonateBridge connects surplus items directly to verified non-profit requirements with automated AI matching, real-time logistics tracking, and zero middle-man fees.
              </p>

              {/* Main Pill Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  onClick={() => navigate(isAuthenticated ? '/upload-donation' : '/auth')}
                  className="rounded-full bg-[#1C1B18] text-white hover:bg-[#C48B3F] transition-all duration-300 px-8 py-3.5 text-sm font-medium flex items-center justify-center gap-2.5 shadow-md"
                >
                  <Gift className="w-4 h-4" /> List Surplus Item
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => navigate('/discover')}
                  className="rounded-full border border-[#1C1B18] text-[#1C1B18] hover:bg-[#EAE4DC] transition-all duration-300 px-7 py-3.5 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4 text-[#666157]" /> Discover Demands Map
                </button>
              </div>

              {/* Tag Quick Filters */}
              <div className="pt-6 space-y-2.5 border-t border-[#DCD4C8]">
                <p className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider">Popular Resource Demands</p>
                <div className="flex flex-wrap gap-2">
                  {['Blankets', 'Dry Rations', 'Textbooks', 'Medical Kits'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className="px-4 py-1.5 rounded-full bg-[#EAE4DC] hover:bg-[#C48B3F] hover:text-white text-[#1C1B18] text-xs font-medium transition-all cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Hero Live Card */}
            <div className="lg:col-span-5">
              <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-7 shadow-sm space-y-6 text-left">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#DCD4C8] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C48B3F] animate-pulse" />
                    <h3 className="font-serif text-lg font-bold text-[#1C1B18]">Live Network Feed</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#C48B3F] uppercase tracking-wider bg-[#F3F0EA] px-3 py-1 rounded-full border border-[#DCD4C8]">
                    REAL-TIME
                  </span>
                </div>

                {/* Urgent Demands */}
                <div className="space-y-3">
                  <p className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider">Urgent NGO Demands</p>

                  {loadingNeeds ? (
                    <div className="py-8 text-center bg-[#F3F0EA] rounded-2xl">
                      <Loader2 className="w-5 h-5 animate-spin text-[#C48B3F] mx-auto mb-2" />
                      <p className="text-xs text-[#666157]">Syncing live network demands...</p>
                    </div>
                  ) : needs.filter(n => (n.status === 'ACTIVE' || !n.status) && (n.quantity - (n.fulfilledQuantity || 0)) > 0).length > 0 ? (
                    needs.filter(n => (n.status === 'ACTIVE' || !n.status) && (n.quantity - (n.fulfilledQuantity || 0)) > 0).slice(0, 3).map((need) => (
                      <div key={need.id} className="p-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl hover:border-[#C48B3F] transition-all flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#C48B3F]/15 text-[#C48B3F] font-bold text-[10px]">
                              {need.category}
                            </span>
                            <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full uppercase">
                              {need.urgency || 'High'} Need
                            </span>
                          </div>
                          <h4 className="font-bold text-[#1C1B18] text-xs truncate">{need.item}</h4>
                          <p className="text-[11px] text-[#666157] truncate flex items-center gap-1">
                            <Building className="w-3 h-3 text-[#666157]" />
                            {need.ngoName || 'Local Partner NGO'} &bull; Qty: {need.quantity}
                          </p>
                        </div>

                        <button
                          onClick={() => navigate(`/upload-donation?category=${encodeURIComponent(need.category)}&item=${encodeURIComponent(need.item)}&ngo_id=${need.ngoId || ''}`)}
                          className="rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-[11px] py-1.5 px-4 font-medium shrink-0 transition-colors"
                        >
                          Fulfill
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center bg-[#F3F0EA] rounded-2xl space-y-1">
                      <HeartHandshake className="w-6 h-6 text-[#C48B3F] mx-auto mb-1" />
                      <p className="font-bold text-[#1C1B18] text-xs">No active demands listed</p>
                      <p className="text-[11px] text-[#666157]">NGO partners will post live demands here.</p>
                    </div>
                  )}
                </div>

                {/* Instant Impact Rating */}
                <div className="p-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1C1B18] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#C48B3F]" /> Smart Match Integrity
                    </span>
                    <span className="font-mono font-bold text-[#C48B3F]">96% Match Fit</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#666157] pt-2 border-t border-[#DCD4C8]">
                    <span>Est. Beneficiaries: <strong className="text-[#1C1B18]">~{simQty * 2} people</strong></span>
                    <span>CO₂ Saved: <strong className="text-[#C48B3F]">{heroSimOutput.co2} kg</strong></span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>


      {/* Interactive Sandbox Section */}
      <section className="py-20 bg-[#F3F0EA] border-b border-[#DCD4C8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EAE4DC] text-[#C48B3F] text-xs font-mono uppercase tracking-wider font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Interactive Sandbox
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1C1B18] font-bold">
              Simulate Match Integrity &amp; Eco-Impact
            </h2>
            <p className="text-sm text-[#666157] leading-relaxed">
              Explore how spatial algorithms coordinate physical deliveries, reduce carbon footprints, and maintain audit trails in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

            {/* Tab Selectors */}
            <div className="lg:col-span-5 flex flex-col space-y-3">
              <button
                onClick={() => setSandboxTab('match')}
                className={`w-full p-5 rounded-2xl text-left border transition-all duration-200 flex gap-4 items-center cursor-pointer ${sandboxTab === 'match'
                    ? 'bg-[#EAE4DC] border-[#C48B3F]'
                    : 'bg-[#F3F0EA] border-[#DCD4C8] hover:bg-[#EAE4DC]'
                  }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${sandboxTab === 'match' ? 'bg-[#1C1B18] text-white' : 'bg-[#DCD4C8] text-[#1C1B18]'
                  }`}>
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1C1B18]">Smart-Match Engine</h3>
                  <p className="text-xs text-[#666157] mt-0.5">Select category & locality to calculate spatial fit score.</p>
                </div>
              </button>

              <button
                onClick={() => setSandboxTab('impact')}
                className={`w-full p-5 rounded-2xl text-left border transition-all duration-200 flex gap-4 items-center cursor-pointer ${sandboxTab === 'impact'
                    ? 'bg-[#EAE4DC] border-[#C48B3F]'
                    : 'bg-[#F3F0EA] border-[#DCD4C8] hover:bg-[#EAE4DC]'
                  }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${sandboxTab === 'impact' ? 'bg-[#1C1B18] text-white' : 'bg-[#DCD4C8] text-[#1C1B18]'
                  }`}>
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1C1B18]">Eco-Impact Calculator</h3>
                  <p className="text-xs text-[#666157] mt-0.5">Estimate beneficiary reach and CO2 carbon offset metrics.</p>
                </div>
              </button>

              <button
                onClick={() => setSandboxTab('tracker')}
                className={`w-full p-5 rounded-2xl text-left border transition-all duration-200 flex gap-4 items-center cursor-pointer ${sandboxTab === 'tracker'
                    ? 'bg-[#EAE4DC] border-[#C48B3F]'
                    : 'bg-[#F3F0EA] border-[#DCD4C8] hover:bg-[#EAE4DC]'
                  }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${sandboxTab === 'tracker' ? 'bg-[#1C1B18] text-white' : 'bg-[#DCD4C8] text-[#1C1B18]'
                  }`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1C1B18]">Logistics Lifecycle Tracker</h3>
                  <p className="text-xs text-[#666157] mt-0.5">Walkthrough physical audit handshakes step-by-step.</p>
                </div>
              </button>
            </div>

            {/* Widget Container */}
            <div className="lg:col-span-7">
              <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-7 shadow-xs h-full flex flex-col justify-between text-left">

                {/* 1. MATCH SIMULATOR WIDGET */}
                {sandboxTab === 'match' && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center pb-4 border-b border-[#DCD4C8]">
                        <h4 className="font-serif font-bold text-[#1C1B18] text-sm flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-[#C48B3F]" /> Smart Match Simulator
                        </h4>
                        <span className="text-[11px] bg-[#F3F0EA] text-[#C48B3F] px-3 py-0.5 rounded-full border border-[#DCD4C8] font-mono">Category 30% | Distance 20%</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#666157]">Category</label>
                          <select
                            value={matchCategory}
                            onChange={(e) => setMatchCategory(e.target.value)}
                            className="w-full p-3 bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl text-xs font-medium text-[#1C1B18] outline-none focus:border-[#C48B3F]"
                          >
                            <option value="Food">Food &amp; Rations</option>
                            <option value="Books">Books &amp; Learning Kits</option>
                            <option value="Clothing">Clothing &amp; Blankets</option>
                            <option value="Medical Equipment">Medical Supplies</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-[#666157]">Donor Location</label>
                            {matchLocation && (
                              <button
                                type="button"
                                onClick={() => setShowManualInput(!showManualInput)}
                                className="text-[10px] text-[#C48B3F] hover:underline font-medium cursor-pointer"
                              >
                                {showManualInput ? 'Cancel' : 'Change City'}
                              </button>
                            )}
                          </div>

                          {!matchLocation && !showManualInput ? (
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                onClick={handlePullLocation}
                                disabled={isLocating}
                                className="w-full p-2.5 bg-[#F3F0EA] hover:bg-[#DCD4C8] border border-dashed border-[#C48B3F] text-[#C48B3F] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                              >
                                {isLocating ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Pulling your location...</span>
                                  </>
                                ) : (
                                  <>
                                    <Navigation className="w-3.5 h-3.5" />
                                    <span>Pull My Current Location</span>
                                  </>
                                )}
                              </button>
                              <div className="text-center">
                                <button
                                  type="button"
                                  onClick={() => setShowManualInput(true)}
                                  className="text-[10px] text-[#666157] hover:text-[#1C1B18] underline cursor-pointer"
                                >
                                  Or enter city manually
                                </button>
                              </div>
                            </div>
                          ) : showManualInput ? (
                            <form onSubmit={handleManualLocationSubmit} className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder="Enter city name (e.g. Mumbai, Delhi)..."
                                value={manualLocationInput}
                                onChange={(e) => setManualLocationInput(e.target.value)}
                                className="w-full p-2.5 bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl text-xs font-medium text-[#1C1B18] outline-none focus:border-[#C48B3F]"
                              />
                              <button
                                type="submit"
                                disabled={isLocating}
                                className="px-3 py-2 bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium rounded-xl transition shrink-0 cursor-pointer"
                              >
                                {isLocating ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Set'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowManualInput(false)}
                                className="px-2 py-2 text-[#666157] text-xs hover:text-[#1C1B18] cursor-pointer"
                              >
                                ✕
                              </button>
                            </form>
                          ) : (
                            <div className="p-2.5 bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-[#C48B3F] shrink-0" />
                                <span className="font-bold text-[#1C1B18] truncate">{matchLocation}</span>
                              </div>
                              <button
                                type="button"
                                onClick={handlePullLocation}
                                disabled={isLocating}
                                title="Re-pull current GPS location"
                                className="text-[11px] font-bold text-[#C48B3F] hover:underline flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                              >
                                <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                                Re-pull
                              </button>
                            </div>
                          )}

                          {locError && (
                            <p className="text-[10px] text-rose-600 font-medium pt-1">{locError}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 my-4 grow overflow-y-auto">
                      <p className="text-[10px] font-mono font-bold text-[#666157] uppercase tracking-wider">Recommended Hub Destinations</p>

                      {!matchCoords ? (
                        <div className="p-6 bg-[#F3F0EA] border border-dashed border-[#DCD4C8] rounded-2xl text-center space-y-2">
                          <div className="w-9 h-9 rounded-full bg-[#EAE4DC] border border-[#DCD4C8] flex items-center justify-center mx-auto text-[#C48B3F]">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <h5 className="text-xs font-serif font-bold text-[#1C1B18]">Location Not Pulled</h5>
                          <p className="text-[11px] text-[#666157] max-w-xs mx-auto">
                            Pull your location to calculate real spatial fit scores and find nearby recipient hubs.
                          </p>
                          <button
                            type="button"
                            onClick={handlePullLocation}
                            disabled={isLocating}
                            className="mt-1 px-4 py-1.5 bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium rounded-full transition cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Pull Location</span>
                          </button>
                        </div>
                      ) : simulationResults.length > 0 ? (
                        simulationResults.map((res, i) => (
                          <div key={i} className="p-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl flex items-center justify-between gap-4 hover:border-[#C48B3F] transition-all">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h5 className="text-xs font-bold text-[#1C1B18] truncate">{res.ngo?.name || 'NGO Partner'}</h5>
                                <span className="text-[10px] bg-[#C48B3F]/15 text-[#C48B3F] font-bold px-2.5 py-0.5 rounded-full">
                                  {res.distance} km away
                                </span>
                              </div>
                              <p className="text-xs text-[#666157] truncate font-medium">Need: {res.need?.quantity || 1}x {res.need?.item || 'Items'}</p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="text-sm font-bold text-[#C48B3F]">{res.score}%</span>
                                <p className="text-[9px] text-[#666157] uppercase font-mono">Fit Score</p>
                              </div>
                              <button
                                className="rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium text-xs py-1.5 px-4 shadow-xs transition-colors cursor-pointer"
                                onClick={() => navigate('/auth')}
                              >
                                Pledge
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl text-center space-y-1.5">
                          <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto" />
                          <h5 className="text-xs font-serif font-bold text-[#1C1B18]">No Demands Available in This Area</h5>
                          <p className="text-[11px] text-[#666157]">
                            No registered NGO demands found matching &ldquo;{matchCategory}&rdquo; near {matchLocation}.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-[#666157] pt-3 border-t border-[#DCD4C8] text-center font-mono">
                      Deterministic Multi-factor Score = Category (30%) + Distance (20%) + Urgency (15%) + Trust (10%) + Freshness (10%)
                    </div>
                  </motion.div>
                )}

                {/* 2. ECO-IMPACT ESTIMATOR WIDGET */}
                {sandboxTab === 'impact' && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center pb-4 border-b border-[#DCD4C8]">
                        <h4 className="font-serif font-bold text-[#1C1B18] text-sm flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-[#C48B3F]" /> Eco-Impact Estimator
                        </h4>
                        <span className="text-[11px] bg-[#F3F0EA] text-[#C48B3F] px-3 py-0.5 rounded-full border border-[#DCD4C8] font-mono">100% Direct Aid</span>
                      </div>

                      <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4 items-center">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#666157]">Item Category</label>
                            <select
                              value={impactCategory}
                              onChange={(e) => setImpactCategory(e.target.value)}
                              className="w-full p-3 bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl text-xs font-medium text-[#1C1B18] outline-none"
                            >
                              <option value="Food">Staple Rations</option>
                              <option value="Books">Textbooks &amp; Learning Tools</option>
                              <option value="Clothing">Warm Clothes &amp; Bedding</option>
                              <option value="Medical">Medical Disposables</option>
                            </select>
                          </div>
                          <div className="text-right">
                            <label className="text-xs font-semibold text-[#666157] block">Quantity</label>
                            <p className="text-2xl font-bold text-[#C48B3F] tracking-tight">{impactQuantity} <span className="text-xs text-[#666157] font-normal">Units</span></p>
                          </div>
                        </div>

                        <div className="bg-[#F3F0EA] p-4 rounded-2xl border border-[#DCD4C8]">
                          <input
                            type="range"
                            min="5"
                            max="500"
                            step="5"
                            value={impactQuantity}
                            onChange={(e) => setImpactQuantity(e.target.value)}
                            className="w-full h-2 bg-[#DCD4C8] rounded-full appearance-none cursor-pointer accent-[#C48B3F]"
                          />
                          <div className="flex justify-between text-[10px] text-[#666157] font-mono uppercase mt-2">
                            <span>5 min</span>
                            <span>500 max</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 my-4">
                      <div className="p-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl text-center">
                        <p className="text-[10px] text-[#666157] uppercase font-mono mb-1">Reach</p>
                        <p className="text-xl font-bold text-[#1C1B18] tracking-tight">{impactMetrics.beneficiaries}</p>
                        <p className="text-[11px] text-[#C48B3F] font-medium mt-0.5">{impactMetrics.beneficiaryLabel}</p>
                      </div>

                      <div className="p-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl text-center">
                        <p className="text-[10px] text-[#666157] uppercase font-mono mb-1">CO2 Offset</p>
                        <p className="text-xl font-bold text-[#1C1B18] tracking-tight">{impactMetrics.co2} <span className="text-xs text-[#666157]">kg</span></p>
                        <p className="text-[11px] text-[#666157] font-medium mt-0.5">Emissions Avoided</p>
                      </div>

                      <div className="p-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl text-center">
                        <p className="text-[10px] text-[#666157] uppercase font-mono mb-1">Turnaround</p>
                        <p className="text-base font-bold text-[#C48B3F] tracking-tight mt-0.5">&lt; 3 hrs</p>
                        <p className="text-[11px] text-[#666157] font-medium mt-0.5">Local Match</p>
                      </div>
                    </div>

                    <div className="text-[10px] text-[#666157] pt-3 border-t border-[#DCD4C8] text-center font-mono">
                      Impact metrics computed from local radial courier dispatches. Zero sorting depots reduces packaging waste.
                    </div>
                  </motion.div>
                )}

                {/* 3. LOGISTICS PATHWAY TRACKER WIDGET */}
                {sandboxTab === 'tracker' && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center pb-4 border-b border-[#DCD4C8]">
                        <h4 className="font-serif font-bold text-[#1C1B18] text-sm flex items-center gap-2">
                          <Truck className="w-4 h-4 text-[#C48B3F]" /> Fulfillment Lifecycle Tracker  (Future Plans)
                        </h4>
                        <span className="text-[11px] bg-[#F3F0EA] text-[#C48B3F] px-3 py-0.5 rounded-full border border-[#DCD4C8] font-mono">Audit Ledger</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mt-4">
                        {TRACKER_STAGES.map((st, i) => (
                          <button
                            key={i}
                            onClick={() => setTrackerStep(i)}
                            className={`p-3 rounded-xl text-center border transition-all duration-200 flex flex-col items-center gap-1.5 cursor-pointer ${trackerStep === i
                                ? 'bg-[#1C1B18] border-[#1C1B18] text-white shadow-xs'
                                : 'bg-[#F3F0EA] border-[#DCD4C8] text-[#666157] hover:bg-[#EAE4DC]'
                              }`}
                          >
                            <p className="text-[11px] font-medium truncate w-full">{st.title.split(' ')[1] || st.title}</p>
                            <span className={`inline-block w-2 h-2 rounded-full ${st.status === 'COMPLETED' ? 'bg-[#C48B3F]' :
                                st.status === 'ACTIVE' ? 'bg-amber-400 animate-pulse' : 'bg-[#DCD4C8]'
                              }`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl text-left my-4 space-y-3 grow flex flex-col justify-center">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-[#666157] uppercase tracking-wider bg-[#EAE4DC] px-2.5 py-0.5 rounded-full">STAGE ({trackerStep + 1}/4)</span>
                        <span className="text-xs font-semibold text-[#666157]">{TRACKER_STAGES[trackerStep].time}</span>
                      </div>
                      <h4 className="font-serif font-bold text-base text-[#1C1B18]">{TRACKER_STAGES[trackerStep].title}</h4>
                      <div className="bg-[#EAE4DC] p-4 rounded-xl border border-[#DCD4C8]">
                        <p className="text-xs font-mono text-[#1C1B18] leading-relaxed">
                          {TRACKER_STAGES[trackerStep].log}
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-[#666157] pt-3 border-t border-[#DCD4C8] flex justify-between items-center font-mono">
                      <span>Secure Audit Ledger Signature</span>
                      <span className="text-[#C48B3F] bg-[#F3F0EA] px-2.5 py-0.5 rounded-full font-bold border border-[#DCD4C8]">ECDSA-SHA256 SECURED</span>
                    </div>
                  </motion.div>
                )}

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Editorial Storytelling Transition (Dark Canvas) */}
      <section className="py-24 bg-[#0F0E0C] text-[#F3F0EA] relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <span className="text-xs font-mono tracking-widest text-[#C48B3F] uppercase font-bold">Our Core Narrative</span>
            <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-white font-normal leading-tight max-w-4xl mx-auto">
              "We believe zero usable resources should go to landfill while a neighboring family goes without."
            </h2>
            <p className="text-base sm:text-xl text-stone-400 max-w-2xl mx-auto leading-relaxed font-light">
              DonateBridge was designed to eliminate cash handling overhead, ensure every NGO filing is legally verified, and track physical cargo with complete transparency.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Projects and Campaigns Section */}
      <section className="py-20 bg-[#F3F0EA] border-b border-[#DCD4C8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2 text-left">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EAE4DC] text-[#C48B3F] text-xs font-mono uppercase tracking-wider font-bold">
                <Building className="w-3.5 h-3.5" /> Featured Campaigns
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1B18]">
                Active Non-Profit Drives
              </h2>
              <p className="text-sm text-[#666157] max-w-xl">
                Vetted NGO projects requiring specific physical items. Directly pledge items to fulfill their campaign targets.
              </p>
            </div>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 rounded-full border border-[#1C1B18] text-[#1C1B18] hover:bg-[#EAE4DC] px-6 py-2.5 text-xs font-medium transition-all self-start sm:self-auto"
            >
              Browse all needs <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {needs.filter(n => (n.status === 'ACTIVE' || !n.status) && (n.quantity - (n.fulfilledQuantity || 0)) > 0).length > 0 ? needs.filter(n => (n.status === 'ACTIVE' || !n.status) && (n.quantity - (n.fulfilledQuantity || 0)) > 0).slice(0, 3).map((need) => {
              const target = need.quantity || 1;
              const received = need.fulfilledQuantity || 0;
              const progress = Math.min(100, Math.round((received / target) * 100));
              const image = CATEGORY_IMAGES[need.category] || "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=600";
              return (
                <div key={need.id} className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl overflow-hidden flex flex-col justify-between shadow-xs hover:border-[#C48B3F] transition-all group">
                  <div>
                    <div className="relative h-48 w-full overflow-hidden bg-[#DCD4C8]">
                      <img
                        src={image}
                        alt={need.item}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C48B3F] text-white">
                          {need.urgency} Priority
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 text-left">
                        <p className="text-[10px] font-mono font-bold text-[#D89B48] uppercase tracking-wider mb-0.5">{need.category}</p>
                        <h4 className="text-white font-serif font-bold text-base truncate">{need.ngoName}</h4>
                      </div>
                    </div>

                    <div className="p-6 text-left space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-serif text-lg font-bold text-[#1C1B18] leading-snug line-clamp-1">
                          {need.item} Drive
                        </h3>
                        <p className="text-xs text-[#666157] line-clamp-2 leading-relaxed">
                          {need.description || `Providing ${need.item} to support local community members in need.`}
                        </p>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-[#666157]">Fulfilled Progress</span>
                          <span className="font-bold text-[#C48B3F]">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#F3F0EA] rounded-full overflow-hidden border border-[#DCD4C8]">
                          <div
                            className="h-full bg-[#C48B3F] rounded-full transition-all duration-700"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-[#666157]">
                          <span>Received: <strong className="text-[#1C1B18]">{received}</strong></span>
                          <span>Target: <strong className="text-[#1C1B18]">{target} {need.item}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <button
                      className="w-full py-3 rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium shadow-xs transition-all flex items-center justify-center gap-1.5"
                      onClick={() => navigate(`/ngo/${need.ngoId}`)}
                    >
                      Pledge Items <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-3 text-center py-12 bg-[#EAE4DC] rounded-3xl border border-[#DCD4C8] text-xs text-[#666157]">
                No active needs found at the moment.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA & Newsletter Section */}
      <section className="py-20 bg-[#F3F0EA]">
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="w-14 h-14 mx-auto bg-[#EAE4DC] border border-[#DCD4C8] rounded-full flex items-center justify-center text-[#C48B3F]">
            <Heart className="w-7 h-7" />
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#1C1B18]">
            Ready to bridge needs in your neighborhood?
          </h2>
          <p className="text-sm text-[#666157] max-w-lg mx-auto leading-relaxed">
            Create your account today. Log in as a donor to submit item dispatches, or register your NGO credentials to post supply campaign requests.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <button
              className="rounded-full bg-[#1C1B18] text-white hover:bg-[#C48B3F] px-8 py-3 text-sm font-medium transition-all shadow-md"
              onClick={() => navigate('/auth?tab=register')}
            >
              Register Account
            </button>
            <button
              className="rounded-full border border-[#1C1B18] text-[#1C1B18] hover:bg-[#EAE4DC] px-7 py-3 text-sm font-medium transition-all"
              onClick={() => navigate('/discover')}
            >
              Browse Active Demands
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}