import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, useSocket } from '../context/GlobalStateContext';
import { useToast } from '../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, ArrowLeft, Eye, EyeOff, Sparkles, Activity, CheckCircle2, Truck, Compass, MapPin, RefreshCw, Upload, FileText, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import OtpInputField from '../components/ui/OtpInputField';
import LeafletMap from '../components/ui/LeafletMap';
import { authAPI, locationAPI, getApiError } from '../api/index';

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

export default function AuthSuite() {
  const { loginWithTokens, authMessage, clearAuthMessage, isAuthenticated, user } = useAuth();
  const { addNotification } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const notifyUser = (title, message, type = 'system') => {
    if (addNotification) {
      addNotification({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type,
        title,
        message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      });
    }
  };

  const isRegisterParam = searchParams.get('tab') === 'register' || 
    searchParams.get('register') === 'true' || 
    searchParams.get('mode') === 'register' || 
    window.location.pathname.includes('/register');
  const roleParam = searchParams.get('role');

  const [isRegister, setIsRegister] = useState(isRegisterParam);
  const [selectedRole, setSelectedRole] = useState((roleParam && ['donor', 'ngo', 'admin'].includes(roleParam)) ? roleParam : 'donor');
  const [step, setStep] = useState('credentials');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const [pendingRegData, setPendingRegData] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Donor Identity Verification (Aadhaar & PAN)
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarDocUrl, setAadhaarDocUrl] = useState('');
  const [panDocUrl, setPanDocUrl] = useState('');
  const [uploadingAadhaar, setUploadingAadhaar] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);

  // Location & Coordinates state (no predefined default)
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [detectedLoc, setDetectedLoc] = useState({
    address: '',
    city: '',
    state: '',
    pin_code: '',
    country: 'India'
  });
  const [locStatus, setLocStatus] = useState('idle'); // 'idle' | 'detecting' | 'success' | 'error'
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');

  const { register, handleSubmit, formState: { errors }, reset: resetForm, setValue } = useForm();

  const triggerReverseGeocode = async (lat, lng) => {
    setLocStatus('detecting');
    try {
      const res = await locationAPI.reverseGeocode(lat, lng);
      const data = res.data;
      setDetectedLoc({
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pin_code: data.pin_code || '',
        country: data.country || ''
      });
      setLocStatus('success');
      toast.success('Location detected successfully.');
    } catch {
      setLocStatus('error');
      toast.error('Unable to determine location. Please select location manually.');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus('error');
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setLocStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        triggerReverseGeocode(lat, lng);
      },
      () => {
        setLocStatus('error');
        toast.error('Unable to access your location. Please select your location manually on the map.');
      },
      { timeout: 5000 }
    );
  };

  const handleMapClick = (latlng) => {
    const lat = parseFloat(latlng.lat);
    const lng = parseFloat(latlng.lng);
    setCoords({ lat, lng });
    triggerReverseGeocode(lat, lng);
  };

  // Redirect if user is already logged in
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      if (user.role === 'admin') navigate('/admin', { replace: true });
      else if (user.role === 'ngo') navigate('/ngo', { replace: true });
      else navigate('/donor', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const shouldRegister = searchParams.get('tab') === 'register' || 
      searchParams.get('register') === 'true' || 
      searchParams.get('mode') === 'register' || 
      window.location.pathname.includes('/register');
    const shouldLogin = searchParams.get('tab') === 'login' || 
      window.location.pathname.includes('/login');

    if (shouldRegister) {
      setIsRegister(true);
    } else if (shouldLogin) {
      setIsRegister(false);
    }

    const r = searchParams.get('role');
    if (r && ['donor', 'ngo', 'admin'].includes(r)) {
      setSelectedRole(r);
    }
  }, [searchParams]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const redirectAfterLogin = (role) => {
    if (role === 'admin') navigate('/admin', { replace: true });
    else if (role === 'ngo') navigate('/ngo', { replace: true });
    else navigate('/donor', { replace: true });
  };

  const handleAadhaarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAadhaar(true);
    try {
      const res = await authAPI.uploadFile(file);
      setAadhaarDocUrl(res.data.url);
      toast.success('Aadhaar document uploaded successfully.');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setUploadingAadhaar(false);
    }
  };

  const handlePanUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPan(true);
    try {
      const res = await authAPI.uploadFile(file);
      setPanDocUrl(res.data.url);
      toast.success('PAN card document uploaded successfully.');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setUploadingPan(false);
    }
  };

  const onSubmitCredentials = async (data) => {
    setAuthError('');
    clearAuthMessage();
    setLoading(true);

    try {
      if (isRegister) {
        if (selectedRole === 'donor') {
          const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
          const cleanPan = panNumber.trim().toUpperCase();

          if (cleanAadhaar && cleanAadhaar.length !== 12) {
            setAuthError('Aadhaar number must be exactly 12 digits (format: 1234-5678-9012).');
            setLoading(false);
            return;
          }
          if (cleanPan && !/^[A-Z0-9]{10}$/.test(cleanPan)) {
            setAuthError('PAN card must be a 10-character alphanumeric code (e.g. ABCDE1234F).');
            setLoading(false);
            return;
          }

          data.aadhaar_number = cleanAadhaar || null;
          data.pan_number = cleanPan || null;
          data.aadhaar_doc = aadhaarDocUrl || null;
          data.pan_doc = panDocUrl || null;
        }

        await authAPI.sendOTP(data.email, true);
        setPendingRegData(data);
        setOtpCode('');
        setStep('register_otp');
        startResendTimer();
        toast.success('Verification OTP sent to your email address.');
        notifyUser('Verification Code Sent', `A 6-digit OTP verification code was sent to ${data.email}.`);
      } else {
        const loginRes = await authAPI.login(data.email, data.password);
        const { user, access, refresh } = loginRes.data;
        loginWithTokens(user, access, refresh);
        clearAuthMessage();
        redirectAfterLogin(user.role);
      }
    } catch (err) {
      setAuthError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOTP = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setAuthError('Please enter a valid 6-digit OTP.');
      return;
    }
    setLoading(true);
    setAuthError('');
    try {
      await authAPI.verifyOTP(pendingRegData.email, otpCode);
      const rawUsername = pendingRegData.name || pendingRegData.email.split('@')[0];
      const cleanUsername = rawUsername.replace(/[^a-zA-Z0-9@.+-_]/g, '') + Math.floor(Math.random() * 10000);
      const registerRes = await authAPI.register(
        cleanUsername,
        pendingRegData.email,
        pendingRegData.password,
        selectedRole,
        '👤',
        {
          lat: coords.lat,
          lng: coords.lng,
          address: detectedLoc.address,
          city: detectedLoc.city,
          state: detectedLoc.state,
          pin_code: detectedLoc.pin_code,
          country: detectedLoc.country,
          aadhaar_number: pendingRegData.aadhaar_number || null,
          pan_number: pendingRegData.pan_number || null,
          aadhaar_doc: pendingRegData.aadhaar_doc || null,
          pan_doc: pendingRegData.pan_doc || null,
        }
      );
      const { user, access, refresh } = registerRes.data;
      loginWithTokens(user, access, refresh);
      toast.success('Account created! Verification documents submitted to Admin.');
      notifyUser('Account Registered', `Welcome to DonateBridge! Your donor identity documents are pending administrator audit.`, 'system');
      if (user.role === 'ngo') {
        navigate('/ngo-register');
      } else {
        redirectAfterLogin(user.role);
      }
    } catch (err) {
      setAuthError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };


  const handleResendOTP = async (email, isSignup = false) => {
    if (resendTimer > 0) return;
    setAuthError('');
    setLoading(true);
    try {
      await authAPI.sendOTP(email, isSignup);
      startResendTimer();
      toast.success('OTP has been sent to your email address.');
      notifyUser('OTP Resent', `A new 6-digit verification code was sent to ${email}.`);
    } catch (err) {
      setAuthError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { setAuthError('Email is required.'); return; }
    setLoading(true);
    setAuthError('');
    try {
      await authAPI.forgotPassword(forgotEmail);
      toast.success('OTP has been sent to your email address.');
      notifyUser('Password Reset Code', `Password recovery code was sent to ${forgotEmail}.`);
      setOtpCode('');
      startResendTimer();
      setStep('forgot_otp');
    } catch (err) {
      setAuthError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOTP = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setAuthError('Please enter a valid 6-digit OTP.');
      return;
    }
    setLoading(true);
    setAuthError('');
    try {
      await authAPI.verifyOTP(forgotEmail, otpCode);
      setStep('reset');
    } catch (err) {
      setAuthError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPassword !== resetConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    if (resetPassword.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(forgotEmail, otpCode, resetPassword);
      toast.success('Password updated successfully. Please sign in.');
      setStep('credentials');
      setIsRegister(false);
      resetForm();
      setAuthError('');
    } catch (err) {
      setAuthError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col lg:grid lg:grid-cols-12 bg-[#F3F0EA] font-sans text-[#1C1B18]">

      {/* LEFT SIDE - Brand Experience Banner */}
      <div className="lg:col-span-5 bg-[#0F0E0C] p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden min-h-75 lg:min-h-screen text-left border-r border-[#262420]">

        {/* Decorative background glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#C48B3F]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#C48B3F]/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Top Back Navigation Button */}
        <div className="relative z-10">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#191815] hover:bg-[#C48B3F] text-white font-medium text-xs tracking-wider transition-all cursor-pointer border border-[#262420]"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Home
          </button>
        </div>

        {/* Main Brand Messaging */}
        <div className="relative z-10 space-y-8 max-w-lg my-auto py-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#191815] text-[#C48B3F] font-mono font-bold text-[10px] uppercase tracking-widest border border-[#262420]">
              <Sparkles className="w-3.5 h-3.5" /> Secure Logistics Portal
            </span>
            <h1 className="bg-[#5C4033] p-6 rounded-lg text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#F3F0EA] leading-tight tracking-tight">
              Connecting Donors &amp; NGOs with Transparency.
            </h1>

            <p className="text-sm sm:text-base text-[#DCD4C8] leading-relaxed font-normal">
              Direct physical supply logistics, zero middle-agency escrow leakage, real-time tracking, and instant verification paperwork.
            </p>
          </div>

          {/* High-Contrast Feature Highlights */}
          <div className="space-y-4 pt-6 border-t border-[#262420]">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-[#191815] border border-[#262420] flex items-center justify-center shrink-0 text-[#C48B3F]">
                <ShieldCheck className="w-5 h-5 text-[#C48B3F]" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#F3F0EA] text-sm">Verified Nonprofit Network</h4>
                <p className="text-xs text-[#DCD4C8] mt-0.5 leading-relaxed">
                  Strict admin audits of registration documentation prevent verification fraud.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-[#191815] border border-[#262420] flex items-center justify-center shrink-0 text-[#C48B3F]">
                <Lock className="w-5 h-5 text-[#C48B3F]" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#F3F0EA] text-sm">Encrypted Authentication</h4>
                <p className="text-xs text-[#DCD4C8] mt-0.5 leading-relaxed">
                  Role-based permissions ensure maximum security and zero credential leakage.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-[#191815] border border-[#262420] flex items-center justify-center shrink-0 text-[#C48B3F]">
                <Truck className="w-5 h-5 text-[#C48B3F]" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#F3F0EA] text-sm">Direct Route Dispatches</h4>
                <p className="text-xs text-[#DCD4C8] mt-0.5 leading-relaxed">
                  Coordinate physical logistics seamlessly with vetted couriers and hub pickup points.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs font-mono text-[#A09A8E]">
          &copy; {new Date().getFullYear()} DonateBridge Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE - Authentication Form Card */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 bg-[#F3F0EA]">

        <div className="w-full max-w-md bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-8 sm:p-10 shadow-xs text-left space-y-6">
          <AnimatePresence mode="wait">

            {/* CREDENTIALS STEP */}
            {step === 'credentials' && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1B18] tracking-tight">
                    {isRegister ? 'Create an Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-xs text-[#666157] font-medium">
                    {isRegister
                      ? 'Register to dispatch supplies or request NGO assistance.'
                      : 'Sign in to access your dispatch dashboard.'}
                  </p>
                  {authMessage && (
                    <p className="text-xs text-rose-700 font-bold bg-rose-50 p-3 border border-rose-200 rounded-2xl mt-3">
                      {authMessage}
                    </p>
                  )}
                </div>

                {/* Role Switcher */}
                <div className="flex p-1 bg-[#F3F0EA] rounded-full border border-[#DCD4C8]">
                  {(!isRegister ? ['donor', 'ngo', 'admin'] : ['donor', 'ngo']).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => { setSelectedRole(role); clearAuthMessage(); }}
                      className={`flex-1 py-2 text-xs font-medium rounded-full transition-all capitalize cursor-pointer ${selectedRole === role
                        ? 'bg-[#1C1B18] text-white shadow-xs'
                        : 'text-[#666157] hover:text-[#1C1B18]'
                        }`}
                    >
                      {role === 'donor' ? (isRegister ? 'Donor Account' : 'Donor') : role === 'ngo' ? (isRegister ? 'NGO Organization' : 'NGO') : 'Administrator'}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit(onSubmitCredentials)} className="space-y-4">
                  {isRegister && (
                    <InputField
                      label={selectedRole === 'ngo' ? 'Organization Legal Name' : 'Full Name'}
                      id="name"
                      placeholder={selectedRole === 'ngo' ? 'Hope Foundation' : 'Sarah Jenkins'}
                      error={errors.name}
                      {...register('name', { required: 'Name is required' })}
                    />
                  )}

                  <InputField
                    label={isRegister ? "Email Address" : "Email Address or Username"}
                    id="email"
                    type={isRegister ? "email" : "text"}
                    placeholder={selectedRole === 'admin' ? "Enter email or username" : `${selectedRole}@donatebridge.org`}
                    error={errors.email}
                    {...register('email', {
                      required: isRegister ? 'Email is required' : 'Email or username is required',
                      ...(isRegister ? {
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      } : {}),
                    })}
                  />

                  <div className="relative">
                    <InputField
                      label="Password"
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      error={errors.password}
                      {...register('password', {
                        required: 'Password is required',
                        ...(isRegister && {
                          minLength: { value: 8, message: 'Password must be at least 8 characters' }
                        })
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8.5 text-[#666157] hover:text-[#C48B3F] transition-colors p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Automatic Location & Coordinates Selection Block */}
                  {isRegister && (
                    <div className="space-y-3 pt-2 border-t border-[#DCD4C8]">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-serif font-bold text-[#1C1B18] flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-[#C48B3F]" /> Location & Geographic Pin
                        </span>
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          className="text-[11px] font-bold text-[#C48B3F] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Use My Location
                        </button>
                      </div>

                      {/* Coordinates Input Grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] font-mono text-[#666157] uppercase font-bold block mb-1">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 28.6139"
                            value={coords.lat ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              setCoords(prev => ({ ...prev, lat: val }));
                              if (val !== null && coords.lng !== null) triggerReverseGeocode(val, coords.lng);
                            }}
                            className="w-full bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl px-3 py-2 text-xs font-mono text-[#1C1B18] outline-none focus:border-[#C48B3F]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-[#666157] uppercase font-bold block mb-1">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 77.2090"
                            value={coords.lng ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              setCoords(prev => ({ ...prev, lng: val }));
                              if (coords.lat !== null && val !== null) triggerReverseGeocode(coords.lat, val);
                            }}
                            className="w-full bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl px-3 py-2 text-xs font-mono text-[#1C1B18] outline-none focus:border-[#C48B3F]"
                          />
                        </div>
                      </div>

                      {/* Location Detection Status Box */}
                      <div className="p-3 bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold text-[#666157] uppercase">Auto-Detected Location</span>
                          {locStatus === 'detecting' && (
                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Detecting location...
                            </span>
                          )}
                          {locStatus === 'success' && (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Location detected
                            </span>
                          )}
                          {locStatus === 'error' && (
                            <span className="text-[10px] text-amber-700 font-bold">
                              Unable to determine location. Select manually.
                            </span>
                          )}
                          {locStatus === 'idle' && !coords.lat && (
                            <span className="text-[10px] text-[#666157] font-medium">
                              Not set. Click &ldquo;Use My Location&rdquo; above.
                            </span>
                          )}
                        </div>

                        <p className="font-medium text-[#1C1B18] text-xs truncate">
                          {detectedLoc.address || (detectedLoc.city ? `${detectedLoc.city}, ${detectedLoc.state}` : 'No location pulled yet')}
                        </p>

                        {detectedLoc.city && (
                          <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono text-[#666157]">
                            <div>City: <span className="text-[#1C1B18] font-bold">{detectedLoc.city}</span></div>
                            <div>State: <span className="text-[#1C1B18] font-bold">{detectedLoc.state}</span></div>
                            <div>Pin: <span className="text-[#1C1B18] font-bold">{detectedLoc.pin_code}</span></div>
                          </div>
                        )}
                      </div>

                      {/* Interactive Map Picker Toggle */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowMapPicker(!showMapPicker)}
                          className="text-xs text-[#1C1B18] hover:text-[#C48B3F] font-medium underline flex items-center gap-1 cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5" /> {showMapPicker ? 'Hide Interactive Map' : 'Select Location on Map'}
                        </button>

                        {showMapPicker && (
                          <div className="h-48 rounded-xl overflow-hidden border border-[#DCD4C8] mt-2">
                            <LeafletMap
                              center={coords.lat && coords.lng ? [coords.lat, coords.lng] : [20.5937, 78.9629]}
                              zoom={coords.lat ? 13 : 5}
                              markers={coords.lat && coords.lng ? [{ lat: coords.lat, lng: coords.lng, popupContent: <div><b>Selected Location Pin</b></div> }] : []}
                              onMapClick={handleMapClick}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Donor Identity & Tax Verification (Aadhaar & PAN) */}
                  {isRegister && selectedRole === 'donor' && (
                    <div className="space-y-4 pt-3 border-t border-[#DCD4C8]">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-[#1C1B18] text-xs flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#C48B3F]" />
                          Identity & Tax Verification
                        </span>
                        <span className="text-[10px] font-mono text-[#666157] bg-[#E5DFD5] px-2 py-0.5 rounded-full">
                          Admin Review Required
                        </span>
                      </div>
                      <p className="text-[11px] text-[#666157] leading-relaxed">
                        To maintain a verified and safe donor community, submit your Aadhaar and PAN details. Our admin team reviews documents before approving full donor privileges.
                      </p>

                      {/* Aadhaar Number and Upload */}
                      <div className="p-3 bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl space-y-2.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-mono uppercase font-bold text-[#1C1B18] flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-[#C48B3F]" /> Aadhaar Card
                          </label>
                          <span className="text-[10px] text-[#666157]">12-Digit UID</span>
                        </div>
                        <input
                          type="text"
                          maxLength={14}
                          placeholder="1234-5678-9012"
                          value={aadhaarNumber}
                          onChange={(e) => {
                            setAadhaarNumber(formatAadhaarInput(e.target.value, aadhaarNumber));
                          }}
                          className="w-full bg-white border border-[#DCD4C8] rounded-lg px-3 py-2 text-xs font-mono text-[#1C1B18] outline-none focus:border-[#C48B3F] tracking-wider"
                        />
                        <div className="flex items-center justify-between pt-1">
                          <label className="cursor-pointer text-[11px] font-medium text-[#C48B3F] hover:underline flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingAadhaar ? 'Uploading Aadhaar...' : 'Upload Aadhaar (PDF/JPG)'}</span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                              onChange={handleAadhaarUpload}
                              className="hidden"
                              disabled={uploadingAadhaar}
                            />
                          </label>
                          {uploadingAadhaar && <RefreshCw className="w-3.5 h-3.5 text-[#C48B3F] animate-spin" />}
                        </div>
                        {aadhaarDocUrl && (
                          <div className="flex items-center justify-between text-[11px] bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1.5 rounded-lg">
                            <div className="flex items-center gap-1.5 truncate">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">Aadhaar Document Attached</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={aadhaarDocUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => setAadhaarDocUrl('')}
                                className="text-stone-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* PAN Card Number and Upload */}
                      <div className="p-3 bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl space-y-2.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-mono uppercase font-bold text-[#1C1B18] flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-[#C48B3F]" /> PAN Card
                          </label>
                          <span className="text-[10px] text-[#666157]">10-Character Alphanumeric</span>
                        </div>
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="ABCDE1234F"
                          value={panNumber}
                          onChange={(e) => setPanNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                          className="w-full bg-white border border-[#DCD4C8] rounded-lg px-3 py-2 text-xs font-mono text-[#1C1B18] outline-none focus:border-[#C48B3F] uppercase tracking-wider"
                        />
                        <div className="flex items-center justify-between pt-1">
                          <label className="cursor-pointer text-[11px] font-medium text-[#C48B3F] hover:underline flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingPan ? 'Uploading PAN...' : 'Upload PAN Card (PDF/JPG)'}</span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                              onChange={handlePanUpload}
                              className="hidden"
                              disabled={uploadingPan}
                            />
                          </label>
                          {uploadingPan && <RefreshCw className="w-3.5 h-3.5 text-[#C48B3F] animate-spin" />}
                        </div>
                        {panDocUrl && (
                          <div className="flex items-center justify-between text-[11px] bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1.5 rounded-lg">
                            <div className="flex items-center gap-1.5 truncate">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">PAN Document Attached</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={panDocUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => setPanDocUrl('')}
                                className="text-stone-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isRegister && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => { setStep('forgot'); setAuthError(''); }}
                        className="text-xs text-[#C48B3F] hover:underline font-bold cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium py-3 px-4 rounded-full shadow-xs text-xs transition-all cursor-pointer mt-2"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : isRegister ? 'Continue to Verification' : 'Sign In'}
                  </Button>

                  {authError && (
                    <p className="text-xs text-rose-600 font-bold text-center pt-2">
                      {authError}
                    </p>
                  )}
                </form>

                <div className="pt-4 border-t border-[#DCD4C8] text-center text-xs font-medium text-[#666157]">
                  {isRegister ? 'Already have an account? ' : "Don't have an account yet? "}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}
                    className="text-[#C48B3F] hover:underline font-bold cursor-pointer ml-1"
                  >
                    {isRegister ? 'Sign in' : 'Register Now'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* REGISTER OTP STEP */}
            {step === 'register_otp' && (
              <motion.div
                key="register_otp"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto bg-[#F3F0EA] text-[#C48B3F] rounded-full border border-[#DCD4C8] flex items-center justify-center mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-serif font-bold text-[#1C1B18]">Verification Code Sent</h2>
                  <p className="text-xs text-[#666157] font-medium">
                    We've sent a 6-digit verification code to <span className="font-bold text-[#1C1B18]">{pendingRegData?.email}</span>.<br />
                    Please check your Gmail inbox and enter the code below.
                  </p>
                </div>

                <form onSubmit={handleRegisterOTP} className="space-y-5">
                  <div className="py-2">
                    <label className="block text-xs font-serif font-bold text-[#1C1B18] text-center mb-3">
                      Enter 6-Digit Verification Code
                    </label>
                    <OtpInputField
                      length={6}
                      value={otpCode}
                      onChange={(code) => {
                        setOtpCode(code);
                        if (authError) setAuthError('');
                      }}
                      disabled={loading}
                      error={authError}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium py-3 rounded-full text-xs shadow-xs"
                    disabled={loading || otpCode.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify & Create Account'}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => handleResendOTP(pendingRegData?.email, true)}
                      disabled={resendTimer > 0 || loading}
                      className="text-xs text-[#C48B3F] font-bold hover:underline disabled:opacity-50"
                    >
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setAuthError(''); }}
                    className="w-full py-2 text-xs font-medium text-[#666157] hover:text-[#1C1B18]"
                  >
                    Return to Login
                  </button>
                </form>
              </motion.div>
            )}

            {/* FORGOT PASSWORD STEP */}
            {step === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto bg-[#F3F0EA] text-[#C48B3F] rounded-full border border-[#DCD4C8] flex items-center justify-center mb-3">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-serif font-bold text-[#1C1B18]">Reset Password</h2>
                  <p className="text-xs text-[#666157] font-medium">Enter your account email to receive a recovery code.</p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <InputField
                    label="Email Address"
                    id="forgot-email"
                    type="email"
                    placeholder="name@organization.org"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />

                  <Button
                    type="submit"
                    className="w-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium py-3 rounded-full text-xs shadow-xs"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Recovery Code'}
                  </Button>

                  {authError && <p className="text-xs text-rose-600 font-bold text-center">{authError}</p>}

                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setAuthError(''); }}
                    className="w-full py-2 text-xs font-medium text-[#666157] hover:text-[#1C1B18]"
                  >
                    Cancel &amp; Return
                  </button>
                </form>
              </motion.div>
            )}

            {/* FORGOT OTP STEP */}
            {step === 'forgot_otp' && (
              <motion.div
                key="forgot_otp"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-serif font-bold text-[#1C1B18]">Verification Code Sent</h2>
                  <p className="text-xs text-[#666157] font-medium">
                    We've sent a 6-digit verification code to <span className="font-bold text-[#1C1B18]">{forgotEmail}</span>.<br />
                    Please check your Gmail inbox and enter the code below.
                  </p>
                </div>

                <form onSubmit={handleForgotOTP} className="space-y-5">
                  <div className="py-2">
                    <label className="block text-xs font-serif font-bold text-[#1C1B18] text-center mb-3">
                      Enter 6-Digit Recovery Code
                    </label>
                    <OtpInputField
                      length={6}
                      value={otpCode}
                      onChange={(code) => {
                        setOtpCode(code);
                        if (authError) setAuthError('');
                      }}
                      disabled={loading}
                      error={authError}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium py-3 rounded-full text-xs shadow-xs"
                    disabled={loading || otpCode.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => handleResendOTP(forgotEmail)}
                      disabled={resendTimer > 0 || loading}
                      className="text-xs text-[#C48B3F] font-bold hover:underline disabled:opacity-50"
                    >
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setStep('forgot'); setAuthError(''); }}
                    className="w-full py-2 text-xs font-medium text-[#666157] hover:text-[#1C1B18]"
                  >
                    Back
                  </button>
                </form>
              </motion.div>
            )}

            {/* RESET PASSWORD STEP */}
            {step === 'reset' && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-serif font-bold text-[#1C1B18]">Set New Password</h2>
                  <p className="text-xs text-[#666157] font-medium">Enter a strong new password for your account.</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <InputField
                    label="New Password"
                    id="new-pass"
                    type="password"
                    placeholder="••••••••"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                  />

                  <InputField
                    label="Confirm New Password"
                    id="confirm-new-pass"
                    type="password"
                    placeholder="••••••••"
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    required
                  />

                  <Button
                    type="submit"
                    className="w-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium py-3 rounded-full text-xs shadow-xs"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>

                  {authError && <p className="text-xs text-rose-600 font-bold text-center">{authError}</p>}

                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setAuthError(''); }}
                    className="w-full py-2 text-xs font-medium text-[#666157] hover:text-[#1C1B18]"
                  >
                    Cancel
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
