import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Car, Footprints, Bike, X, ChevronDown, ChevronUp, MapPin, Sparkles, CheckCircle2, CornerUpRight, ArrowUpRight } from 'lucide-react';
import { calculateCarbonSaved } from '../../utils/routing';

export default function NavigationDrawer({
  selectedItem,
  routeData,
  travelProfile,
  onTravelProfileChange,
  onClearRoute,
  isRoutingLoading
}) {
  const [isStepsOpen, setIsStepsOpen] = useState(false);

  if (!selectedItem) return null;

  const title = selectedItem.title || selectedItem.name || selectedItem.category || 'Target Destination';
  const address = selectedItem.location?.address || selectedItem.address || 'Address provided';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-500 max-w-md w-full px-4 sm:px-0 text-left"
      >
        <div className="bg-[#0F0E0C]/95 backdrop-blur-2xl border border-[#262420] rounded-3xl p-5 text-white shadow-2xl space-y-4">
          
          {/* Top Header & Destination Name */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#262420]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#C48B3F]/20 border border-[#C48B3F]/30 flex items-center justify-center shrink-0 text-[#C48B3F]">
                <Navigation className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold text-[#C48B3F] uppercase tracking-widest block">
                  Active Dispatch Route
                </span>
                <h4 className="font-serif font-bold text-sm text-white truncate">{title}</h4>
                <p className="text-xs text-[#A09A8E] truncate">{address}</p>
              </div>
            </div>

            <button
              onClick={onClearRoute}
              className="p-2 rounded-full text-[#A09A8E] hover:text-white hover:bg-[#191815] transition-colors shrink-0 cursor-pointer"
              title="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Travel Mode Toggle & Route Stats */}
          {isRoutingLoading ? (
            <div className="py-6 flex items-center justify-center gap-3 text-xs text-[#C48B3F] font-medium">
              <span className="w-4 h-4 rounded-full border-2 border-[#C48B3F] border-t-transparent animate-spin" />
              Calculating optimal navigation route...
            </div>
          ) : routeData ? (
            <div className="space-y-4">
              
              {/* Travel Mode Selector */}
              <div className="grid grid-cols-3 gap-2 bg-[#191815] p-1.5 rounded-full border border-[#262420]">
                <button
                  onClick={() => onTravelProfileChange('driving')}
                  className={`py-2 px-3 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    travelProfile === 'driving' ? 'bg-[#C48B3F] text-white shadow-xs' : 'text-[#A09A8E] hover:text-white'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" /> Drive
                </button>
                <button
                  onClick={() => onTravelProfileChange('walking')}
                  className={`py-2 px-3 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    travelProfile === 'walking' ? 'bg-[#C48B3F] text-white shadow-xs' : 'text-[#A09A8E] hover:text-white'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" /> Walk
                </button>
                <button
                  onClick={() => onTravelProfileChange('bicycling')}
                  className={`py-2 px-3 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    travelProfile === 'bicycling' ? 'bg-[#C48B3F] text-white shadow-xs' : 'text-[#A09A8E] hover:text-white'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" /> Cycle
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 text-center bg-[#191815] p-3 rounded-2xl border border-[#262420]">
                <div>
                  <span className="text-[10px] text-[#A09A8E] uppercase font-mono font-bold block">Distance</span>
                  <span className="text-base font-bold text-white font-mono">{routeData.distanceKm} km</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#A09A8E] uppercase font-mono font-bold block">Est. Time</span>
                  <span className="text-base font-bold text-[#C48B3F] font-mono">{routeData.durationMins} mins</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#A09A8E] uppercase font-mono font-bold block">Carbon Offset</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    {calculateCarbonSaved(routeData.distanceKm, selectedItem.category)} kg CO₂
                  </span>
                </div>
              </div>

              {/* Turn-by-Turn Steps Toggle */}
              {routeData.steps && routeData.steps.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setIsStepsOpen(!isStepsOpen)}
                    className="w-full flex items-center justify-between text-xs font-medium text-[#A09A8E] hover:text-white py-1 px-2 rounded-lg hover:bg-[#191815] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <CornerUpRight className="w-3.5 h-3.5 text-[#C48B3F]" />
                      Turn-by-Turn Steps ({routeData.steps.length})
                    </span>
                    {isStepsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isStepsOpen && (
                    <div className="max-h-48 overflow-y-auto pr-1 space-y-2 text-xs font-mono hide-scrollbar border-t border-[#262420] pt-2">
                      {routeData.steps.map((step, idx) => (
                        <div key={step.id || idx} className="flex items-start gap-2 text-[#A09A8E] p-2 rounded-xl bg-[#191815] border border-[#262420]">
                          <span className="w-5 h-5 rounded-full bg-[#C48B3F]/20 text-[#C48B3F] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-snug text-white">{step.instruction}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
