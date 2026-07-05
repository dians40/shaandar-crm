"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FORM_SECTIONS } from "@/constants/employee-options";
import { createEmployee, fetchEmployee, updateEmployee } from "@/lib/employees-api";
import {
  hasValidationErrors,
  validateBasicInformation,
  validateBankAndSalary,
  type BasicInformationErrors,
  type BankAndSalaryErrors,
} from "@/lib/validate-employee-form";
import {
  INITIAL_EMPLOYEE_FORM,
  type EmployeeFormData,
  type FormSectionId,
} from "@/types/employee-form";
import BasicInformationSection from "./sections/basic-information-section";
import WorkAssignmentSection from "./sections/work-assignment-section";
import FamilyHistorySection from "./sections/family-history-section";
import DocumentUploadSection from "./sections/document-upload-section";
import BankSalarySection from "./sections/bank-salary-section";

type Props = {
  mode?: "add" | "edit";
  employeeId?: string;
  onBack: () => void;
  onSuccess: () => void;
};

export default function EmployeeForm({
  mode = "add",
  employeeId,
  onBack,
  onSuccess,
}: Props) {
  const [activeSection, setActiveSection] = useState<FormSectionId>("basic");
  const [formData, setFormData] = useState<EmployeeFormData>(INITIAL_EMPLOYEE_FORM);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [basicErrors, setBasicErrors] = useState<BasicInformationErrors>({});
  const [bankErrors, setBankErrors] = useState<BankAndSalaryErrors>({});

  useEffect(() => {
    if (mode !== "edit" || !employeeId) return;

    setIsLoading(true);
    setLoadError(null);

    fetchEmployee(employeeId)
      .then((data) => setFormData(data))
      .catch((error) =>
        setLoadError(error instanceof Error ? error.message : "Failed to load employee.")
      )
      .finally(() => setIsLoading(false));
  }, [mode, employeeId]);

  const activeIndex = FORM_SECTIONS.findIndex(
    (section) => section.id === activeSection
  );
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === FORM_SECTIONS.length - 1;

  const runBasicValidation = () => {
    const errors = validateBasicInformation(formData.basicInformation);
    setBasicErrors(errors);
    setShowValidation(true);
    return !hasValidationErrors(errors);
  };

  const runBankValidation = () => {
    const errors = validateBankAndSalary(formData.bankAndSalary);
    setBankErrors(errors);
    setShowValidation(true);
    return !hasValidationErrors(errors);
  };

  const sectionContent = useMemo(() => {
    switch (activeSection) {
      case "basic":
        return (
          <BasicInformationSection
            data={formData.basicInformation}
            errors={showValidation ? basicErrors : {}}
            profilePhoto={formData.documents.profilePhoto}
            existingProfilePhotoPath={formData.existingDocumentPaths.profilePhoto}
            onProfilePhotoChange={(file) =>
              setFormData((prev) => ({
                ...prev,
                documents: { ...prev.documents, profilePhoto: file },
              }))
            }
            onChange={(basicInformation) => {
              setFormData((prev) => ({ ...prev, basicInformation }));
              if (showValidation) {
                setBasicErrors(validateBasicInformation(basicInformation));
              }
            }}
          />
        );
      case "work":
        return (
          <WorkAssignmentSection
            data={formData.workAssignment}
            onChange={(workAssignment) =>
              setFormData((prev) => ({ ...prev, workAssignment }))
            }
          />
        );
      case "family":
        return (
          <FamilyHistorySection
            members={formData.familyMembers}
            onChange={(familyMembers) =>
              setFormData((prev) => ({ ...prev, familyMembers }))
            }
          />
        );
      case "documents":
        return (
          <DocumentUploadSection
            documents={formData.documents}
            documentNumbers={formData.documentNumbers}
            existingDocumentPaths={formData.existingDocumentPaths}
            onDocumentsChange={(documents) =>
              setFormData((prev) => ({ ...prev, documents }))
            }
            onDocumentNumbersChange={(documentNumbers) =>
              setFormData((prev) => ({ ...prev, documentNumbers }))
            }
          />
        );
      case "bank":
        return (
          <BankSalarySection
            data={formData.bankAndSalary}
            salaryBasis={formData.basicInformation.salaryBasis}
            errors={showValidation ? bankErrors : {}}
            onChange={(bankAndSalary) => {
              setFormData((prev) => ({ ...prev, bankAndSalary }));
              if (showValidation) {
                setBankErrors(validateBankAndSalary(bankAndSalary));
              }
            }}
          />
        );
      default:
        return null;
    }
  }, [activeSection, formData, basicErrors, bankErrors, showValidation]);

  const goNext = () => {
    if (activeSection === "basic" && !runBasicValidation()) return;
    if (!isLast) setActiveSection(FORM_SECTIONS[activeIndex + 1].id);
  };

  const goPrevious = () => {
    if (!isFirst) setActiveSection(FORM_SECTIONS[activeIndex - 1].id);
  };

  const handleSectionTabClick = (sectionId: FormSectionId, index: number) => {
    if (index > activeIndex && activeSection === "basic" && !runBasicValidation()) {
      return;
    }
    setActiveSection(sectionId);
  };

  const handleSubmit = async () => {
    if (!runBasicValidation()) {
      setActiveSection("basic");
      return;
    }
    if (!runBankValidation()) {
      setActiveSection("bank");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    try {
      const result =
        mode === "edit" && employeeId
          ? await updateEmployee(employeeId, formData)
          : await createEmployee(formData);

      setSubmitMessage(result.message);
      onSuccess();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save employee."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_EMPLOYEE_FORM);
    setActiveSection("basic");
    setSubmitMessage(null);
    setSubmitError(null);
    setShowValidation(false);
    setBasicErrors({});
    setBankErrors({});
  };

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-corporate-border bg-corporate-surface p-10">
        <Loader2 className="h-6 w-6 animate-spin text-corporate-brand" />
        <span className="ml-3 text-sm text-corporate-muted">Loading employee...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {loadError}
        <button type="button" className="btn-secondary mt-4" onClick={onBack}>
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-corporate-brand hover:text-corporate-brand-hover"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Employee List
            </button>
            <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
              Employee Management
            </p>
            <h2 className="mt-1 text-lg font-semibold text-corporate-text">
              {mode === "edit" ? "Edit Employee" : "Add New Employee"}
            </h2>
            <p className="mt-1 text-sm text-corporate-muted">
              {mode === "edit"
                ? "Update any field — previously empty entries can be filled now."
                : "Complete all five sections. Machine assignment is optional."}
            </p>
          </div>
          <div className="text-sm text-corporate-muted">
            Step {activeIndex + 1} of {FORM_SECTIONS.length}
          </div>
        </div>

        <div className="workspace-table-scroll mt-5">
          <div className="flex min-w-max gap-2">
            {FORM_SECTIONS.map((section, index) => {
              const isActive = section.id === activeSection;
              const isCompleted = index < activeIndex;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSectionTabClick(section.id, index)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors sm:px-4",
                    isActive
                      ? "border-corporate-brand bg-corporate-brand-light text-corporate-brand"
                      : "border-corporate-border bg-corporate-bg text-corporate-muted hover:text-corporate-text"
                  )}
                >
                  <span className="block text-[11px] font-semibold uppercase tracking-wide">
                    {index + 1}. {section.shortLabel}
                  </span>
                  <span className="mt-0.5 block text-xs sm:text-sm">
                    {section.label}
                    {isCompleted && !isActive ? " ✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showValidation &&
        (hasValidationErrors(basicErrors) || hasValidationErrors(bankErrors)) &&
        activeSection !== "basic" &&
        activeSection !== "bank" && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          Please complete all required fields in Basic Information and Bank & Salary before submitting.
        </div>
      )}

      <form
        className="form-section-card"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (isLast) void handleSubmit();
          else goNext();
        }}
      >
        {sectionContent}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-corporate-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          {mode === "add" ? (
            <button type="button" className="btn-secondary" onClick={handleReset}>
              Reset Form
            </button>
          ) : (
            <span />
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {!isFirst && (
              <button type="button" className="btn-secondary" onClick={goPrevious}>
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Previous
              </button>
            )}
            <button type="submit" disabled={isSubmitting} className="btn-primary px-6">
              {isLast ? (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  {isSubmitting
                    ? "Saving..."
                    : mode === "edit"
                      ? "Update Employee"
                      : "Submit Employee"}
                </>
              ) : (
                <>
                  Next Section
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {submitError}
        </div>
      )}

      {submitMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-card">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">{submitMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
