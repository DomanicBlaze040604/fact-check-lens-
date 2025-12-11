import React from 'react';
import { FactCheckResponse, Claim } from '../types';
import VerdictBadge from './VerdictBadge';
import EvidenceCard from './EvidenceCard';
import { AlertTriangle, Info, Search } from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface ResultsDisplayProps {
  data: FactCheckResponse;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ data }) => {
  const formatConfidence = (val: number) => Math.round(val * 100);

  const getConfidenceColor = (val: number) => {
    if (val > 0.8) return '#10b981';
    if (val > 0.5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Executive Summary Card */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Overall Verdict</h2>
            <div className="flex items-center gap-3">
              <VerdictBadge verdict={data.overall_verdict} size="lg" />
              <span className="text-slate-400 text-sm">|</span>
              <span className="text-slate-600 text-sm font-medium">
                {data.input_summary.detected_claims_count} Claim{data.input_summary.detected_claims_count !== 1 ? 's' : ''} Analyzed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <div className="h-16 w-16 relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                        cx="50%" 
                        cy="50%" 
                        innerRadius="60%" 
                        outerRadius="100%" 
                        barSize={6} 
                        data={[{ value: formatConfidence(data.overall_confidence), fill: getConfidenceColor(data.overall_confidence) }]} 
                        startAngle={90} 
                        endAngle={-270}
                    >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                    {formatConfidence(data.overall_confidence)}%
                 </div>
             </div>
             <div className="flex flex-col">
                 <span className="text-xs font-semibold text-slate-700">Confidence Score</span>
                 <span className="text-[10px] text-slate-500">Model Certainty</span>
             </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-serif font-bold text-slate-800 mb-2">Analysis Summary</h3>
          <p className="text-slate-600 leading-relaxed mb-6">
            {data.explainable_summary}
          </p>

          {data.safety_warnings.length > 0 && (
             <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md">
                <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-red-800 uppercase mb-1">Safety Advisory</h4>
                        {data.safety_warnings.map((warn, idx) => (
                            <div key={idx} className="mb-2 last:mb-0">
                                <p className="text-sm text-red-700 font-medium">{warn.message}</p>
                                <p className="text-xs text-red-600 mt-1">Recommended: {warn.recommended_action}</p>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          )}

           {/* Input Context Snippet */}
           <div className="bg-slate-100 rounded p-3 text-xs text-slate-500 border border-slate-200">
              <span className="font-semibold uppercase mr-2">Analyzed Input ({data.input_summary.input_type}):</span>
              <span className="italic">"{data.input_summary.raw_input_excerpt}"</span>
              {data.meta.vision_note && (
                  <div className="mt-1 pt-1 border-t border-slate-200 text-slate-400">
                     <span className="font-semibold">Visual Analysis:</span> {data.meta.vision_note}
                  </div>
              )}
           </div>
        </div>
      </section>

      {/* Claims List */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
             <div className="h-px bg-slate-300 flex-grow"></div>
             <h3 className="text-slate-400 font-semibold uppercase tracking-widest text-xs">Detailed Claims Analysis</h3>
             <div className="h-px bg-slate-300 flex-grow"></div>
        </div>

        {data.claims.map((claim) => (
            <div key={claim.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md">
                <div className="p-5 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                             <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                    {claim.claim_type} Claim
                                </span>
                                {claim.entities.map(e => (
                                    <span key={e} className="text-[10px] text-slate-400 bg-slate-50 px-1.5 rounded border border-slate-100">
                                        {e}
                                    </span>
                                ))}
                             </div>
                             <h4 className="text-lg font-medium text-slate-900 leading-snug">
                                "{claim.claim_text}"
                             </h4>
                        </div>
                        <VerdictBadge verdict={claim.verdict} confidence={claim.verdict_confidence} />
                    </div>
                    
                    <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-md border border-slate-100">
                        <span className="font-semibold text-slate-700 block mb-1 text-xs uppercase">Reasoning</span>
                        {claim.reasoning}
                    </p>
                </div>

                {/* Evidence Grid */}
                <div className="p-5 bg-slate-50/50">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Search className="w-3 h-3" />
                        Supporting Evidence
                    </h5>
                    {claim.evidence.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {claim.evidence.map((ev, idx) => (
                                <EvidenceCard key={idx} evidence={ev} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-400 italic py-2 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            No direct evidence found. Verdict based on reasoning.
                        </div>
                    )}
                </div>
            </div>
        ))}
      </section>

      {/* Suggested Actions */}
      {data.suggested_actions.length > 0 && (
          <section className="flex flex-wrap gap-2 justify-center py-4">
              {data.suggested_actions.map(action => (
                  <span key={action} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 uppercase tracking-wide">
                      Recommended: {action.replace(/_/g, ' ')}
                  </span>
              ))}
          </section>
      )}

      {/* Meta Footer */}
      <footer className="text-center text-slate-400 text-xs py-8 space-y-2">
          <p>Analyzed by {data.meta.model} at {new Date(data.meta.timestamp_utc).toLocaleString()}</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 opacity-75">
              {data.meta.search_queries.slice(0,3).map((q, i) => (
                  <span key={i} className="italic">"{q}"</span>
              ))}
          </div>
      </footer>

    </div>
  );
};

export default ResultsDisplay;