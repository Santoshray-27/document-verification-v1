import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Graph Paper Background */}
      <div className="absolute inset-0 bg-graph-paper bg-graph opacity-20 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-16 max-w-4xl mx-auto w-full">
         
         <div className="flex-1 text-center md:text-left space-y-6">
            <h1 className="font-display text-[10rem] leading-none text-ink tracking-tighter opacity-10">404</h1>
            <div className="relative">
               <h2 className="font-display text-4xl text-ink">Page Not Found</h2>
               {/* Ink Stamp */}
               <motion.div 
                 initial={{ opacity: 0, scale: 2, rotate: 10 }}
                 animate={{ opacity: 1, scale: 1, rotate: -5 }}
                 transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}
                 className="absolute -top-12 -right-8 px-4 py-1 border-[3px] border-rose-600 text-rose-600 font-display text-2xl uppercase tracking-widest font-bold mix-blend-multiply opacity-80"
               >
                 NOT FOUND
               </motion.div>
            </div>
            
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted leading-relaxed max-w-md">
              The requested record or resource does not exist in the active registry. It may have been moved, revoked, or the URL is malformed.
            </p>
            
            <div className="pt-8">
              <Link to="/" className="inline-flex items-center gap-2 bg-ink text-bg px-6 py-3 font-mono font-bold text-[10px] uppercase tracking-widest shadow-hard hover:-translate-y-1 transition-transform border border-ink">
                <ArrowLeft size={14} /> Return to Console
              </Link>
            </div>
         </div>

         <div className="flex-1 w-full max-w-sm relative perspective-[1000px]">
           <motion.div 
             animate={{ rotateY: [-10, 10, -10], rotateX: [5, -5, 5] }}
             transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
             className="w-full aspect-[1/1.4] bg-surface border border-line shadow-2xl relative p-8 flex flex-col items-center justify-center text-ink-muted"
             style={{ transformStyle: 'preserve-3d' }}
           >
             <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ink -translate-x-[2px] -translate-y-[2px]" />
             <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ink translate-x-[2px] -translate-y-[2px]" />
             <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ink -translate-x-[2px] translate-y-[2px]" />
             <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ink translate-x-[2px] translate-y-[2px]" />
             
             <FileQuestion size={48} className="opacity-20 mb-4" />
             <div className="w-16 h-px bg-line mb-4" />
             <p className="font-mono text-[10px] uppercase tracking-widest">Null Reference</p>
             
             {/* Scan line effect */}
             <motion.div 
               animate={{ y: ['-100%', '300%'] }} 
               transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
               className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-rose-500/10 to-transparent border-b border-rose-500/30 pointer-events-none"
             />
           </motion.div>
         </div>

      </div>
    </div>
  );
}
