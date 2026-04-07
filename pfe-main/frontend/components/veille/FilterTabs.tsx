import React from "react";
import { motion } from "framer-motion";

interface FilterTabsProps {
  categories: string[];
  activeCategory: string;
  onFilterChange: (category: string) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ categories, activeCategory, onFilterChange }) => {
  return (
    <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm p-1.5 rounded-[2rem] border border-slate-100/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-x-auto no-scrollbar scroll-smooth">
      <div className="flex items-center gap-1 min-w-max">
        {categories.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => onFilterChange(category)}
              className={`relative px-5 py-2.5 rounded-[1.5rem] text-[12px] font-black tracking-widest uppercase transition-all duration-300
                ${isActive ? "text-[#00BCD4]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="activeFilter"
                  className="absolute inset-0 bg-white rounded-[1.5rem] shadow-sm ring-1 ring-slate-100"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{ zIndex: 0 }}
                />
              )}
              <span className="relative z-10">{category}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterTabs;
