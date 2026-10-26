import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useToast } from '../components/ui/Toast';
import { donationAPI, authAPI, getApiError } from '../api/index';
import { useAuth } from '../context/GlobalStateContext';
import Navbar from '../components/layout/Navbar';
import LeafletMap from '../components/ui/LeafletMap';
import {
  Sparkles, CheckCircle, Package, ArrowRight, ArrowLeft,
  FileText, Upload, Trash2, Eye, Compass, Calendar, AlertTriangle
} from 'lucide-react';

const CATEGORIES = [
  'Books', 'Clothes', 'Food', 'Furniture', 'Electronics',
  'Medical Equipment', 'School Supplies', 'Blankets', 'Sports Equipment'
];

const CONDITIONS = [
  'New', 'Like New', 'Good', 'Fair', 'Poor'
];

export default function RequestWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [selectedCoords, setSelectedCoords] = useState({ lat: null, lng: null });
  const [isLocating, setIsLocating] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [createdDonationId, setCreatedDonationId] = useState(null);
  
  const [addressSearch, setAddressSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const preselectedCategory = searchParams.get('category') || 'Blankets';
  const preselectedItem = searchParams.get('item') || '';

  const { register, handleSubmit, formState: { errors }, trigger } = useForm({
    defaultValues: {
      title: preselectedItem,
      category: preselectedCategory,
      condition: 'Good',
      quantity: '1',
      description: preselectedItem ? `Fulfilling demand requirement for ${preselectedItem}` : '',
      pickupAddress: '',
      preferredPickupTime: ''
    }
  });

  const handlePullLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setSelectedCoords({ lat, lng });
        toast.success(`Location detected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data.display_name) setAddressSearch(data.display_name);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        toast.error('Could not detect location. You can search address or click map.');
      },
      { timeout: 8000 }
    );
  };

  const handleNextStep = async () => {
    let fieldsToValidate = [];
    if (step === 1) {
      fieldsToValidate = ['title', 'category', 'condition', 'quantity', 'description'];
    } else if (step === 2) {
      fieldsToValidate = ['pickupAddress', 'preferredPickupTime'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
    } else {
      toast.error('Please fix form validation errors.');
    }
  };

  const handleMapClick = async (latlng) => {
    const lat = latlng.lat;
    const lng = latlng.lng;
    setSelectedCoords({ lat, lng });
    toast.success(`Pickup point pinned: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data.display_name) setAddressSearch(data.display_name);
    } catch (e) {
      console.error(e);
    }
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
    setSelectedCoords({ lat, lng });
    setAddressSearch(item.display_name);
    setSearchResults([]);
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      toast.warning('Maximum 5 images are allowed.');
      return;
    }

    const newPhotos = files.map(file => ({
      name: file.name,
      previewUrl: URL.createObjectURL(file)
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
    toast.success(`Added ${files.length} photo(s).`);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    toast.success('Photo removed.');
  };

  const onSubmitForm = async (data) => {
    if (photos.length === 0) {
      toast.warning('Please upload at least one photo of the donation item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedPhotoUrls = [];
      for (const photo of photos) {
        if (photo.previewUrl.startsWith('blob:')) {
          try {
            const blob = await fetch(photo.previewUrl).then(r => r.blob());
            const file = new File([blob], photo.name || 'photo.jpg', { type: blob.type });
            const uploadRes = await authAPI.uploadFile(file);
            uploadedPhotoUrls.push(uploadRes.data.url);
          } catch {
            uploadedPhotoUrls.push(photo.previewUrl);
          }
        } else {
          uploadedPhotoUrls.push(photo.previewUrl);
        }
      }

      const preselectedNgoId = searchParams.get('ngo_id') || searchParams.get('ngoId');
      const res = await donationAPI.create({
        title: data.title,
        category: data.category,
        condition: data.condition,
        quantity: parseInt(data.quantity) || 1,
        description: data.description,
        photos: uploadedPhotoUrls,
        pickup_address: data.pickupAddress,
        pickup_lat: selectedCoords.lat,
        pickup_lng: selectedCoords.lng,
        preferred_pickup_time: data.preferredPickupTime,
        matched_ngo_id: preselectedNgoId || undefined,
      });

      setCreatedDonationId(res.data?.id || null);
      setStep(4);
      toast.success('Donation listing logged in moderation queue.');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] text-[#1C1B18] font-sans">
      <Navbar />

      <main className="grow max-w-3xl mx-auto w-full p-6 sm:p-8 pt-24 space-y-8">
        
        {/* Header */}
        <section className="text-center max-w-xl mx-auto space-y-2">
          <span className="px-4 py-1.5 bg-[#EAE4DC] text-[#C48B3F] text-xs font-mono uppercase tracking-wider font-bold rounded-full border border-[#DCD4C8]">
            Donation Wizard
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-[#1C1B18]">
            Upload Surplus Item Listing
          </h1>
          <p className="text-sm text-[#666157]">
            Detail physical surplus item logistics. New uploads are moderated by admins to enforce platform integrity.
          </p>
        </section>

        {/* Wizard Progress */}
        {step < 4 && (
          <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-2xl p-4 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-[#1C1B18] text-white' : 'bg-[#F3F0EA] text-[#666157]'}`}>1</span>
              <span className={step === 1 ? 'font-bold text-[#1C1B18]' : 'text-[#666157]'}>Item Details</span>
            </div>
            <span className="h-px bg-[#DCD4C8] flex-1 mx-4"></span>
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-[#1C1B18] text-white' : 'bg-[#F3F0EA] text-[#666157]'}`}>2</span>
              <span className={step === 2 ? 'font-bold text-[#1C1B18]' : 'text-[#666157]'}>Pickup Logistics</span>
            </div>
            <span className="h-px bg-[#DCD4C8] flex-1 mx-4"></span>
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-[#1C1B18] text-white' : 'bg-[#F3F0EA] text-[#666157]'}`}>3</span>
              <span className={step === 3 ? 'font-bold text-[#1C1B18]' : 'text-[#666157]'}>Photos Upload</span>
            </div>
          </div>
        )}

        {/* Wizard Form Panels */}
        <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl shadow-xs p-6 sm:p-10 space-y-6">
          
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#1C1B18]">Step 1: Item Details</h3>
                <p className="text-xs text-[#666157] mt-1">Specify categories, quantities, and operational conditions.</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1C1B18] uppercase tracking-wider block">Item Title</label>
                  <input
                    id="title"
                    placeholder="e.g. Winter blankets and woolen caps"
                    {...register('title', { required: 'Item title is required' })}
                    className="w-full bg-transparent border-b-2 border-[#1C1B18] focus:border-[#C48B3F] text-sm text-[#1C1B18] placeholder-[#666157] px-0 py-3 outline-none transition-colors"
                  />
                  {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#1C1B18] uppercase tracking-wider block">Category</label>
                    <select
                      id="category"
                      {...register('category', { required: 'Category is required' })}
                      className="w-full bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl text-xs text-[#1C1B18] px-4 py-3 outline-none focus:border-[#C48B3F]"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#1C1B18] uppercase tracking-wider block">Condition</label>
                    <select
                      id="condition"
                      {...register('condition', { required: 'Condition is required' })}
                      className="w-full bg-[#F3F0EA] border border-[#DCD4C8] rounded-xl text-xs text-[#1C1B18] px-4 py-3 outline-none focus:border-[#C48B3F]"
                    >
                      {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#1C1B18] uppercase tracking-wider block">Quantity</label>
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="1"
                      {...register('quantity', {
                        required: 'Quantity is required',
                        min: { value: 1, message: 'Quantity must be at least 1' }
                      })}
                      className="w-full bg-transparent border-b-2 border-[#1C1B18] focus:border-[#C48B3F] text-sm text-[#1C1B18] placeholder-[#666157] px-0 py-3 outline-none transition-colors"
                    />
                    {errors.quantity && <p className="text-xs text-rose-600 mt-1">{errors.quantity.message}</p>}
                  </div>

                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1C1B18] uppercase tracking-wider block">Item Description & Specifications</label>
                  <textarea
                    id="description"
                    rows="4"
                    placeholder="Describe cleanliness, size details, wrapping status, and sorting breakdown..."
                    {...register('description', { required: 'Detailed description is required' })}
                    className="w-full bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl p-4 text-xs text-[#1C1B18] placeholder-[#666157] outline-none focus:border-[#C48B3F] min-h-28"
                  />
                  {errors.description && <p className="text-xs text-rose-600">{errors.description.message}</p>}
                </div>
              </div>

              <div className="pt-4 border-t border-[#DCD4C8] flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white px-8 py-3 text-sm font-medium transition-all flex items-center gap-2"
                >
                  Continue to Pickup Details <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#1C1B18]">Step 2: Pickup Logistics & Coordinates</h3>
                <p className="text-xs text-[#666157] mt-1">Designate package retrieval street details and select coordinates.</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1C1B18] uppercase tracking-wider block">Preferred Pickup Time Window</label>
                  <input
                    id="preferredPickupTime"
                    placeholder="e.g. Weekdays 9:00 AM - 1:00 PM, or Saturday afternoon"
                    {...register('preferredPickupTime', { required: 'Preferred pickup time is required' })}
                    className="w-full bg-transparent border-b-2 border-[#1C1B18] focus:border-[#C48B3F] text-sm text-[#1C1B18] placeholder-[#666157] px-0 py-3 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1C1B18] uppercase tracking-wider block">Pickup Street Address</label>
                  <textarea
                    id="pickupAddress"
                    rows="3"
                    placeholder="Provide full address where the logistics carriers can pick up items..."
                    {...register('pickupAddress', { required: 'Pickup address is required' })}
                    className="w-full bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl p-4 text-xs text-[#1C1B18] placeholder-[#666157] outline-none focus:border-[#C48B3F]"
                  />
                </div>

                {/* Coordinate Map Picker */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[#1C1B18] flex items-center gap-1.5"><Compass className="w-4 h-4 text-[#C48B3F]" /> Map Location Pin</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePullLocation}
                        disabled={isLocating}
                        className="text-xs font-bold text-[#4A7C59] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <MapPin className="w-3.5 h-3.5" /> {isLocating ? 'Detecting...' : 'Pull Location'}
                      </button>
                      <span className="font-mono text-[#C48B3F] font-bold">
                        {selectedCoords.lat ? `${selectedCoords.lat.toFixed(4)}, ${selectedCoords.lng.toFixed(4)}` : 'Not pinned'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addressSearch}
                      onChange={(e) => setAddressSearch(e.target.value)}
                      placeholder="Search street, area, city..."
                      className="flex-1 px-4 py-2.5 bg-[#F3F0EA] border border-[#DCD4C8] rounded-full text-xs text-[#1C1B18] outline-none focus:border-[#C48B3F]"
                    />
                    <button
                      type="button"
                      onClick={handleAddressSearch}
                      className="px-5 py-2.5 rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium transition-colors"
                    >
                      Search
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <ul className="border border-[#DCD4C8] rounded-2xl bg-[#F3F0EA] text-xs max-h-36 overflow-y-auto divide-y divide-[#DCD4C8]">
                      {searchResults.map((item, i) => (
                        <li
                          key={i}
                          onClick={() => selectAddress(item)}
                          className="p-3 hover:bg-[#EAE4DC] cursor-pointer truncate text-[#1C1B18]"
                        >
                          {item.display_name}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="h-64 rounded-2xl overflow-hidden border border-[#DCD4C8]">
                    <LeafletMap
                      center={selectedCoords.lat && selectedCoords.lng ? [selectedCoords.lat, selectedCoords.lng] : [20.5937, 78.9629]}
                      zoom={selectedCoords.lat && selectedCoords.lng ? 13 : 5}
                      markers={selectedCoords.lat && selectedCoords.lng ? [{ lat: selectedCoords.lat, lng: selectedCoords.lng, popupContent: <div><b>Donation Pickup Location</b></div> }] : []}
                      onMapClick={handleMapClick}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#DCD4C8] flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-full border border-[#1C1B18] text-[#1C1B18] hover:bg-[#F3F0EA] px-6 py-2.5 text-xs font-medium flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white px-8 py-3 text-sm font-medium transition-all flex items-center gap-2"
                >
                  Continue to Photo Uploads <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#1C1B18]">Step 3: Item Photos</h3>
                <p className="text-xs text-[#666157] mt-1">Upload clear photos showing current condition (maximum 5 images).</p>
              </div>

              <div className="space-y-6">
                <div
                  onClick={() => document.getElementById('photoSelect').click()}
                  className="border-2 border-dashed border-[#DCD4C8] rounded-2xl p-8 bg-[#F3F0EA] text-center hover:bg-[#EAE4DC] transition-all cursor-pointer space-y-2"
                >
                  <Upload className="w-8 h-8 text-[#C48B3F] mx-auto" />
                  <p className="text-xs font-bold text-[#1C1B18]">Click or Drag & Drop to upload photos</p>
                  <p className="text-xs text-[#666157]">Supported formats: JPG, PNG. Max 5MB per file.</p>
                  <input
                    type="file"
                    id="photoSelect"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {photos.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-[#1C1B18] block">Uploaded Images ({photos.length}/5)</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {photos.map((photo, index) => (
                        <div key={index} className="border border-[#DCD4C8] rounded-xl overflow-hidden bg-white relative aspect-square group">
                          <img src={photo.previewUrl} alt={`Item preview ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#DCD4C8] flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-full border border-[#1C1B18] text-[#1C1B18] hover:bg-[#F3F0EA] px-6 py-2.5 text-xs font-medium flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit(onSubmitForm)}
                  disabled={isSubmitting}
                  className="rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white px-8 py-3 text-sm font-medium transition-all flex items-center gap-2"
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Listing Proposal'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-6 py-6">
              <div className="w-16 h-16 bg-[#F3F0EA] border border-[#DCD4C8] rounded-full flex items-center justify-center text-[#C48B3F] mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-3xl font-bold text-[#1C1B18]">Donation Proposal Logged</h2>
                <p className="text-xs text-[#666157] max-w-md mx-auto">
                  Your physical donation proposal has been submitted to the moderation panel.
                </p>
              </div>

              <div className="p-5 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl text-left max-w-sm mx-auto text-xs font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#666157]">STATUS:</span>
                  <span className="font-bold text-[#C48B3F] bg-[#C48B3F]/15 px-2.5 py-0.5 rounded-full text-xs">PENDING AUDIT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666157]">DONATION ID:</span>
                  <span className="text-[#1C1B18] font-bold">{createdDonationId || 'Processing...'}</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3 max-w-sm mx-auto">
                <button 
                  className="rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white px-7 py-3 text-xs font-medium transition-all" 
                  onClick={() => navigate('/donor')}
                >
                  View in Dashboard
                </button>
                <button 
                  className="rounded-full border border-[#1C1B18] text-[#1C1B18] hover:bg-[#F3F0EA] px-7 py-3 text-xs font-medium transition-all" 
                  onClick={() => navigate('/discover')}
                >
                  Browse Marketplace
                </button>
              </div>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
