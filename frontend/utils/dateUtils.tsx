export function getCurrentMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export function getEndOfWeek(start: string): string {
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + 6 * 86400000); // +6 days
  return endDate.toISOString().split('T')[0];
}
