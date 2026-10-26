import React from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, Heart, Navigation, Award, Sparkles, Check, Package, Building, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { Button } from '../ui/Button';

export default function ItemCard({
  item,
  type = 'donations', // 'donations' | 'ngos'
  isSelected = false,
  isHovered = false,
  isSaved = false,
  smartMatchDetails = null,
  onSelect,
  onHover,
  onToggleSave,
  onClaim,
  userRole
}) {
  const title = item.title || item.name || item.category || 'Dispatched Item';
  const category = item.category || 'General';
  const quantity = item.quantity || 1;
  const distanceKm = item._dist ? item._dist.toFixed(1) : null;
  const address = item.location?.address || item.address || 'Address listed';
  const trustScore = item.trustScore || item.trust_score || 85;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onMouseEnter={() => onHover && onHover(item.id)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`group relative border rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer ${
        isSelected
          ? 'bg-[#F3F0EA] border-[#C48B3F] ring-2 ring-[#C48B3F]/30 shadow-md'
          : isHovered
          ? 'bg-[#EAE4DC] border-[#C48B3F] shadow-sm'
          : 'bg-[#EAE4DC] border-[#DCD4C8] hover:border-[#C48B3F]'
      }`}
      onClick={() => onSelect && onSelect(item)}
    >
      <div className="space-y-4">
        
        {/* Top Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              type === 'ngos' ? 'bg-[#F3F0EA] text-[#C48B3F] border border-[#DCD4C8]' : 'bg-[#F3F0EA] text-[#1C1B18] border border-[#DCD4C8]'
            }`}>
              {type === 'ngos' ? <Building className="w-5 h-5" /> : <Package className="w-5 h-5 text-[#C48B3F]" />}
            </div>
            
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#666157] block">
                {type === 'ngos' ? 'Verified Partner NGO' : `${quantity} Units Available`}
              </span>
              <h3 className="font-serif font-bold text-base text-[#1C1B18] truncate leading-snug group-hover:text-[#C48B3F] transition-colors">
                {title}
              </h3>
            </div>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave && onToggleSave(item.id, e);
            }}
            className={`p-2 rounded-full border transition-colors cursor-pointer shrink-0 ${
              isSaved
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-[#F3F0EA] border-[#DCD4C8] text-[#666157] hover:text-[#1C1B18]'
            }`}
            title={isSaved ? 'Saved in wishlist' : 'Save item'}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Smart Match Banner if available */}
        {smartMatchDetails && (
          <div className="bg-[#F3F0EA] border border-[#DCD4C8] p-2.5 rounded-2xl flex items-center justify-between text-xs text-[#1C1B18] font-medium">
            <span className="flex items-center gap-1.5 font-bold text-[#C48B3F]">
              <Sparkles className="w-4 h-4" /> Smart Match
            </span>
            <span className="font-bold text-xs bg-[#1C1B18] text-white px-2.5 py-0.5 rounded-full">
              {smartMatchDetails.score}% Score
            </span>
          </div>
        )}

        {/* Info Pills */}
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          {category && (
            <span className="bg-[#F3F0EA] text-[#1C1B18] px-3 py-1 rounded-full border border-[#DCD4C8]">
              {category}
            </span>
          )}

          {distanceKm && (
            <span className="bg-emerald-50 text-emerald-800 font-mono font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              <Navigation className="w-3 h-3 text-emerald-600" /> {distanceKm} km away
            </span>
          )}

          {type === 'ngos' && (
            <span className="bg-[#F3F0EA] text-[#C48B3F] font-mono font-bold px-3 py-1 rounded-full border border-[#DCD4C8] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#C48B3F]" /> {trustScore}% Trust
            </span>
          )}
        </div>

        {/* Address */}
        <p className="text-xs text-[#666157] flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-[#C48B3F] shrink-0" />
          <span className="truncate">{address}</span>
        </p>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-5 pt-4 border-t border-[#DCD4C8] flex items-center justify-between gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect && onSelect(item);
          }}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border ${
            isSelected
              ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
              : 'bg-[#F3F0EA] hover:bg-[#DCD4C8] text-[#1C1B18] border-[#DCD4C8]'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          {isSelected ? 'Active Route' : 'Navigate'}
        </button>

        {type === 'donations' && userRole === 'ngo' && (
          <Button
            size="sm"
            className="bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium py-1.5 px-4 rounded-full shadow-xs"
            onClick={(e) => {
              e.stopPropagation();
              onClaim && onClaim(item);
            }}
          >
            Claim Dispatch
          </Button>
        )}
      </div>
    </motion.div>
  );
}
