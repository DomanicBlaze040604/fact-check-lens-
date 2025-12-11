import React, { useState } from 'react';
import { FactCheckResponse } from '../types';
import VerdictBadge from './VerdictBadge';
import EvidenceCard from './EvidenceCard';
import { generatePdfReport } from '../services/reportService';
import { AlertTriangle, Info, Search, Copy, Check, Download, Volume2, FileText } from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';

interface ResultsDisplayProps {
  data: FactCheckResponse;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const formatConfidence = (val: number) => Math.round(val * 100);

  const getConfidenceColor = (val: number) => {
    if (val > 0.8) return '#10B981'; // brand-green
    if (val > 0.5) return '#F59E0B'; // brand-yellow
    return '#EF4444'; // brand-red
  };

  const handleCopy = () => {
    const summary = `Fact Check Result: ${data.overall_verdict.toUpperCase()}\nConfidence: ${formatConfidence(data.overall_confidence)}%\n\nSummary: ${data.explainable_summary}\n\nVia Instant Fact-Check Lens`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJsonDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fact-check-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSpeak = () => {
    if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        return;
    }
    const utterance = new SpeechSynthesisUtterance(data.explainable_summary);
    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Executive Summary Card */}
      <section className="bg-white rounded-3xl shadow-xl shadow-brand-green/5 border border-white overflow-hidden relative">
        <div className="bg-gradient-to-r from-slate-50 to-brand-light/30 px-8 py-6 border-b border-brand-green/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Overall Verdict</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <VerdictBadge verdict={data.overall_verdict} size="lg" />
              <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
              <span className="text-slate-600 font-medium">
                {data.input_summary.detected_claims_count} Claim{data.input_summary.detected_claims_count !== 1 ? 's' : ''} Analyzed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-2xl border border-slate-100 shadow-sm">
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
                 <span className="text-sm font-bold text-slate-800">Confidence</span>
                 <span className="text-xs text-slate-400">AI Certainty</span>
             </div>
          </div>
        </div>

        <div className="p-8">
          <div className="flex justify-between items-start mb-4">
             <h3 className="text-xl font-serif font-bold text-slate-900">Analysis Summary</h3>
             <div className="flex gap-2">
                <button 
                    onClick={handleSpeak}
                    className={clsx("text-slate-400 hover:text-brand-green transition-colors p-2 rounded-lg hover:bg-brand-light", isPlaying && "text-brand-green bg-brand-light")}
                    title="Read Aloud"
                >
                    <Volume2 className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => generatePdfReport(data)}
                    className="text-white bg-brand-green hover:bg-brand-dark transition-colors px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm shadow-brand-green/20"
                    title="Download PDF Report"
                >
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-bold">PDF</span>
                </button>
                <button 
                    onClick={handleJsonDownload}
                    className="text-slate-400 hover:text-brand-green transition-colors p-2 rounded-lg hover:bg-brand-light"
                    title="Download JSON Data"
                >
                    <Download className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-brand-green transition-colors p-2 rounded-lg hover:bg-brand-light"
                    title="Copy Summary"
                >
                    {copied ? <Check className="w-5 h-5 text-brand-green" /> : <Copy className="w-5 h-5" />}
                </button>
             </div>
          </div>
          
          <p className="text-slate-700 leading-relaxed text-lg mb-8">
            {data.explainable_summary}
          </p>

          {data.safety_warnings.length > 0 && (
             <div className="bg-brand-red/5 border border-brand-red/10 p-5 rounded-xl mb-6">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-brand-red/10 text-brand-red rounded-lg">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-red-900 uppercase mb-2">Safety Advisory</h4>
                        {data.safety_warnings.map((warn, idx) => (
                            <div key={idx} className="mb-3 last:mb-0">
                                <p className="text-sm text-red-800 font-medium">{warn.message}</p>
                                <p className="text-xs text-red-600 mt-1">Recommendation: {warn.recommended_action}</p>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          )}

           {/* Input Context Snippet */}
           <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 border border-slate-100">
              <span className="font-bold uppercase tracking-wider mr-2 text-slate-400">Source Context:</span>
              <span className="italic text-slate-600">"{data.input_summary.raw_input_excerpt}"</span>
              {data.meta.vision_note && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-slate-500">
                     <span className="font-semibold text-brand-green">Visual Analysis:</span> {data.meta.vision_note}
                  </div>
              )}
           </div>
        </div>
      </section>

      {/* Claims List */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
             <div className="h-px bg-slate-200 flex-grow"></div>
             <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Detailed Claims Analysis</h3>
             <div className="h-px bg-slate-200 flex-grow"></div>
        </div>

        {data.claims.map((claim) => (
            <div key={claim.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-brand-green/5 group">
                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-4">
                        <div className="flex-1 space-y-3">
                             <div className="flex flex-wrap items-center gap-2">
                                <span className={clsx(
                                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                    claim.claim_type === 'explicit' ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                    {claim.claim_type} Claim
                                </span>
                                {claim.entities.map(e => (
                                    <span key={e} className="text-[10px] text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 font-medium">
                                        {e}
                                    </span>
                                ))}
                             </div>
                             <h4 className="text-xl font-medium text-slate-900 leading-snug group-hover:text-brand-green transition-colors">
                                "{claim.claim_text}"
                             </h4>
                        </div>
                        <VerdictBadge verdict={claim.verdict} confidence={claim.verdict_confidence} />
                    </div>
                    
                    <div className="text-sm text-slate-600 bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-100 relative">
                        <span className="absolute top-0 left-0 w-1 h-full bg-brand-yellow/50 rounded-l-xl"></span>
                        <span className="font-bold text-slate-700 block mb-2 text-xs uppercase tracking-wide">Analysis & Reasoning</span>
                        {claim.reasoning}
                    </div>
                </div>

                {/* Evidence Grid */}
                <div className="px-6 md:px-8 pb-8 pt-2">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5" />
                        Supporting Evidence
                    </h5>
                    {claim.evidence.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {claim.evidence.map((ev, idx) => (
                                <EvidenceCard key={idx} evidence={ev} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-400 italic py-3 px-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            No direct evidence found. Verdict based on logical reasoning and model knowledge.
                        </div>
                    )}
                </div>
            </div>
        ))}
      </section>

      {/* Suggested Actions */}
      {data.suggested_actions.length > 0 && (
          <section className="flex flex-wrap gap-3 justify-center py-6">
              {data.suggested_actions.map(action => (
                  <span key={action} className="px-4 py-1.5 rounded-full bg-brand-light text-brand-green text-xs font-bold border border-brand-green/20 uppercase tracking-wide shadow-sm">
                      Recommended: {action.replace(/_/g, ' ')}
                  </span>
              ))}
          </section>
      )}

      {/* Meta Footer */}
      <footer className="text-center text-slate-400 text-xs py-8 space-y-3 border-t border-slate-100 mt-12">
          <p>Analyzed by <span className="font-semibold text-slate-500">{data.meta.model}</span> at {new Date(data.meta.timestamp_utc).toLocaleString()}</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 opacity-75 max-w-lg mx-auto">
              {data.meta.search_queries.slice(0,3).map((q, i) => (
                  <span key={i} className="italic bg-slate-50 px-2 py-0.5 rounded text-slate-500">"{q}"</span>
              ))}
          </div>
      </footer>

    </div>
  );
};

export default ResultsDisplay;