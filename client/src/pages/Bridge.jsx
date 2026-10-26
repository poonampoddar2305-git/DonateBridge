import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/GlobalStateContext';
import { useRealDB } from '../hooks/useRealDB';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import {
  Upload, ShieldCheck, Globe, Compass, CheckCircle, Clock,
  Truck, BarChart3, ChevronRight, ArrowRight, Sparkles,
  HeartHandshake, Building2, Package, MapPin, AlertCircle,
  RefreshCw, Zap, CheckCircle2, Lock, ArrowUpRight, Filter
} from 'lucide-react';

const STEPS = [
  {
    num: 1,
    title: 'Donor Uploads Items',
    desc: 'The donor registers item details — category, condition, photos, and pickup address — to create a verified listing on the platform.',
    icon: Upload,
    color: 'bg-[#1C1B18]',
    details: [
      'Define item category and condition',
      'Upload photos for verification',
      'Set pickup address coordinates'
    ],
    mockup: (
      <div className="space-y-3">
        <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-4 rounded-2xl flex items-center justify-between">
          <span className="text-[#666157] font-medium">Donation Title</span>
          <span className="font-serif font-bold text-[#1C1B18]">50 School Textbooks</span>
        </div>
        <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-4 rounded-2xl flex items-center justify-between">
          <span className="text-[#666157] font-medium">Verification File</span>
          <span className="font-mono font-bold text-[#C48B3F]">cargo_manifest.pdf</span>
        </div>
        <div className="flex justify-between items-center px-1 text-[#666157] text-xs">
          <span>Weight: 18 kg</span>
          <span className="text-[#C48B3F] font-bold flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-[#C48B3F]" /> Ready for upload
          </span>
        </div>
      </div>
    )
  },
  {
    num: 2,
    title: 'Admin Verifies Listing',
    desc: 'A platform supervisor reviews the item details, verifies authenticity through uploaded documents, and approves the listing.',
    icon: ShieldCheck,
    color: 'bg-[#1C1B18]',
    details: [
      'Cross-reference donor registration',
      'Validate location coordinates',
      'Approve listing for public catalog'
    ],
    mockup: (
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#666157] font-medium">Integrity Audit</span>
          <span className="text-emerald-900 font-mono font-bold bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">PASSED</span>
        </div>
        <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-4 rounded-2xl font-mono text-[#666157] space-y-1.5 text-xs">
          <div>&gt; Matching headquarters coords...</div>
          <div className="text-[#1C1B18] font-bold">MATCH: 19.076, 72.8777 [OK]</div>
          <div>&gt; Updating trust flags... DONE</div>
        </div>
        <div className="text-[#666157] text-center text-xs">Audit signed &bull; SHA-256 block updated</div>
      </div>
    )
  },
  {
    num: 3,
    title: 'Item Goes Public',
    desc: 'The approved donation becomes visible in the public Discover directory, where verified NGOs can browse and filter available items.',
    icon: Globe,
    color: 'bg-[#1C1B18]',
    details: [
      'Published to the active Discover feed',
      'Indexed by category, proximity, and urgency',
      'Open for NGO match requests'
    ],
    mockup: (
      <div className="space-y-3">
        <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-3.5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[#1C1B18] text-[#C48B3F] flex items-center justify-center font-serif font-bold shrink-0">BK</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-serif font-bold text-[#1C1B18] text-sm truncate">50 Textbooks &amp; Stationary Kits</h4>
            <p className="text-[#666157] text-xs">Mumbai Central Hub &bull; Available</p>
          </div>
          <span className="px-3 py-1 bg-[#EAE4DC] text-[#C48B3F] rounded-full font-mono font-bold shrink-0 text-[10px] border border-[#DCD4C8]">
            PUBLIC
          </span>
        </div>
        <p className="text-[#666157] text-center italic text-xs">Listed on active directories. Ready for NGO matching.</p>
      </div>
    )
  },
  {
    num: 4,
    title: 'NGO Requests Item',
    desc: 'A registered NGO identifies the donation as matching their community needs and submits an allocation request through the platform.',
    icon: Compass,
    color: 'bg-[#1C1B18]',
    details: [
      'Identify local community demands',
      'Auto-verify NGO eligibility',
      'Generate proximity match scores'
    ],
    mockup: (
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#666157] font-medium">Suggested NGO Partner</span>
          <span className="text-[#C48B3F] font-mono font-bold">98.4% Proximity Match</span>
        </div>
        <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#1C1B18] flex items-center justify-center text-[#C48B3F] font-serif font-bold">EH</div>
          <div>
            <p className="font-serif font-bold text-[#1C1B18] text-sm">Education Hub NGO</p>
            <p className="text-[#666157] text-xs">Demands matched: Educational books</p>
          </div>
        </div>
      </div>
    )
  },
  {
    num: 5,
    title: 'Donor Accepts Match',
    desc: 'The donor reviews the NGO match, approves the recipient suggestion, and locks the allocation — triggering the logistics flow.',
    icon: CheckCircle,
    color: 'bg-[#1C1B18]',
    details: [
      'Review recipient organization profile',
      'Accept optimized logistics route',
      'Generate electronic manifest'
    ],
    mockup: (
      <div className="space-y-3">
        <div className="border border-[#DCD4C8] bg-[#F3F0EA] p-4 rounded-2xl space-y-2">
          <p className="font-serif font-bold text-[#1C1B18] text-xs">Route Matching Accepted</p>
          <p className="text-[#666157] text-xs">Donor approved recipient suggestion. Allocation manifest locked.</p>
        </div>
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-[#666157]">Manifest: #M-902-L</span>
          <span className="text-[#C48B3F] bg-[#EAE4DC] px-3 py-1 rounded-full font-bold border border-[#DCD4C8]">LOCKED</span>
        </div>
      </div>
    )
  },
  {
    num: 6,
    title: 'Pickup Scheduled',
    desc: 'A logistics courier is dispatched to the donor\'s location to collect the items. Real-time tracking is enabled for both parties.',
    icon: Clock,
    color: 'bg-[#1C1B18]',
    details: [
      'Deploy regional courier unit',
      'Sync schedule with donor availability',
      'Enable real-time parcel tracking'
    ],
    mockup: (
      <div className="space-y-3">
        <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-4 rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between font-serif font-bold">
            <span>Express Unit: DB-LOGISTICS</span>
            <span className="text-[#C48B3F] font-mono">En Route</span>
          </div>
          <div className="flex justify-between text-[#666157] text-xs">
            <span>Driver: Ramesh K.</span>
            <span className="font-mono">ETA: 14 mins</span>
          </div>
        </div>
        <p className="text-[#666157] text-center text-xs">GPS tracking active &bull; Transmit rate: 1Hz</p>
      </div>
    )
  },
  {
    num: 7,
    title: 'Delivery Completed',
    desc: 'Items are delivered to the NGO hub and verified through electronic signature. Custody transfer is recorded in the audit log.',
    icon: Truck,
    color: 'bg-[#1C1B18]',
    details: [
      'Courier delivers items to NGO hub',
      'NGO confirms with digital signature',
      'Release custody transfer logs'
    ],
    mockup: (
      <div className="space-y-3">
        <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-4 rounded-2xl flex items-center justify-between text-xs">
          <span className="text-[#666157] font-medium">Custody Transfer</span>
          <span className="text-[#C48B3F] font-mono font-bold flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> SIGNED
          </span>
        </div>
        <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-4 rounded-2xl font-mono text-[#666157] space-y-1.5 text-xs">
          <div>&gt; Matching GPS location logs...</div>
          <div>NGO HQ REGION MATCH: 100% [VALID]</div>
          <div>STATUS: COMPLETED DISPATCH</div>
        </div>
      </div>
    )
  },
  {
    num: 8,
    title: 'Impact Ledger Updated',
    desc: 'CO₂ savings, item metrics, and beneficiary impact data are synced to the transparency ledger — completing the donation lifecycle.',
    icon: BarChart3,
    color: 'bg-[#1C1B18]',
    details: [
      'Calculate carbon emissions saved',
      'Append data to transparency log',
      'Credit donor profile with impact points'
    ],
    mockup: (
      <div className="space-y-3">
        <div className="bg-[#1C1B18] text-[#F3F0EA] p-5 rounded-2xl text-center space-y-1">
          <p className="font-mono uppercase tracking-wider text-[#C48B3F] text-[10px]">CO₂ Emissions Saved</p>
          <p className="text-2xl font-serif font-bold">+0.15 Tons Offset</p>
        </div>
        <div className="flex justify-between items-center text-[#666157] px-1 text-xs font-mono">
          <span>Block Index: #5812902</span>
          <span>Status: SYNCED</span>
        </div>
      </div>
    )
  }
];

export default function Bridge() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { donations, needs, claimDonation, loadingDonations } = useRealDB();

  const [activeTab, setActiveTab] = useState('hub'); // 'hub' | 'workflow'
  const [activeStep, setActiveStep] = useState(1);
  const [claimingId, setClaimingId] = useState(null);

  const role = user?.role || 'guest';
  const currentStep = STEPS.find(s => s.num === activeStep);
  const StepIcon = currentStep.icon;

  const handleClaimSupply = async (donationId) => {
    if (!isAuthenticated) {
      toast.info('Please register or sign in as an NGO to claim this donation.');
      navigate('/auth?tab=register&role=ngo');
      return;
    }
    if (role !== 'ngo') {
      toast.error('Only registered NGOs can claim surplus supplies.');
      return;
    }

    setClaimingId(donationId);
    try {
      await claimDonation(donationId);
      toast.success('Donation claimed! Tracking and logistics manifest generated.');
    } catch (err) {
      // Error handled by useRealDB
    } finally {
      setClaimingId(null);
    }
  };

  const handleFulfillNeed = (need) => {
    if (!isAuthenticated) {
      toast.info('Please register or sign in as a Donor to fulfill this NGO requirement.');
      navigate('/auth?tab=register&role=donor');
      return;
    }
    navigate(`/upload-donation?category=${encodeURIComponent(need.category)}&item=${encodeURIComponent(need.item)}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans">
      <Navbar />

      {/* Light Editorial Hero Banner */}
      <section className="bg-[#EAE4DC] border-b border-[#DCD4C8] pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F3F0EA] text-[#1C1B18] border border-[#DCD4C8] text-xs font-mono font-bold">
                  <Globe className="w-3.5 h-3.5 text-[#C48B3F]" />
                  Community Supply Bridge
                </span>

                {role === 'donor' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-mono font-bold">
                    <HeartHandshake className="w-3.5 h-3.5 text-emerald-700" /> Donor Workspace
                  </span>
                )}
                {role === 'ngo' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-mono font-bold">
                    <Building2 className="w-3.5 h-3.5 text-amber-700" /> NGO Console
                  </span>
                )}
                {role === 'admin' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F0EA] text-[#1C1B18] border border-[#DCD4C8] text-xs font-mono font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C48B3F]" /> Moderator Audit Mode
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1B18]">
                The Donation <span className="text-[#C48B3F]">Bridge</span>
              </h1>
              
              <p className="text-[#666157] text-sm sm:text-base leading-relaxed">
                {role === 'donor' && "Find urgent NGO needs matching your surplus items and bridge resources directly to local non-profits."}
                {role === 'ngo' && "Browse verified surplus donations uploaded by local donors and claim items for your community programs."}
                {role === 'guest' && "Discover how DonateBridge connects donors with verified NGOs to deliver non-monetary supply aid."}
              </p>
            </div>

            {/* Quick Action Box */}
            <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-4 rounded-3xl shrink-0 flex flex-col gap-2.5 sm:min-w-[220px]">
              {role === 'donor' && (
                <>
                  <Button variant="primary" onClick={() => navigate('/upload-donation')} icon={Upload} className="w-full justify-center text-xs rounded-full bg-[#1C1B18] text-white hover:bg-[#C48B3F]">
                    Upload Donation
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/donor')} icon={Package} className="w-full justify-center text-xs rounded-full bg-[#EAE4DC] text-[#1C1B18] border border-[#DCD4C8]">
                    My Deliveries
                  </Button>
                </>
              )}
              {role === 'ngo' && (
                <>
                  <Button variant="primary" onClick={() => navigate('/post-need')} icon={Zap} className="w-full justify-center text-xs rounded-full bg-[#1C1B18] text-white hover:bg-[#C48B3F]">
                    Post Emergency Need
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/ngo')} icon={Building2} className="w-full justify-center text-xs rounded-full bg-[#EAE4DC] text-[#1C1B18] border border-[#DCD4C8]">
                    NGO Console
                  </Button>
                </>
              )}
              {role === 'guest' && (
                <>
                  <Button variant="primary" onClick={() => navigate('/auth?tab=register&role=donor')} icon={HeartHandshake} className="w-full justify-center text-xs rounded-full bg-[#1C1B18] text-white hover:bg-[#C48B3F]">
                    Join as Donor
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/auth?tab=register&role=ngo')} icon={Building2} className="w-full justify-center text-xs rounded-full bg-[#EAE4DC] text-[#1C1B18] border border-[#DCD4C8]">
                    Register NGO
                  </Button>
                </>
              )}
            </div>

          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-2 mt-8 border-b border-[#DCD4C8] pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('hub')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full transition-all cursor-pointer ${
                activeTab === 'hub'
                  ? 'bg-[#1C1B18] text-white shadow-xs font-bold'
                  : 'bg-[#F3F0EA] text-[#666157] hover:text-[#1C1B18]'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${activeTab === 'hub' ? 'text-[#C48B3F]' : 'text-[#666157]'}`} />
              Live Matching Hub
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'hub' ? 'bg-[#C48B3F] text-white' : 'bg-[#EAE4DC] text-[#666157]'
              }`}>
                {role === 'donor' ? `${needs.length} Needs` : `${donations.length} Supplies`}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('workflow')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full transition-all cursor-pointer ${
                activeTab === 'workflow'
                  ? 'bg-[#1C1B18] text-white shadow-xs font-bold'
                  : 'bg-[#F3F0EA] text-[#666157] hover:text-[#1C1B18]'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 ${activeTab === 'workflow' ? 'text-[#C48B3F]' : 'text-[#666157]'}`} />
              How The Bridge Works (8-Step Journey)
            </button>
          </div>

        </div>
      </section>

      {/* Main Tab Content */}
      <main className="flex-1 py-10 text-left">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* TAB 1: LIVE MATCHING HUB */}
          {activeTab === 'hub' && (
            <div className="space-y-8">
              
              {/* DONOR ROLE VIEW */}
              {(role === 'donor' || (role === 'guest' && activeTab === 'hub')) && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCD4C8] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <HeartHandshake className="w-5 h-5 text-[#C48B3F]" />
                        <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                          {role === 'donor' ? 'Urgent NGO Needs Waiting for Supplies' : 'Community NGO Needs Preview'}
                        </h2>
                      </div>
                      <p className="text-[#666157] text-xs mt-1">
                        Select any requirement below to fulfill it with your surplus items.
                      </p>
                    </div>

                    <Link to="/discover" className="text-[#C48B3F] text-xs font-mono font-bold hover:underline flex items-center gap-1">
                      Browse All Needs <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {needs.length === 0 ? (
                    <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-8 rounded-3xl text-center space-y-3">
                      <Package className="w-12 h-12 text-[#C48B3F] mx-auto" />
                      <p className="text-[#1C1B18] font-serif font-bold text-sm">No urgent NGO needs listed at the moment.</p>
                      <Button variant="primary" onClick={() => navigate('/upload-donation')} icon={Upload} className="rounded-full bg-[#1C1B18] text-white">
                        Upload Surplus Donation
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {needs.map((need) => (
                        <div key={need.id} className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0EA] text-[#1C1B18] border border-[#DCD4C8] font-mono font-bold text-[10px]">
                                {need.category}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[9px] uppercase tracking-wider ${
                                need.urgency === 'High' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                                need.urgency === 'Medium' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                'bg-[#F3F0EA] text-[#666157] border border-[#DCD4C8]'
                              }`}>
                                {need.urgency} Urgency
                              </span>
                            </div>

                            <div>
                              <h3 className="font-serif font-bold text-[#1C1B18] text-base">{need.item}</h3>
                              <p className="text-[#666157] text-xs mt-1 flex items-center gap-1 font-medium">
                                <Building2 className="w-3.5 h-3.5 text-[#C48B3F]" />
                                {need.ngo_name || 'Verified NGO'}
                              </p>
                              {need.description && (
                                <p className="text-[#666157] text-xs mt-2 line-clamp-2">{need.description}</p>
                              )}
                            </div>

                            {/* Quantity progress */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-[#666157]">Target Demand</span>
                                <span className="text-[#1C1B18] font-bold">{need.fulfilled_quantity || 0} / {need.quantity} units</span>
                              </div>
                              <div className="w-full bg-[#F3F0EA] h-2 rounded-full overflow-hidden border border-[#DCD4C8]">
                                <div
                                  className="bg-[#C48B3F] h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, (((need.fulfilled_quantity || 0) / need.quantity) * 100))}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="primary"
                            onClick={() => handleFulfillNeed(need)}
                            icon={HeartHandshake}
                            className="w-full justify-center text-xs py-2.5 rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white"
                          >
                            Bridge &amp; Fulfill Need
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* NGO ROLE VIEW */}
              {(role === 'ngo' || (role === 'guest' && activeTab === 'hub')) && (
                <div className="space-y-6 pt-4 border-t border-[#DCD4C8]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCD4C8] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-[#C48B3F]" />
                        <h2 className="font-serif text-xl font-bold text-[#1C1B18]">
                          {role === 'ngo' ? 'Available Surplus Donations For Claim' : 'Donor Surplus Supplies Preview'}
                        </h2>
                      </div>
                      <p className="text-[#666157] text-xs mt-1">
                        Verified items uploaded by local donors. Claim to allocate to your NGO.
                      </p>
                    </div>

                    <Link to="/discover" className="text-[#C48B3F] text-xs font-mono font-bold hover:underline flex items-center gap-1">
                      Browse All Supplies <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {donations.length === 0 ? (
                    <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-8 rounded-3xl text-center space-y-3">
                      <Package className="w-12 h-12 text-[#C48B3F] mx-auto" />
                      <p className="text-[#1C1B18] font-serif font-bold text-sm">No unclaimed surplus items available right now.</p>
                      <Button variant="primary" onClick={() => navigate('/post-need')} icon={Zap} className="rounded-full bg-[#1C1B18] text-white">
                        Post Emergency Need
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {donations.filter(d => d.status === 'VERIFIED' || d.status === 'PENDING').slice(0, 6).map((donation) => (
                        <div key={donation.id} className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0EA] text-[#1C1B18] border border-[#DCD4C8] font-mono font-bold text-[10px]">
                                {donation.category}
                              </span>
                              <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[9px] bg-[#F3F0EA] text-[#666157] uppercase tracking-wider border border-[#DCD4C8]">
                                {donation.condition || 'Good Condition'}
                              </span>
                            </div>

                            <div>
                              <h3 className="font-serif font-bold text-[#1C1B18] text-base">{donation.title || donation.itemName}</h3>
                              <p className="text-[#666157] text-xs mt-1 flex items-center gap-1 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-[#C48B3F]" />
                                {donation.pickup_address || donation.location?.address || 'Mumbai Region'}
                              </p>
                              {donation.description && (
                                <p className="text-[#666157] text-xs mt-2 line-clamp-2">{donation.description}</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#DCD4C8] font-mono">
                              <span className="text-[#666157]">Quantity Available</span>
                              <span className="text-[#1C1B18] font-bold">{donation.quantity} units</span>
                            </div>
                          </div>

                          <Button
                            variant="primary"
                            onClick={() => handleClaimSupply(donation.id)}
                            isDisabled={claimingId === donation.id}
                            icon={claimingId === donation.id ? RefreshCw : Building2}
                            className="w-full justify-center text-xs py-2.5 rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white"
                          >
                            {claimingId === donation.id ? 'Claiming...' : 'Claim & Request Delivery'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* QUICK ROLE ACTION CARDS */}
              <div className="pt-8 border-t border-[#DCD4C8]">
                <h3 className="font-serif font-bold text-[#1C1B18] text-lg mb-4">
                  Quick Platform Actions
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-5 rounded-3xl space-y-3 shadow-xs">
                    <div className="w-10 h-10 rounded-2xl bg-[#F3F0EA] text-[#C48B3F] flex items-center justify-center font-bold border border-[#DCD4C8]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h4 className="font-serif font-bold text-[#1C1B18] text-base">Donate Surplus Items</h4>
                    <p className="text-[#666157] text-xs leading-relaxed">
                      Upload spare textbooks, clothes, electronics, or medical kits to connect with non-profits.
                    </p>
                    <Button variant="secondary" onClick={() => navigate('/upload-donation')} className="w-full text-xs rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#1C1B18]">
                      Start Donation Listing
                    </Button>
                  </div>

                  <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-5 rounded-3xl space-y-3 shadow-xs">
                    <div className="w-10 h-10 rounded-2xl bg-[#F3F0EA] text-[#C48B3F] flex items-center justify-center font-bold border border-[#DCD4C8]">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h4 className="font-serif font-bold text-[#1C1B18] text-base">Post Emergency NGO Need</h4>
                    <p className="text-[#666157] text-xs leading-relaxed">
                      Are you a registered NGO? Broadcast urgent community demands for donor matching.
                    </p>
                    <Button variant="secondary" onClick={() => navigate('/post-need')} className="w-full text-xs rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#1C1B18]">
                      Broadcast Requirement
                    </Button>
                  </div>

                  <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-5 rounded-3xl space-y-3 shadow-xs">
                    <div className="w-10 h-10 rounded-2xl bg-[#F3F0EA] text-[#C48B3F] flex items-center justify-center font-bold border border-[#DCD4C8]">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <h4 className="font-serif font-bold text-[#1C1B18] text-base">Explore Impact Metrics</h4>
                    <p className="text-[#666157] text-xs leading-relaxed">
                      View real-time CO₂ savings, verified delivery milestones, and circular economy stats.
                    </p>
                    <Button variant="secondary" onClick={() => navigate('/impact')} className="w-full text-xs rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#1C1B18]">
                      View Impact Dashboard
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: 8-STEP WORKFLOW TIMELINE */}
          {activeTab === 'workflow' && (
            <div className="flex flex-col lg:flex-row gap-8">

              {/* Left: Step Navigation */}
              <div className="w-full lg:w-80 shrink-0 space-y-2">
                {STEPS.map((step) => {
                  const Icon = step.icon;
                  const isActive = activeStep === step.num;
                  const isPast = activeStep > step.num;
                  return (
                    <button
                      key={step.num}
                      onClick={() => setActiveStep(step.num)}
                      className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#C48B3F] bg-[#EAE4DC] shadow-xs font-bold'
                          : 'border-transparent hover:bg-[#EAE4DC]'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-[#1C1B18] text-[#C48B3F]' :
                        isPast ? 'bg-[#EAE4DC] text-[#1C1B18]' :
                        'bg-[#F3F0EA] text-[#666157]'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[#666157] font-mono uppercase tracking-wider text-[9px] ${isActive ? 'text-[#C48B3F] font-bold' : ''}`}>
                          Step {step.num}
                        </p>
                        <p className={`text-xs truncate ${isActive ? 'text-[#1C1B18] font-serif font-bold' : 'text-[#666157]'}`}>
                          {step.title}
                        </p>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-[#C48B3F] shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Right: Step Detail Card */}
              <div className="flex-1">
                <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl shadow-xs overflow-hidden">
                  
                  {/* Step Header */}
                  <div className="p-6 lg:p-8 border-b border-[#DCD4C8] bg-[#F3F0EA]/50">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[#C48B3F] bg-[#1C1B18]`}>
                        <StepIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[#C48B3F] font-mono font-bold uppercase tracking-wider text-xs">
                          Step {currentStep.num} of {STEPS.length}
                        </p>
                        <h2 className="font-serif font-bold text-[#1C1B18] text-xl">
                          {currentStep.title}
                        </h2>
                      </div>
                    </div>
                    <p className="text-[#666157] mt-3 text-xs leading-relaxed max-w-2xl">
                      {currentStep.desc}
                    </p>
                  </div>

                  {/* Step Body */}
                  <div className="p-6 lg:p-8 space-y-6">
                    
                    {/* Checklist */}
                    <div className="space-y-2.5">
                      <h3 className="font-mono font-bold text-[#666157] uppercase tracking-wider text-xs">
                        What happens at this step
                      </h3>
                      <ul className="space-y-2">
                        {currentStep.details.map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-[#1C1B18] text-xs">
                            <CheckCircle className="w-4 h-4 text-[#C48B3F] shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Live Preview Mockup */}
                    <div className="space-y-3">
                      <h3 className="font-mono font-bold text-[#666157] uppercase tracking-wider text-xs">
                        Interactive Live Preview
                      </h3>
                      <div className="border border-[#DCD4C8] rounded-2xl p-5 bg-[#F3F0EA]">
                        {currentStep.mockup}
                      </div>
                    </div>
                  </div>

                  {/* Step Navigation Footer */}
                  <div className="p-6 lg:p-8 border-t border-[#DCD4C8] bg-[#F3F0EA]/30 flex items-center justify-between">
                    <Button
                      variant="secondary"
                      onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                      isDisabled={activeStep === 1}
                      className="text-xs rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#1C1B18]"
                    >
                      Previous Step
                    </Button>
                    
                    {/* Progress indicator */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      {STEPS.map(s => (
                        <div
                          key={s.num}
                          className={`w-2.5 h-2.5 rounded-full transition-colors cursor-pointer ${
                            s.num === activeStep ? 'bg-[#C48B3F]' :
                            s.num < activeStep ? 'bg-[#1C1B18]' :
                            'bg-[#DCD4C8]'
                          }`}
                          onClick={() => setActiveStep(s.num)}
                        />
                      ))}
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => setActiveStep(Math.min(STEPS.length, activeStep + 1))}
                      isDisabled={activeStep === STEPS.length}
                      icon={ArrowRight}
                      className="text-xs rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white"
                    >
                      Next Step
                    </Button>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
