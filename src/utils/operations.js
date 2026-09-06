import { localDateKey } from './reports';

export function itemUnitTotal(item) {
  return Number(item?.unitPrice ?? item?.price ?? 0) + (item?.selectedModifiers || []).reduce((sum, mod) => sum + Number(mod.price || 0), 0);
}

export function orderAnalytics(orders, dayKey = localDateKey(new Date())) {
  const dayOrders = (orders || []).filter((o) => (o.dayKey || localDateKey(o.createdAt)) === dayKey);
  const gross = dayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const itemCounts = {};
  const modifierCounts = {};
  const hourSales = {};
  let coffeeQty = 0;
  let mealQty = 0;
  let rewardsIssued = 0;
  let rewardsRedeemed = 0;
  dayOrders.forEach((o) => {
    const hour = new Date(o.createdAt).getHours();
    hourSales[hour] = (hourSales[hour] || 0) + Number(o.total || 0);
    if (o.loyaltyReward) rewardsIssued += 1;
    if (o.rewardRedeemed) rewardsRedeemed += 1;
    (o.items || []).forEach((i) => {
      const qty = Number(i.qty || 0);
      itemCounts[i.name] = (itemCounts[i.name] || 0) + qty;
      if ((i.loyaltyPrograms || []).includes('Coffee')) coffeeQty += qty;
      if ((i.loyaltyPrograms || []).includes('Meal')) mealQty += qty;
      (i.selectedModifiers || []).forEach((m) => { modifierCounts[m.name] = (modifierCounts[m.name] || 0) + qty; });
    });
  });
  const top = Object.entries(itemCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const modifiers = Object.entries(modifierCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const busiest = Object.entries(hourSales).sort((a,b)=>b[1]-a[1])[0] || null;
  return { dayOrders, gross, average: dayOrders.length ? gross/dayOrders.length : 0, coffeeQty, mealQty, rewardsIssued, rewardsRedeemed, top, modifiers, busiest };
}

export function isItemAvailableNow(item, now = new Date()) {
  if (item?.soldOut || item?.active === false) return false;
  const schedule = item?.schedule;
  if (!schedule?.enabled) return true;
  const day = now.getDay();
  if (Array.isArray(schedule.days) && schedule.days.length && !schedule.days.includes(day)) return false;
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  if (schedule.start && hhmm < schedule.start) return false;
  if (schedule.end && hhmm > schedule.end) return false;
  return true;
}

export function makeRewardId(order, program) {
  return `FG-${String(order?.number || '').padStart(3,'0')}-${String(program || 'R').slice(0,1).toUpperCase()}-${Date.now().toString().slice(-5)}`;
}
