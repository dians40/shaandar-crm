export type GodownRecord = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  pinCode: string;
  managerName: string;
  contactPhone: string;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_GODOWN_FORM: Omit<GodownRecord, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  code: "",
  address: "",
  city: "",
  pinCode: "",
  managerName: "",
  contactPhone: "",
  isActive: true,
  notes: "",
};
