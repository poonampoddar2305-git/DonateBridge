import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/GlobalStateContext';
import { useRealDB } from '../hooks/useRealDB';
import { authAPI, donationAPI, getApiError } from '../api/index';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import DonationCard from '../components/ui/DonationCard';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import LeafletMap from '../components/ui/LeafletMap';
import AiMatchAssistant from '../components/ui/AiMatchAssistant';
import { useToast } from '../components/ui/Toast';
import { 
  MapPin, Box, Calendar, Heart, Download, Upload, Trash2, Award, 
  History, TrendingUp, Sparkles, Filter, Check, Eye, Leaf, AlertCircle, 
  ArrowRight, Navigation, XCircle, Plus, RefreshCw, Layers, ShieldCheck, CheckCircle2, ChevronRight, FileText
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['Clothing', 'Food', 'Books', 'Furniture', 'Electronics', 'Medical', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

const formatAadhaarInput = (val, prev = '') => {
  const isDeleting = prev.length > val.length;
  let raw = val;
  if (isDeleting && prev.endsWith('-') && val === prev.slice(0, -1)) {
    raw = val.slice(0, -1);
  }
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  const chunks = [];
  for (let i = 0; i < digits.length; i += 4) {
    chunks.push(digits.slice(i, i + 4));
  }
  let formatted = chunks.join('-');
  if (!isDeleting && (digits.length === 4 || digits.length === 8) && digits.length < 12) {
    formatted += '-';
  }
  return formatted;
};

export default function DonorDashboard() {
  const { user, refreshUserData } = useAuth();
  const { myDonations, addDonation, fetchMyDonations, needs, ngos } = useRealDB();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'submit' | 'history' | 'impact'
  const [isRetracting, setIsRetracting] = useState(null);

  // Donor Verification Modal & Resubmit State
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [resubmitAadhaar, setResubmitAadhaar] = useState(user?.aadhaarNumber ? formatAadhaarInput(user.aadhaarNumber) : '');
  const [resubmitPan, setResubmitPan] = useState(user?.panNumber || '');
  const [resubmitAadhaarDoc, setResubmitAadhaarDoc] = useState(user?.aadhaarDoc || '');
  const [resubmitPanDoc, setResubmitPanDoc] = useState(user?.panDoc || '');
  const [uploadingAadhaar, setUploadingAadhaar] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  useEffect(() => {
    if (refreshUserData) {
      refreshUserData();
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (user.aadhaarNumber) setResubmitAadhaar(formatAadhaarInput(user.aadhaarNumber));
      if (user.panNumber) setResubmitPan(user.panNumber);
      if (user.aadhaarDoc) setResubmitAadhaarDoc(user.aadhaarDoc);
      if (user.panDoc) setResubmitPanDoc(user.panDoc);
    }
  }, [user]);

  // Form state
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Clothing');
  const [condition, setCondition] = useState('Good');
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [addressSearch, setAddressSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [location, setLocation] = useState({ lat: null, lng: null, address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  // Filters for ledger
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Certificate target ref
  const certificateRef = useRef(null);
  const [activeReceiptDonation, setActiveReceiptDonation] = useState(null);

  const donorDonations = myDonations || [];

  // Metrics calculation
  const totalDonated = donorDonations.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalDelivered = donorDonations.filter(d => d.status === 'DELIVERED').reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const estimatedPeopleHelped = totalDelivered * 3;
  const carbonSavedKg = totalDelivered * 4.5;

  const urgentNeeds = (needs || [])
    .filter(n => {
      const remaining = n.quantity - (n.fulfilledQuantity || 0);
      return (n.urgency === 'High' || n.urgency === 'Medium') && remaining > 0;
    })
    .slice(0, 5)
    .map(n => {
      const ngo = (ngos || []).find(o => String(o.id) === String(n.ngoId));
      const remaining = n.quantity - (n.fulfilledQuantity || 0);
      return {
        id: n.id,
        ngo: ngo?.name || n.ngoName || 'NGO Partner',
        item: n.item || n.category,
        qty: remaining,
        totalQty: n.quantity,
        fulfilledQty: n.fulfilledQuantity || 0,
        urgency: n.urgency,
        category: n.category,
      };
    });

  // Pull geolocation on mount if granted, but no predefined fallback
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            setLocation({ lat, lng, address: addr });
            setAddressSearch(addr);
          } catch {
            setLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
          }
        },
        () => {
          // No predefined fallback
        }
      );
    }
  }, []);

  const handlePullCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setLocation({ lat, lng, address: addr });
          setAddressSearch(addr);
          toast.success('Live location pulled successfully.');
        } catch {
          setLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
          toast.success('Location coordinates pulled.');
        }
      },
      () => {
        toast.error('Unable to access location. Please search address or pick on map.');
      }
    );
  };

  const handleAddressSearch = async () => {
    if (!addressSearch) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(addressSearch)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      console.error("Nominatim search failed", e);
    }
  };

  const selectAddress = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const addr = item.display_name;
    setLocation({ lat, lng, address: addr });
    setAddressSearch(addr);
    setSearchResults([]);
  };

  const handleMapClick = async (latlng) => {
    const { lat, lng } = latlng;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setLocation({ lat, lng, address: addr });
      setAddressSearch(addr);
    } catch {
      setLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const res = await authAPI.uploadFile(file);
        setPhotos(prev => [...prev, res.data.url]);
        toast.success('Photo uploaded successfully.');
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
        toast.info('Using local photo preview.');
      }
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const [targetNgoId, setTargetNgoId] = useState(null);

  const handleSubmitDonation = async (e) => {
    e.preventDefault();
    if (!location.lat || !location.lng || location.lat === 0) {
      toast.error('Please pick a pickup location on the map.');
      return;
    }
    setIsSubmitting(true);
    try {
      const newDnt = await addDonation({
        itemName,
        category,
        condition,
        quantity: parseInt(quantity) || 1,
        description,
        photos,
        location,
        preferredPickupTime: 'Flexible',
        matched_ngo_id: targetNgoId || undefined,
      });
      setItemName('');
      setDescription('');
      setPhotos([]);
      setQuantity(1);
      setTargetNgoId(null);
      setSubmissionSuccess(newDnt);
      await fetchMyDonations();
      toast.success('Donation listing created successfully!');
    } catch (err) {
      toast.error(err.response?.data ? JSON.stringify(err.response.data) : getApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadReceipt = () => {
    if (!certificateRef.current) return;
    toPng(certificateRef.current, { cacheBust: true })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `DonateBridge-Receipt-${activeReceiptDonation.id}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Download receipt failed', err);
      });
  };

  const fulfillDemand = (demand) => {
    setItemName(demand.item);
    setCategory(CATEGORIES.includes(demand.category) ? demand.category : 'Clothing');
    setQuantity(demand.qty);
    setDescription(`Direct demand fulfillment for ${demand.ngo}.`);
    setTargetNgoId(demand.ngoId || demand.ngo_id || demand.ngo);
    setActiveTab('submit');
    toast.info(`Auto-filled submit form for ${demand.ngo}'s request (${demand.qty}x needed).`);
  };

  const handlePreFillFromAi = (aiData) => {
    if (aiData.itemName) setItemName(aiData.itemName);
    if (aiData.category) setCategory(CATEGORIES.includes(aiData.category) ? aiData.category : 'Clothing');
    if (aiData.quantity) setQuantity(aiData.quantity);
    if (aiData.description) setDescription(aiData.description);
    if (aiData.targetNgoId) setTargetNgoId(aiData.targetNgoId);
    setActiveTab('submit');
    toast.info('Pre-filled donation submission form from AI Assistant match!');
  };

  const retractDonation = async (donationId) => {
    if (!window.confirm('Are you sure you want to retract this donation?')) return;
    setIsRetracting(donationId);
    try {
      await donationAPI.update(donationId, { status: 'REJECTED' });
      toast.success('Donation retracted.');
      await fetchMyDonations();
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsRetracting(null);
    }
  };

  const handleUploadAadhaar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAadhaar(true);
    try {
      const res = await authAPI.uploadFile(file);
      setResubmitAadhaarDoc(res.data.url);
      toast.success('Aadhaar document uploaded successfully.');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setUploadingAadhaar(false);
    }
  };

  const handleUploadPan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPan(true);
    try {
      const res = await authAPI.uploadFile(file);
      setResubmitPanDoc(res.data.url);
      toast.success('PAN document uploaded successfully.');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setUploadingPan(false);
    }
  };

  const handleResubmitVerification = async (e) => {
    e.preventDefault();
    const cleanAadhaar = resubmitAadhaar.replace(/\D/g, '');
    const cleanPan = resubmitPan.trim().toUpperCase();

    if (cleanAadhaar && cleanAadhaar.length !== 12) {
      toast.error('Aadhaar number must be exactly 12 digits (format: 1234-5678-9012).');
      return;
    }
    if (cleanPan && !/^[A-Z0-9]{10}$/.test(cleanPan)) {
      toast.error('PAN card must be a 10-character alphanumeric code (e.g. ABCDE1234F).');
      return;
    }

    setIsResubmitting(true);
    try {
      await authAPI.resubmitVerification({
        aadhaar_number: cleanAadhaar || null,
        pan_number: cleanPan || null,
        aadhaar_doc: resubmitAadhaarDoc || null,
        pan_doc: resubmitPanDoc || null,
      });
      toast.success('Verification documents resubmitted successfully. Administrator will review shortly.');
      setShowVerificationModal(false);
      if (refreshUserData) {
        await refreshUserData();
      }
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsResubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] text-[#1C1B18] font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 pt-24 space-y-8">
        
        {/* Modern Top Workspace Header */}
        <div className="bg-[#EAE4DC] rounded-3xl p-6 sm:p-8 border border-[#DCD4C8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img 
              src={user?.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('/media')) 
                ? user.avatar 
                : 'https://api.dicebear.com/7.x/adventurer/svg?seed=donor&backgroundColor=e8f3ec'
              } 
              className="w-16 h-16 rounded-full border-2 border-[#C48B3F] object-cover shadow-xs shrink-0"
              alt="Avatar"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-serif font-bold text-[#1C1B18] tracking-tight">
                  Welcome, {user?.name || user?.username || 'Generous Donor'}
                </h1>
                {/* Dynamic Verification Status Badge */}
                {user?.verificationStatus === 'pending' && (
                  <span className="px-3 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-700" />
                    Verification Pending
                  </span>
                )}
                {user?.verificationStatus === 'changes_requested' && (
                  <span className="px-3 py-0.5 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-900 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-indigo-700" />
                    Changes Requested
                  </span>
                )}
                {user?.verificationStatus === 'rejected' && (
                  <span className="px-3 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-900 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-3 h-3 text-rose-700" />
                    Verification Rejected
                  </span>
                )}
                {(user?.verificationStatus === 'approved' || !user?.verificationStatus) && (
                  <span className="px-3 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    Verified Donor
                  </span>
                )}
              </div>
              <p className="text-[#666157] text-sm font-medium mt-1">
                {user?.email} &bull; Managing surplus item donations for social cause
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchMyDonations()}
              className="px-4 py-2.5 bg-[#F3F0EA] hover:bg-[#DCD4C8] border border-[#DCD4C8] text-[#1C1B18] font-medium text-xs rounded-full transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-[#666157]" /> Refresh Data
            </button>
            <button
              onClick={() => { setActiveTab('submit'); setSubmissionSuccess(null); }}
              className="px-6 py-2.5 bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium text-xs rounded-full transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Donation
            </button>
          </div>
        </div>

        {/* Identity Verification Alert Banners */}
        {user?.verificationStatus === 'pending' && (
          <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-bold text-amber-950">Identity & Tax Verification In Progress</h3>
                <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                  Your Aadhaar UID and PAN card documents have been submitted to the administration team for compliance audit. You can continue listing donations while your documents are being reviewed.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowVerificationModal(true)}
              className="px-4 py-2 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-full transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              Review / Update Docs
            </button>
          </div>
        )}

        {user?.verificationStatus === 'changes_requested' && (
          <div className="bg-indigo-50 border border-indigo-300 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 border border-indigo-300 text-indigo-800 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-bold text-indigo-950">Action Needed: Administrator Requested Changes</h3>
                <p className="text-xs text-indigo-900 mt-0.5 leading-relaxed">
                  {user?.rejectionReason ? (
                    <><strong>Admin Remarks:</strong> &ldquo;{user.rejectionReason}&rdquo; &mdash; Please adjust your Aadhaar or PAN details and re-upload required documents.</>
                  ) : (
                    "The administrator requested updates on your Aadhaar or PAN verification documents before approving your account."
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowVerificationModal(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-full transition whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
            >
              Edit &amp; Resubmit Documents
            </button>
          </div>
        )}

        {user?.verificationStatus === 'rejected' && (
          <div className="bg-rose-50 border border-rose-300 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-300 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-bold text-rose-950">Identity Verification Not Approved</h3>
                <p className="text-xs text-rose-900 mt-0.5 leading-relaxed">
                  {user?.rejectionReason ? (
                    <><strong>Reason:</strong> &ldquo;{user.rejectionReason}&rdquo; &mdash; Please provide valid Aadhaar / PAN documents to verify your profile.</>
                  ) : (
                    "Your submitted documents could not be verified by the administrator. Please update your details and resubmit."
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowVerificationModal(true)}
              className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-full transition whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
            >
              Update &amp; Resubmit Verification
            </button>
          </div>
        )}

        {/* 4 Executive Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#EAE4DC] p-6 rounded-3xl border border-[#DCD4C8] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#666157]">Total Dispatched</span>
              <div className="w-9 h-9 rounded-full bg-[#F3F0EA] border border-[#DCD4C8] flex items-center justify-center text-[#1C1B18]">
                <Box className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-display font-black text-slate-900 tracking-tight">{totalDonated} <span className="text-sm font-normal text-slate-400">units</span></p>
            <p className="text-xs text-slate-500 font-medium">Total items submitted to platform</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivered & Claimed</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#4A7C59]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-display font-black text-[#4A7C59] tracking-tight">{totalDelivered} <span className="text-sm font-normal text-emerald-600/70">units</span></p>
            <p className="text-xs text-slate-500 font-medium">Items received by verified NGOs</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lives Benefitted</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Heart className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-display font-black text-blue-600 tracking-tight">{estimatedPeopleHelped} <span className="text-sm font-normal text-blue-400">people</span></p>
            <p className="text-xs text-slate-500 font-medium">Direct community impact score</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Carbon Offset</span>
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <Leaf className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-display font-black text-teal-600 tracking-tight">{carbonSavedKg.toFixed(1)} <span className="text-sm font-normal text-teal-400">kg CO₂</span></p>
            <p className="text-xs text-slate-500 font-medium">Landfill emissions prevented</p>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
          {[
            { id: 'overview', icon: TrendingUp, label: 'Overview' },
            { id: 'ai-assistant', icon: Sparkles, label: 'AI Match Assistant' },
            { id: 'submit', icon: Plus, label: 'Submit Donation' },
            { id: 'history', icon: History, label: 'Donation History' },
            { id: 'impact', icon: Award, label: 'Tax Certificates' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSubmissionSuccess(null); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-emerald-400' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Tab Contents */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column (7 cols): Recent Submissions */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div>
                    <h3 className="font-display font-black text-slate-900 text-lg tracking-tight">Recent Submissions</h3>
                    <p className="text-slate-500 text-xs font-medium">Your recently listed surplus items</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('submit')}
                    className="px-4 py-2 bg-emerald-50 text-[#4A7C59] hover:bg-emerald-100 font-bold text-xs rounded-xl border border-emerald-100 transition-colors cursor-pointer"
                  >
                    + Create New
                  </button>
                </div>

                {donorDonations.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                      <Box className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-display font-black text-slate-900 text-lg">No donations posted yet</h4>
                      <p className="text-slate-500 max-w-sm mx-auto mt-1 text-xs font-medium">Create an item listing so local verified NGOs can claim and arrange pickup.</p>
                    </div>
                    <Button variant="primary" onClick={() => setActiveTab('submit')} className="px-6 rounded-xl font-bold">
                      Create First Listing
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {donorDonations.slice(0, 3).map((donation) => (
                      <div key={donation.id} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:border-slate-300 transition-all">
                        <DonationCard
                          donation={donation}
                          actions={
                            <div className="flex items-center gap-2">
                              {(donation.status === 'MATCHED' || donation.status === 'DELIVERED') && (
                                <button
                                  onClick={() => navigate(`/tracking/${donation.id}`)}
                                  className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs rounded-xl border border-sky-200 transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  <Navigation className="w-3.5 h-3.5" /> Track Logistics
                                </button>
                              )}
                              {donation.status === 'DELIVERED' && (
                                <button
                                  onClick={() => {
                                    setActiveReceiptDonation(donation);
                                    setActiveTab('impact');
                                  }}
                                  className="px-4 py-2 bg-slate-900 hover:bg-[#4A7C59] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View Certificate
                                </button>
                              )}
                            </div>
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column (5 cols): Urgent NGO Demands + Carbon Progress */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Urgent Demands */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-display font-black text-slate-900 text-base tracking-tight">Urgent NGO Needs</h3>
                      <p className="text-slate-500 text-xs font-medium">Direct requests from local charities</p>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  </div>

                  <div className="space-y-3">
                    {urgentNeeds.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 font-medium text-xs border border-dashed border-slate-200 rounded-xl">
                        No urgent NGO demands registered right now.
                      </div>
                    ) : (
                      urgentNeeds.map((demand) => (
                        <div key={demand.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3 hover:border-slate-300 transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-md font-mono font-bold text-[10px] uppercase">
                                {demand.urgency} Urgency
                              </span>
                              <h4 className="font-display font-bold text-slate-900 mt-2 text-sm">{demand.item}</h4>
                              <p className="text-slate-500 text-xs font-medium mt-0.5">{demand.ngo}</p>
                            </div>
                            <span className="font-mono font-bold text-slate-900 text-sm bg-white px-2.5 py-1 rounded-lg border border-slate-200">{demand.qty}x</span>
                          </div>

                          <button
                            onClick={() => fulfillDemand(demand)}
                            className="w-full py-2 bg-white hover:bg-slate-900 text-slate-800 hover:text-white border border-slate-200 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            Fulfill Request <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sustainability Goal Card (Clean, modern light card) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4A7C59]">Sustainability Tracker</span>
                    <Leaf className="w-4 h-4 text-[#4A7C59]" />
                  </div>

                  <div>
                    <p className="text-3xl font-display font-black text-slate-900 tracking-tight">{carbonSavedKg.toFixed(1)} <span className="text-sm font-normal text-slate-400">kg</span></p>
                    <p className="text-slate-500 text-xs font-bold mt-0.5">Total Carbon Emissions Offset</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 font-medium pt-2 border-t border-slate-100">
                    <p className="flex items-center justify-between">
                      <span>Equivalent trees planted:</span>
                      <strong className="text-slate-900">{(carbonSavedKg / 22).toFixed(1)} trees</strong>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Offset driving miles:</span>
                      <strong className="text-slate-900">{(carbonSavedKg * 2.5).toFixed(1)} miles</strong>
                    </p>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#4A7C59] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (carbonSavedKg / 50) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono font-bold block text-right">Goal: 50 kg</span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB: AI MATCH ASSISTANT */}
          {activeTab === 'ai-assistant' && (
            <motion.div
              key="ai-assistant"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AiMatchAssistant onPreFillForm={handlePreFillFromAi} />
            </motion.div>
          )}

          {/* TAB 2: SUBMIT DONATION FORM */}
          {activeTab === 'submit' && (
            <motion.div
              key="submit"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-8"
            >
              {submissionSuccess ? (
                <div className="text-center py-8 space-y-6 max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#4A7C59] mx-auto">
                    <Check className="w-10 h-10 stroke-3" />
                  </div>
                  <div>
                    <h2 className="font-display font-black text-slate-900 text-2xl tracking-tight">Listing Submitted</h2>
                    <p className="text-slate-500 text-xs mt-1 font-medium">Reference ID: <strong className="text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{submissionSuccess.id}</strong></p>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2 text-xs">
                    <p className="font-bold text-slate-900 text-sm">{submissionSuccess.itemName}</p>
                    <p className="text-slate-500 font-medium">Category: <span className="text-slate-800">{submissionSuccess.category}</span> &bull; Quantity: <span className="text-slate-800">{submissionSuccess.quantity}</span></p>
                    <p className="text-slate-500 truncate font-medium flex items-center gap-1.5 mt-1"><MapPin className="w-3.5 h-3.5 text-emerald-600" /> {submissionSuccess.location.address}</p>
                  </div>

                  <p className="text-slate-500 text-xs leading-relaxed font-medium">
                    Your donation has been added to the moderation queue. Once reviewed by administrators, verified NGOs will be able to claim and pick up the items.
                  </p>

                  <div className="flex gap-3 justify-center pt-2">
                    <Button variant="secondary" onClick={() => setSubmissionSuccess(null)} className="rounded-xl font-bold">
                      Submit Another
                    </Button>
                    <Button variant="primary" onClick={() => { setActiveTab('overview'); setSubmissionSuccess(null); }} className="rounded-xl font-bold">
                      View Overview
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitDonation} className="space-y-8">
                  <div>
                    <h2 className="font-display font-black text-slate-900 text-2xl tracking-tight">Submit Donation Item</h2>
                    <p className="text-slate-500 text-xs font-medium mt-1">Provide details and pin pickup location for charity item distribution.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputField
                      label="Item Title"
                      id="item-name"
                      placeholder="e.g. 50 Winter Blankets, High School Books"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      required
                    />

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:border-emerald-500"
                      >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Condition</label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:border-emerald-500"
                      >
                        {CONDITIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                      </select>
                    </div>

                    <InputField
                      label="Quantity"
                      id="qty"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows="3"
                      className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 font-medium text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-400"
                      placeholder="Add details, size guides, packaging info, expiration date if applicable..."
                      required
                    />
                  </div>

                  {/* Photos Upload */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Upload Photos</label>
                    <div className="flex flex-wrap gap-3 items-center">
                      {photos.map((photoUrl, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                          <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {photos.length < 5 && (
                        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-500 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer bg-slate-50">
                          <Upload className="w-5 h-5" />
                          <span className="text-[10px] font-bold mt-1">Upload</span>
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Geolocation Pickup Picker */}
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Pickup Address & Geolocation</label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={addressSearch}
                        onChange={(e) => setAddressSearch(e.target.value)}
                        placeholder="Search address or city..."
                        className="flex-1 min-w-[200px] bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 font-medium text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddressSearch}
                        className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Search
                      </button>
                      <button
                        type="button"
                        onClick={handlePullCurrentLocation}
                        className="px-4 py-3 bg-[#C48B3F] hover:bg-[#a67432] text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Pull Location
                      </button>
                    </div>

                    {!location.lat && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl font-medium">
                        📍 Location not set. Click <strong>Pull Location</strong>, search your address, or click directly on the map below.
                      </p>
                    )}

                    {searchResults.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm divide-y divide-slate-100 max-h-40 overflow-y-auto text-xs">
                        {searchResults.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => selectAddress(item)}
                            className="p-3 hover:bg-slate-50 cursor-pointer font-medium text-slate-700 truncate"
                          >
                            {item.display_name}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="h-64 rounded-xl overflow-hidden border border-slate-200">
                      <LeafletMap
                        center={location.lat && location.lng ? [location.lat, location.lng] : [20.5937, 78.9629]}
                        zoom={location.lat ? 13 : 5}
                        markers={location.lat && location.lng ? [{ lat: location.lat, lng: location.lng, popupContent: '<strong>Pickup Point</strong>' }] : []}
                        onMapClick={handleMapClick}
                        className="h-full w-full"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setActiveTab('overview')} className="rounded-xl font-bold">
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" loading={isSubmitting} className="rounded-xl font-bold">
                      Publish Donation Listing
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* TAB 3: LEDGER HISTORY */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6"
            >
              <div>
                <h2 className="font-display font-black text-slate-900 text-2xl tracking-tight">Donation Audit History</h2>
                <p className="text-slate-500 text-xs font-medium mt-1">Complete history of all item submissions and fulfillment states.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl justify-between items-center text-xs font-medium">
                <div className="flex gap-3 flex-wrap">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-slate-700 shadow-sm focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-slate-700 shadow-sm focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="PENDING">PENDING</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="MATCHED">MATCHED</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div className="font-mono text-slate-500 font-bold bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  Total records: {donorDonations.length}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden border border-slate-200/80 rounded-xl shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="p-4">Reference Tag</th>
                        <th className="p-4">Item Title</th>
                        <th className="p-4">Category</th>
                        <th className="p-4 text-center">Qty</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {donorDonations
                        .filter(d => categoryFilter === 'All' || d.category === categoryFilter)
                        .filter(d => statusFilter === 'All' || d.status === statusFilter)
                        .map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-4 font-mono font-bold text-[#4A7C59]">{log.id}</td>
                            <td className="p-4 font-bold text-slate-900">{log.itemName || `${log.quantity}x ${log.category}`}</td>
                            <td className="p-4 text-slate-500 font-medium">{log.category}</td>
                            <td className="p-4 text-center font-mono font-bold text-slate-800">{log.quantity}</td>
                            <td className="p-4">
                              <span className={`inline-flex px-3 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider border ${
                                log.status === 'DELIVERED' ? 'bg-emerald-50 text-[#4A7C59] border-emerald-200' :
                                log.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                log.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-sky-50 text-sky-700 border-sky-200'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {(log.status === 'MATCHED' || log.status === 'DELIVERED') && (
                                  <button
                                    onClick={() => navigate(`/tracking/${log.id}`)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                                  >
                                    <Navigation className="w-3 h-3" /> Track
                                  </button>
                                )}
                                {log.status === 'PENDING' && (
                                  <button
                                    onClick={() => retractDonation(log.id)}
                                    disabled={isRetracting === log.id}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <XCircle className="w-3 h-3" /> Retract
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: TAX EXEMPTION CERTIFICATES */}
          {activeTab === 'impact' && (
            <motion.div
              key="impact"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6"
            >
              <div>
                <h2 className="font-display font-black text-slate-900 text-2xl tracking-tight">80G Tax Exemption Certificates</h2>
                <p className="text-slate-500 text-xs font-medium mt-1">Download official impact certificates for delivered items.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Delivered List */}
                <div className="lg:col-span-5 space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Delivered Items</label>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-105 overflow-y-auto bg-white shadow-sm">
                    {donorDonations.filter(d => d.status === 'DELIVERED').length === 0 ? (
                      <div className="p-8 text-slate-400 text-center font-medium text-xs flex flex-col items-center justify-center gap-2">
                        <Box className="w-6 h-6 opacity-40" />
                        <p>No completed/delivered donations yet.</p>
                      </div>
                    ) : (
                      donorDonations.filter(d => d.status === 'DELIVERED').map(item => (
                        <div
                          key={item.id}
                          onClick={() => setActiveReceiptDonation(item)}
                          className={`p-4 cursor-pointer transition-all flex justify-between items-center ${
                            activeReceiptDonation?.id === item.id ? 'bg-emerald-50/60 border-l-4 border-l-[#4A7C59]' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <p className={`font-mono text-xs font-bold ${activeReceiptDonation?.id === item.id ? 'text-[#4A7C59]' : 'text-slate-500'}`}>{item.id}</p>
                            <p className="font-bold text-slate-900 text-xs mt-0.5">{item.itemName}</p>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            View
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Certificate Document Preview */}
                <div className="lg:col-span-7 flex flex-col items-center justify-center border border-slate-200/80 rounded-2xl p-6 bg-slate-50/60 min-h-105">
                  {activeReceiptDonation ? (
                    <div className="w-full flex flex-col items-center space-y-6">
                      
                      {/* Document Card */}
                      <div
                        ref={certificateRef}
                        className="w-full max-w-md bg-white p-8 border border-slate-200 rounded-2xl flex flex-col items-center text-center space-y-6 shadow-md relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-full h-2 bg-[#4A7C59]" />
                        
                        <div>
                          <span className="font-mono uppercase tracking-widest text-slate-400 block font-bold text-[10px]">DONATEBRIDGE IMPACT NETWORK</span>
                          <h3 className="font-display font-black text-slate-900 text-xl mt-1 tracking-tight">80G Impact Certificate</h3>
                        </div>

                        <div className="border-t border-b border-dashed border-slate-200 py-6 w-full space-y-2 bg-slate-50/50 px-5 rounded-xl text-xs">
                          <span className="font-mono text-[#4A7C59] uppercase block font-bold text-[10px] tracking-wider">DONOR RECIPIENT</span>
                          <p className="font-display font-black text-slate-900 text-lg">{activeReceiptDonation.donorName || user?.name || user?.username || 'Generous Donor'}</p>
                          <p className="text-slate-600 font-medium leading-relaxed mt-2">
                            Successfully delivered <strong className="text-slate-900">{activeReceiptDonation.quantity}x {activeReceiptDonation.category}</strong> to an approved NGO partner.
                          </p>
                          <p className="text-slate-400 font-mono text-[10px] mt-2">Verification ID: <span className="text-slate-700 font-bold">{activeReceiptDonation.id}</span></p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full text-left font-mono bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs">
                          <div>
                            <span className="text-slate-400 block text-[9px] font-bold uppercase">ESTIMATED IMPACT</span>
                            <span className="font-black text-slate-800 text-sm mt-0.5 block">{activeReceiptDonation.quantity * 3} lives</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[9px] font-bold uppercase">CARBON SAVED</span>
                            <span className="font-black text-[#4A7C59] text-sm mt-0.5 block">{activeReceiptDonation.quantity * 4.5} kg CO₂</span>
                          </div>
                        </div>

                        <div>
                          <span className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[#4A7C59] font-bold text-[10px] uppercase tracking-wider">
                            OFFICIAL VERIFIED CERTIFICATE
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={downloadReceipt}
                        className="px-6 py-3 bg-slate-900 hover:bg-[#4A7C59] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all"
                      >
                        <Download className="w-4 h-4" /> Download Certificate PNG
                      </button>
                    </div>
                  ) : (
                    <div className="text-center p-8 space-y-3">
                      <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-sm">
                        <Award className="w-8 h-8" />
                      </div>
                      <h4 className="font-display font-black text-slate-900 text-base">Certificate Previewer</h4>
                      <p className="text-slate-500 max-w-xs mx-auto font-medium text-xs">Select a delivered donation item from the left list to generate its 80G tax certificate preview.</p>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ─── DONOR VERIFICATION RESUBMISSION MODAL ─── */}
        {showVerificationModal && (
          <div className="fixed inset-0 z-50 bg-[#1C1B18]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#EAE4DC] rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#DCD4C8] text-left p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-[#DCD4C8] pb-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#1C1B18] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#C48B3F]" />
                    Identity &amp; Tax Documents
                  </h2>
                  <p className="text-xs text-[#666157] mt-0.5">
                    Update Aadhaar and PAN documents for administrator compliance review
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(false)}
                  className="p-2 rounded-full text-[#666157] hover:text-[#1C1B18] hover:bg-[#F3F0EA] transition cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {user?.rejectionReason && (
                <div className="p-4 bg-amber-100 border border-amber-300 rounded-2xl text-xs text-amber-950">
                  <span className="font-bold block mb-1">Feedback / Remarks from Administrator:</span>
                  <p>{user.rejectionReason}</p>
                </div>
              )}

              <form onSubmit={handleResubmitVerification} className="space-y-5">
                {/* Aadhaar UID & Document */}
                <div className="p-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono font-bold uppercase text-[#1C1B18] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#C48B3F]" /> Aadhaar Card
                    </label>
                    <span className="text-[10px] text-[#666157]">12-Digit UID</span>
                  </div>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="1234-5678-9012"
                    value={resubmitAadhaar}
                    onChange={(e) => setResubmitAadhaar(formatAadhaarInput(e.target.value, resubmitAadhaar))}
                    className="w-full bg-white border border-[#DCD4C8] rounded-xl px-3 py-2 text-xs font-mono text-[#1C1B18] outline-none focus:border-[#C48B3F] tracking-wider"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <label className="cursor-pointer text-xs font-medium text-[#C48B3F] hover:underline flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingAadhaar ? 'Uploading document...' : 'Upload Aadhaar File (PDF/JPG)'}</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                        onChange={handleUploadAadhaar}
                        className="hidden"
                        disabled={uploadingAadhaar}
                      />
                    </label>
                    {uploadingAadhaar && <RefreshCw className="w-3.5 h-3.5 text-[#C48B3F] animate-spin" />}
                  </div>
                  {resubmitAadhaarDoc && (
                    <div className="flex items-center justify-between text-xs bg-white border border-emerald-300 text-emerald-800 p-2.5 rounded-xl">
                      <span className="truncate">✓ Aadhaar Attachment Uploaded</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={resubmitAadhaarDoc}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-900 font-bold underline"
                        >
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => setResubmitAadhaarDoc('')}
                          className="text-stone-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* PAN Number & Document */}
                <div className="p-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono font-bold uppercase text-[#1C1B18] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#C48B3F]" /> PAN Card
                    </label>
                    <span className="text-[10px] text-[#666157]">10-Character Alphanumeric</span>
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={resubmitPan}
                    onChange={(e) => setResubmitPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                    className="w-full bg-white border border-[#DCD4C8] rounded-xl px-3 py-2 text-xs font-mono text-[#1C1B18] outline-none focus:border-[#C48B3F] uppercase tracking-wider"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <label className="cursor-pointer text-xs font-medium text-[#C48B3F] hover:underline flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingPan ? 'Uploading document...' : 'Upload PAN File (PDF/JPG)'}</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                        onChange={handleUploadPan}
                        className="hidden"
                        disabled={uploadingPan}
                      />
                    </label>
                    {uploadingPan && <RefreshCw className="w-3.5 h-3.5 text-[#C48B3F] animate-spin" />}
                  </div>
                  {resubmitPanDoc && (
                    <div className="flex items-center justify-between text-xs bg-white border border-emerald-300 text-emerald-800 p-2.5 rounded-xl">
                      <span className="truncate">✓ PAN Document Attached</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={resubmitPanDoc}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-900 font-bold underline"
                        >
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => setResubmitPanDoc('')}
                          className="text-stone-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowVerificationModal(false)}
                    className="px-5 py-2.5 rounded-full border border-[#DCD4C8] hover:bg-[#DCD4C8] text-xs font-medium text-[#1C1B18] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResubmitting}
                    className="px-6 py-2.5 rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium shadow-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    {isResubmitting ? 'Submitting...' : 'Resubmit for Verification'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
