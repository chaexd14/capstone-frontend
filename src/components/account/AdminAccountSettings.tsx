"use client";

import { AccountSettings } from "@/components/account/AccountSettings";
import { useRecruiter } from "@/context/RecruiterContext";

export function AdminAccountSettings() {
  const { currentUser, updateCurrentUserIdentity } = useRecruiter();
  if (!currentUser) return null;

  return (
    <AccountSettings
      identity={{
        id: currentUser.id,
        first_name: currentUser.firstName || "",
        last_name: currentUser.lastName || "",
        name: currentUser.name,
        email: currentUser.email || "",
        role: currentUser.role,
        company_name: currentUser.company,
      }}
      onIdentityUpdated={updateCurrentUserIdentity}
    />
  );
}
