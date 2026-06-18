import {
  calculatePercentageChange,
  calculateRPM,
  calculateNetSubscribers,
  calculateWatchTimeHours,
  projectMonthEndRevenue,
  isTrending,
  isDeclining,
  isLowCTR,
  isHighRPMOpportunity,
} from './src/utils/calculations';

function runTests() {
  console.log('--- Starting Calculation Verification Tests ---');

  // Test 1: Percentage Change
  const pct1 = calculatePercentageChange(120, 100);
  console.log(`Test 1: % change 100 -> 120 (Expected: 20): ${pct1 === 20 ? '✅ PASS' : '❌ FAIL (' + pct1 + ')'}`);

  const pct2 = calculatePercentageChange(75, 100);
  console.log(`Test 2: % change 100 -> 75 (Expected: -25): ${pct2 === -25 ? '✅ PASS' : '❌ FAIL (' + pct2 + ')'}`);

  const pct3 = calculatePercentageChange(50, 0);
  console.log(`Test 3: % change 0 -> 50 (Expected: 100): ${pct3 === 100 ? '✅ PASS' : '❌ FAIL (' + pct3 + ')'}`);

  // Test 2: RPM
  const rpm1 = calculateRPM(150, 50000);
  console.log(`Test 4: RPM for $150, 50k views (Expected: 3.00): ${rpm1 === 3.00 ? '✅ PASS' : '❌ FAIL (' + rpm1 + ')'}`);

  const rpm2 = calculateRPM(150, 0);
  console.log(`Test 5: RPM with 0 views (Expected: 0): ${rpm2 === 0 ? '✅ PASS' : '❌ FAIL (' + rpm2 + ')'}`);

  // Test 3: Net Subscribers
  const netSubs = calculateNetSubscribers(100, 30);
  console.log(`Test 6: Net Subs (Expected: 70): ${netSubs === 70 ? '✅ PASS' : '❌ FAIL (' + netSubs + ')'}`);

  // Test 4: Watch Time Hours
  const hours = calculateWatchTimeHours(150);
  console.log(`Test 7: Watch Time Hours (Expected: 2.5): ${hours === 2.5 ? '✅ PASS' : '❌ FAIL (' + hours + ')'}`);

  // Test 5: Projection
  const proj = projectMonthEndRevenue(300, 10, 30);
  console.log(`Test 8: Projection (Expected: 900): ${proj === 900 ? '✅ PASS' : '❌ FAIL (' + proj + ')'}`);

  // Test 6: Trending
  const trend1 = isTrending(130, 100);
  console.log(`Test 9: Is Trending (Expected: true): ${trend1 === true ? '✅ PASS' : '❌ FAIL'}`);

  const trend2 = isTrending(110, 100);
  console.log(`Test 10: Is Trending (Expected: false): ${trend2 === false ? '✅ PASS' : '❌ FAIL'}`);

  // Test 7: Declining
  const decl1 = isDeclining(70, 100);
  console.log(`Test 11: Is Declining (Expected: true): ${decl1 === true ? '✅ PASS' : '❌ FAIL'}`);

  const decl2 = isDeclining(90, 100);
  console.log(`Test 12: Is Declining (Expected: false): ${decl2 === false ? '✅ PASS' : '❌ FAIL'}`);

  console.log('--- Verification Finished ---');
}

runTests();
