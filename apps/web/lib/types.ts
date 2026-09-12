export type MeResponse = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
    branchId: string | null;
    professionalId: string | null;
  };
  company: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    locale: string;
    primaryColor: string | null;
    secondaryColor: string | null;
    logoUrl: string | null;
    contactEmail: string;
    contactPhone: string | null;
  };
};
