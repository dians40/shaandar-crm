"use client";

import { Baby, Plus, Trash2, UserRound } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { ESI_ROLE_OPTIONS } from "@/constants/employee-options";
import { createFamilyMemberId } from "@/lib/employee-form-utils";
import type { FamilyMember, FamilyRelationship } from "@/types/employee-form";

type Props = {
  members: FamilyMember[];
  onChange: (members: FamilyMember[]) => void;
};

const RELATIONSHIP_OPTIONS: Record<
  FamilyRelationship,
  { label: string; icon: React.ReactNode }
> = {
  Mother: { label: "Add Mother", icon: <UserRound className="h-4 w-4" /> },
  Father: { label: "Add Father", icon: <UserRound className="h-4 w-4" /> },
  Child: { label: "Add Child", icon: <Baby className="h-4 w-4" /> },
};

export default function FamilyHistorySection({ members, onChange }: Props) {
  const addMember = (relationship: FamilyRelationship) => {
    onChange([
      ...members,
      {
        id: createFamilyMemberId(),
        fullName: "",
        relationship,
        esiRole: relationship === "Child" ? "Dependent Child" : "Dependent Parent",
      },
    ]);
  };

  const updateMember = (id: string, patch: Partial<FamilyMember>) => {
    onChange(
      members.map((member) =>
        member.id === id ? { ...member, ...patch } : member
      )
    );
  };

  const removeMember = (id: string) => {
    onChange(members.filter((member) => member.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-corporate-text">
          Family History & ESI Linkage
        </h2>
        <p className="mt-1 text-sm text-corporate-muted">
          Add family members and assign ESI roles for statutory benefit coverage.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {(Object.keys(RELATIONSHIP_OPTIONS) as FamilyRelationship[]).map(
          (relationship) => {
            const config = RELATIONSHIP_OPTIONS[relationship];
            return (
              <button
                key={relationship}
                type="button"
                className="btn-outline-brand"
                onClick={() => addMember(relationship)}
              >
                <Plus className="h-4 w-4" />
                {config.label}
              </button>
            );
          }
        )}
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-corporate-border bg-corporate-bg px-6 py-10 text-center">
          <p className="text-sm font-medium text-corporate-text">
            No family members added yet
          </p>
          <p className="mt-1 text-sm text-corporate-muted">
            Use the buttons above to add mother, father, or child records for ESI
            linkage.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((member, index) => (
            <article
              key={member.id}
              className="rounded-xl border border-corporate-border bg-corporate-bg p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-corporate-text">
                    Family Member {index + 1}
                  </p>
                  <p className="text-xs text-corporate-muted">
                    Relationship: {member.relationship}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <TextInput
                  label="Full Name"
                  name={`family-name-${member.id}`}
                  placeholder="Enter full name"
                  value={member.fullName}
                  onChange={(e) =>
                    updateMember(member.id, { fullName: e.target.value })
                  }
                />
                <SelectInput
                  label="Relationship"
                  name={`family-relationship-${member.id}`}
                  value={member.relationship}
                  onChange={(e) =>
                    updateMember(member.id, {
                      relationship: e.target.value as FamilyRelationship,
                    })
                  }
                  options={[
                    { value: "Mother", label: "Mother" },
                    { value: "Father", label: "Father" },
                    { value: "Child", label: "Child" },
                  ]}
                />
                <SelectInput
                  label="ESI Role"
                  name={`family-esi-${member.id}`}
                  value={member.esiRole}
                  onChange={(e) =>
                    updateMember(member.id, {
                      esiRole: e.target.value as FamilyMember["esiRole"],
                    })
                  }
                  hint="Assign ESI benefit category for this member"
                  options={ESI_ROLE_OPTIONS.map((role) => ({
                    value: role,
                    label: role,
                  }))}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
