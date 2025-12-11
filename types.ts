export type InputType = 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'url' | 'mixed';

export type ClaimType = 'explicit' | 'implicit';

export type SourceType = 'news' | 'research' | 'official' | 'factcheck' | 'video' | 'archive' | 'other';

export type Verdict = 'true' | 'false' | 'misleading' | 'out_of_context' | 'ai_generated' | 'unknown';

export interface Evidence {
  source_title: string;
  source_url: string;
  source_type: SourceType;
  quote: string;
  extracted_text?: string;
  confidence_in_source: number;
  retrieved_at: string;
}

export interface Claim {
  id: string;
  claim_text: string;
  claim_type: ClaimType;
  entities: string[];
  evidence: Evidence[];
  verdict: Verdict;
  verdict_confidence: number;
  reasoning: string;
  suggested_search_queries: string[];
  provenance: string[];
}

export interface SafetyWarning {
  category: 'medical' | 'legal' | 'privacy' | 'violent_content' | 'self_harm' | 'other';
  message: string;
  recommended_action: string;
}

export interface InputSummary {
  input_type: InputType;
  raw_input_excerpt: string;
  detected_claims_count: number;
}

export interface MetaData {
  search_queries: string[];
  timestamp_utc: string;
  model: string;
  notes?: string;
  vision_note?: string;
}

export interface FactCheckResponse {
  input_summary: InputSummary;
  claims: Claim[];
  overall_verdict: Verdict;
  overall_confidence: number;
  explainable_summary: string;
  suggested_actions: string[];
  safety_warnings: SafetyWarning[];
  meta: MetaData;
}

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  data: FactCheckResponse | null;
  error?: string;
}
