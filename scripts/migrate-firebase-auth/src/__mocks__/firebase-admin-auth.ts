export interface UserRecord {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  providerData: Array<{ providerId: string; uid: string }>;
}

export const getAuth = () => ({ listUsers: async () => ({ users: [], pageToken: undefined }) });
