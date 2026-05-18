export type ProfileRole = string | string[] | null | undefined;

export const getRoleList = (role: ProfileRole) => {
  if (Array.isArray(role)) return role;
  if (typeof role === 'string') return role.split(',');
  return [];
};

export const hasOwnerRole = (role: ProfileRole) => {
  const roles = getRoleList(role).map((item) => item.replace(/['"]/g, '').trim().toLowerCase());
  return roles.some((roleName) => ['owner', 'founder', 'admin'].includes(roleName));
};

export const hasStaffRole = (role: ProfileRole) => {
  const roles = getRoleList(role).map((item) => item.replace(/['"]/g, '').trim().toLowerCase());
  return roles.some((roleName) => ['owner', 'founder', 'admin', 'staff', 'moderator', 'mod', 'developer', 'dev'].includes(roleName));
};
