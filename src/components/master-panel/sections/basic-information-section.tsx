"use client";

import {
  SelectInput,
  TextInput,
  TextareaInput,
  FileInputField,
} from "@/components/forms/form-fields";
import {
  EMPLOYEE_TYPES,
  GENDER_OPTIONS,
  SALARY_BASIS_BY_TYPE,
} from "@/constants/employee-options";
import { calculateAgeFromDob, DOCUMENT_LABELS } from "@/lib/employee-form-utils";
import type { BasicInformationErrors } from "@/lib/validate-employee-form";
import type { BasicInformation, EmployeeType, Gender, SalaryBasis } from "@/types/employee-form";

type Props = {
  data: BasicInformation;
  errors: BasicInformationErrors;
  profilePhoto: File | null;
  existingProfilePhotoPath?: string | null;
  onProfilePhotoChange: (file: File | null) => void;
  onChange: (data: BasicInformation) => void;
};

function pathLabel(path: string | null | undefined): string | null {
  if (!path) return null;
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

export default function BasicInformationSection({
  data,
  errors,
  profilePhoto,
  existingProfilePhotoPath,
  onProfilePhotoChange,
  onChange,
}: Props) {
  const salaryOptions =
    data.employeeType && data.employeeType in SALARY_BASIS_BY_TYPE
      ? SALARY_BASIS_BY_TYPE[data.employeeType as EmployeeType]
      : [];

  const updateField = <K extends keyof BasicInformation>(
    key: K,
    value: BasicInformation[K]
  ) => {
    onChange({ ...data, [key]: value });
  };

  const handleDobChange = (dateOfBirth: string) => {
    onChange({
      ...data,
      dateOfBirth,
      age: calculateAgeFromDob(dateOfBirth),
    });
  };

  const handleEmployeeTypeChange = (employeeType: EmployeeType | "") => {
    const validSalary =
      employeeType &&
      SALARY_BASIS_BY_TYPE[employeeType as EmployeeType]?.includes(
        data.salaryBasis as (typeof SALARY_BASIS_BY_TYPE)[EmployeeType][number]
      );

    onChange({
      ...data,
      employeeType,
      salaryBasis: validSalary ? data.salaryBasis : "",
    });
  };

  const handleMobileChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    updateField("mobileNumber", digitsOnly);
  };

  const profileDisplayName =
    profilePhoto?.name ??
    (existingProfilePhotoPath
      ? `Uploaded: ${pathLabel(existingProfilePhotoPath)}`
      : null);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-corporate-text">
          Basic Information
        </h2>
        <p className="mt-1 text-sm text-corporate-muted">
          Personal details, vehicle linkage, references, and employment classification.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-corporate-border bg-corporate-bg/50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-corporate-muted">
          Identity & Photo
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            label="Full Name"
            name="fullName"
            required
            placeholder="Enter full name"
            value={data.fullName}
            error={errors.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
          />
          <FileInputField
            label={DOCUMENT_LABELS.profilePhoto.label}
            hint={DOCUMENT_LABELS.profilePhoto.hint}
            fileName={profileDisplayName}
            onFileChange={onProfilePhotoChange}
          />
          <TextInput
            label="Vehicle Number"
            name="vehicleNumber"
            placeholder="e.g. MH-12-AB-1234"
            value={data.vehicleNumber}
            onChange={(e) => updateField("vehicleNumber", e.target.value.toUpperCase())}
            hint="Track which driver/labor is assigned to which vehicle"
          />
          <TextInput
            label="Joining Date"
            name="joiningDate"
            type="date"
            value={data.joiningDate}
            onChange={(e) => updateField("joiningDate", e.target.value)}
          />
          <SelectInput
            label="Gender"
            name="gender"
            value={data.gender}
            onChange={(e) => updateField("gender", e.target.value as Gender | "")}
            placeholder="Select gender"
            options={GENDER_OPTIONS.map((g) => ({ value: g, label: g }))}
          />
          <TextInput
            label="Police Station Name"
            name="policeStationName"
            placeholder="Nearest police station"
            value={data.policeStationName}
            onChange={(e) => updateField("policeStationName", e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-corporate-muted">
          Family & Contact
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            label="Father's Name"
            name="fatherName"
            placeholder="Enter father's name"
            value={data.fatherName}
            onChange={(e) => updateField("fatherName", e.target.value)}
          />
          <TextInput
            label="Mother's Name"
            name="motherName"
            placeholder="Enter mother's name"
            value={data.motherName}
            onChange={(e) => updateField("motherName", e.target.value)}
          />
          <TextInput
            label="Date of Birth"
            name="dateOfBirth"
            type="date"
            required
            value={data.dateOfBirth}
            error={errors.dateOfBirth}
            onChange={(e) => handleDobChange(e.target.value)}
          />
          <TextInput
            label="Age"
            name="age"
            type="number"
            readOnly
            placeholder="Auto-calculated"
            value={data.age ?? ""}
            hint="Automatically calculated from date of birth"
            className="bg-corporate-bg"
          />
          <TextInput
            label="Mobile Number"
            name="mobileNumber"
            type="tel"
            inputMode="numeric"
            required
            placeholder="10-digit mobile number"
            value={data.mobileNumber}
            error={errors.mobileNumber}
            maxLength={10}
            onChange={(e) => handleMobileChange(e.target.value)}
          />
          <TextInput
            label="Alternative Mobile Number"
            name="alternativeMobileNumber"
            type="tel"
            inputMode="numeric"
            placeholder="Optional secondary number"
            value={data.alternativeMobileNumber}
            maxLength={10}
            onChange={(e) =>
              updateField(
                "alternativeMobileNumber",
                e.target.value.replace(/\D/g, "").slice(0, 10)
              )
            }
          />
          <TextInput
            label="Pin Code"
            name="pinCode"
            placeholder="6-digit pin code"
            value={data.pinCode}
            onChange={(e) => updateField("pinCode", e.target.value)}
          />
          <div className="sm:col-span-2">
            <TextareaInput
              label="Full Address"
              name="fullAddress"
              placeholder="House no., street, city, state"
              value={data.fullAddress}
              onChange={(e) => updateField("fullAddress", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-corporate-border bg-corporate-bg/50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-corporate-muted">
          Reference Details
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            label="Reference From Name"
            name="referenceFromName"
            placeholder="Name of reference person"
            value={data.referenceFromName}
            onChange={(e) => updateField("referenceFromName", e.target.value)}
          />
          <TextInput
            label="Reference Mobile Number"
            name="referenceMobileNumber"
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile number"
            value={data.referenceMobileNumber}
            maxLength={10}
            onChange={(e) =>
              updateField(
                "referenceMobileNumber",
                e.target.value.replace(/\D/g, "").slice(0, 10)
              )
            }
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-corporate-muted">
          Employment Classification
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectInput
            label="Employee Type"
            name="employeeType"
            required
            value={data.employeeType}
            error={errors.employeeType}
            onChange={(e) =>
              handleEmployeeTypeChange(e.target.value as EmployeeType | "")
            }
            options={EMPLOYEE_TYPES.map((type) => ({ value: type, label: type }))}
          />
          <SelectInput
            label="Salary Basis"
            name="salaryBasis"
            disabled={!data.employeeType}
            value={data.salaryBasis}
            onChange={(e) =>
              updateField("salaryBasis", e.target.value as SalaryBasis | "")
            }
            placeholder={
              data.employeeType ? "Select salary basis" : "Select employee type first"
            }
            hint={
              data.employeeType
                ? "Options filtered based on selected employee type"
                : undefined
            }
            options={salaryOptions.map((basis) => ({
              value: basis,
              label: basis,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
