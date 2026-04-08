export type TrackingStatus =
  | "active-investigation"
  | "in-progress"
  | "completed"
  | "queued";

export type PipelineStatus = "completed" | "in-progress" | "queued";

export type CheckCategory =
  | "IDENTITY_CHECKS"
  | "VERIFICATION_SERVICES"
  | "LEGAL_IMMIGRATION_CHECKS"
  | "CORPORATE_FINANCIAL_CHECKS"
  | "SPECIALIZED_CHECKS";

export type CheckProgressStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "ACTIVE_INVESTIGATION"
  | "COMPLETED"
  | "ON_HOLD";

export interface MetadataField {
  label: string;
  value: string;
}

export interface PipelineStepData {
  id: string;
  title: string;
  description: string;
  status: PipelineStatus;
}

export interface ActivityItem {
  id: string;
  time: string;
  description: string;
  highlight?: string;
}

export interface TrackingRecord {
  referenceNumber: string;
  status: TrackingStatus;
  title: string;
  expectedCompletion: string;
  percent: number;
  summary: string;
  metadataFields: MetadataField[];
  pipelineSteps: PipelineStepData[];
  recentActivity: ActivityItem[];
}

export interface TrackingSample {
  referenceNumber: string;
  status: TrackingStatus;
  title: string;
  summary: string;
}

export interface SheetOrderSnapshot {
  trackingNumber: string;
  submitterName: string;
  submitterEmail: string;
  companyName: string;
  submitterPhone: string;
  subjectName: string;
  subjectEmail: string;
  subjectDateOfBirth: string;
  subjectPhone: string;
  currentAddress: string;
  apartmentOrSuite: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
  purpose: string;
  areaOfCheck: string;
  selectedCheckCategories: CheckCategory[];
  rawFields: Record<string, string>;
}

export interface OrderProgressSummary {
  trackingNumber: string;
  overallStatus: CheckProgressStatus;
  summary: string | null;
  etaLabel: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckProgressView {
  id: string;
  checkType: CheckCategory;
  status: CheckProgressStatus;
  timelineLabel: string | null;
  notes: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressActivityView {
  id: string;
  message: string;
  highlight: string | null;
  createdAt: string;
}

export interface OrderProgressView {
  order: SheetOrderSnapshot;
  progress: OrderProgressSummary | null;
  checks: CheckProgressView[];
  activities: ProgressActivityView[];
  trackerRecord: TrackingRecord;
}
