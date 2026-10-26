import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { useToast } from '../components/ui/Toast';
import { moderationAPI, getApiError } from '../api/index';
import {
  ShieldCheck, AlertTriangle, CheckCircle, XCircle, FileText,
  Eye, Download, RefreshCw, ArrowRight, ExternalLink, Search,
  Check, X, Building, MapPin, Phone, Globe, Clock, Award, User,
  FileCheck
} from 'lucide-react';

const STATUS_BADGES = {
  pending: { label: 'PENDING AUDIT', bg: 'bg-amber-100 text-amber-900 border-amber-300', icon: Clock },
  approved: { label: 'VERIFIED & APPROVED', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: CheckCircle },
  rejected: { label: 'REJECTED', bg: 'bg-rose-100 text-rose-900 border-rose-300', icon: XCircle },
  changes_requested: { label: 'CHANGES REQUESTED', bg: 'bg-indigo-100 text-indigo-900 border-indigo-300', icon: AlertTriangle },
};

const DOC_TYPE_LABELS = {
  govRegCert: 'Govt Registration Certificate',
  panCard: 'PAN Card / Tax Document',
  trustRegCert: 'Trust / NGO Registration Cert',
  addressProof: 'Office Address Proof',
  idProof: 'Identity Proof',
  verificationLetter: 'Official Verification Letter',
  logo: 'Organization Logo'
};

