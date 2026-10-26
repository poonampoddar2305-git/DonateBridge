import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Truck, MapPin, CheckCircle, Package, ArrowLeft, Calendar, ShieldCheck, RefreshCw, Navigation } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Navbar from '../components/layout/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { logisticsAPI, getApiError } from '../api/index';
import { useToast } from '../components/ui/Toast';

export default function LogisticsTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeStep, setActiveStep] = useState(1);
  const [carrierName, setCarrierName] = useState('Express Cargo #DB-990');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [donorCoords, setDonorCoords] = useState(null);
  const [ngoCoords, setNgoCoords] = useState(null);
  const [hasValidCoords, setHasValidCoords] = useState(false);
  const [pickupAddress, setPickupAddress] = useState('');
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const courierMarker = useRef(null);
  const routeLine = useRef(null);
  const donorMarkerRef = useRef(null);
  const ngoMarkerRef = useRef(null);

  const defaultMilestones = [
    { title: 'Requested', time: '10:00 AM', desc: 'Donation request logged by donor, pending verification.' },
    { title: 'Approved', time: '10:15 AM', desc: 'Listing approved by Admin and matched with NGO need parameters.' },
    { title: 'Dispatched', time: '10:45 AM', desc: 'Logistics carrier assigned and dispatched to donor pickup location.' },
    { title: 'In Transit', time: '11:15 AM', desc: 'Shipment picked up, currently in transit to destination NGO hub.' },
    { title: 'Delivered', time: '11:40 AM', desc: 'Parcels delivered to the destination NGO Hub address.' },
    { title: 'Completed', time: '11:55 AM', desc: 'Digital receipt matching complete, transaction hashed on ledger.' },
  ];

  const [milestones, setMilestones] = useState(defaultMilestones);

  const fetchTracking = async () => {
    try {
      setLoading(true);
      const res = await logisticsAPI.getTracking(id);
      const job = res.data;
      setActiveStep(job.current_step || 1);
      setCarrierName(job.carrier_name || 'Express Cargo #DB-990');
      
      const donation = job.donation_details || {};
      setPickupAddress(donation.pickup_address || '');

      const pickupLat = donation.pickup_lat != null ? parseFloat(donation.pickup_lat) : null;
      const pickupLng = donation.pickup_lng != null ? parseFloat(donation.pickup_lng) : null;
      const deliveryLat = donation.matched_ngo_details?.lat != null ? parseFloat(donation.matched_ngo_details.lat) : null;
      const deliveryLng = donation.matched_ngo_details?.lng != null ? parseFloat(donation.matched_ngo_details.lng) : null;
      
      const hasD = pickupLat != null && !isNaN(pickupLat) && pickupLng != null && !isNaN(pickupLng);
      const hasN = deliveryLat != null && !isNaN(deliveryLat) && deliveryLng != null && !isNaN(deliveryLng);

      const dCoords = hasD ? [pickupLat, pickupLng] : null;
      const nCoords = hasN ? [deliveryLat, deliveryLng] : null;
      setDonorCoords(dCoords);
      setNgoCoords(nCoords);
      setHasValidCoords(hasD || hasN);

      // Re-map backend milestones with real coords
      const mapped = defaultMilestones.map((m, idx) => {
        const stepNum = idx + 1;
        const matchingMilestone = (job.milestones || []).find(ms => ms.step_num === stepNum);
        let stepCoords = dCoords;
        if (matchingMilestone && matchingMilestone.lat != null && matchingMilestone.lng != null) {
          stepCoords = [matchingMilestone.lat, matchingMilestone.lng];
        } else if (stepNum === 4 && dCoords && nCoords) {
          stepCoords = [(dCoords[0] + nCoords[0]) / 2, (dCoords[1] + nCoords[1]) / 2];
        } else if (stepNum >= 5 && nCoords) {
          stepCoords = nCoords;
        }

        return {
          title: matchingMilestone ? matchingMilestone.title : m.title,
          time: matchingMilestone ? new Date(matchingMilestone.time_stamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : m.time,
          desc: matchingMilestone ? matchingMilestone.description : m.desc,
          coords: stepCoords
        };
      });
      setMilestones(mapped);
    } catch (err) {
      console.warn("Failed fetching tracking:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, [id]);

  useEffect(() => {
    if (mapRef.current && !mapInstance.current && (donorCoords || ngoCoords)) {
      const initialCenter = donorCoords || ngoCoords || [20.5937, 78.9629];
      const map = L.map(mapRef.current).setView(initialCenter, 13);
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      if (donorCoords) {
        const donorIcon = L.divIcon({
          html: `<div class="w-6 h-6 rounded-full bg-[#1C1B18] border-2 border-white flex items-center justify-center text-white font-extrabold text-[10px] shadow-sm">DON</div>`,
          className: 'custom-donor-icon',
          iconSize: [24, 24]
        });
        donorMarkerRef.current = L.marker(donorCoords, { icon: donorIcon })
          .addTo(map)
          .bindPopup('<b>Donor Pickup Point</b>');
      }

      if (ngoCoords) {
        const ngoIcon = L.divIcon({
          html: `<div class="w-6 h-6 rounded-full bg-[#C48B3F] border-2 border-white flex items-center justify-center text-white font-extrabold text-[10px] shadow-sm">NGO</div>`,
          className: 'custom-ngo-icon',
          iconSize: [24, 24]
        });
        ngoMarkerRef.current = L.marker(ngoCoords, { icon: ngoIcon })
          .addTo(map)
          .bindPopup('<b>NGO Destination Hub</b>');
      }

      if (donorCoords && ngoCoords) {
        routeLine.current = L.polyline([donorCoords, ngoCoords], {
          color: '#C48B3F',
          weight: 3,
          dashArray: '4,6',
          opacity: 0.8
        }).addTo(map);

        map.fitBounds([donorCoords, ngoCoords], { padding: [50, 50] });
      }

      const activePos = milestones[activeStep - 1]?.coords || donorCoords || ngoCoords;
      if (activePos) {
        const truckIcon = L.divIcon({
          html: `<div class="w-8 h-8 rounded-full bg-[#1C1B18] border-2 border-[#C48B3F] flex items-center justify-center text-white shadow-md animate-pulse"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C48B3F" stroke-width="2.5"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>`,
          className: 'custom-truck-icon',
          iconSize: [32, 32]
        });
        courierMarker.current = L.marker(activePos, { icon: truckIcon }).addTo(map);
      }
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        courierMarker.current = null;
        routeLine.current = null;
        donorMarkerRef.current = null;
        ngoMarkerRef.current = null;
      }
    };
  }, [loading, donorCoords, ngoCoords]);

  useEffect(() => {
    const activePos = milestones[activeStep - 1]?.coords || donorCoords || ngoCoords;
    if (courierMarker.current && activePos) {
      courierMarker.current.setLatLng(activePos);
      if (mapInstance.current) {
        mapInstance.current.panTo(activePos);
      }
    }
  }, [activeStep, milestones, donorCoords, ngoCoords]);

  const handleUpdateStep = async (stepNum) => {
    setUpdating(true);
    try {
      const res = await logisticsAPI.updateStep(id, stepNum);
      setActiveStep(stepNum);
      toast.success(`Logistics tracking status updated to step ${stepNum}.`);
      fetchTracking();
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 border-t border-[#DCD4C8] pt-16">
        
        {/* Left Side: Milestones */}
        <aside className="w-full lg:w-115 bg-[#EAE4DC] border-r border-[#DCD4C8] p-6 flex flex-col min-h-0 overflow-y-auto space-y-6 shrink-0 shadow-xs text-left">
          <div className="flex justify-between items-center pb-4 border-b border-[#DCD4C8]">
            <div>
              <h3 className="text-base font-serif font-bold text-[#1C1B18]">Logistics Tracker</h3>
              <p className="text-[10px] font-mono text-[#666157] uppercase tracking-widest">DISPATCH PATHWAY</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-[#666157] block">DISPATCH ID</span>
              <span className="text-xs font-mono font-bold text-[#C48B3F]">DB-{id || '1042'}</span>
            </div>
          </div>

          {/* Coordinates log panel */}
          <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-4 rounded-2xl text-xs space-y-2.5 font-mono">
            <div className="flex justify-between items-center font-bold">
              <span>Transit Status:</span>
              <span className="text-[#C48B3F] uppercase tracking-wide">
                {milestones[activeStep - 1]?.title}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Current GPS:</span>
              <span className="text-[#1C1B18] font-bold flex items-center gap-1">
                <Navigation className="w-3 h-3 text-[#C48B3F] animate-pulse" />
                {currentCoords[0].toFixed(5)}° N, {currentCoords[1].toFixed(5)}° E
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Carrier Unit:</span>
              <span className="text-[#1C1B18]">{carrierName}</span>
            </div>
          </div>

          <div className="relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DCD4C8] pl-8 space-y-6 grow">
            {milestones.map((m, idx) => {
              const stepNum = idx + 1;
              const isCurrent = stepNum === activeStep;
              const isPassed = stepNum < activeStep;

              return (
                <div key={idx} className="relative text-xs">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center absolute -left-9.5 -top-1 font-mono font-bold text-xs border transition-all ${
                    isCurrent ? 'bg-[#1C1B18] text-white border-[#1C1B18] ring-4 ring-[#1C1B18]/10' :
                    isPassed ? 'bg-[#F3F0EA] text-[#C48B3F] border-[#DCD4C8]' :
                    'bg-[#F3F0EA] text-[#666157] border-[#DCD4C8]'
                  }`}>
                    {isPassed ? '✓' : stepNum}
                  </div>

                  <div className="space-y-0.5">
                    <p className={`font-serif font-bold ${isCurrent ? 'text-[#C48B3F]' : 'text-[#1C1B18]'}`}>{m.title}</p>
                    <p className="text-[10px] text-[#666157] font-mono">{m.time}</p>
                    <p className="text-xs text-[#666157] leading-relaxed mt-1">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stepper Controls */}
          <div className="pt-4 border-t border-[#DCD4C8] flex gap-2 mt-auto">
            <button
              disabled={updating || activeStep <= 1}
              onClick={() => handleUpdateStep(activeStep - 1)}
              className="w-full py-2.5 border border-[#DCD4C8] bg-[#F3F0EA] hover:bg-[#DCD4C8] text-[#1C1B18] text-xs font-medium rounded-full cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'SAVING…' : 'PREVIOUS STEP'}
            </button>
            <button
              disabled={updating || activeStep >= 6}
              onClick={() => handleUpdateStep(activeStep + 1)}
              className="w-full py-2.5 bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium rounded-full cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'SAVING…' : 'NEXT STEP'}
            </button>
          </div>
        </aside>

        {/* Right Side: Map */}
        <main className="grow min-h-87.5 lg:min-h-0 z-10 relative">
          <div ref={mapRef} className="w-full h-full min-h-87.5" />
          {!hasValidCoords && !loading && (
            <div className="absolute inset-0 bg-[#F3F0EA]/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
              <Navigation className="w-10 h-10 text-[#C48B3F] mb-3 animate-pulse" />
              <h3 className="text-base font-serif font-bold text-[#1C1B18] mb-1">GPS Coordinates Pending</h3>
              <p className="text-xs text-[#666157] max-w-sm">
                Live geolocation coordinates have not been tagged for this pickup location yet. Tracking proceeds sequentially based on courier checkpoint verifications.
              </p>
              {pickupAddress && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#DCD4C8] rounded-full text-xs text-[#1C1B18] font-mono">
                  <MapPin className="w-3.5 h-3.5 text-[#C48B3F]" />
                  <span>{pickupAddress}</span>
                </div>
              )}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
