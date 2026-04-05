export type TrackingStatus =
  | "active-investigation"
  | "in-progress"
  | "completed"
  | "queued";

export interface MetadataField {
  label: string;
  value: string;
}

export interface PipelineStepData {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "queued";
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
