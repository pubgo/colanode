import { WorkspaceRole } from '@colanode/core';

interface WorkspaceRoleItem {
  name: string;
  value: WorkspaceRole;
  description: string;
  enabled: boolean;
}

const roles: WorkspaceRoleItem[] = [
  {
    name: 'Owner',
    value: 'owner',
    description: 'Full access',
    enabled: true,
  },
  {
    name: 'Admin',
    value: 'admin',
    description: 'Administration access',
    enabled: true,
  },
  {
    name: 'Collaborator',
    value: 'collaborator',
    description: 'Can contribute in content',
    enabled: true,
  },
  {
    name: 'Guest',
    value: 'guest',
    description: 'Can view content',
    enabled: true,
  },
  {
    name: 'No access',
    value: 'none',
    description: 'No access to workspace',
    enabled: true,
  },
];

interface WorkspaceUserRoleDropdownProps {
  userId: string;
  value: WorkspaceRole;
  canEdit: boolean;
}

export const WorkspaceUserRoleDropdown = ({
  userId: _userId,
  value,
  canEdit: _canEdit,
}: WorkspaceUserRoleDropdownProps) => {
  const currentRole = roles.find((role) => role.value === value);

  return (
    <p className="p-1 text-sm text-muted-foreground">{currentRole?.name}</p>
  );
};
