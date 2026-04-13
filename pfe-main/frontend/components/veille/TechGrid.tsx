import React from "react";
import { motion, Variants } from "framer-motion";
import TechCard, { TechArticle } from "./TechCard";

interface TechGridProps {
  articles: TechArticle[];
  isLoading: boolean;
  onApply: (article: TechArticle) => void;
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const TechGrid: React.FC<TechGridProps> = ({ articles, isLoading, onApply }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-96 bg-white/50 animate-pulse rounded-[2rem] border border-slate-100"></div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">📭</span>
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-2">Aucun article trouvé</h3>
        <p className="text-slate-400 font-semibold max-w-sm">
          Nous n'avons trouvé aucune ressource technologique pour cette catégorie. Revenez plus tard !
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4"
    >
      {articles.map((article) => (
        <motion.div key={article.id} variants={item}>
          <TechCard article={article} onApply={onApply} />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default TechGrid;
