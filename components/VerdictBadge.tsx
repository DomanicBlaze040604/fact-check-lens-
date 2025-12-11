import React from 'react';
import clsx from 'clsx';
import { Verdict } from '../types';
import { VERDICT_COLORS, VERDICT_LABELS } from '../constants';
import { ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle, Bot } from 'lucide-react';

interface VerdictBadgeProps {
  verdict: Verdict;
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
}

const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, confidence, size = 'md' }) => {
  const colorClass = VERDICT_COLORS[verdict] || VERDICT_COLORS.unknown;
  const label = VERDICT_LABELS[verdict] || 'Unknown';
  
  const Icon = () => {
    switch(verdict) {
      case 'true': return <ShieldCheck className="w-4 h-4 mr-1.5" />;
      case 'false': return <ShieldAlert className="w-4 h-4 mr-1.5" />;
      case 'misleading': return <AlertTriangle className="w-4 h-4 mr-1.5" />;
      case 'out_of_context': return <AlertTriangle className="w-4 h-4 mr-1.5" />;
      case 'ai_generated': return <Bot className="w-4 h-4 mr-1.5" />;
      default: return <HelpCircle className="w-4 h-4 mr-1.5" />;
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className={clsx(
      "inline-flex items-center font-medium rounded-full border",
      colorClass,
      sizeClasses[size]
    )}>
      <Icon />
      <span>{label}</span>
      {confidence !== undefined && (
        <span className="ml-2 pl-2 border-l border-current opacity-75">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
};

export default VerdictBadge;