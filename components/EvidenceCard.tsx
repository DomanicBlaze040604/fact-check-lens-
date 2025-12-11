import React from 'react';
import { Evidence } from '../types';
import { ExternalLink, Quote, Calendar } from 'lucide-react';

interface EvidenceCardProps {
  evidence: Evidence;
}

const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-0.5">
                {evidence.source_type}
            </span>
            <a 
                href={evidence.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
                {evidence.source_title}
                <ExternalLink className="w-3 h-3" />
            </a>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(evidence.retrieved_at).toLocaleDateString()}
        </div>
      </div>
      
      {evidence.quote && (
        <div className="bg-slate-50 p-2 rounded text-xs text-slate-700 italic border-l-2 border-slate-300 relative">
          <Quote className="w-3 h-3 text-slate-300 absolute top-1 right-1" />
           "{evidence.quote}"
        </div>
      )}
      
      {evidence.confidence_in_source < 0.7 && (
         <div className="mt-2 text-[10px] text-amber-600 flex items-center">
            ⚠️ Low source confidence
         </div>
      )}
    </div>
  );
};

export default EvidenceCard;