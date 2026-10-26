import React from 'react';
import StatusStamp from './StatusStamp';
import { MapPin, Box, Tag, Calendar, ShieldCheck, Heart, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DonationCard({
  donation,
  matchScoreDetails,
  onApprove,
  onReject,
  onClaim,
  actions = null
}) {
  const {
    id,
    donorName,
    category,
    condition,
    quantity,
    description,
    photos,
    location,
    status,
    submittedAt
  } = donation;

  const dateFormatted = new Date(submittedAt || Date.now()).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 flex flex-col md:flex-row gap-6 relative shadow-xs hover:border-[#C48B3F] transition-all"
    >
      <div className="shrink-0 flex md:flex-col items-center justify-between border-b md:border-b-0 md:border-r border-[#DCD4C8] pb-4 md:pb-0 md:pr-6 md:w-48">
        <div className="text-center md:w-full space-y-2">
          <span className="font-mono text-[10px] text-[#666157] block tracking-wider uppercase">REFERENCE ID</span>
          <span className="text-xs font-semibold font-mono text-[#1C1B18]">{id}</span>
          
          <div className="mt-2 text-center md:flex justify-center hidden">
            <StatusStamp status={status} />
          </div>
        </div>

        <div className="flex md:flex-col gap-2 md:mt-4 w-full justify-center md:items-center">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-xs text-[#1C1B18] font-medium">
            <Tag className="w-3.5 h-3.5 text-[#C48B3F]" />
            {category}
          </span>
          <span className="text-xs font-mono text-[#666157] flex items-center gap-1.5 justify-center mt-1">
            <Calendar className="w-3.5 h-3.5" />
            {dateFormatted}
          </span>
        </div>
      </div>

      {/* Right side info details */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-4 text-left">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-serif font-bold text-lg text-[#1C1B18]">
              {donation.itemName || `${quantity}x ${category} Request`}
            </h3>
            <span className="text-xs px-3 py-0.5 rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#C48B3F] font-semibold">
              Condition: {condition}
            </span>
          </div>

          <p className="text-xs text-[#666157] leading-relaxed">
            {description || "No description provided."}
          </p>

          {/* Photos list */}
          {photos && photos.length > 0 && (
            <div className="flex gap-2.5 overflow-x-auto py-1">
              {photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${category} preview`}
                  className="w-16 h-16 object-cover border border-[#DCD4C8] rounded-2xl bg-[#F3F0EA]"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=100';
                  }}
                />
              ))}
            </div>
          )}

          {/* Location / Donor metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs border-t border-[#DCD4C8]">
            <div className="flex items-center gap-2 text-[#666157]">
              <MapPin className="w-4 h-4 text-[#C48B3F] shrink-0" />
              <span className="truncate">{location?.address || "Location unspecified"}</span>
            </div>
            <div className="flex items-center gap-2 sm:justify-end text-[#666157]">
              <User className="w-4 h-4 text-[#666157]" />
              <span>Donor: <strong className="text-[#1C1B18] font-bold">{donorName || "Anonymous"}</strong></span>
            </div>
          </div>

          {/* Match Score Breakdown panel */}
          {matchScoreDetails && (
            <div className="mt-4 p-4 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl space-y-3">
              <div className="flex justify-between items-baseline text-xs">
                <span className="font-semibold text-[#1C1B18] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#C48B3F]" />
                  Smart Match Recommendation
                </span>
                <span className="font-bold text-[#C48B3F]">{matchScoreDetails.total}% Fit Score</span>
              </div>

              <div className="h-2 rounded-full overflow-hidden flex bg-[#DCD4C8]">
                <div style={{ width: `${matchScoreDetails.categoryFit}%` }} className="bg-[#1C1B18] h-full" />
                <div style={{ width: `${matchScoreDetails.distanceScore}%` }} className="bg-[#C48B3F] h-full" />
                <div style={{ width: `${matchScoreDetails.quantityScore}%` }} className="bg-amber-600 h-full" />
                <div style={{ width: `${matchScoreDetails.urgencyScore}%` }} className="bg-emerald-600 h-full" />
                <div style={{ width: `${matchScoreDetails.trustScore}%` }} className="bg-teal-700 h-full" />
                <div style={{ width: `${matchScoreDetails.freshnessScore}%` }} className="bg-stone-500 h-full" />
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        {(onApprove || onReject || onClaim || actions || donation.rejectionReason) && (
          <div className="mt-6 pt-4 border-t border-[#DCD4C8] flex flex-wrap gap-2 items-center justify-between">
            {donation.rejectionReason && (
              <p className="text-xs text-rose-600 italic">
                Moderation rejection reason: "{donation.rejectionReason}"
              </p>
            )}

            <div className="flex gap-2 ml-auto">
              {onReject && (
                <button
                  onClick={onReject}
                  className="px-5 py-2 border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-medium rounded-full transition-colors cursor-pointer"
                >
                  Reject listing
                </button>
              )}
              {onApprove && (
                <button
                  onClick={onApprove}
                  className="px-5 py-2 bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  Approve listing
                </button>
              )}
              {onClaim && (
                <button
                  onClick={onClaim}
                  className="px-5 py-2 bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-xs font-medium rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  Claim request
                </button>
              )}
              {actions}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
