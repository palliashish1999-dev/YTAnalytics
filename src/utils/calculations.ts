/**
 * Core mathematical and business intelligence formulas for YouTube channel analytics.
 */

/**
 * Calculates percentage change between two values.
 * Formula: ((current - previous) / previous) * 100
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
}

/**
 * Calculates Revenue Per Mille (RPM).
 * Formula: (revenue / views) * 1000
 */
export function calculateRPM(revenue: number, views: number): number {
  if (views === 0) return 0;
  return parseFloat(((revenue / views) * 1000).toFixed(2));
}

/**
 * Calculates net subscribers.
 * Formula: subscribersGained - subscribersLost
 */
export function calculateNetSubscribers(gained: number, lost: number): number {
  return gained - lost;
}

/**
 * Converts estimated minutes watched to hours.
 * Formula: minutes / 60
 */
export function calculateWatchTimeHours(minutes: number): number {
  return parseFloat((minutes / 60).toFixed(2));
}

/**
 * Projects month-end revenue based on month-to-date performance.
 * Formula: (currentMonthRevenue / completedDaysInMonth) * totalDaysInMonth
 */
export function projectMonthEndRevenue(currentRevenue: number, completedDays: number, totalDays: number): number {
  if (completedDays <= 0) return 0;
  return parseFloat(((currentRevenue / completedDays) * totalDays).toFixed(2));
}

/**
 * Determines if a video is trending (views increased by more than 25%).
 */
export function isTrending(currentViews: number, previousViews: number): boolean {
  if (previousViews === 0) return currentViews > 100; // minimum view threshold to consider trending
  return calculatePercentageChange(currentViews, previousViews) >= 25;
}

/**
 * Determines if a video is declining (views dropped by more than 25%).
 */
export function isDeclining(currentViews: number, previousViews: number): boolean {
  if (previousViews === 0) return false;
  return calculatePercentageChange(currentViews, previousViews) <= -25;
}

/**
 * Determines if a CTR value is below the channel average.
 */
export function isLowCTR(ctr: number, averageCtr: number): boolean {
  return ctr < averageCtr;
}

/**
 * Determines if an RPM value represents a high yield opportunity.
 */
export function isHighRPMOpportunity(rpm: number, averageRpm: number): boolean {
  return rpm > averageRpm;
}
