export function getWeeksSince(startDate: Date, targetDate: Date): number {
  const start = new Date(startDate);
  const target = new Date(targetDate);
  
  // Calculate difference in milliseconds
  const diffTime = target.getTime() - start.getTime();
  
  // Convert to days, then to weeks
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const weeks = Math.floor(diffDays / 7);
  
  return weeks;
}