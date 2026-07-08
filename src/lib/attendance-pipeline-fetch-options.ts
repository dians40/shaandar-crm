export type AttendancePipelineFetchOptions = {
  limit?: number;
  date?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  department?: string;
  designation?: string;
};

export function parseAttendancePipelineFetchParams(
  searchParams: URLSearchParams
): AttendancePipelineFetchOptions {
  return {
    limit: Math.min(Number(searchParams.get("limit") ?? "500"), 500),
    date: searchParams.get("date")?.trim() || undefined,
    fromDate: searchParams.get("fromDate")?.trim() || undefined,
    toDate: searchParams.get("toDate")?.trim() || undefined,
    search: searchParams.get("search")?.trim() || undefined,
    department: searchParams.get("department")?.trim() || undefined,
    designation: searchParams.get("designation")?.trim() || undefined,
  };
}

export function appendAttendancePipelineFetchParams(
  params: URLSearchParams,
  options: AttendancePipelineFetchOptions
): void {
  if (options.fromDate) params.set("fromDate", options.fromDate);
  if (options.toDate) params.set("toDate", options.toDate);
  if (options.search) params.set("search", options.search);
  if (options.department) params.set("department", options.department);
  if (options.designation) params.set("designation", options.designation);
}
