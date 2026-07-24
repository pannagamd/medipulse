export type Severity = 'safe' | 'moderate' | 'high' | 'dangerous' | 'unknown';

export interface ApiErrorShape {
  detail?: string | { message?: string } | Array<{ msg: string }>;
  message?: string;
}

export interface User {
  id: string;
  phone_number: string;
  email: string | null;
  full_name: string | null;
  is_admin: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginResponse extends TokenPair {
  user: User;
}

export interface MedicineAlias {
  id: string;
  alias: string;
  alias_type: string;
  source_name: string;
}

export interface MedicineSource {
  id: string;
  source_name: string;
  source_record_id?: string | null;
  source_url?: string | null;
  source_version?: string | null;
  source_date?: string | null;
  confidence: number;
}

export interface Medicine {
  id: string;
  generic_name: string;
  brand_name?: string | null;
  composition?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  side_effects?: string | null;
  precautions?: string | null;
  contraindications?: string | null;
  storage_instructions?: string | null;
  usage_guidelines?: string | null;
  source_name: string;
  source_url?: string | null;
  source_version?: string | null;
  source_date?: string | null;
  confidence: number;
  rx_cui?: string | null;
  created_at: string;
  updated_at: string;
  aliases: MedicineAlias[];
  sources: MedicineSource[];
}

export interface MedicineSearchResponse {
  total: number;
  items: Medicine[];
}

export interface ResolvedMedicine {
  input: string;
  resolved_name: string;
  medicine_id?: string | null;
  brand_name?: string | null;
  composition?: string | null;
  contraindications?: string | null;
  precautions?: string | null;
  matched: boolean;
}

export interface ProfileWarning {
  severity: Severity;
  message: string;
  medicine?: string | null;
}

export interface InteractionResult {
  drug_a: string;
  drug_b: string;
  severity: Severity;
  explanation: string;
  mechanism?: string | null;
  recommendations: string[];
  sources: Array<{ name: string; url?: string | null; version?: string | null; date?: string | null }>;
  confidence: number;
  matched: boolean;
}

export interface InteractionAnalyzeResponse {
  results: InteractionResult[];
  resolved_medicines: ResolvedMedicine[];
  profile_warnings: ProfileWarning[];
  overall_severity: Severity;
  medical_disclaimer: string;
}

export interface HealthProfile {
  id: string;
  user_id: string;
  age?: number | null;
  gender?: string | null;
  weight_kg?: number | null;
  allergies?: string | null;
  medical_conditions?: string | null;
  current_medications?: string | null;
  is_pregnant?: boolean | null;
  notes?: string | null;
}

export type HealthProfileUpdatePayload = Omit<HealthProfile, 'id' | 'user_id'>;

export interface ProfileSafetyCheckResponse {
  resolved_medicines: ResolvedMedicine[];
  profile_warnings: ProfileWarning[];
  medical_disclaimer: string;
}

export interface SymptomSuggestion {
  rule_id?: string | null;
  possible_condition: string;
  matched_symptoms: string[];
  care_recommendations: string[];
  commonly_used_medicines: string[];
  precautions: string[];
  escalation_triggers: string[];
  seek_medical_care: boolean;
  confidence: number;
}

export interface SymptomSuggestionResponse {
  suggestions: SymptomSuggestion[];
  profile_warnings: ProfileWarning[];
  urgent: boolean;
  emergency_warning: string;
  medical_disclaimer: string;
}

export interface ImportBatch {
  id: string;
  source_name: string;
  source_type: string;
  filename: string | null;
  records_total: number;
  records_imported: number;
  errors: string | null;
  status: string;
}

export interface ImportResult {
  batch: ImportBatch;
}

export interface ImportBatchListResponse {
  total: number;
  items: ImportBatch[];
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

export interface EnrichmentResult {
  medicine: Medicine;
  source: MedicineSource | null;
  updated_fields: string[];
  skipped_fields: string[];
  message: string;
}

export type PagedHistoryItem = {
  id: string;
  kind: 'medicine' | 'interaction' | 'pregnancy' | 'profile' | 'symptom';
  title: string;
  detail: string;
  createdAt: string;
};
