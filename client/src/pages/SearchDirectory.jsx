import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRealDB } from '../hooks/useRealDB';
import { getDistanceInKm, calculateMatchScore } from '../utils/geo';
import { fetchOSRMRoute } from '../utils/routing';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import DiscoverMap from '../components/discover/DiscoverMap';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/GlobalStateContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Heart, X, Check, RotateCcw,
  Sparkles, Building, Truck, Info, Award, Users, Filter, Navigation,
  Package, Compass, LayoutGrid, Map as MapIcon, Columns, ArrowUpDown,
  Car, Footprints, Bike, SlidersHorizontal, ChevronRight, ShieldCheck
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const CATEGORIES = ['All', 'Books', 'Clothes', 'Food', 'Furniture', 'Electronics', 'Medical Equipment', 'School Supplies', 'Blankets', 'Sports Equipment'];

export default function SearchDirectory() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const initialQuery = new URLSearchParams(search).get('query') || '';

  const { ngos, needs, donations, claimDonation, fetchDonations, fetchNgos, loadingDonations, loadingNgos } = useRealDB();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const currentNgo = user?.role === 'ngo' ? ngos.find(n => n.email === user?.email) || ngos[0] : null;

  // Filter state
  const [searchType, setSearchType] = useState(user?.role === 'ngo' ? 'donations' : 'ngos'); // 'donations' | 'ngos'
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [distanceRange, setDistanceRange] = useState(25);
  const [minTrustScore, setMinTrustScore] = useState(50);
  const [sortBy, setSortBy] = useState('distance'); // 'distance' | 'match' | 'date' | 'qty'

  // View Layout state: 'split' | 'grid' | 'map'
  const [viewMode, setViewMode] = useState('split');

  // Selection & Route State
  const [selectedItem, setSelectedItem] = useState(null);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [travelMode, setTravelMode] = useState('driving'); // 'driving' | 'walking' | 'bicycling'
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  // Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimLogistics, setClaimLogistics] = useState('courier');
  const [claimUseCase, setClaimUseCase] = useState('');

  // Saved Wishlist
  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem('db_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  // User Coords State - No predefined location
  const [userCoords, setUserCoords] = useState(null);
  const [userAddress, setUserAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handlePullLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      setShowManualInput(true);
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords([lat, lng]);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.suburb || data.address?.state_district || 'Detected Location';
          setUserAddress(city);
          toast.success(`Location detected: ${city}`);
        } catch {
          setUserAddress(`${lat.toFixed(3)}, ${lng.toFixed(3)}`);
          toast.success('Coordinates pulled successfully.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        toast.error('Could not detect location. Please enter city manually.');
        setShowManualInput(true);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleManualLocationSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!manualCity.trim()) return;
    setIsLocating(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualCity.trim())}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setUserCoords([lat, lng]);
        setUserAddress(data[0].display_name.split(',')[0]);
        toast.success(`Location set to ${data[0].display_name.split(',')[0]}`);
        setShowManualInput(false);
      } else {
        toast.error(`Could not find "${manualCity}". Try another city name.`);
      }
    } catch {
      toast.error('Geocoding search failed. Please try again.');
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('db_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Server-side filter trigger with 400ms debounce (no duplicate request spam)
  useEffect(() => {
    if (!userCoords) return;

    const timer = setTimeout(() => {
      const params = {};
      if (query) params.query = query;
      if (selectedCategory !== 'All') params.category = selectedCategory;
      params.lat = userCoords[0];
      params.lng = userCoords[1];
      params.distance = distanceRange;

      if (searchType === 'donations') {
        fetchDonations(params);
      } else {
        if (minTrustScore > 0) params.trust_score = minTrustScore;
        fetchNgos(params);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, selectedCategory, distanceRange, minTrustScore, searchType, userCoords]);

  // Dynamic Route calculation when selected item changes
  useEffect(() => {
    if (!selectedItem || !userCoords) {
      setRouteData(null);
      return;
    }

    const destLat = selectedItem.location ? selectedItem.location.lat : selectedItem.lat;
    const destLng = selectedItem.location ? selectedItem.location.lng : selectedItem.lng;

    if (!destLat || !destLng) {
      setRouteData(null);
      return;
    }

    let isMounted = true;
    setIsRouteLoading(true);

    fetchOSRMRoute(userCoords, [destLat, destLng], travelMode)
      .then(res => {
        if (isMounted) {
          setRouteData(res);
          setIsRouteLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsRouteLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedItem, userCoords, travelMode]);

  const normalizeCategory = (cat) => {
    if (!cat) return '';
    const c = cat.toLowerCase().trim();
    if (c === 'clothes' || c === 'clothing') return 'clothes';
    if (c === 'medical' || c === 'medical equipment') return 'medical equipment';
    return c;
  };

  const getSmartMatchDetails = (donation) => {
    if (!currentNgo) return null;
    const matchingNeed = needs.find(n => n.ngoId === currentNgo.id && normalizeCategory(n.category) === normalizeCategory(donation.category));
    if (!matchingNeed) return null;
    return calculateMatchScore(donation, { ...matchingNeed, lat: currentNgo.lat, lng: currentNgo.lng });
  };

  // Filter and sort items list
  const displayItems = useMemo(() => {
    if (!userCoords) {
      return [];
    }

    let raw = searchType === 'donations' ? donations : ngos;

    if (searchType === 'donations') {
      raw = raw.filter(item => item.status === 'VERIFIED' || item.status === 'PENDING');
    }

    // Immediate Category Filter
    if (selectedCategory !== 'All') {
      const targetNorm = normalizeCategory(selectedCategory);
      raw = raw.filter(item => {
        const itemNorm = normalizeCategory(item.category || item.ngoType || '');
        return itemNorm.includes(targetNorm) || targetNorm.includes(itemNorm);
      });
    }

    // Immediate Search Query Filter
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      raw = raw.filter(item => {
        const titleMatch = (item.title || item.name || '').toLowerCase().includes(q);
        const catMatch = (item.category || item.ngoType || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const addrMatch = (item.pickup_address || item.address || item.city || '').toLowerCase().includes(q);
        return titleMatch || catMatch || descMatch || addrMatch;
      });
    }

    let list = raw.map(item => {
      const lat = item.location ? item.location.lat : item.lat;
      const lng = item.location ? item.location.lng : item.lng;
      const dist = (lat && lng) ? getDistanceInKm(userCoords[0], userCoords[1], lat, lng) : 999;
      const match = searchType === 'donations' ? getSmartMatchDetails(item) : null;
      return {
        ...item,
        _dist: dist,
        _matchScore: match ? match.score : 0
      };
    });

    list = list.filter(item => item._dist <= distanceRange + 15);

    if (sortBy === 'distance') {
      list.sort((a, b) => a._dist - b._dist);
    } else if (sortBy === 'match') {
      list.sort((a, b) => b._matchScore - a._matchScore);
    } else if (sortBy === 'qty') {
      list.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
    } else if (sortBy === 'date') {
      list.sort((a, b) => new Date(b.createdAt || b.submittedAt || 0) - new Date(a.createdAt || a.submittedAt || 0));
    }

    return list;
  }, [searchType, donations, ngos, userCoords, distanceRange, sortBy, currentNgo, needs, selectedCategory, query]);

  const toggleWishlist = (id, e) => {
    if (e) e.stopPropagation();
    if (wishlist.includes(id)) {
      setWishlist(prev => prev.filter(i => i !== id));
      toast.success('Removed from saved.');
    } else {
      setWishlist(prev => [...prev, id]);
      toast.success('Saved!');
    }
  };

  const handleOpenClaimModal = (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setClaimSuccess(false);
    setClaimUseCase('');
    setClaimLogistics('courier');
    setIsClaimModalOpen(true);
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || user?.role !== 'ngo') {
      toast.error('Only registered NGOs can claim donations.');
      return;
    }
    setIsClaiming(true);
    try {
      await claimDonation(selectedItem.id);
      setIsClaiming(false);
      setClaimSuccess(true);
      toast.success(`Claim submitted for ${selectedItem.title || selectedItem.category}!`);
      setWishlist(prev => prev.filter(id => id !== selectedItem.id));
    } catch (err) {
      setIsClaiming(false);
      toast.error('Failed to submit claim.');
    }
  };

  const resetFilters = () => {
    setQuery('');
    setSelectedCategory('All');
    setDistanceRange(25);
    setMinTrustScore(50);
    setSortBy('distance');
  };

  const activeFiltersCount = (selectedCategory !== 'All' ? 1 : 0) +
    (distanceRange !== 25 ? 1 : 0) +
    (query ? 1 : 0) +
    (searchType === 'ngos' && minTrustScore !== 50 ? 1 : 0);

  const isLoading = searchType === 'donations' ? loadingDonations : loadingNgos;

  // Build Leaflet map data
  const mapCenter = selectedItem
    ? [selectedItem.location ? selectedItem.location.lat : selectedItem.lat, selectedItem.location ? selectedItem.location.lng : selectedItem.lng]
    : (userCoords || [20.5937, 78.9629]);

  const mapMarkers = [
    ...(userCoords ? [{ lat: userCoords[0], lng: userCoords[1], popupContent: '<strong style="color:#4A7C59">Your Location</strong>' }] : []),
    ...displayItems.map(item => {
      const lat = item.location ? item.location.lat : item.lat;
      const lng = item.location ? item.location.lng : item.lng;
      const title = item.title || item.name || item.category || 'Location';
      return {
        lat,
        lng,
        popupContent: `<strong>${title}</strong><br/><span style="font-size:11px;color:#64748B">${item._dist ? item._dist.toFixed(1) + ' km away' : ''}</span>`
      };
    }).filter(m => m.lat && m.lng)
  ];

  const mapPolylines = (routeData && routeData.coordinates) ? [{
    positions: routeData.coordinates,
    color: '#4A7C59',
    weight: 4,
    dashArray: routeData.isFallback ? '5, 5' : null
  }] : (hoveredItemId && userCoords) ? (() => {
    const item = displayItems.find(i => i.id === hoveredItemId);
    const lat = item?.location ? item.location.lat : item?.lat;
    const lng = item?.location ? item.location.lng : item?.lng;
    return lat && lng ? [{ positions: [userCoords, [lat, lng]], color: '#4A7C59', weight: 2, dashArray: '5, 5' }] : [];
  })() : [];

  const mapCircles = userCoords ? [{ lat: userCoords[0], lng: userCoords[1], radius: distanceRange * 1000, color: '#4A7C59', fillOpacity: 0.05, weight: 1.5 }] : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans text-[#1C1B18]">
      <Navbar />

      {/* Main Page Header */}
      <div className="bg-[#EAE4DC] border-b border-[#DCD4C8] pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-left">
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#F3F0EA] text-[#C48B3F] border border-[#DCD4C8] text-xs font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Resource Directory &amp; Radar
              </span>
              <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#1C1B18] tracking-tight mt-2">
                Discover Local Dispatches &amp; NGO Partners
              </h1>
              <p className="text-sm text-[#666157] mt-1">
                Explore physical supply dispatches, verify regional NGOs, and view interactive route mapping.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-[#F3F0EA] p-1.5 rounded-full border border-[#DCD4C8] shrink-0">
              <button
                onClick={() => { setSearchType('donations'); setSelectedItem(null); setRouteData(null); }}
                className={`py-2 px-5 text-xs font-medium rounded-full transition-all cursor-pointer flex items-center gap-2 ${
                  searchType === 'donations' ? 'bg-[#1C1B18] text-white shadow-xs' : 'text-[#666157] hover:text-[#1C1B18]'
                }`}
              >
                <Search className={`w-3.5 h-3.5 ${searchType === 'donations' ? 'text-[#C48B3F]' : ''}`} /> Scan Donations
              </button>
              <button
                onClick={() => { setSearchType('ngos'); setSelectedItem(null); setRouteData(null); }}
                className={`py-2 px-5 text-xs font-medium rounded-full transition-all cursor-pointer flex items-center gap-2 ${
                  searchType === 'ngos' ? 'bg-[#1C1B18] text-white shadow-xs' : 'text-[#666157] hover:text-[#1C1B18]'
                }`}
              >
                <Building className={`w-3.5 h-3.5 ${searchType === 'ngos' ? 'text-[#C48B3F]' : ''}`} /> Partner NGOs
              </button>
            </div>
          </div>

          {/* Integrated Filter Bar */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
            
            {/* Dynamic Location Puller Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-stone-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#4A7C59] shrink-0" />
                <span className="text-xs font-semibold text-stone-800">
                  {userCoords ? (
                    <>Current Area: <span className="text-[#4A7C59] font-bold">{userAddress || `${userCoords[0].toFixed(3)}, ${userCoords[1].toFixed(3)}`}</span></>
                  ) : (
                    <span className="text-amber-700 font-bold">Location Not Set (Pull location to discover nearby items)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handlePullLocation}
                  disabled={isLocating}
                  className="px-3 py-1.5 bg-[#1C1B18] hover:bg-[#4A7C59] text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Navigation className={`w-3.5 h-3.5 text-[#C48B3F] ${isLocating ? 'animate-spin' : ''}`} />
                  {isLocating ? 'Detecting...' : (userCoords ? 'Re-pull GPS' : 'Pull Location')}
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  {showManualInput ? 'Close Search' : 'Search City'}
                </button>
              </div>
            </div>

            {showManualInput && (
              <form onSubmit={handleManualLocationSubmit} className="flex gap-2 p-2 bg-white rounded-lg border border-stone-200">
                <input
                  type="text"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="Enter city or area (e.g. Pune, Mumbai, Delhi)..."
                  className="flex-1 bg-stone-50 border border-stone-300 rounded-md px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#4A7C59]"
                />
                <button
                  type="submit"
                  disabled={isLocating || !manualCity.trim()}
                  className="px-4 py-1.5 bg-[#4A7C59] hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Locate
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search Bar */}
              <div className="relative md:col-span-5 lg:col-span-6">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchType === 'donations' ? "Search items (e.g. Blankets, Books, Food)..." : "Search NGO names..."}
                  className="w-full pl-10 pr-8 h-10 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59]"
                />
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Distance Slider */}
              <div className="flex items-center gap-3 bg-white border border-stone-300 rounded-lg px-3.5 h-10 md:col-span-4 lg:col-span-3">
                <Navigation className="w-3.5 h-3.5 text-[#4A7C59] shrink-0" />
                <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider shrink-0">Radius</span>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={distanceRange}
                  onChange={(e) => setDistanceRange(Number(e.target.value))}
                  className="w-full accent-[#4A7C59] cursor-pointer"
                />
                <span className="font-mono font-bold text-xs text-stone-800 shrink-0">{distanceRange} km</span>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-white border border-stone-300 rounded-lg px-3 h-10 md:col-span-3 lg:col-span-3">
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs font-semibold text-stone-800 cursor-pointer py-0!"
                >
                  <option value="distance">Sort: Distance</option>
                  <option value="match">Sort: Match Score</option>
                  <option value="qty">Sort: Quantity</option>
                  <option value="date">Sort: Recent</option>
                </select>
              </div>
            </div>

            {/* Category Pills & View Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200">
              
              {/* Category Carousel */}
              {searchType === 'donations' ? (
                <div className="flex overflow-x-auto gap-2 hide-scrollbar py-0.5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer border ${
                        selectedCategory === cat
                          ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-white border border-stone-200 px-3 py-1.5 rounded-lg text-xs">
                  <Award className="w-3.5 h-3.5 text-[#4A7C59]" />
                  <span className="font-semibold text-stone-600">Min Trust Score:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={minTrustScore}
                    onChange={(e) => setMinTrustScore(Number(e.target.value))}
                    className="w-24 accent-[#4A7C59] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-stone-900">{minTrustScore}%</span>
                </div>
              )}

              {/* View Layout Controls & Reset */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-stone-500 hover:text-stone-800 font-medium flex items-center gap-1 mr-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}

                <div className="flex bg-white p-1 rounded-lg border border-stone-300">
                  <button
                    title="Split View"
                    onClick={() => setViewMode('split')}
                    className={`p-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'split' ? 'bg-accent text-[#4A7C59]' : 'text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    <Columns className="w-4 h-4" />
                  </button>
                  <button
                    title="Grid Focus"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'grid' ? 'bg-accent text-[#4A7C59]' : 'text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    title="Map Focus"
                    onClick={() => setViewMode('map')}
                    className={`p-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'map' ? 'bg-accent text-[#4A7C59]' : 'text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    <MapIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Item Cards List Column */}
          <div className={`${
            viewMode === 'map' ? 'hidden' : viewMode === 'grid' ? 'lg:col-span-12' : 'lg:col-span-6 xl:col-span-7'
          } space-y-4`}>

            {/* List Info Bar */}
            <div className="flex items-center justify-between text-xs font-medium text-stone-500 px-1">
              <span>Showing {displayItems.length} {searchType === 'donations' ? 'Dispatches' : 'NGO Partners'}</span>
              {selectedItem && (
                <button
                  onClick={() => { setSelectedItem(null); setRouteData(null); }}
                  className="text-[#4A7C59] font-bold hover:underline cursor-pointer"
                >
                  Clear Selected Map Route
                </button>
              )}
            </div>

            {/* Route Stats Drawer if an item is selected */}
            {selectedItem && (
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#4A7C59]" />
                    <span className="text-xs font-bold text-stone-900">
                      Active Navigation to: {selectedItem.title || selectedItem.name || selectedItem.category}
                    </span>
                  </div>

                  {/* Travel Mode Toggle */}
                  <div className="flex bg-white p-1 rounded-md border border-[#4A7C59]/20 text-xs font-semibold">
                    <button
                      onClick={() => setTravelMode('driving')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${travelMode === 'driving' ? 'bg-[#4A7C59] text-white' : 'text-stone-600'}`}
                    >
                      Drive
                    </button>
                    <button
                      onClick={() => setTravelMode('walking')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${travelMode === 'walking' ? 'bg-[#4A7C59] text-white' : 'text-stone-600'}`}
                    >
                      Walk
                    </button>
                    <button
                      onClick={() => setTravelMode('bicycling')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${travelMode === 'bicycling' ? 'bg-[#4A7C59] text-white' : 'text-stone-600'}`}
                    >
                      Cycle
                    </button>
                  </div>
                </div>

                {isRouteLoading ? (
                  <div className="text-xs text-[#4A7C59] font-semibold">Calculating route path...</div>
                ) : routeData ? (
                  <div className="grid grid-cols-3 gap-3 text-xs bg-white p-2.5 rounded-lg border border-[#4A7C59]/20 text-stone-800">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Distance</span>
                      <span className="font-bold text-stone-900">{routeData.distanceKm} km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Est. Time</span>
                      <span className="font-bold text-[#4A7C59]">{routeData.durationMins} mins</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Routing</span>
                      <span className="font-bold text-stone-700">{routeData.isFallback ? 'Direct Path' : 'Road Route'}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Loading Skeletons */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="bg-white rounded-xl p-5 border border-stone-200 animate-pulse space-y-3">
                    <div className="h-4 bg-stone-200 rounded w-1/3" />
                    <div className="h-5 bg-stone-200 rounded w-2/3" />
                    <div className="h-4 bg-stone-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : displayItems.length > 0 ? (
              <div className={`grid grid-cols-1 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                {displayItems.map(item => {
                  const title = item.title || item.name || item.category || 'Dispatched Item';
                  const category = item.category || 'General';
                  const quantity = item.quantity || 1;
                  const distanceKm = item._dist ? item._dist.toFixed(1) : null;
                  const address = item.location?.address || item.address || 'Address listed';
                  const trustScore = item.trustScore || item.trust_score || 85;
                  const isSelected = selectedItem?.id === item.id;
                  const isHovered = hoveredItemId === item.id;
                  const isSaved = wishlist.includes(item.id);
                  const smartMatch = searchType === 'donations' ? getSmartMatchDetails(item) : null;

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredItemId(item.id)}
                      onMouseLeave={() => setHoveredItemId(null)}
                      onClick={() => setSelectedItem(item)}
                      className={`bg-white border rounded-xl p-5 text-left flex flex-col justify-between space-y-4 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#4A7C59] ring-2 ring-[#4A7C59]/20 shadow-md bg-[#F8FCFA]'
                          : isHovered
                          ? 'border-stone-400 shadow-sm'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="space-y-3">
                        
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A7C59] block">
                              {searchType === 'ngos' ? 'Verified NGO Partner' : `${quantity} Units Available`}
                            </span>
                            <h3 className="font-bold text-base text-stone-900 truncate mt-0.5">
                              {title}
                            </h3>
                          </div>

                          <button
                            onClick={(e) => toggleWishlist(item.id, e)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                              isSaved ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-stone-50 border-stone-200 text-stone-400 hover:text-stone-600'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                          </button>
                        </div>

                        {/* Smart Match score if present */}
                        {smartMatch && (
                          <div className="bg-accent text-[#4A7C59] px-2.5 py-1 rounded-md text-xs font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Smart Match</span>
                            <span className="font-bold">{smartMatch.score}% Score</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5 text-xs font-medium">
                          {category && (
                            <span className="bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-md border border-stone-200">
                              {category}
                            </span>
                          )}
                          {distanceKm && (
                            <span className="bg-emerald-50 text-emerald-800 font-mono font-bold px-2.5 py-0.5 rounded-md border border-emerald-200">
                              {distanceKm} km away
                            </span>
                          )}
                          {searchType === 'ngos' && (
                            <span className="bg-amber-50 text-amber-800 font-mono font-bold px-2.5 py-0.5 rounded-md border border-amber-200">
                              {trustScore}% Trust
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-stone-500 flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{address}</span>
                        </p>
                      </div>

                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected ? 'bg-[#4A7C59] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {isSelected ? 'Selected on Map' : 'View on Map'}
                        </button>

                        {searchType === 'donations' && user?.role === 'ngo' && (
                          <Button
                            size="sm"
                            className="bg-[#4A7C59] hover:bg-primary-hover text-white text-xs font-bold py-1.5 px-3 rounded-lg"
                            onClick={(e) => handleOpenClaimModal(item, e)}
                          >
                            Claim Item
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !userCoords ? (
              /* Location Not Set State */
              <div className="bg-white border-2 border-dashed border-[#DCD4C8] rounded-2xl p-10 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#4A7C59] flex items-center justify-center mx-auto">
                  <MapPin className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-stone-900 text-lg">Location Not Set</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    No predefined location is set. Pull your GPS location or search your city to discover nearby verified donations and NGO partners.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Button
                    onClick={handlePullLocation}
                    disabled={isLocating}
                    className="bg-[#1C1B18] hover:bg-[#4A7C59] text-white text-xs font-semibold py-2.5 px-5 rounded-full flex items-center gap-2 cursor-pointer"
                  >
                    <Navigation className={`w-4 h-4 text-[#C48B3F] ${isLocating ? 'animate-spin' : ''}`} />
                    {isLocating ? 'Detecting Location...' : 'Pull My Current Location'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="px-4 py-2.5 rounded-full border border-stone-300 hover:border-stone-500 text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
                  >
                    {showManualInput ? 'Close Manual Search' : 'Enter City Manually'}
                  </button>
                </div>
              </div>
            ) : (
              /* Empty State when location is pulled but nothing nearby */
              <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-3">
                <Search className="w-8 h-8 text-stone-400 mx-auto" />
                <h4 className="font-bold text-stone-800 text-base">No active demands in this area</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  No verified {searchType === 'donations' ? 'donations' : 'NGO partners'} were found within {distanceRange} km of {userAddress || 'your location'}. Try increasing the search radius or selecting "All" categories.
                </p>
                <Button onClick={resetFilters} variant="secondary" className="text-xs font-bold py-2 px-4">
                  Reset Filters
                </Button>
              </div>
            )}
          </div>

          {/* Sticky Discover Map Column */}
          <div className={`${
            viewMode === 'grid' ? 'hidden' : viewMode === 'map' ? 'lg:col-span-12 h-175' : 'lg:col-span-6 xl:col-span-5 h-145 lg:sticky lg:top-24'
          }`}>
            <DiscoverMap
              userCoords={userCoords}
              onUserCoordsChange={setUserCoords}
              items={displayItems}
              searchType={searchType}
              selectedItem={selectedItem}
              hoveredItemId={hoveredItemId}
              onSelectItem={(item) => setSelectedItem(item)}
              routeData={routeData}
              radiusKm={distanceRange}
              className="h-full w-full rounded-xl border border-stone-300 shadow-sm"
            />
          </div>
        </div>

        {/* NGO Claim Modal */}
        <AnimatePresence>
          {isClaimModalOpen && selectedItem && (
            <div className="fixed inset-0 z-600 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-stone-200 space-y-4 text-left"
              >
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <h3 className="font-bold text-base text-stone-900">
                    Claim {selectedItem.title || selectedItem.category}
                  </h3>
                  <button onClick={() => setIsClaimModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {claimSuccess ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-12 h-12 bg-accent text-[#4A7C59] rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-stone-900 text-sm">Claim Request Submitted!</h4>
                    <p className="text-xs text-stone-500">
                      The donor has been notified. Check your NGO console for handover paperwork.
                    </p>
                    <Button
                      onClick={() => { setIsClaimModalOpen(false); navigate('/ngo-console'); }}
                      className="bg-[#4A7C59] hover:bg-primary-hover text-white font-bold text-xs py-2 px-4 rounded-lg w-full"
                    >
                      Go to NGO Console
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleClaimSubmit} className="space-y-3">
                    <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs space-y-1">
                      <p className="font-semibold text-stone-800">Donor Location: {selectedItem.location?.address || selectedItem.address}</p>
                      <p className="text-stone-500">Quantity: {selectedItem.quantity || 1} units</p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">Fulfillment Logistics</label>
                      <select
                        value={claimLogistics}
                        onChange={(e) => setClaimLogistics(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#4A7C59]"
                      >
                        <option value="courier">DonateBridge Direct Courier Pickup</option>
                        <option value="self">Self Pickup (NGO Volunteer Fleet)</option>
                        <option value="dropoff">Donor Dropoff at Partner Hub</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">Deployment Note</label>
                      <textarea
                        required
                        rows="3"
                        value={claimUseCase}
                        onChange={(e) => setClaimUseCase(e.target.value)}
                        placeholder="State how these items will be distributed..."
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#4A7C59]"
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsClaimModalOpen(false)}
                        className="flex-1 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        Cancel
                      </button>
                      <Button
                        type="submit"
                        disabled={isClaiming}
                        className="flex-1 bg-[#4A7C59] hover:bg-primary-hover text-white text-xs font-bold py-2 rounded-lg"
                      >
                        {isClaiming ? 'Submitting...' : 'Confirm Claim'}
                      </Button>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
