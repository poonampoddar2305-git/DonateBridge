import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/GlobalStateContext';
import { useToast } from '../components/ui/Toast';
import { 
  Download, Edit2, Check, Mail, Phone, MapPin, 
  ShieldCheck, Lock, Package, FileText, ArrowUpRight, 
  RefreshCw, Leaf, LogOut, CheckCircle2, Plus, Key, Shield,
  Upload, Camera, User, X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import Navbar from '../components/layout/Navbar';
import { authAPI, donationAPI, getApiError } from '../api/index';
import { motion } from 'framer-motion';

const AVATAR_PRESETS = [
  { id: 'av-1', label: 'Default', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=donor&backgroundColor=e8f3ec' },
  { id: 'av-2', label: 'Professional', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah&backgroundColor=b6e3f4' },
  { id: 'av-3', label: 'Executive', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex&backgroundColor=c0aede' },
  { id: 'av-4', label: 'Leader', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael&backgroundColor=ffdfbf' },
  { id: 'av-5', label: 'Hero', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=hero&backgroundColor=d1d4f9' },
  { id: 'av-6', label: 'Eco', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=eco&backgroundColor=ffd5dc' },
];

export default function UserProfile() {
  const { user, setUser, logout, refreshUserData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // UI Modes
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [profileName, setProfileName] = useState(user?.name || user?.username || '');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || AVATAR_PRESETS[0].url);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  
  // Data & Upload States
  const [myDonations, setMyDonations] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [togglingMfa, setTogglingMfa] = useState(false);

  // Load profile & donations from backend DB
  const loadUserData = async () => {
    setLoadingProfile(true);
    try {
      const [meRes, donationsRes] = await Promise.all([
        authAPI.getMe().catch(() => null),
        donationAPI.getMyDonations().catch(() => null)
      ]);

      if (meRes?.data) {
        const u = meRes.data;
        setProfileName(u.username || u.name || '');
        if (u.avatar && (u.avatar.startsWith('http') || u.avatar.startsWith('/media'))) {
          setSelectedAvatar(u.avatar);
        } else {
          setSelectedAvatar(AVATAR_PRESETS[0].url);
        }

        if (u.profile) {
          setProfilePhone(u.profile.phone || '');
          setProfileLocation(u.profile.address || '');
          setMfaEnabled(!!u.profile.mfa_enabled);
        }
      }

      if (donationsRes?.data) {
        setMyDonations(Array.isArray(donationsRes.data) ? donationsRes.data : (donationsRes.data.results || []));
      }
    } catch (err) {
      console.error('Failed to load user profile', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // Custom Profile Image Upload Handler (End-to-End API Integration)
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file size must be under 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const res = await authAPI.uploadFile(file);
      if (res?.data?.url) {
        setSelectedAvatar(res.data.url);
        toast.success('Profile photo uploaded! Click "Save Profile Details" to apply.');
      }
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsUploading(false);
    }
  };

  // Save updated profile details to backend
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (profilePhone && !/^[6-9]\d{9}$/.test(profilePhone.trim())) {
      toast.error('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }
    setIsSaving(true);
    try {
      const updatedRes = await authAPI.updateMe({
        name: profileName,
        phone: profilePhone ? profilePhone.trim() : '',
        address: profileLocation,
        location: profileLocation,
        avatar: selectedAvatar,
        mfa_enabled: mfaEnabled,
      });


      if (updatedRes?.data) {
        const freshUser = {
          ...user,
          name: updatedRes.data.username || profileName,
          avatar: updatedRes.data.avatar || selectedAvatar,
        };
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      }

      await refreshUserData();
      setIsEditing(false);
      toast.success('Profile details saved successfully!');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle MFA Handler
  const handleToggleMFA = async () => {
    setTogglingMfa(true);
    const newMfaState = !mfaEnabled;
    try {
      await authAPI.updateMe({ mfa_enabled: newMfaState });
      setMfaEnabled(newMfaState);
      toast.success(`MFA Authentication ${newMfaState ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setTogglingMfa(false);
    }
  };

  const handleSendResetPassword = async () => {
    try {
      await authAPI.forgotPassword(user?.email);
      toast.success(`Password reset OTP sent to ${user?.email}`);
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const handleDownloadReceipt = (id, title) => {
    toast.info(`Downloading 80G Tax Receipt for ${title} (${id}.pdf)`);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  // Metrics
  const deliveredDonations = myDonations.filter(d => d.status === 'DELIVERED');
  const totalItemsCount = myDonations.reduce((acc, d) => acc + (d.quantity || 1), 0);
  const carbonOffsetKg = totalItemsCount * 10;
  const userLevel = Math.min(5, Math.floor(myDonations.length / 3) + 1);

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] text-[#1C1B18] font-sans">
      <Navbar />

      <main className="grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pt-24 space-y-6 text-left">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCD4C8] pb-5">
          <div className="space-y-1">
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-[#1C1B18] tracking-tight">
              My Profile &amp; Settings
            </h1>
            <p className="text-xs text-[#666157] font-medium">
              View your account details, manage security preferences, and track your contribution history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={loadUserData}
              disabled={loadingProfile}
              className="inline-flex items-center gap-1.5 bg-[#EAE4DC] border border-[#DCD4C8] hover:bg-[#DCD4C8] text-[#1C1B18] px-4 py-2 rounded-full text-xs font-medium transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingProfile ? 'animate-spin' : ''}`} /> Refresh
            </button>
            
            <button 
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: PROFILE & SECURITY */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Personal Details Card */}
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#DCD4C8] pb-4">
                <h3 className="font-serif font-bold text-[#1C1B18] text-lg flex items-center gap-2">
                  Personal Details
                </h3>

                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 bg-[#1C1B18] hover:bg-[#C48B3F] text-white px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-1 bg-[#F3F0EA] hover:bg-[#DCD4C8] text-[#1C1B18] px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border border-[#DCD4C8]"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>

              {/* READ-ONLY VIEW (DEFAULT) */}
              {!isEditing ? (
                <div className="space-y-6">
                  {/* Avatar & Name Header */}
                  <div className="flex items-center gap-4">
                    <img
                      src={selectedAvatar}
                      alt="Profile Avatar"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#C48B3F]/40 bg-[#F3F0EA] shadow-xs"
                      onError={(e) => { e.target.src = AVATAR_PRESETS[0].url; }}
                    />
                    <div className="space-y-1">
                      <h4 className="font-serif font-bold text-[#1C1B18] text-xl tracking-tight">
                        {profileName || 'Member User'}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C48B3F] bg-[#F3F0EA] px-3 py-0.5 rounded-full border border-[#DCD4C8]">
                          {user?.role || 'Donor'}
                        </span>
                        <span className="text-[#666157] text-xs flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C48B3F]" /> Account Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info Table Rows */}
                  <div className="space-y-3 pt-2 text-sm border-t border-[#DCD4C8]">
                    <div className="flex items-center justify-between py-2 border-b border-[#DCD4C8]/50">
                      <span className="text-[#666157] font-medium text-xs flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#C48B3F]" /> Account Email
                      </span>
                      <span className="font-bold text-[#1C1B18] text-xs font-mono">{user?.email}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-[#DCD4C8]/50">
                      <span className="text-[#666157] font-medium text-xs flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#C48B3F]" /> Contact Telephone
                      </span>
                      <span className="font-bold text-[#1C1B18] text-xs">
                        {profilePhone || <span className="text-[#666157] italic">Not provided</span>}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-[#666157] font-medium text-xs flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#C48B3F]" /> Primary Location
                      </span>
                      <span className="font-bold text-[#1C1B18] text-xs">
                        {profileLocation || <span className="text-[#666157] italic">Not provided</span>}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* EDIT FORM VIEW */
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  
                  {/* Profile Photo & Avatar Chooser */}
                  <div className="space-y-3">
                    <label className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider block">Profile Picture</label>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="relative group shrink-0">
                        <img
                          src={selectedAvatar}
                          alt="Profile Avatar"
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-[#C48B3F] bg-[#F3F0EA]"
                          onError={(e) => { e.target.src = AVATAR_PRESETS[0].url; }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="absolute -bottom-1 -right-1 p-1.5 bg-[#1C1B18] text-white rounded-full hover:bg-[#C48B3F] transition-all cursor-pointer"
                          title="Upload Custom Photo"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />

                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {AVATAR_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setSelectedAvatar(preset.url)}
                              className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                                selectedAvatar === preset.url
                                  ? 'border-[#C48B3F] ring-2 ring-[#C48B3F]/20 scale-105'
                                  : 'border-[#DCD4C8] hover:border-[#C48B3F] opacity-80 hover:opacity-100'
                              }`}
                              title={preset.label}
                            >
                              <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="bg-[#F3F0EA] text-[#1C1B18] border border-[#DCD4C8] hover:bg-[#1C1B18] hover:text-white text-xs h-8 px-3 rounded-full font-medium transition-all"
                          >
                            <Upload className="w-3 h-3 mr-1" /> {isUploading ? 'Uploading...' : 'Upload Custom Image'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <InputField
                    label="Full Name / Display Name"
                    id="profileName"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider block">Account Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full bg-[#F3F0EA] border border-[#DCD4C8] p-3 rounded-2xl text-[#666157] text-xs font-medium cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Contact Telephone"
                      id="profilePhone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, ''))}
                    />


                    <InputField
                      label="Location / Area Address"
                      id="profileLocation"
                      placeholder="e.g. Sector 4, East Hub"
                      value={profileLocation}
                      onChange={(e) => setProfileLocation(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2.5 bg-[#F3F0EA] hover:bg-[#DCD4C8] text-[#1C1B18] text-xs font-medium rounded-full transition-all cursor-pointer border border-[#DCD4C8]"
                    >
                      Cancel
                    </button>

                    <Button 
                      type="submit" 
                      variant="primary" 
                      loading={isSaving}
                      className="bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium h-11 px-6 rounded-full shadow-xs"
                    >
                      {isSaving ? 'Saving Changes...' : 'Save Profile Details'}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Account Security Card */}
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCD4C8] pb-3">
                <h3 className="font-serif font-bold text-[#1C1B18] text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#C48B3F]" /> Account Security
                </h3>
                <span className="text-xs font-mono font-bold text-[#666157]">MFA Settings</span>
              </div>

              <div className="p-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="font-serif font-bold text-xs text-[#1C1B18] block">Multi-Factor Authentication (MFA)</span>
                  <span className="text-xs text-[#666157] block">Protect login access with OTP email verification</span>
                </div>

                <button
                  onClick={handleToggleMFA}
                  disabled={togglingMfa}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    mfaEnabled ? 'bg-[#C48B3F]' : 'bg-[#DCD4C8]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      mfaEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-[#666157] font-medium">
                  <Key className="w-4 h-4 text-[#C48B3F]" /> Need to update your password?
                </div>
                <button
                  onClick={handleSendResetPassword}
                  className="text-xs font-bold text-[#C48B3F] hover:underline cursor-pointer"
                >
                  Send Reset OTP →
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: ACCOUNT OVERVIEW & ACTIVITY */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Account Summary Metrics Card */}
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCD4C8] pb-3">
                <h3 className="font-serif font-bold text-[#1C1B18] text-base">Account Overview</h3>
                <span className="px-3 py-0.5 bg-[#F3F0EA] text-[#C48B3F] font-mono font-bold text-[10px] uppercase rounded-full border border-[#DCD4C8]">
                  {user?.role || 'Donor'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#666157] block">Total Dispatches</span>
                  <span className="text-2xl font-black text-[#1C1B18] block font-mono">{myDonations.length}</span>
                </div>

                <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#666157] block">Carbon Offset</span>
                  <span className="text-2xl font-black text-[#C48B3F] block font-mono">{carbonOffsetKg} kg</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl flex items-center justify-between text-xs">
                <span className="text-[#666157] font-medium">Contributor Tier:</span>
                <span className="font-bold text-[#C48B3F]">Level {userLevel} Hero</span>
              </div>
            </div>

            {/* Recent Contribution Dispatches List */}
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCD4C8] pb-3">
                <h3 className="font-serif font-bold text-[#1C1B18] text-base flex items-center gap-2">
                  <Package className="w-4.5 h-4.5 text-[#C48B3F]" /> Recent Dispatches
                </h3>
                <button
                  onClick={() => navigate('/request-wizard')}
                  className="text-xs font-bold text-[#C48B3F] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
              </div>

              {myDonations.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-xs font-serif font-bold text-[#1C1B18]">No active dispatches submitted yet</p>
                  <Button 
                    variant="primary" 
                    onClick={() => navigate('/request-wizard')}
                    className="bg-[#1C1B18] text-white text-xs h-9 px-5 rounded-full font-medium hover:bg-[#C48B3F]"
                  >
                    Start Donation Wizard
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myDonations.slice(0, 4).map((d) => (
                    <div key={d.id} className="p-3.5 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl flex items-center justify-between text-xs">
                      <div className="space-y-0.5 truncate max-w-42.5">
                        <span className="font-serif font-bold text-[#1C1B18] block truncate">{d.title || d.category}</span>
                        <span className="text-[10px] text-[#666157] font-mono block">ID: {d.id} ({d.quantity} u)</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          d.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                          d.status === 'MATCHED' ? 'bg-[#EAE4DC] text-[#C48B3F]' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {d.status}
                        </span>
                        
                        <button
                          onClick={() => navigate(`/tracking/${d.id}`)}
                          className="p-1 text-[#C48B3F] hover:bg-[#DCD4C8] rounded-full transition-colors cursor-pointer"
                          title="Track logistics"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tax Exemption Receipts (80G) */}
            {deliveredDonations.length > 0 && (
              <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#DCD4C8] pb-3">
                  <h3 className="font-serif font-bold text-[#1C1B18] text-base flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-[#C48B3F]" /> 80G Tax Receipts
                  </h3>
                  <span className="text-xs text-[#C48B3F] font-bold">{deliveredDonations.length} Available</span>
                </div>

                <div className="space-y-2.5">
                  {deliveredDonations.map((d) => (
                    <div key={d.id} className="p-3.5 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl flex items-center justify-between text-xs">
                      <div className="truncate max-w-45">
                        <span className="font-serif font-bold text-[#1C1B18] block truncate">{d.title || d.category}</span>
                        <span className="text-[10px] text-[#C48B3F] font-mono block">80G Certificate</span>
                      </div>

                      <button
                        onClick={() => handleDownloadReceipt(d.id, d.title || d.category)}
                        className="inline-flex items-center gap-1 bg-[#1C1B18] text-white px-3 py-1 rounded-full text-[11px] font-medium hover:bg-[#C48B3F] transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
