export const LOYALTY_PROGRAMS = ['Coffee', 'Meal'];

export function itemPrograms(item) {
  return Array.isArray(item?.loyaltyPrograms) ? item.loyaltyPrograms : [];
}

export function cartEligibility(cart = []) {
  return {
    Coffee: cart.some((line) => itemPrograms(line).includes('Coffee')),
    Meal: cart.some((line) => itemPrograms(line).includes('Meal')),
  };
}

export function resolveLoyaltyProgram(cart = [], preferred = '') {
  const eligibility = cartEligibility(cart);
  if (preferred && eligibility[preferred]) return preferred;
  if (eligibility.Meal) return 'Meal';
  if (eligibility.Coffee) return 'Coffee';
  return '';
}

function lineUnitValue(line) {
  const modifiers = (line?.selectedModifiers || []).reduce((sum, modifier) => sum + Number(modifier?.price || 0), 0);
  return Math.max(0, Number(line?.unitPrice || 0) + modifiers);
}

export function loyaltyValueForOrder(cart = [], program = '') {
  if (!program) return 0;
  let unitCount = 0;
  let weightedValue = 0;

  cart.forEach((line) => {
    if (!itemPrograms(line).includes(program)) return;
    const qty = Math.max(0, Number(line?.qty || 0));
    if (!qty) return;
    unitCount += qty;
    weightedValue += qty * lineUnitValue(line);
  });

  if (!unitCount) return 0;
  return Number((weightedValue / unitCount).toFixed(2));
}

export function loyaltySummaryForOrder(cart = [], preferred = '') {
  const program = resolveLoyaltyProgram(cart, preferred);
  return {
    program: program || null,
    value: program ? loyaltyValueForOrder(cart, program) : 0,
    eligibility: cartEligibility(cart),
  };
}

export function applyLoyaltyToCustomer(customer, order) {
  const program = order?.loyaltyProgram;
  if (!customer || !LOYALTY_PROGRAMS.includes(program)) {
    return { customer, reward: null };
  }

  const key = program.toLowerCase();
  const cycleTotalKey = `${key}CycleTotal`;
  const lastRewardKey = `${key}LastReward`;
  const rewardAtKey = `${key}LastRewardAt`;
  const pointValue = Math.max(0, Number(order?.loyaltyValue || 0));
  const currentCount = Math.max(0, Number(customer?.[key] || 0));

  // Older customer records may already have points but no value history. Preserve
  // those points by using the current qualifying order value as the best available
  // estimate for the missing historic values instead of throwing the points away.
  const storedCycleTotal = Number(customer?.[cycleTotalKey]);
  const currentCycleTotal = Number.isFinite(storedCycleTotal) && storedCycleTotal > 0
    ? storedCycleTotal
    : currentCount > 0 ? currentCount * pointValue : 0;

  const nextCount = currentCount + 1;
  const nextCycleTotal = currentCycleTotal + pointValue;
  const now = new Date().toISOString();

  if (nextCount >= 10) {
    const rewardValue = Number((nextCycleTotal / 10).toFixed(2));
    return {
      customer: {
        ...customer,
        [key]: 0,
        [cycleTotalKey]: 0,
        [lastRewardKey]: rewardValue,
        [rewardAtKey]: now,
      },
      reward: {
        program,
        value: rewardValue,
        customerName: order?.customerName || customer?.name || '',
        completedAt: now,
      },
    };
  }

  return {
    customer: {
      ...customer,
      [key]: nextCount,
      [cycleTotalKey]: Number(nextCycleTotal.toFixed(2)),
    },
    reward: null,
  };
}
