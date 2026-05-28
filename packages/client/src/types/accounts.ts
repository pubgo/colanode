export type Account = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  token: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string | null;
  syncedAt: string | null;
};
