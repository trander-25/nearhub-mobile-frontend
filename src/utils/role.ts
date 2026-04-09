export function isOrganizerRole(role: string | null | undefined): boolean {
  return (role ?? '').trim().toLowerCase() === 'organizer';
}

export function isAdminRole(role: string | null | undefined): boolean {
  return (role ?? '').trim().toLowerCase() === 'admin';
}
