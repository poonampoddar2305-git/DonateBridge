import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/GlobalStateContext';
import { ngoAPI, authAPI, locationAPI, getApiError } from '../api/index';
import Navbar from '../components/layout/Navbar';
import LeafletMap from '../components/ui/LeafletMap';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import {
  Building, MapPin, Upload, FileText, CheckCircle,
  ArrowRight, ArrowLeft, Trash2, Eye, Compass, Heart, Plus, X, RefreshCw
} from 'lucide-react';

const DOCUMENT_SLOTS = [
  { key: 'govRegCert', label: 'Government Registration Certificate', required: true },
  { key: 'panCard', label: 'PAN Card / Tax Document Copy', required: true },
  { key: 'trustRegCert', label: 'Trust / NGO Registration Proof', required: true },
  { key: 'addressProof', label: 'Office Address Proof (Optional)', required: false }
];

export default function NgoRegister() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refreshUserData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingNgo, setExistingNgo] = useState(null);

  const [step, setStep] = useState(1); // 1: Org Info, 2: Address & Location Map, 3: Document Filings, 4: Success
  const [selectedCoords, setSelectedCoords] = useState({ lat: null, lng: null });
  const [locStatus, setLocStatus] = useState('idle');
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [selectedPreviewPage, setSelectedPreviewPage] = useState(null);
  const [trackingId] = useState(() => Math.floor(1000 + Math.random() * 9000));

  const { register, handleSubmit, setValue, formState: { errors }, trigger } = useForm({
    defaultValues: {
      name: '',
      registrationNumber: '',
      govRegistrationNumber: '',
      ngoType: 'Trust',
      email: '',
      phone: '',
      website: '',
      address: '',
      state: '',
      district: '',
      city: '',
      pinCode: '',
      description: '',
      mission: '',
      workingAreas: '',
      operatingSince: '',
      volunteersCount: ''
    }
  });

  useEffect(() => {
    if (user) {
      if (user.name) setValue('name', user.name);
      if (user.email) setValue('email', user.email);
    }
    ngoAPI.getMe().then(res => {
      const data = res.data;
      if (data) {
        setExistingNgo(data);
        if (data.name) setValue('name', data.name);
        if (data.phone) setValue('phone', data.phone);
        if (data.pin_code) setValue('pinCode', data.pin_code);
        if (data.operating_since) setValue('operatingSince', data.operating_since);
        if (data.address) setValue('address', data.address);
        if (data.registration_number) setValue('registrationNumber', data.registration_number);
        if (data.gov_registration_number) setValue('govRegistrationNumber', data.gov_registration_number);
        if (data.ngo_type) setValue('ngoType', data.ngo_type);
        if (data.website) setValue('website', data.website);
        if (data.description) setValue('description', data.description);
        if (data.mission) setValue('mission', data.mission);
        if (data.working_areas) setValue('workingAreas', data.working_areas);
        if (data.volunteers_count) setValue('volunteersCount', String(data.volunteers_count));
        if (data.lat && data.lng) setSelectedCoords({ lat: data.lat, lng: data.lng });
        if (data.documents && typeof data.documents === 'object') {
          const docsMap = {};
          Object.entries(data.documents).forEach(([slotKey, docUrls]) => {
            if (Array.isArray(docUrls)) {
              docsMap[slotKey] = docUrls.map((url, idx) => ({
                id: `doc-${idx}-${Date.now()}`,
                name: `Document Page ${idx + 1}`,
                previewUrl: url
              }));
            }
          });
          setUploadedFiles(docsMap);
        }
      }
    }).catch(() => {
      // Fresh registration
    });
  }, [user, setValue]);

  const handleNextStep = async () => {
    const isValid = await trigger(['name', 'phone', 'pinCode', 'operatingSince', 'address']);
    if (isValid) {
      setStep(3);
    } else {
      toast.error('Please complete all required fields correctly before proceeding.');
    }
  };

  const triggerReverseGeocode = async (lat, lng) => {
    setLocStatus('detecting');
    try {
      const res = await locationAPI.reverseGeocode(lat, lng);
      const data = res.data;
      if (data.address) setValue('address', data.address);
      if (data.city) setValue('city', data.city);
      if (data.state) setValue('state', data.state);
      if (data.pin_code) setValue('pinCode', data.pin_code);
      setLocStatus('success');
      toast.success('NGO address auto-populated from coordinates.');
    } catch {
      setLocStatus('error');
    }
  };

  const handleMapClick = (latlng) => {
    const lat = typeof latlng === 'object' && latlng.lat !== undefined ? parseFloat(latlng.lat) : parseFloat(latlng);
    const lng = typeof latlng === 'object' && latlng.lng !== undefined ? parseFloat(latlng.lng) : parseFloat(arguments[1]);
    setSelectedCoords({ lat, lng });
    triggerReverseGeocode(lat, lng);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setLocStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedCoords({ lat, lng });
        triggerReverseGeocode(lat, lng);
      },
      () => {
        setLocStatus('error');
        toast.error('Unable to access location. Please click on the map to set your coordinates.');
      },
      { timeout: 5000 }
    );
  };


  const handleFileChange = async (slotKey, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds 5MB limit`);
        continue;
      }

      try {
        const res = await authAPI.uploadFile(file);
        if (res?.data?.url) {
          const newDoc = {
            id: `doc-${Date.now()}-${Math.random()}`,
            name: file.name,
            previewUrl: res.data.url
          };

          setUploadedFiles(prev => ({
            ...prev,
            [slotKey]: [...(prev[slotKey] || []), newDoc]
          }));

          toast.success(`Uploaded ${file.name}`);
        }
      } catch (err) {
        toast.error(getApiError(err));
      }
    }
  };

  const handleRemovePage = (slotKey, pageId) => {
    setUploadedFiles(prev => ({
      ...prev,
      [slotKey]: (prev[slotKey] || []).filter(p => p.id !== pageId)
    }));
    toast.info('Removed page');
  };

  const onFormSubmit = async (data) => {
    setIsSubmitting(true);

    try {
      const uploadedDocUrls = {};
      Object.entries(uploadedFiles).forEach(([key, list]) => {
        if (list && list.length > 0) {
          uploadedDocUrls[key] = list.map(item => item.previewUrl);
        }
      });

      const payload = {
        name: data.name,
        registration_number: data.registrationNumber || 'N/A',
        gov_registration_number: data.govRegistrationNumber || 'N/A',
        ngo_type: data.ngoType || 'Trust',
        phone: data.phone,
        website: data.website || '',
        state: data.state || '',
        district: data.district || '',
        city: data.city || '',
        pin_code: data.pinCode || '',
        address: data.address,
        description: data.description || 'Verified fast-track NGO.',
        mission: data.mission || 'To serve the community quickly.',
        working_areas: data.workingAreas || 'General Relief',
        operating_since: data.operatingSince || '2023',
        volunteers_count: parseInt(data.volunteersCount) || 10,
        lat: selectedCoords.lat || null,
        lng: selectedCoords.lng || null,
        documents: uploadedDocUrls,
      };

      await ngoAPI.register(payload);
      if (refreshUserData) await refreshUserData();
      setStep(4);
      toast.success('Registration filed successfully! Pending admin review.');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 sm:p-8 space-y-8 pt-24 text-left">
        
        {/* Page title and description */}
        <section className="text-center max-w-2xl mx-auto space-y-2">
          <span className="px-3 py-1 bg-[#EAE4DC] text-[#C48B3F] text-[10px] font-mono font-bold rounded-full uppercase tracking-wider border border-[#DCD4C8]">
            NGO Partnership
          </span>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-[#1C1B18]">
            Register NGO Authority Profile
          </h1>
          <p className="text-xs text-[#666157]">
            Submit regulatory documentation for administrative audit. All details require validation before listings become visible.
          </p>
        </section>

        {step < 4 && (
          <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-full px-6 py-3 flex justify-between items-center text-xs max-w-md mx-auto shadow-xs">
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${step >= 1 ? 'bg-[#1C1B18] text-white' : 'bg-[#F3F0EA] text-[#666157]'}`}>1</span>
              <span className={step === 1 ? 'font-serif font-bold text-[#1C1B18]' : 'text-[#666157]'}>Basic Info</span>
            </div>
            <span className="h-[1px] bg-[#DCD4C8] flex-1 mx-4"></span>
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${step >= 3 ? 'bg-[#1C1B18] text-white' : 'bg-[#F3F0EA] text-[#666157]'}`}>2</span>
              <span className={step === 3 ? 'font-serif font-bold text-[#1C1B18]' : 'text-[#666157]'}>Upload Document</span>
            </div>
          </div>
        )}

        {/* Wizard Form Cards */}
        <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl shadow-xs p-6 sm:p-8">
          
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#1C1B18]">Step 1: Basic Information</h3>
                <p className="text-xs text-[#666157] mt-1">Provide your organization name and address.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="NGO Legal Name"
                  id="name"
                  placeholder="e.g. Hope Foundation"
                  error={errors.name}
                  {...register('name', { 
                    required: 'NGO Legal Name is required',
                    minLength: { value: 3, message: 'NGO Name must be at least 3 characters' }
                  })}
                />
                <InputField
                  label="Phone Number"
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  error={errors.phone}
                  {...register('phone', { 
                    required: 'Contact phone is required',
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: 'Please enter a valid 10-digit Indian mobile number.'
                    },
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                    }
                  })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Pin Code"
                  id="pinCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="e.g. 440001"
                  error={errors.pinCode}
                  {...register('pinCode', {
                    required: 'Pin code is required',
                    pattern: {
                      value: /^[1-9]\d{5}$/,
                      message: 'Please enter a valid 6-digit Indian pincode.'
                    },
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                    }
                  })}
                />
                <InputField
                  label="Operating Since (Year)"
                  id="operatingSince"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 2018"
                  error={errors.operatingSince}
                  {...register('operatingSince', {
                    required: 'Operating year is required',
                    pattern: {
                      value: /^\d{4}$/,
                      message: 'Please enter a valid 4-digit operating year.'
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider block">Street Address Details</label>
                <textarea
                  id="address"
                  rows="2"
                  placeholder="Complete office or facility address..."
                  {...register('address', { required: 'Street address is required' })}
                  className="w-full px-4 py-3 border border-[#DCD4C8] rounded-2xl text-xs bg-[#F3F0EA] text-[#1C1B18] placeholder-[#666157] focus:outline-none focus:border-[#C48B3F] min-h-[70px]"
                />
                {errors.address && <p className="text-xs text-rose-600 font-mono mt-1">{errors.address.message}</p>}
              </div>


              {/* Map Coordinator Picker */}
              <div className="space-y-3 pt-2 border-t border-[#DCD4C8]">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-serif font-bold text-[#1C1B18] flex items-center gap-1.5"><Compass className="w-4 h-4 text-[#C48B3F]" /> Geographic Facility Coordinates</span>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="text-xs font-bold text-[#C48B3F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Use My Location
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-[#666157] uppercase font-bold block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Not set"
                      value={selectedCoords.lat ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        setSelectedCoords(prev => ({ ...prev, lat: val }));
                        if (val !== null && selectedCoords.lng !== null) triggerReverseGeocode(val, selectedCoords.lng);
                      }}
                      className="w-full bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl px-3 py-2 text-xs font-mono text-[#1C1B18] outline-none focus:border-[#C48B3F]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[#666157] uppercase font-bold block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Not set"
                      value={selectedCoords.lng ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        setSelectedCoords(prev => ({ ...prev, lng: val }));
                        if (selectedCoords.lat !== null && val !== null) triggerReverseGeocode(selectedCoords.lat, val);
                      }}
                      className="w-full bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl px-3 py-2 text-xs font-mono text-[#1C1B18] outline-none focus:border-[#C48B3F]"
                    />
                  </div>
                </div>

                <div className="h-64 rounded-2xl overflow-hidden border border-[#DCD4C8]">
                  <LeafletMap
                    center={selectedCoords.lat && selectedCoords.lng ? [selectedCoords.lat, selectedCoords.lng] : [20.5937, 78.9629]}
                    zoom={selectedCoords.lat && selectedCoords.lng ? 13 : 5}
                    markers={selectedCoords.lat && selectedCoords.lng ? [{ lat: selectedCoords.lat, lng: selectedCoords.lng, popupContent: <div><b>NGO Registered Facility Pin</b></div> }] : []}
                    onMapClick={handleMapClick}
                  />
                </div>
                <p className="text-xs text-[#666157]">Click anywhere on the map or enter coordinates above to automatically reverse-geocode and auto-fill address details.</p>
              </div>

              <div className="pt-4 border-t border-[#DCD4C8] flex justify-end">
                <Button type="button" variant="primary" onClick={handleNextStep} icon={ArrowRight} className="bg-[#1C1B18] text-white hover:bg-[#C48B3F] rounded-full text-xs font-medium">
                  Continue to Document
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#1C1B18]">Step 3: Document Filings Upload</h3>
                <p className="text-xs text-[#666157] mt-1">Upload the required certifications. Document preview is supported before submission.</p>
              </div>

              <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DOCUMENT_SLOTS.map((slot) => {
                    const pages = uploadedFiles[slot.key];
                    return (
                      <div key={slot.key} className="border border-[#DCD4C8] p-4 rounded-2xl bg-[#F3F0EA] flex flex-col justify-between gap-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="text-xs font-serif font-bold text-[#1C1B18] block">{slot.label}</span>
                            <span className="text-[10px] text-[#666157] font-mono block">Upload scans (PDF, Images)</span>
                          </div>
                          {pages && pages.length > 0 && (
                            <span className="text-[10px] font-mono text-[#C48B3F] bg-[#EAE4DC] px-2.5 py-0.5 rounded-full font-bold border border-[#DCD4C8]">
                              {pages.length} page(s)
                            </span>
                          )}
                        </div>

                        {pages && pages.length > 0 ? (
                          <div className="flex flex-wrap gap-2 p-2 bg-[#EAE4DC] border border-[#DCD4C8] rounded-xl">
                            {pages.map((page, idx) => (
                              <div key={page.id} className="relative group w-12 h-12 rounded-lg border border-[#DCD4C8] bg-[#F3F0EA] overflow-hidden shrink-0">
                                <img src={page.previewUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPreviewPage({ page, label: `${slot.label} - Page ${idx + 1}` })}
                                    className="p-1 text-white hover:text-[#C48B3F] cursor-pointer"
                                    title="Preview page"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePage(slot.key, page.id)}
                                    className="p-1 text-white hover:text-rose-400 cursor-pointer"
                                    title="Delete page"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="absolute bottom-0 inset-x-0 text-[9px] bg-black/70 text-white text-center py-0.5 font-mono">
                                  P.{idx + 1}
                                </span>
                              </div>
                            ))}

                            <div className="w-12 h-12 shrink-0">
                              <input
                                type="file"
                                id={`file-add-${slot.key}`}
                                accept="image/*,application/pdf"
                                multiple
                                onChange={(e) => handleFileChange(slot.key, e)}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => document.getElementById(`file-add-${slot.key}`).click()}
                                className="w-full h-full border border-dashed border-[#DCD4C8] hover:border-[#C48B3F] rounded-lg flex flex-col items-center justify-center text-[#666157] hover:text-[#1C1B18] bg-[#F3F0EA] transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-mono font-bold mt-0.5">Add</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-dashed border-[#DCD4C8] p-4 rounded-xl bg-[#EAE4DC] flex flex-col items-center justify-center text-center space-y-2">
                            <span className="text-xs text-[#666157]">No pages uploaded yet</span>
                            <input
                              type="file"
                              id={`file-init-${slot.key}`}
                              accept="image/*,application/pdf"
                              multiple
                              onChange={(e) => handleFileChange(slot.key, e)}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="text-xs py-1 px-3 font-medium rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#1C1B18]"
                              onClick={() => document.getElementById(`file-init-${slot.key}`).click()}
                              icon={Upload}
                            >
                              Upload Pages
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-[#DCD4C8] flex justify-between">
                  <Button type="button" variant="secondary" onClick={() => setStep(1)} icon={ArrowLeft} className="rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#1C1B18]">
                    Back
                  </Button>
                  <Button type="submit" variant="primary" icon={CheckCircle} loading={isSubmitting} className="bg-[#1C1B18] hover:bg-[#C48B3F] text-white rounded-full">
                    {isSubmitting ? 'Submitting…' : 'Submit Application'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-6 py-8">
              <div className="w-16 h-16 bg-[#F3F0EA] border border-[#DCD4C8] rounded-full flex items-center justify-center text-[#C48B3F] mx-auto shadow-xs">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold text-[#1C1B18]">Application Submitted Successfully</h2>
                <p className="text-xs text-[#666157] max-w-md mx-auto leading-relaxed">
                  Your NGO partnership filings have been logged into our system queue. An administrator will verify the government registrations and map coordinates.
                </p>
              </div>

              <div className="p-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl text-left max-w-sm mx-auto text-xs font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#666157]">STATUS:</span>
                  <span className="font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full text-[10px]">PENDING AUDIT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666157]">QUEUE INDEX:</span>
                  <span className="text-[#1C1B18] font-bold">#DB-REG-{trackingId}</span>
                </div>
                <div className="flex justify-between border-t border-[#DCD4C8] pt-2 text-[11px] text-[#666157] text-center leading-relaxed">
                  <span>Our admins typically audit document filings within 24 hours.</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                <Button variant="primary" className="w-full bg-[#1C1B18] text-white hover:bg-[#C48B3F] rounded-full" onClick={() => navigate('/auth')}>
                  Go to Login Screen
                </Button>
                <Button variant="secondary" className="w-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#1C1B18] rounded-full" onClick={() => navigate('/')}>
                  Return to Home
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* PAGE PREVIEW MODAL */}
        {selectedPreviewPage && (
          <div className="fixed inset-0 bg-[#1C1B18]/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-left">
              <div className="p-4 border-b border-[#DCD4C8] flex justify-between items-center bg-[#EAE4DC]">
                <div className="text-xs">
                  <span className="text-[10px] font-mono text-[#666157] font-bold block uppercase">Document Page Preview</span>
                  <span className="font-serif font-bold text-[#1C1B18]">{selectedPreviewPage.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPreviewPage(null)}
                  className="p-1.5 hover:bg-[#F3F0EA] text-[#666157] hover:text-[#1C1B18] rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-black/50 p-6 flex items-center justify-center">
                <img
                  src={selectedPreviewPage.page.previewUrl}
                  alt={selectedPreviewPage.page.name}
                  className="max-h-[60vh] object-contain rounded-xl border border-[#DCD4C8]"
                />
              </div>
              <div className="p-3 bg-[#EAE4DC] border-t border-[#DCD4C8] flex justify-between items-center text-xs text-[#666157] font-mono">
                <span>File: {selectedPreviewPage.page.name}</span>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
