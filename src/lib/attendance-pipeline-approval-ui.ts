export type PipelineApprovalAction =
  | ""
  | "approve_layer_3"
  | "approve_layer_4"
  | "save_archive"
  | "reject";

export const LAYER_2_APPROVAL_OPTIONS: { value: PipelineApprovalAction; label: string }[] = [
  { value: "", label: "Select Status" },
  { value: "approve_layer_3", label: "Approve to Layer 3" },
  { value: "reject", label: "Reject" },
];

export const LAYER_3_APPROVAL_OPTIONS: { value: PipelineApprovalAction; label: string }[] = [
  { value: "", label: "Select Status" },
  { value: "approve_layer_4", label: "Approve to Layer 4" },
  { value: "reject", label: "Reject" },
];

export const LAYER_4_APPROVAL_OPTIONS: { value: PipelineApprovalAction; label: string }[] = [
  { value: "", label: "Select Status" },
  { value: "save_archive", label: "Save to Archive" },
  { value: "reject", label: "Reject" },
];

export const ATTENDANCE_PIPELINE_REFRESH_EVENT = "attendance-pipeline-refresh";

export function dispatchAttendancePipelineRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ATTENDANCE_PIPELINE_REFRESH_EVENT));
}
