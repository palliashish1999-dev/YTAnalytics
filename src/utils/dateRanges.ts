export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangeComparison {
  current: DateRange;
  previous: DateRange;
}

/**
 * Calculates current and previous Date objects for standard and custom date ranges.
 * Uses 'yesterday' as the baseline end-date since YouTube Analytics updates with a 1-day delay.
 */
export function getDateRange(rangeType: string, customStart?: string, customEnd?: string): DateRangeComparison {
  const today = new Date();
  
  // YouTube data is typically updated up to "yesterday"
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  let start = new Date(yesterday);
  let end = new Date(yesterday);

  let prevStart = new Date(yesterday);
  let prevEnd = new Date(yesterday);

  const range = rangeType.toLowerCase().replace(/_/g, ' ');

  if (range === 'yesterday') {
    start.setDate(yesterday.getDate());
    end.setDate(yesterday.getDate());

    prevStart.setDate(yesterday.getDate() - 1);
    prevEnd.setDate(yesterday.getDate() - 1);
  } 
  else if (range === '7days' || range === 'last 7 days') {
    start.setDate(yesterday.getDate() - 6);
    end.setDate(yesterday.getDate());

    prevStart.setDate(start.getDate() - 7);
    prevEnd.setDate(start.getDate() - 1);
  } 
  else if (range === '30days' || range === 'last 30 days') {
    start.setDate(yesterday.getDate() - 29);
    end.setDate(yesterday.getDate());

    prevStart.setDate(start.getDate() - 30);
    prevEnd.setDate(start.getDate() - 1);
  } 
  else if (range === 'thismonth' || range === 'this month') {
    start = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
    end = new Date(yesterday);

    const daysInThisMonth = yesterday.getDate();
    prevStart = new Date(yesterday.getFullYear(), yesterday.getMonth() - 1, 1);
    
    // Get last day of previous month or matched day-of-month
    const lastDayOfPrevMonth = new Date(yesterday.getFullYear(), yesterday.getMonth(), 0).getDate();
    prevEnd = new Date(yesterday.getFullYear(), yesterday.getMonth() - 1, Math.min(daysInThisMonth, lastDayOfPrevMonth));
  } 
  else if (range === 'prevmonth' || range === 'previous month') {
    start = new Date(yesterday.getFullYear(), yesterday.getMonth() - 1, 1);
    end = new Date(yesterday.getFullYear(), yesterday.getMonth(), 0);

    const diffMs = end.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    prevStart = new Date(prevEnd.getTime() - diffMs);
  } 
  else if (range === 'custom' && customStart && customEnd) {
    start = new Date(customStart);
    end = new Date(customEnd);

    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    prevStart = new Date(prevEnd.getTime() - (durationDays - 1) * 24 * 60 * 60 * 1000);
  } 
  else {
    // Default to last 30 days
    start.setDate(yesterday.getDate() - 29);
    end.setDate(yesterday.getDate());

    prevStart.setDate(start.getDate() - 30);
    prevEnd.setDate(start.getDate() - 1);
  }

  // Set boundary times to start and end of day
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  prevStart.setHours(0, 0, 0, 0);
  prevEnd.setHours(23, 59, 59, 999);

  return {
    current: { startDate: start, endDate: end },
    previous: { startDate: prevStart, endDate: prevEnd },
  };
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 */
export function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