export default function AdminConsole() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Top-level module view: 'donors' or 'ngos'
  const [mainView, setMainView] = useState('donors');

  // NGO Queue State
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'changes_requested', 'approved', 'rejected', 'all'
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // NGO Audit Modal State
  const [selectedNgo, setSelectedNgo] = useState(null);
  const [selectedDocPreview, setSelectedDocPreview] = useState(null);
  const [auditAction, setAuditAction] = useState(null); // 'approve', 'reject', 'request_changes'
  const [auditReason, setAuditReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Donor Queue State
  const [donorTab, setDonorTab] = useState('pending'); // 'pending', 'changes_requested', 'approved', 'rejected', 'all'
  const [donors, setDonors] = useState([]);
  const [donorLoading, setDonorLoading] = useState(true);
  const [donorSearchTerm, setDonorSearchTerm] = useState('');

  // Donor Audit Modal State
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [selectedDonorDocPreview, setSelectedDonorDocPreview] = useState(null);
  const [donorAuditAction, setDonorAuditAction] = useState(null);
  const [donorAuditReason, setDonorAuditReason] = useState('');
  const [isDonorSubmitting, setIsDonorSubmitting] = useState(false);

  const fetchNGOQueue = async (statusFilter = activeTab) => {
    setLoading(true);
    try {
      const res = await moderationAPI.getPendingNGOs(statusFilter);
      setNgos(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchDonorQueue = async (statusFilter = donorTab) => {
    setDonorLoading(true);
    try {
      const res = await moderationAPI.getPendingDonors(statusFilter);
      setDonors(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setDonorLoading(false);
    }
  };

  useEffect(() => {
    if (mainView === 'donors') {
      fetchDonorQueue(donorTab);
    } else {
      fetchNGOQueue(activeTab);
    }
  }, [mainView, donorTab, activeTab]);

  const handleOpenAuditModal = (ngo) => {
    setSelectedNgo(ngo);
    setAuditAction(null);
    setAuditReason('');
    setSelectedDocPreview(null);
  };

  const handleOpenDonorAuditModal = (donor) => {
    setSelectedDonor(donor);
    setDonorAuditAction(null);
    setDonorAuditReason(donor.rejection_reason || '');
    setSelectedDonorDocPreview(null);
  };

  const handleAuditSubmit = async (action) => {
    if ((action === 'reject' || action === 'request_changes') && !auditReason.trim()) {
      toast.error(`A specific reason is required to ${action === 'reject' ? 'reject' : 'request changes for'} an NGO application.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await moderationAPI.auditNGO(selectedNgo.id, action, auditReason.trim());
      const actionLabels = {
        approve: 'NGO Application Approved Successfully',
        reject: 'NGO Application Rejected',
        request_changes: 'Changes Requested from NGO'
      };
      toast.success(actionLabels[action]);
      setSelectedNgo(null);
      fetchNGOQueue(activeTab);
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDonorAuditSubmit = async (action) => {
    if ((action === 'reject' || action === 'request_changes') && !donorAuditReason.trim()) {
      toast.error(`A specific reason is required to ${action === 'reject' ? 'reject' : 'send back to edit'} donor verification.`);
      return;
    }

    setIsDonorSubmitting(true);
    try {
      await moderationAPI.auditDonor(selectedDonor.id, action, donorAuditReason.trim());
      const actionLabels = {
        approve: 'Donor Identity Verification Approved Successfully',
        reject: 'Donor Identity Verification Rejected',
        request_changes: 'Sent Back to Donor to Edit Details & Documents'
      };
      toast.success(actionLabels[action]);
      setSelectedDonor(null);
      fetchDonorQueue(donorTab);
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsDonorSubmitting(false);
    }
  };

  const filteredNgos = ngos.filter(ngo => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      ngo.name?.toLowerCase().includes(term) ||
      ngo.registration_number?.toLowerCase().includes(term) ||
      ngo.city?.toLowerCase().includes(term)
    );
  });

  const filteredDonors = donors.filter(d => {
    if (!donorSearchTerm) return true;
    const term = donorSearchTerm.toLowerCase();
    const fullName = `${d.first_name || ''} ${d.last_name || ''}`.toLowerCase();
    return (
      fullName.includes(term) ||
      d.username?.toLowerCase().includes(term) ||
      d.email?.toLowerCase().includes(term) ||
      d.phone_number?.toLowerCase().includes(term) ||
      d.aadhaar_number?.toLowerCase().includes(term) ||
      d.pan_number?.toLowerCase().includes(term) ||
      d.city?.toLowerCase().includes(term) ||
      d.state?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#F3F0EA] text-[#1C1B18] font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 space-y-6 text-left">
        {/* Module Switcher: Donor Verification vs NGO Verification */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMainView('donors')}
            className={`px-5 py-3 rounded-2xl text-xs font-serif font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
              mainView === 'donors'
                ? 'bg-[#1C1B18] text-white border-[#1C1B18] shadow-md'
                : 'bg-[#EAE4DC] text-[#666157] border-[#DCD4C8] hover:border-[#C48B3F]'
            }`}
          >
            <User className="w-4 h-4 text-[#C48B3F]" />
            <span>Donor Identity & Tax Verification (Aadhaar & PAN)</span>
            {donors.filter(d => d.verification_status === 'pending').length > 0 && (
              <span className="bg-amber-400 text-stone-900 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                {donors.filter(d => d.verification_status === 'pending').length} pending
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMainView('ngos')}
            className={`px-5 py-3 rounded-2xl text-xs font-serif font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
              mainView === 'ngos'
                ? 'bg-[#1C1B18] text-white border-[#1C1B18] shadow-md'
                : 'bg-[#EAE4DC] text-[#666157] border-[#DCD4C8] hover:border-[#C48B3F]'
            }`}
          >
            <Building className="w-4 h-4 text-[#C48B3F]" />
            <span>NGO Document Verification Center</span>
            {ngos.filter(n => n.verification_status === 'pending').length > 0 && (
              <span className="bg-amber-400 text-stone-900 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                {ngos.filter(n => n.verification_status === 'pending').length} pending
              </span>
            )}
          </button>
        </div>

        {/* ─── DONOR VERIFICATION MODULE ─── */}
        {mainView === 'donors' && (
          <div className="space-y-6">
            {/* Top Header Banner for Donors */}
            <div className="bg-[#EAE4DC] rounded-3xl p-6 sm:p-8 border border-[#DCD4C8] shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#F3F0EA] border border-[#DCD4C8] text-[#C48B3F] flex items-center justify-center font-bold">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1B18] tracking-tight">
                      Donor Identity & Tax Verification
                    </h1>
                    <p className="text-[#666157] text-xs font-medium mt-1">
                      Aadhaar UID and PAN document compliance portal. Accept, reject, or send back to edit donor verification requests.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fetchDonorQueue(donorTab)}
                    className="px-4 py-2.5 rounded-full bg-[#F3F0EA] hover:bg-[#DCD4C8] border border-[#DCD4C8] text-[#1C1B18] text-xs font-medium flex items-center gap-2 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${donorLoading ? 'animate-spin' : ''}`} />
                    Refresh Queue
                  </button>
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium flex items-center gap-2 transition"
                  >
                    Django Admin <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Donor Status Tabs */}
              <div className="flex items-center gap-2 mt-8 border-b border-[#DCD4C8] pb-3 overflow-x-auto">
                {[
                  { id: 'pending', label: 'Pending Audit Queue' },
                  { id: 'changes_requested', label: 'Changes Requested' },
                  { id: 'approved', label: 'Verified Donors' },
                  { id: 'rejected', label: 'Rejected Donors' },
                  { id: 'all', label: 'All Donors' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDonorTab(tab.id)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                      donorTab === tab.id
                        ? 'bg-[#1C1B18] text-white shadow-xs'
                        : 'text-[#666157] hover:bg-[#F3F0EA]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#666157] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search donor by name, email, Aadhaar, PAN..."
                  value={donorSearchTerm}
                  onChange={(e) => setDonorSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[#DCD4C8] bg-[#EAE4DC] text-[#1C1B18] text-xs focus:outline-none focus:border-[#C48B3F] placeholder-[#666157]"
                />
              </div>
              <div className="text-xs font-mono text-[#666157]">
                Showing {filteredDonors.length} donor record(s)
              </div>
            </div>

            {/* Donor Queue Grid / Cards */}
            {donorLoading ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-[#C48B3F]/20 border-t-[#C48B3F] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[#666157] font-mono text-xs">Loading donor verification filings...</p>
              </div>
            ) : filteredDonors.length === 0 ? (
              <div className="bg-[#EAE4DC] rounded-3xl p-12 text-center border border-[#DCD4C8] shadow-xs">
                <CheckCircle className="w-12 h-12 text-[#C48B3F] mx-auto mb-3" />
                <h3 className="text-lg font-serif font-bold text-[#1C1B18]">No donors in this verification queue</h3>
                <p className="text-[#666157] text-xs mt-1">All donor records in this category have been processed or none found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDonors.map(donor => {
                  const statusCfg = STATUS_BADGES[donor.verification_status] || STATUS_BADGES.pending;
                  const StatusIcon = statusCfg.icon;
                  const displayName = donor.first_name ? `${donor.first_name} ${donor.last_name}` : donor.username;

                  return (
                    <div
                      key={donor.id}
                      className="bg-[#EAE4DC] rounded-3xl p-6 border border-[#DCD4C8] shadow-xs hover:border-[#C48B3F] transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border ${statusCfg.bg}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusCfg.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[#666157]">Donor #{donor.id}</span>
                        </div>

                        <h3 className="text-lg font-serif font-bold text-[#1C1B18] line-clamp-1 mb-1">{displayName}</h3>
                        <p className="text-xs text-[#666157] truncate mb-1">{donor.email}</p>
                        <p className="text-xs text-[#666157] flex items-center gap-1 mb-4">
                          <MapPin className="w-3.5 h-3.5 text-[#C48B3F] shrink-0" />
                          {donor.city || 'N/A'}, {donor.state || 'India'}
                        </p>

                        <div className="space-y-2 bg-[#F3F0EA] rounded-2xl p-4 text-xs text-[#666157] mb-6 border border-[#DCD4C8]">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Aadhaar (UID):</span>
                            <span className="font-mono font-bold text-[#1C1B18]">
                              {donor.aadhaar_number ? `${donor.aadhaar_number.slice(0, 4)} **** ${donor.aadhaar_number.slice(-4)}` : 'Not Provided'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Aadhaar Doc:</span>
                            <span className={`font-mono text-[11px] font-bold ${donor.aadhaar_doc ? 'text-emerald-700' : 'text-stone-400'}`}>
                              {donor.aadhaar_doc ? '✓ Attached' : 'Missing'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">PAN Card:</span>
                            <span className="font-mono font-bold text-[#1C1B18] uppercase">
                              {donor.pan_number || 'Not Provided'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">PAN Doc:</span>
                            <span className={`font-mono text-[11px] font-bold ${donor.pan_doc ? 'text-emerald-700' : 'text-stone-400'}`}>
                              {donor.pan_doc ? '✓ Attached' : 'Missing'}
                            </span>
                          </div>
                          {donor.rejection_reason && (
                            <div className="pt-2 border-t border-[#DCD4C8] text-[11px] text-amber-900 font-medium">
                              <span className="font-bold">Remarks: </span>
                              <span className="line-clamp-2">{donor.rejection_reason}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenDonorAuditModal(donor)}
                        className="w-full py-2.5 rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        Inspect Filings &amp; Audit
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── NGO VERIFICATION MODULE ─── */}
        {mainView === 'ngos' && (
          <div className="space-y-6">
            {/* Top Header Banner */}
            <div className="bg-[#EAE4DC] rounded-3xl p-6 sm:p-8 border border-[#DCD4C8] shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#F3F0EA] border border-[#DCD4C8] text-[#C48B3F] flex items-center justify-center font-bold">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1B18] tracking-tight">
                      NGO Document Verification Center
                    </h1>
                    <p className="text-[#666157] text-xs font-medium mt-1">
                      Manual document inspection &amp; identity verification portal. Strict human audit queue.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fetchNGOQueue(activeTab)}
                    className="px-4 py-2.5 rounded-full bg-[#F3F0EA] hover:bg-[#DCD4C8] border border-[#DCD4C8] text-[#1C1B18] text-xs font-medium flex items-center gap-2 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Queue
                  </button>
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium flex items-center gap-2 transition"
                  >
                    Django Admin <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-2 mt-8 border-b border-[#DCD4C8] pb-3 overflow-x-auto">
                {[
                  { id: 'pending', label: 'Pending Audit Queue' },
                  { id: 'changes_requested', label: 'Changes Requested' },
                  { id: 'approved', label: 'Verified NGOs' },
                  { id: 'rejected', label: 'Rejected Filings' },
                  { id: 'all', label: 'All Organizations' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#1C1B18] text-white shadow-xs'
                        : 'text-[#666157] hover:bg-[#F3F0EA]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#666157] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search NGO by name, reg no, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[#DCD4C8] bg-[#EAE4DC] text-[#1C1B18] text-xs focus:outline-none focus:border-[#C48B3F] placeholder-[#666157]"
                />
              </div>
              <div className="text-xs font-mono text-[#666157]">
                Showing {filteredNgos.length} organization(s)
              </div>
            </div>

            {/* Queue Grid / Table */}
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-[#C48B3F]/20 border-t-[#C48B3F] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[#666157] font-mono text-xs">Loading verification filings...</p>
              </div>
            ) : filteredNgos.length === 0 ? (
              <div className="bg-[#EAE4DC] rounded-3xl p-12 text-center border border-[#DCD4C8] shadow-xs">
                <CheckCircle className="w-12 h-12 text-[#C48B3F] mx-auto mb-3" />
                <h3 className="text-lg font-serif font-bold text-[#1C1B18]">No NGOs in this verification queue</h3>
                <p className="text-[#666157] text-xs mt-1">All applications in this category have been processed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNgos.map(ngo => {
                  const statusCfg = STATUS_BADGES[ngo.verification_status] || STATUS_BADGES.pending;
                  const StatusIcon = statusCfg.icon;
                  const docCount = ngo.documents ? Object.values(ngo.documents).flat().length : 0;

                  return (
                    <div
                      key={ngo.id}
                      className="bg-[#EAE4DC] rounded-3xl p-6 border border-[#DCD4C8] shadow-xs hover:border-[#C48B3F] transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border ${statusCfg.bg}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusCfg.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[#666157]">ID #{ngo.id}</span>
                        </div>

                        <h3 className="text-lg font-serif font-bold text-[#1C1B18] line-clamp-1 mb-1">{ngo.name}</h3>
                        <p className="text-xs text-[#666157] flex items-center gap-1 mb-4">
                          <MapPin className="w-3.5 h-3.5 text-[#C48B3F]" />
                          {ngo.city}, {ngo.state}
                        </p>

                        <div className="space-y-2 bg-[#F3F0EA] rounded-2xl p-4 text-xs text-[#666157] mb-6 border border-[#DCD4C8]">
                          <div className="flex justify-between">
                            <span className="font-medium">Gov Reg No:</span>
                            <span className="font-mono font-bold text-[#1C1B18]">{ngo.gov_registration_number || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Type:</span>
                            <span className="font-bold text-[#1C1B18]">{ngo.ngo_type || 'Trust'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Uploaded Documents:</span>
                            <span className="font-mono font-bold text-[#C48B3F]">{docCount} page(s)</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenAuditModal(ngo)}
                        className="w-full py-2.5 rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        Inspect Filings &amp; Audit
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- NGO INSPECTION & AUDIT MODAL --- */}
      {selectedNgo && (
        <div className="fixed inset-0 z-50 bg-[#1C1B18]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#EAE4DC] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#DCD4C8] text-left">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#DCD4C8] flex items-start justify-between gap-4 sticky top-0 bg-[#EAE4DC] z-10">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-serif font-bold text-[#1C1B18]">{selectedNgo.name}</h2>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border ${STATUS_BADGES[selectedNgo.verification_status]?.bg}`}>
                    {STATUS_BADGES[selectedNgo.verification_status]?.label}
                  </span>
                </div>
                <p className="text-xs font-mono text-[#666157] mt-1">Reg No: {selectedNgo.registration_number} | Gov Reg: {selectedNgo.gov_registration_number}</p>
              </div>
              <button
                onClick={() => setSelectedNgo(null)}
                className="p-2 rounded-full text-[#666157] hover:text-[#1C1B18] hover:bg-[#F3F0EA] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Section 1: Organizational Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl p-4 text-xs">
                <div>
                  <span className="text-[#666157] block mb-0.5 font-medium">Contact Phone:</span>
                  <span className="font-mono font-bold text-[#1C1B18] text-sm">{selectedNgo.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#666157] block mb-0.5 font-medium">Operating Location:</span>
                  <span className="font-bold text-[#1C1B18] text-sm">{selectedNgo.address}, {selectedNgo.city}</span>
                </div>
                <div>
                  <span className="text-[#666157] block mb-0.5 font-medium">Trust Score:</span>
                  <span className="font-mono font-bold text-[#C48B3F] text-sm">{selectedNgo.trust_score}%</span>
                </div>
              </div>

              {selectedNgo.rejection_reason && (
                <div className="bg-amber-100 border border-amber-300 rounded-2xl p-4 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-700" /> Previous Administrative Feedback:
                  </div>
                  <p className="text-amber-900">{selectedNgo.rejection_reason}</p>
                </div>
              )}

              {/* Section 2: Uploaded Document Viewer */}
              <div>
                <h3 className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C48B3F]" />
                  Uploaded Legal Documents ({selectedNgo.documents ? Object.values(selectedNgo.documents).flat().length : 0})
                </h3>

                {!selectedNgo.documents || Object.keys(selectedNgo.documents).length === 0 ? (
                  <div className="p-8 text-center bg-[#F3F0EA] rounded-2xl border border-[#DCD4C8]">
                    <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-xs font-serif font-bold text-[#1C1B18]">No verification documents uploaded</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(selectedNgo.documents).map(([docType, fileUrls]) => {
                      const docName = DOC_TYPE_LABELS[docType] || docType;
                      const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];

                      return (
                        <div key={docType} className="bg-[#F3F0EA] rounded-2xl p-4 border border-[#DCD4C8] shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-serif font-bold text-[#1C1B18]">{docName}</span>
                              <span className="text-[10px] font-mono bg-[#EAE4DC] font-bold px-2 py-0.5 rounded-full text-[#666157]">
                                {urls.length} file(s)
                              </span>
                            </div>

                            <div className="space-y-2 mb-4">
                              {urls.map((url, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-[#EAE4DC] border border-[#DCD4C8]">
                                  <span className="text-xs text-[#666157] font-mono truncate max-w-[200px]">Page {i + 1}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setSelectedDocPreview({ url, title: `${docName} - Page ${i + 1}` })}
                                      className="p-1.5 rounded-full text-[#C48B3F] hover:bg-[#F3F0EA] text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Preview
                                    </button>
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-full text-[#666157] hover:bg-[#F3F0EA] text-xs font-bold flex items-center gap-1"
                                    >
                                      <Download className="w-3.5 h-3.5" /> View/Download
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Document Image Preview Sub-Modal */}
              {selectedDocPreview && (
                <div className="p-4 bg-[#1C1B18] rounded-2xl text-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-[#DCD4C8]">{selectedDocPreview.title}</span>
                    <button onClick={() => setSelectedDocPreview(null)} className="text-xs text-[#C48B3F] hover:underline cursor-pointer">
                      Close Preview
                    </button>
                  </div>
                  <div className="bg-black/40 rounded-xl p-2 flex items-center justify-center min-h-[250px]">
                    {selectedDocPreview.url.endsWith('.pdf') ? (
                      <iframe src={selectedDocPreview.url} title="Doc" className="w-full h-80 rounded-lg" />
                    ) : (
                      <img src={selectedDocPreview.url} alt="Doc Preview" className="max-h-80 object-contain rounded-lg" />
                    )}
                  </div>
                </div>
              )}

              {/* Section 3: Audit Decision Controls */}
              <div className="border-t border-[#DCD4C8] pt-6">
                <h3 className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider mb-4">
                  Manual Verification Decision
                </h3>

                <div className="space-y-4">
                  {auditAction && (auditAction === 'reject' || auditAction === 'request_changes') && (
                    <div>
                      <label className="block text-xs font-mono font-bold text-[#666157] mb-1.5">
                        Audit Remarks &amp; Feedback Reason (Required) *
                      </label>
                      <textarea
                        rows={3}
                        value={auditReason}
                        onChange={(e) => setAuditReason(e.target.value)}
                        placeholder={`State specific issues or missing documents for the NGO...`}
                        className="w-full p-3 rounded-2xl border border-[#DCD4C8] bg-[#F3F0EA] text-[#1C1B18] text-xs focus:outline-none focus:border-[#C48B3F]"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleAuditSubmit('approve')}
                      className="py-3 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve NGO
                    </button>

                    <button
                      disabled={isSubmitting}
                      onClick={() => {
                        if (auditAction === 'request_changes') {
                          handleAuditSubmit('request_changes');
                        } else {
                          setAuditAction('request_changes');
                        }
                      }}
                      className="py-3 rounded-full bg-[#C48B3F] hover:bg-[#a67432] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Request Changes
                    </button>

                    <button
                      disabled={isSubmitting}
                      onClick={() => {
                        if (auditAction === 'reject') {
                          handleAuditSubmit('reject');
                        } else {
                          setAuditAction('reject');
                        }
                      }}
                      className="py-3 rounded-full bg-rose-800 hover:bg-rose-900 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject NGO
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DONOR INSPECTION & AUDIT MODAL --- */}
      {selectedDonor && (
        <div className="fixed inset-0 z-50 bg-[#1C1B18]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#EAE4DC] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#DCD4C8] text-left">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#DCD4C8] flex items-start justify-between gap-4 sticky top-0 bg-[#EAE4DC] z-10">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-serif font-bold text-[#1C1B18]">
                    {selectedDonor.first_name ? `${selectedDonor.first_name} ${selectedDonor.last_name}` : selectedDonor.username}
                  </h2>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border ${STATUS_BADGES[selectedDonor.verification_status]?.bg || STATUS_BADGES.pending.bg}`}>
                    {STATUS_BADGES[selectedDonor.verification_status]?.label || 'PENDING AUDIT'}
                  </span>
                </div>
                <p className="text-xs font-mono text-[#666157] mt-1">
                  Donor ID: #{selectedDonor.id} | Email: {selectedDonor.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDonor(null)}
                className="p-2 rounded-full text-[#666157] hover:text-[#1C1B18] hover:bg-[#F3F0EA] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Section 1: Donor Contact & Location Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl p-4 text-xs">
                <div>
                  <span className="text-[#666157] block mb-0.5 font-medium">Contact Phone:</span>
                  <span className="font-mono font-bold text-[#1C1B18] text-sm">{selectedDonor.phone_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#666157] block mb-0.5 font-medium">Location:</span>
                  <span className="font-bold text-[#1C1B18] text-sm">{selectedDonor.city || 'N/A'}, {selectedDonor.state || 'India'}</span>
                </div>
                <div>
                  <span className="text-[#666157] block mb-0.5 font-medium">PIN Code:</span>
                  <span className="font-mono font-bold text-[#1C1B18] text-sm">{selectedDonor.pin_code || 'N/A'}</span>
                </div>
              </div>

              {selectedDonor.address && (
                <div className="bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl p-3 text-xs">
                  <span className="text-[#666157] font-medium block mb-0.5">Registered Address:</span>
                  <span className="text-[#1C1B18] font-medium">{selectedDonor.address}</span>
                </div>
              )}

              {/* Previous Admin Remarks if any */}
              {selectedDonor.rejection_reason && (
                <div className="bg-amber-100 border border-amber-300 rounded-2xl p-4 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    Previous Administrative Feedback / Remarks:
                  </div>
                  <p className="text-amber-900">{selectedDonor.rejection_reason}</p>
                </div>
              )}

              {/* Section 2: Aadhaar & PAN Card Verification Cards */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C48B3F]" />
                  Identity &amp; Tax Documents
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Aadhaar Card Box */}
                  <div className="bg-[#F3F0EA] rounded-2xl p-5 border border-[#DCD4C8] flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-serif font-bold text-[#1C1B18] flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-[#C48B3F]" />
                          Aadhaar Card (UID)
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          selectedDonor.aadhaar_number ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                        }`}>
                          {selectedDonor.aadhaar_number ? 'Provided' : 'Not Provided'}
                        </span>
                      </div>
                      <p className="text-xs text-[#666157] mb-3">12-Digit Government Unique Identity Number</p>
                      <div className="p-3 bg-white rounded-xl border border-[#DCD4C8] font-mono font-bold text-[#1C1B18] tracking-widest text-center text-sm">
                        {selectedDonor.aadhaar_number || '----------------'}
                      </div>
                    </div>

                    <div>
                      {selectedDonor.aadhaar_doc ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EAE4DC] border border-[#DCD4C8] text-xs">
                            <span className="font-mono text-[#1C1B18] font-bold truncate max-w-[150px]">Aadhaar Attachment</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedDonorDocPreview({ url: selectedDonor.aadhaar_doc, title: 'Aadhaar Card Document' })}
                                className="p-1.5 rounded-full text-[#C48B3F] hover:bg-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Preview
                              </button>
                              <a
                                href={selectedDonor.aadhaar_doc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-full text-[#1C1B18] hover:bg-white text-xs font-bold flex items-center gap-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> View
                              </a>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 text-center bg-stone-100 rounded-xl border border-dashed border-stone-300 text-stone-500 text-xs">
                          No Aadhaar document attachment uploaded
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PAN Card Box */}
                  <div className="bg-[#F3F0EA] rounded-2xl p-5 border border-[#DCD4C8] flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-serif font-bold text-[#1C1B18] flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-[#C48B3F]" />
                          PAN Card (Tax ID)
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          selectedDonor.pan_number ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                        }`}>
                          {selectedDonor.pan_number ? 'Provided' : 'Not Provided'}
                        </span>
                      </div>
                      <p className="text-xs text-[#666157] mb-3">10-Character Income Tax Permanent Account Number</p>
                      <div className="p-3 bg-white rounded-xl border border-[#DCD4C8] font-mono font-bold text-[#1C1B18] tracking-widest text-center text-sm uppercase">
                        {selectedDonor.pan_number || '----------'}
                      </div>
                    </div>

                    <div>
                      {selectedDonor.pan_doc ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EAE4DC] border border-[#DCD4C8] text-xs">
                            <span className="font-mono text-[#1C1B18] font-bold truncate max-w-[150px]">PAN Attachment</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedDonorDocPreview({ url: selectedDonor.pan_doc, title: 'PAN Card Document' })}
                                className="p-1.5 rounded-full text-[#C48B3F] hover:bg-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Preview
                              </button>
                              <a
                                href={selectedDonor.pan_doc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-full text-[#1C1B18] hover:bg-white text-xs font-bold flex items-center gap-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> View
                              </a>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 text-center bg-stone-100 rounded-xl border border-dashed border-stone-300 text-stone-500 text-xs">
                          No PAN document attachment uploaded
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Image/PDF Inline Viewer */}
              {selectedDonorDocPreview && (
                <div className="p-4 bg-[#1C1B18] rounded-2xl text-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-[#DCD4C8]">{selectedDonorDocPreview.title}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDonorDocPreview(null)}
                      className="text-xs text-[#C48B3F] hover:underline cursor-pointer"
                    >
                      Close Preview
                    </button>
                  </div>
                  <div className="bg-black/40 rounded-xl p-2 flex items-center justify-center min-h-[250px]">
                    {selectedDonorDocPreview.url.endsWith('.pdf') ? (
                      <iframe src={selectedDonorDocPreview.url} title="Doc" className="w-full h-80 rounded-lg" />
                    ) : (
                      <img src={selectedDonorDocPreview.url} alt="Doc Preview" className="max-h-80 object-contain rounded-lg" />
                    )}
                  </div>
                </div>
              )}

              {/* Section 3: Audit Decision Controls */}
              <div className="border-t border-[#DCD4C8] pt-6">
                <h3 className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider mb-3">
                  Admin Verification Decision
                </h3>

                <div className="space-y-4">
                  {(donorAuditAction === 'reject' || donorAuditAction === 'request_changes') && (
                    <div>
                      <label className="block text-xs font-mono font-bold text-[#666157] mb-1.5">
                        Audit Remarks &amp; Correction Reason (Required) *
                      </label>
                      <textarea
                        rows={3}
                        value={donorAuditReason}
                        onChange={(e) => setDonorAuditReason(e.target.value)}
                        placeholder={
                          donorAuditAction === 'request_changes'
                            ? "Provide clear instructions for the donor (e.g., Aadhaar photo is blurry, please re-upload clear photo of front & back)..."
                            : "Provide reason for rejecting this donor's verification..."
                        }
                        className="w-full p-3 rounded-2xl border border-[#DCD4C8] bg-[#F3F0EA] text-[#1C1B18] text-xs focus:outline-none focus:border-[#C48B3F]"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      disabled={isDonorSubmitting}
                      onClick={() => handleDonorAuditSubmit('approve')}
                      className="py-3 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Donor
                    </button>

                    <button
                      type="button"
                      disabled={isDonorSubmitting}
                      onClick={() => {
                        if (donorAuditAction === 'request_changes') {
                          handleDonorAuditSubmit('request_changes');
                        } else {
                          setDonorAuditAction('request_changes');
                        }
                      }}
                      className="py-3 rounded-full bg-[#C48B3F] hover:bg-[#a67432] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Send Back to Edit
                    </button>

                    <button
                      type="button"
                      disabled={isDonorSubmitting}
                      onClick={() => {
                        if (donorAuditAction === 'reject') {
                          handleDonorAuditSubmit('reject');
                        } else {
                          setDonorAuditAction('reject');
                        }
                      }}
                      className="py-3 rounded-full bg-rose-800 hover:bg-rose-900 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Verification
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
