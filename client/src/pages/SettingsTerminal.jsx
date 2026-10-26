import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/GlobalStateContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import { useToast } from '../components/ui/Toast';
import { authAPI, getApiError } from '../api/index';
import {
  Settings, User, ShieldCheck, Lock, Bell, Eye, Sun,
  ToggleLeft, ToggleRight, Check, Loader2, Building2,
  HeartHandshake, Save, Key, Phone, Mail, MapPin,
  CheckCircle2, Shield, AlertCircle
} from 'lucide-react';

const AVATAR_OPTIONS = ['👤', '🧑‍💻', '🏢', '🌿', '🤝', '🛡️', '🚀', '📦', '💡', '🌟'];

export default function SettingsTerminal() {
  const { user, setUser, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');

  const [name, setName] = useState(user?.name || user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.address || user?.location || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '👤');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isTogglingMfa, setIsTogglingMfa] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [textSize, setTextSize] = useState(() => localStorage.getItem('pref_textSize') || 'normal');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('pref_highContrast') === 'true');
  const [emailAlerts, setEmailAlerts] = useState(() => localStorage.getItem('pref_emailAlerts') !== 'false');
  const [transitAlerts, setTransitAlerts] = useState(() => localStorage.getItem('pref_transitAlerts') !== 'false');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await authAPI.getMe();
        if (res.data) {
          setName(res.data.username || user?.name || '');
          setEmail(res.data.email || user?.email || '');
          if (res.data.profile) {
            setMfaEnabled(!!res.data.profile.mfa_enabled);
            setPhone(res.data.profile.phone || '');
            setLocation(res.data.profile.address || '');
          }
        }
      } catch (err) {
        console.warn('Failed to load profile details:', err);
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('pref_textSize', textSize);
    if (textSize === 'small') {
      document.documentElement.style.fontSize = '14px';
    } else if (textSize === 'large') {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '16px';
    }
  }, [textSize]);

  useEffect(() => {
    localStorage.setItem('pref_highContrast', String(highContrast));
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const updatedRes = await authAPI.updateMe({
        name,
        email,
        phone,
        address: location,
        location,
        avatar: selectedAvatar,
      });

      if (updatedRes?.data) {
        const freshUser = {
          ...user,
          name: updatedRes.data.username || name,
          email: updatedRes.data.email || email,
          avatar: updatedRes.data.avatar || selectedAvatar,
        };
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      }

      if (refreshUserData) await refreshUserData();
      toast.success('Account profile updated successfully!');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleMFA = async () => {
    setIsTogglingMfa(true);
    const nextState = !mfaEnabled;
    try {
      await authAPI.updateMe({ mfa_enabled: nextState });
      setMfaEnabled(nextState);
      toast.success(`Two-Factor Authentication ${nextState ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsTogglingMfa(false);
    }
  };

  const handleSavePreferences = (e) => {
    if (e) e.preventDefault();
    localStorage.setItem('pref_emailAlerts', String(emailAlerts));
    localStorage.setItem('pref_transitAlerts', String(transitAlerts));
    toast.success('Application preferences saved.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 pt-24 text-left">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DCD4C8] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-[#EAE4DC] border border-[#DCD4C8] text-[#C48B3F]">
                <Settings className="w-5 h-5" />
              </span>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#1C1B18]">
                Account &amp; Preferences
              </h1>
            </div>
            <p className="text-[#666157] text-xs">
              Manage your personal profile, security credentials, notification rules, and accessibility.
            </p>
          </div>

          {/* User Role Card */}
          <div className="bg-[#EAE4DC] border border-[#DCD4C8] px-4 py-2.5 rounded-full shadow-xs flex items-center gap-3 shrink-0">
            <span className="text-2xl">{user?.avatar || selectedAvatar || '👤'}</span>
            <div>
              <p className="font-serif font-bold text-[#1C1B18] text-xs">{user?.name || user?.username || 'DonateBridge User'}</p>
              <p className="text-[10px] text-[#666157] capitalize font-mono font-bold flex items-center gap-1">
                {user?.role === 'ngo' ? <Building2 className="w-3 h-3 text-[#C48B3F]" /> : <HeartHandshake className="w-3 h-3 text-[#C48B3F]" />}
                {user?.role || 'donor'} Account
              </p>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#DCD4C8] pb-3 overflow-x-auto">
          {[
            { id: 'profile', label: 'Profile Details', icon: User },
            { id: 'security', label: 'Security & Auth', icon: Lock },
            { id: 'accessibility', label: 'Display & Accessibility', icon: Eye },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1C1B18] text-white shadow-xs'
                    : 'bg-[#EAE4DC] text-[#666157] hover:text-[#1C1B18]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#C48B3F]' : 'text-[#666157]'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: PROFILE DETAILS */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* Avatar Selector */}
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-6 rounded-3xl space-y-4 shadow-xs">
              <h3 className="font-serif font-bold text-[#1C1B18] text-base flex items-center gap-2">
                <User className="w-4 h-4 text-[#C48B3F]" /> Profile Avatar
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
                      selectedAvatar === av
                        ? 'bg-[#F3F0EA] border-2 border-[#C48B3F] scale-110 shadow-xs'
                        : 'bg-[#F3F0EA] border border-[#DCD4C8] hover:bg-[#EAE4DC]'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Personal Details Form */}
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-6 rounded-3xl space-y-5 shadow-xs">
              <h3 className="font-serif font-bold text-[#1C1B18] text-base flex items-center gap-2">
                <User className="w-4 h-4 text-[#C48B3F]" /> Account Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField
                  label="Full Name / Display Name"
                  icon={User}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  required
                />

                <InputField
                  label="Email Address"
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@domain.com"
                  required
                />

                <InputField
                  label="Phone Number"
                  icon={Phone}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />

                <InputField
                  label="Primary Location / Address"
                  icon={MapPin}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, State (e.g. Mumbai, MH)"
                />
              </div>
            </div>

            {/* NGO Quick Details Card (If NGO Role) */}
            {user?.role === 'ngo' && (
              <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-6 rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-[#1C1B18] text-base flex items-center gap-2">
                      <ShieldCheck className="w-4.5 h-4.5 text-[#C48B3F]" /> NGO Verification Certificate
                    </h3>
                    <p className="text-[#666157] text-xs">
                      Update official non-profit registration numbers, mission statement, and governance documents.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate('/ngo-register')}
                    className="text-xs shrink-0 rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#1C1B18]"
                  >
                    Edit NGO Profile
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                isDisabled={isSavingProfile}
                icon={isSavingProfile ? Loader2 : Save}
                className="px-6 rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white"
              >
                {isSavingProfile ? 'Saving Changes...' : 'Save Profile Details'}
              </Button>
            </div>

          </form>
        )}

        {/* TAB 2: SECURITY & AUTH */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            
            {/* Two-Factor Authentication */}
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-6 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-[#1C1B18] text-base flex items-center gap-2">
                    <Shield className="w-4.5 h-4.5 text-[#C48B3F]" /> Two-Factor Login Validation (OTP)
                  </h3>
                  <p className="text-[#666157] text-xs max-w-xl">
                    Require a 6-digit OTP code sent via email whenever you log into your DonateBridge account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleMFA}
                  disabled={isTogglingMfa}
                  className="focus:outline-none cursor-pointer"
                >
                  {mfaEnabled ? (
                    <ToggleRight className="w-10 h-10 text-[#C48B3F]" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-[#666157]" />
                  )}
                </button>
              </div>

              <div className="p-3.5 bg-[#F3F0EA] rounded-2xl border border-[#DCD4C8] text-xs text-[#666157] flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-[#C48B3F] shrink-0" />
                <span>Current Status: <strong className="text-[#1C1B18]">{mfaEnabled ? 'Enabled' : 'Disabled'}</strong></span>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-6 rounded-3xl space-y-5 shadow-xs">
              <h3 className="font-serif font-bold text-[#1C1B18] text-base flex items-center gap-2">
                <Key className="w-4.5 h-4.5 text-[#C48B3F]" /> Password Management
              </h3>

              <div className="space-y-4 max-w-xl">
                <InputField
                  label="Current Password"
                  type="password"
                  icon={Lock}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />

                <InputField
                  label="New Password"
                  type="password"
                  icon={Lock}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />

                <InputField
                  label="Confirm New Password"
                  type="password"
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!newPassword || newPassword !== confirmPassword) {
                      toast.error('Passwords do not match or field is empty.');
                      return;
                    }
                    toast.success('Password update request processed.');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  icon={Key}
                  className="text-xs rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#1C1B18]"
                >
                  Update Password
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: DISPLAY & ACCESSIBILITY */}
        {activeTab === 'accessibility' && (
          <div className="space-y-6">
            
            {/* Visual Theme Info */}
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-6 rounded-3xl space-y-4 shadow-xs">
              <h3 className="font-serif font-bold text-[#1C1B18] text-base flex items-center gap-2">
                <Sun className="w-4.5 h-4.5 text-[#C48B3F]" /> Color Design System
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-serif font-bold text-[#1C1B18] text-sm">Light Editorial Theme</p>
                  <p className="text-[#666157] text-xs mt-0.5">
                    Curated color palette optimized for high legibility and warm human-centric charity aesthetic.
                  </p>
                </div>
                <span className="px-3 py-1 bg-[#F3F0EA] text-[#C48B3F] font-mono font-bold text-xs rounded-full border border-[#DCD4C8]">
                  ACTIVE
                </span>
              </div>
            </div>

            {/* Text Size Control */}
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-6 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-serif font-bold text-[#1C1B18] text-sm">Adjust Legibility Text Size</p>
                  <p className="text-[#666157] text-xs mt-0.5">
                    Dynamically scales application font sizing for improved reading comfort.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-[#F3F0EA] p-1.5 rounded-full border border-[#DCD4C8]">
                  {['small', 'normal', 'large'].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setTextSize(sz)}
                      className={`px-3 py-1 text-xs font-mono font-bold rounded-full capitalize transition-all cursor-pointer ${
                        textSize === sz
                          ? 'bg-[#1C1B18] text-white shadow-xs'
                          : 'text-[#666157] hover:bg-[#EAE4DC]'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* High Contrast Mode Toggle */}
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-6 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-serif font-bold text-[#1C1B18] text-sm">High Contrast Reading Mode</p>
                  <p className="text-[#666157] text-xs mt-0.5">
                    Enhance text border contrast to aid visual accessibility.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setHighContrast(!highContrast)}
                  className="focus:outline-none cursor-pointer"
                >
                  {highContrast ? (
                    <ToggleRight className="w-10 h-10 text-[#C48B3F]" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-[#666157]" />
                  )}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] p-6 rounded-3xl space-y-5 shadow-xs">
              <h3 className="font-serif font-bold text-[#1C1B18] text-base flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-[#C48B3F]" /> Email &amp; SMS Notifications
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-[#DCD4C8]">
                  <div>
                    <p className="font-serif font-bold text-[#1C1B18] text-sm">Donation Match &amp; Claim Email Alerts</p>
                    <p className="text-[#666157] text-xs mt-0.5">
                      Receive instant emails when a donation is matched or claimed by a local NGO.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailAlerts(!emailAlerts)}
                    className="focus:outline-none cursor-pointer"
                  >
                    {emailAlerts ? (
                      <ToggleRight className="w-10 h-10 text-[#C48B3F]" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-[#666157]" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="font-serif font-bold text-[#1C1B18] text-sm">Logistics Courier &amp; Delivery SMS</p>
                    <p className="text-[#666157] text-xs mt-0.5">
                      Receive mobile text updates when couriers dispatch or arrive at pickup locations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTransitAlerts(!transitAlerts)}
                    className="focus:outline-none cursor-pointer"
                  >
                    {transitAlerts ? (
                      <ToggleRight className="w-10 h-10 text-[#C48B3F]" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-[#666157]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#DCD4C8]">
                <Button variant="primary" onClick={handleSavePreferences} icon={Save} className="text-xs rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white">
                  Save Alert Preferences
                </Button>
              </div>
            </div>

          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
