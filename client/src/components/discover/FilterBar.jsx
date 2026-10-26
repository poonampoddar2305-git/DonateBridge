import React from 'react';
import { 
  Search, Building, Navigation, Award, RotateCcw, X, Filter, SlidersHorizontal,
  LayoutGrid, Map as MapIcon, Columns, ArrowUpDown
} from 'lucide-react';

const CATEGORIES = [
  'All', 'Books', 'Clothes', 'Food', 'Furniture', 
  'Electronics', 'Medical Equipment', 'School Supplies', 'Blankets', 'Sports Equipment'
];

export default function FilterBar({
  searchType,
  onSearchTypeChange,
  query,
  onQueryChange,
  selectedCategory,
  onCategoryChange,
  distanceRange,
  onDistanceChange,
  minTrustScore,
  onMinTrustScoreChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  onResetFilters,
  activeFiltersCount
}) {
  return (
    <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 lg:p-8 space-y-6 shadow-xs text-left">
      
      {/* Top Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#F3F0EA] text-[#C48B3F] border border-[#DCD4C8] font-bold text-[10px] uppercase tracking-widest">
            Global Match Radar
          </span>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#1C1B18] tracking-tight mt-2">
            Resource Directory
          </h1>
          <p className="text-[#666157] mt-1 text-sm font-medium">
            Scan local dispatches, verify verified partner NGOs, and route logistics instantly.
          </p>
        </div>

        {/* View Mode Controls & Radar Mode Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Donations vs NGOs mode tab */}
          <div className="flex bg-[#F3F0EA] p-1.5 rounded-full border border-[#DCD4C8]">
            <button
              onClick={() => onSearchTypeChange('donations')}
              className={`py-2 px-5 text-xs font-medium rounded-full transition-all flex items-center gap-2 cursor-pointer ${
                searchType === 'donations' ? 'bg-[#1C1B18] text-white shadow-xs' : 'text-[#666157] hover:text-[#1C1B18]'
              }`}
            >
              <Search className={`w-3.5 h-3.5 ${searchType === 'donations' ? 'text-[#C48B3F]' : ''}`} /> Scan Donations
            </button>
            <button
              onClick={() => onSearchTypeChange('ngos')}
              className={`py-2 px-5 text-xs font-medium rounded-full transition-all flex items-center gap-2 cursor-pointer ${
                searchType === 'ngos' ? 'bg-[#1C1B18] text-white shadow-xs' : 'text-[#666157] hover:text-[#1C1B18]'
              }`}
            >
              <Building className={`w-3.5 h-3.5 ${searchType === 'ngos' ? 'text-[#C48B3F]' : ''}`} /> Partner NGOs
            </button>
          </div>

          {/* Desktop Layout Split View Toggle */}
          <div className="hidden sm:flex bg-[#F3F0EA] p-1.5 rounded-full border border-[#DCD4C8]">
            <button
              title="Split View"
              onClick={() => onViewModeChange('split')}
              className={`p-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'split' ? 'bg-[#1C1B18] text-[#C48B3F]' : 'text-[#666157] hover:text-[#1C1B18]'
              }`}
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              title="Grid Focus"
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-[#1C1B18] text-[#C48B3F]' : 'text-[#666157] hover:text-[#1C1B18]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              title="Map Focus"
              onClick={() => onViewModeChange('map')}
              className={`p-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'map' ? 'bg-[#1C1B18] text-[#C48B3F]' : 'text-[#666157] hover:text-[#1C1B18]'
              }`}
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Filter Controls Grid */}
      <div className="flex flex-col xl:flex-row gap-4 pt-4 border-t border-[#DCD4C8]">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchType === 'donations' ? "Search items (e.g. Blankets, Books, Food)..." : "Search NGO names or location..."}
            className="w-full pl-12 pr-10 h-12 border border-[#DCD4C8] rounded-2xl bg-[#F3F0EA] text-[#1C1B18] placeholder-[#666157] focus:outline-none focus:border-[#C48B3F] font-medium text-xs transition-all"
          />
          <Search className="w-4 h-4 text-[#C48B3F] absolute left-4 top-1/2 -translate-y-1/2" />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666157] hover:text-[#1C1B18]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Distance Slider */}
        <div className="flex items-center gap-3 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl px-4 h-12 shrink-0">
          <Navigation className="w-4 h-4 text-[#C48B3F] shrink-0" />
          <div className="flex flex-col justify-center min-w-[130px]">
            <span className="text-[9px] font-bold text-[#666157] uppercase tracking-widest">Radius Distance</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="2"
                max="50"
                value={distanceRange}
                onChange={(e) => onDistanceChange(Number(e.target.value))}
                className="w-20 accent-[#C48B3F] cursor-pointer"
              />
              <span className="font-mono font-bold text-[#1C1B18] text-xs">{distanceRange} km</span>
            </div>
          </div>
        </div>

        {/* Trust Score Slider (For NGOs) */}
        {searchType === 'ngos' && (
          <div className="flex items-center gap-3 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl px-4 h-12 shrink-0">
            <Award className="w-4 h-4 text-[#C48B3F] shrink-0" />
            <div className="flex flex-col justify-center min-w-[130px]">
              <span className="text-[9px] font-bold text-[#666157] uppercase tracking-widest">Min Trust Score</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={minTrustScore}
                  onChange={(e) => onMinTrustScoreChange(Number(e.target.value))}
                  className="w-20 accent-[#C48B3F] cursor-pointer"
                />
                <span className="font-mono font-bold text-[#1C1B18] text-xs">{minTrustScore}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 bg-[#F3F0EA] border border-[#DCD4C8] rounded-2xl px-4 h-12 shrink-0">
          <ArrowUpDown className="w-4 h-4 text-[#C48B3F] shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="bg-transparent border-none outline-none font-bold text-xs text-[#1C1B18] cursor-pointer"
          >
            <option value="distance">Sort by Distance</option>
            <option value="match">Sort by Match Score</option>
            <option value="date">Sort by Recent</option>
            <option value="qty">Sort by Quantity</option>
          </select>
        </div>

        {/* Reset Button */}
        {activeFiltersCount > 0 && (
          <button
            onClick={onResetFilters}
            className="h-12 px-5 bg-[#1C1B18] text-white font-medium text-xs rounded-full flex items-center gap-2 hover:bg-[#C48B3F] shrink-0 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Category Pills Carousel (Donations) */}
      {searchType === 'donations' && (
        <div className="flex overflow-x-auto gap-2.5 pb-1 hide-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`py-1.5 px-4 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
                  : 'bg-[#F3F0EA] text-[#666157] border-[#DCD4C8] hover:bg-[#EAE4DC] hover:text-[#1C1B18]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
