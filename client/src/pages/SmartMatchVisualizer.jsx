import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, RefreshCw, MapPin, ArrowRight,
  TrendingUp, Award, ShieldCheck, Navigation, Package, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import LeafletMap from '../components/ui/LeafletMap';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../context/GlobalStateContext';
import { useRealDB } from '../hooks/useRealDB';
import { donationAPI, getApiError } from '../api/index';
import { useToast } from '../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function SmartMatchVisualizer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { myDonations, fetchMyDonations, claimDonation } = useRealDB();

  const isDonor = user?.role === 'donor';
  const isNgo = user?.role === 'ngo';

  // State
  const [matches, setMatches] = useState([]);
  const [selectedMatchIdx, setSelectedMatchIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [selectedDonationId, setSelectedDonationId] = useState('');
  const [error, setError] = useState('');

  // Normalize API responses into a unified match shape
  const normalizeMatches = useCallback((rawMatches, mode) => {
    if (!rawMatches || !Array.isArray(rawMatches)) return [];

    return rawMatches.map((m, idx) => {
      const sb = m.scoreBreakdown || {};
      if (mode === 'donor') {
        return {
          id: idx + 1,
          donationId: null,
          ngoId: m.ngo?.id,
          ngo: m.ngo?.name || 'NGO Partner',
          ngoAddress: m.ngo?.address || '',
          score: sb.total || 0,
          proximityScore: Math.round((sb.distanceScore || 0) / 0.20),
          urgencyScore: Math.round((sb.urgencyScore || 0) / 0.15),
          trustScore: Math.round((sb.trustScore || 0) / 0.10),
          categoryFit: Math.round((sb.categoryFit || 0) / 0.30),
          quantityScore: Math.round((sb.quantityScore || 0) / 0.15),
          freshnessScore: Math.round((sb.freshnessScore || 0) / 0.10),
          distance: sb.distance || 0,
          item: m.need?.item || m.need?.category || 'Items',
          urgency: m.need?.urgency || 'Medium',
          ngoTrustScore: m.ngo?.trustScore || 70,
        };
      } else {
        const d = m.donation || {};
        return {
          id: idx + 1,
          donationId: d.id,
          ngo: d.donorName || d.donor_name || 'Donor',
          ngoAddress: d.pickup_address || d.location?.address || '',
          score: sb.total || 0,
          proximityScore: Math.round((sb.distanceScore || 0) / 0.20),
          urgencyScore: Math.round((sb.urgencyScore || 0) / 0.15),
          trustScore: Math.round((sb.trustScore || 0) / 0.10),
          categoryFit: Math.round((sb.categoryFit || 0) / 0.30),
          quantityScore: Math.round((sb.quantityScore || 0) / 0.15),
          freshnessScore: Math.round((sb.freshnessScore || 0) / 0.10),
          distance: sb.distance || 0,
          item: d.title || d.itemName || m.need?.item || 'Items',
          urgency: m.need?.urgency || 'Medium',
          category: d.category || m.need?.category || '',
          quantity: d.quantity || 0,
          donorPickupLat: d.pickup_lat || d.location?.lat || 0,
          donorPickupLng: d.pickup_lng || d.location?.lng || 0,
        };
      }
    });
  }, []);

  // Fetch matches from API
  const fetchMatches = useCallback(async (donationId = null) => {
    setIsLoading(true);
    setError('');
    try {
      let rawMatches;
      if (isDonor && donationId) {
        const res = await donationAPI.getSmartMatchesForDonation(donationId);
        rawMatches = normalizeMatches(res.data || [], 'donor');
      } else if (isNgo) {
        const res = await donationAPI.getNgoSmartMatches();
        rawMatches = normalizeMatches(res.data || [], 'ngo');
      } else {
        rawMatches = [];
      }
      setMatches(rawMatches);
      setSelectedMatchIdx(0);
    } catch (err) {
      console.error('[SmartMatch] Fetch failed:', err);
      setError(getApiError(err));
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [isDonor, isNgo, normalizeMatches]);

  useEffect(() => {
    if (isDonor && myDonations.length > 0) {
      const verified = myDonations.filter(d => d.status === 'VERIFIED' || d.status === 'PENDING');
      if (verified.length > 0 && !selectedDonationId) {
        setSelectedDonationId(verified[0].id);
      }
    }
  }, [isDonor, myDonations, selectedDonationId]);

  useEffect(() => {
    if (isDonor && selectedDonationId) {
      fetchMatches(selectedDonationId);
    } else if (isNgo) {
      fetchMatches();
    } else if (!isDonor && !isNgo) {
      setIsLoading(false);
      setError('Smart Match is available for Donor and NGO roles.');
    }
  }, [isDonor, isNgo, selectedDonationId, fetchMatches]);

  const handleReoptimize = async () => {
    setIsOptimizing(true);
    await fetchMatches(isDonor ? selectedDonationId : null);
    setIsOptimizing(false);
    toast.success('Match rankings recalculated.');
  };

  const handleClaimDonation = async (donationId) => {
    if (!donationId) return;
    setIsClaiming(true);
    try {
      await claimDonation(donationId);
      toast.success('Donation claimed successfully! Check your NGO console for details.');
      await fetchMatches();
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsClaiming(false);
    }
  };

  const currentMatch = matches[selectedMatchIdx] || null;
  const donorVerifiedDonations = isDonor ? myDonations.filter(d => d.status === 'VERIFIED' || d.status === 'PENDING') : [];

  const hasCoords = currentMatch && currentMatch.donorPickupLat && currentMatch.donorPickupLng;
  const mapCenter = hasCoords
    ? [currentMatch.donorPickupLat, currentMatch.donorPickupLng]
    : [20.5937, 78.9629];

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 pt-20 text-left">
        
        {/* Left Side: Rankings */}
        <aside className="w-full lg:w-120 bg-[#EAE4DC] border-r border-[#DCD4C8] flex flex-col min-h-0 overflow-y-auto p-6 space-y-5 shrink-0 shadow-xs">
          
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-[#DCD4C8]">
            <div>
              <h3 className="font-serif font-bold text-[#1C1B18] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C48B3F]" />
                {isDonor ? 'NGO Match Rankings' : 'Donation Matches'}
              </h3>
              <p className="text-xs text-[#666157] mt-1 font-medium">
                {isDonor
                  ? 'Best NGO partners for your donation based on proximity, need urgency & trust.'
                  : 'Available donations matching your registered needs, ranked by compatibility.'
                }
              </p>
            </div>
            <button
              onClick={handleReoptimize}
              disabled={isOptimizing || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#F3F0EA] hover:bg-[#DCD4C8] border border-[#DCD4C8] rounded-full text-xs font-mono font-bold text-[#1C1B18] transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
              Recalculate
            </button>
          </div>

          {/* Donor: Donation Selector */}
          {isDonor && (
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider block">Select Your Donation</label>
              {donorVerifiedDonations.length > 0 ? (
                <select
                  value={selectedDonationId}
                  onChange={(e) => setSelectedDonationId(e.target.value)}
                  className="w-full bg-[#F3F0EA] border border-[#DCD4C8] p-3 rounded-2xl text-[#1C1B18] font-bold text-xs focus:outline-none focus:border-[#C48B3F] shadow-xs"
                >
                  {donorVerifiedDonations.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.id} — {d.itemName || d.title} ({d.quantity}x {d.category})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="bg-amber-100 border border-amber-300 rounded-2xl p-4 text-amber-900 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  No verified donations found. Submit a donation first.
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-[#666157] space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#C48B3F]" />
              <p className="font-mono text-xs font-bold">Computing match rankings...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="bg-rose-100 border border-rose-300 rounded-2xl p-6 text-rose-900 text-xs font-medium flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-rose-700" />
              <div>
                <p className="font-serif font-bold">Unable to load matches</p>
                <p className="mt-1 text-rose-800">{error}</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && matches.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-5">
              <div className="w-16 h-16 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl flex items-center justify-center text-[#C48B3F] shadow-xs">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#1C1B18] text-lg">No Matches Found</h4>
                <p className="text-[#666157] max-w-xs mx-auto mt-2 text-xs">
                  {isDonor
                    ? 'No NGOs currently match your donation criteria. Try again later as NGOs post new needs.'
                    : 'No donations currently match your registered needs. Check back as donors submit new listings.'
                  }
                </p>
              </div>
              <button
                onClick={() => navigate(isDonor ? '/donor' : '/ngo')}
                className="px-6 py-2.5 bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium text-xs rounded-full transition-colors cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          )}

          {/* Match Cards */}
          {!isLoading && !error && matches.length > 0 && (
            <div className="space-y-4">
              <AnimatePresence>
                {matches.map((match, idx) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedMatchIdx(idx)}
                    className={`border rounded-3xl p-5 transition-all duration-200 cursor-pointer bg-[#F3F0EA] relative overflow-hidden group ${
                      selectedMatchIdx === idx
                        ? 'border-[#C48B3F] shadow-md'
                        : 'border-[#DCD4C8] hover:border-[#C48B3F]'
                    }`}
                  >
                    {selectedMatchIdx === idx && (
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C48B3F]" />
                    )}
                    
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 min-w-0">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C48B3F] bg-[#EAE4DC] px-2.5 py-0.5 rounded-full border border-[#DCD4C8] inline-block">
                          Rank #{idx + 1}
                        </span>
                        <h4 className="font-serif font-bold text-sm text-[#1C1B18] truncate">{isNgo ? match.item : match.ngo}</h4>
                        <p className="text-xs text-[#666157] flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#C48B3F]" />
                          {match.distance > 0 ? `${match.distance} km away` : 'Distance N/A'}
                          {match.urgency && <> &bull; <span className={`font-bold ${match.urgency === 'High' ? 'text-rose-700' : match.urgency === 'Medium' ? 'text-amber-700' : 'text-[#666157]'}`}>{match.urgency}</span></>}
                        </p>
                        {isNgo && (
                          <p className="text-xs text-[#666157] font-medium">{match.quantity}x {match.category}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-2xl font-bold font-serif text-[#C48B3F] block">{match.score}%</span>
                        <span className="text-[9px] text-[#666157] block -mt-1 font-mono font-bold uppercase tracking-wide">Score</span>
                      </div>
                    </div>

                    {/* Score Breakdown Bars */}
                    <div className="space-y-2 mt-4 pt-3 border-t border-[#DCD4C8]">
                      {[
                        { label: 'Category Fit (30%)', value: match.categoryFit, color: 'bg-[#1C1B18]' },
                        { label: 'Proximity (20%)', value: match.proximityScore, color: 'bg-[#C48B3F]' },
                        { label: 'Urgency (15%)', value: match.urgencyScore, color: 'bg-rose-800' },
                        { label: 'Quantity (15%)', value: match.quantityScore, color: 'bg-amber-700' },
                        { label: 'Trust Score (10%)', value: match.trustScore, color: 'bg-stone-700' },
                        { label: 'Freshness (10%)', value: match.freshnessScore, color: 'bg-[#666157]' },
                      ].map(bar => (
                        <div key={bar.label}>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[#666157] font-medium">{bar.label}</span>
                            <span className="font-mono font-bold text-[#1C1B18]">{bar.value}/100</span>
                          </div>
                          <div className="w-full bg-[#EAE4DC] h-1.5 rounded-full overflow-hidden mt-0.5 border border-[#DCD4C8]">
                            <div className={`${bar.color} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, bar.value)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-end pt-3 mt-3 border-t border-[#DCD4C8]">
                      {isNgo ? (
                        <button
                          disabled={isClaiming}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClaimDonation(match.donationId);
                          }}
                          className="flex items-center gap-2 px-5 py-2 bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium text-xs rounded-full transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                          Claim Donation
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/request-wizard?category=${encodeURIComponent(match.item)}`);
                          }}
                          className="flex items-center gap-2 px-5 py-2 bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium text-xs rounded-full transition-colors cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" /> Select Match Route
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </aside>

        {/* Right Side Map */}
        <main className="grow flex-1 relative min-h-87.5 lg:min-h-0 bg-[#F3F0EA]">
          <LeafletMap
            center={mapCenter}
            zoom={hasCoords ? 13 : 5}
            markers={
              hasCoords
                ? [
                    {
                      lat: currentMatch.donorPickupLat,
                      lng: currentMatch.donorPickupLng,
                      popupContent: <div><b>{isDonor ? 'Your Pickup Point' : 'Donation Pickup'}</b><p className="text-xs text-slate-400">{currentMatch.ngoAddress || 'Location'}</p></div>,
                    },
                  ]
                : []
            }
            circles={
              hasCoords
                ? [{
                    lat: currentMatch.donorPickupLat,
                    lng: currentMatch.donorPickupLng,
                    radius: 2000,
                    color: '#C48B3F',
                  }]
                : []
            }
            className="w-full h-full"
          />

          {/* Floating Detail Overlay */}
          {currentMatch && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-6 left-6 right-6 bg-[#EAE4DC]/95 backdrop-blur-md border border-[#DCD4C8] p-5 rounded-3xl text-[#1C1B18] max-w-md space-y-3.5 z-10 text-xs shadow-xl"
            >
              <div className="flex justify-between items-center font-serif font-bold">
                <span className="flex items-center gap-1.5 text-[#C48B3F]">
                  <Navigation className="w-4 h-4 text-[#C48B3F] animate-pulse" /> Computed Route
                </span>
                <span className="font-mono text-[#1C1B18] bg-[#F3F0EA] px-2.5 py-1 rounded-full text-xs border border-[#DCD4C8]">
                  {currentMatch.distance > 0 ? `${currentMatch.distance} km` : 'N/A'}
                </span>
              </div>
              <p className="text-xs text-[#666157] leading-relaxed">
                {isDonor ? (
                  <>
                    Best match: <strong className="text-[#1C1B18]">{currentMatch.ngo}</strong> needs <strong className="text-[#1C1B18]">{currentMatch.item}</strong> with{' '}
                    <strong className="text-[#C48B3F]">{currentMatch.score}%</strong> compatibility score.
                  </>
                ) : (
                  <>
                    Donation: <strong className="text-[#1C1B18]">{currentMatch.item}</strong> from{' '}
                    <strong className="text-[#1C1B18]">{currentMatch.ngo}</strong> with{' '}
                    <strong className="text-[#C48B3F]">{currentMatch.score}%</strong> compatibility score.
                  </>
                )}
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs text-center pt-2 border-t border-[#DCD4C8] font-mono">
                <div>
                  <span className="text-[#666157] block uppercase text-[9px] font-bold tracking-wider">Distance</span>
                  <span className="font-bold text-[#1C1B18]">{currentMatch.distance > 0 ? `${currentMatch.distance} km` : '--'}</span>
                </div>
                <div>
                  <span className="text-[#666157] block uppercase text-[9px] font-bold tracking-wider">Urgency</span>
                  <span className={`font-bold ${currentMatch.urgency === 'High' ? 'text-rose-700' : currentMatch.urgency === 'Medium' ? 'text-amber-700' : 'text-[#666157]'}`}>
                    {currentMatch.urgency}
                  </span>
                </div>
                <div>
                  <span className="text-[#666157] block uppercase text-[9px] font-bold tracking-wider">Match Score</span>
                  <span className="font-bold text-[#C48B3F]">{currentMatch.score}%</span>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
