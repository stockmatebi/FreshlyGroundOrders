export const defaultMenu = [
  {
    id: 'breakfast', name: 'Breakfast', sortOrder: 1,
    items: [
      { id: 'breakfast-special', name: 'Breakfast Special', description: '', price: 40, active: true, soldOut: false, sortOrder: 1, modifiers: [] },
      { id: 'farmers-breakfast', name: "Farmer's Breakfast", description: '', price: 55, active: true, soldOut: false, sortOrder: 2, modifiers: [] },
      { id: 'eggs-benedict', name: 'Eggs Benedict', description: '', price: 50, active: true, soldOut: false, sortOrder: 3, modifiers: [] },
      { id: 'breakfast-waffle', name: 'Breakfast Waffle', description: '', price: 35, active: true, soldOut: false, sortOrder: 4, modifiers: [] },
      { id: 'ciabatta-toast', name: 'Ciabatta Toast', description: 'Avo + Cottage Cheese', price: 30, active: true, soldOut: false, sortOrder: 5, modifiers: [] },
      { id: 'cheese-rye', name: 'Cheese on Rye Bread', description: 'Bacon / Spring Onion / Avo', price: 50, active: true, soldOut: false, sortOrder: 6, modifiers: [] },
      { id: 'cheese-omelette', name: 'Cheese Omelette', description: 'Extra toppings R10', price: 25, active: true, soldOut: false, sortOrder: 7, modifiers: ['extra-topping'] },
    ],
  },
  {
    id: 'weekday-special', name: 'R50 Weekday Special', sortOrder: 2,
    items: [
      { id: 'weekday-special-r50', name: 'R50 Weekday Special', description: 'Ask about today’s weekday special', price: 50, active: true, soldOut: false, sortOrder: 1, modifiers: [] },
    ],
  },
  {
    id: 'lunch', name: 'Lunch', sortOrder: 3,
    items: [
      { id: 'chicken-avo-salad', name: 'Chicken Avo Salad', description: '', price: 50, active: true, soldOut: false, sortOrder: 1, modifiers: [] },
      { id: 'chicken-wrap', name: 'Chicken Wrap', description: '', price: 55, active: true, soldOut: false, sortOrder: 2, modifiers: [] },
      { id: 'meatball-sub', name: 'Meatball Sub', description: 'Italian Relish / Cheese', price: 50, active: true, soldOut: false, sortOrder: 3, modifiers: [] },
      { id: 'bbq-wings', name: 'BBQ Chicken Wings', description: 'Chips or Salad', price: 50, active: true, soldOut: false, sortOrder: 4, modifiers: [] },
      { id: 'wors-roll', name: 'Wors Roll', description: '', price: 20, active: true, soldOut: false, sortOrder: 5, modifiers: [] },
      { id: 'hot-dog', name: 'Hot Dog', description: '', price: 12, active: true, soldOut: false, sortOrder: 6, modifiers: [] },
      { id: 'russian-roll', name: 'Russian Roll', description: '', price: 40, active: true, soldOut: false, sortOrder: 7, modifiers: [] },
      { id: 'deluxe-burger', name: 'Deluxe Burger', description: '', price: 70, active: true, soldOut: false, sortOrder: 8, modifiers: [] },
      { id: 'cheese-burger', name: 'Cheese Burger', description: '', price: 50, active: true, soldOut: false, sortOrder: 9, modifiers: [] },
      { id: 'chips-small', name: 'Chips (Small)', description: '', price: 20, active: true, soldOut: false, sortOrder: 10, modifiers: [] },
      { id: 'chips-large', name: 'Chips (Large)', description: '', price: 40, active: true, soldOut: false, sortOrder: 11, modifiers: [] },
      { id: 'beef-burger', name: 'Beef Burger', description: '', price: 45, active: true, soldOut: false, sortOrder: 12, modifiers: [] },
      { id: 'chicken-burger', name: 'Chicken Burger', description: '', price: 45, active: true, soldOut: false, sortOrder: 13, modifiers: [] },
      { id: 'pork-burger', name: 'Pork Burger', description: '', price: 45, active: true, soldOut: false, sortOrder: 14, modifiers: [] },
    ],
  },
  {
    id: 'toasties', name: 'Toasties', sortOrder: 4,
    items: [
      { id: 'toastie-steak-onion', name: 'Steak + Onion', description: '', price: 40, active: true, soldOut: false, sortOrder: 1, modifiers: [] },
      { id: 'toastie-chicken-mayo', name: 'Chicken + Mayo', description: '', price: 35, active: true, soldOut: false, sortOrder: 2, modifiers: [] },
      { id: 'toastie-cheese-tomato-mushroom', name: 'Cheese + Tomato or Mushroom', description: '', price: 30, active: true, soldOut: false, sortOrder: 3, modifiers: [] },
      { id: 'toastie-ham-cheese-tomato', name: 'Ham / Cheese / Tomato', description: '', price: 35, active: true, soldOut: false, sortOrder: 4, modifiers: [] },
      { id: 'club-sandwich', name: 'Club Sandwich (Dagwood)', description: '', price: 50, active: true, soldOut: false, sortOrder: 5, modifiers: [] },
      { id: 'toastie-savoury-beef', name: 'Savoury Beef Mince, Onion + Cheese', description: '', price: 40, active: true, soldOut: false, sortOrder: 6, modifiers: [] },
      { id: 'toastie-chicken-jalapeno', name: 'Chicken Jalapeño + Sweet Chilli Mayo', description: '', price: 40, active: true, soldOut: false, sortOrder: 7, modifiers: [] },
      { id: 'toastie-chicken-peri', name: 'Chicken Peri Mayo Special with Cheese', description: '', price: 40, active: true, soldOut: false, sortOrder: 8, modifiers: [] },
      { id: 'toastie-bacon-egg-cheese', name: 'Bacon, Egg & Cheese', description: '', price: 40, active: true, soldOut: false, sortOrder: 9, modifiers: [] },
      { id: 'toastie-bacon-banana', name: 'Bacon & Banana', description: '', price: 40, active: true, soldOut: false, sortOrder: 10, modifiers: [] },
    ],
  },
  {
    id: 'beverages', name: 'Beverages', sortOrder: 5,
    items: [
      { id: 'cappuccino-small', name: 'Cappuccino (Small)', description: '', price: 25, active: true, soldOut: false, sortOrder: 1, modifiers: ['extra-shot'] },
      { id: 'cappuccino-large', name: 'Cappuccino (Large)', description: '', price: 30, active: true, soldOut: false, sortOrder: 2, modifiers: ['extra-shot'] },
      { id: 'cappuccino-grande', name: 'Cappuccino Grande', description: '', price: 35, active: true, soldOut: false, sortOrder: 3, modifiers: ['extra-shot'] },
      { id: 'flat-white', name: 'Flat White', description: '', price: 30, active: true, soldOut: false, sortOrder: 4, modifiers: ['extra-shot'] },
      { id: 'latte', name: 'Latte', description: '', price: 30, active: true, soldOut: false, sortOrder: 5, modifiers: ['extra-shot'] },
      { id: 'milkshake', name: 'Milkshake', description: '', price: 40, active: true, soldOut: false, sortOrder: 6, modifiers: [] },
      { id: 'deluxe-shake', name: 'Deluxe Shake', description: '', price: 45, active: true, soldOut: false, sortOrder: 7, modifiers: [] },
      { id: 'filter-coffee', name: 'Filter Coffee', description: '', price: 15, active: true, soldOut: false, sortOrder: 8, modifiers: [] },
      { id: 'tea', name: 'Tea', description: '', price: 20, active: true, soldOut: false, sortOrder: 9, modifiers: [] },
      { id: 'hot-chocolate', name: 'Hot Chocolate', description: '', price: 30, active: true, soldOut: false, sortOrder: 10, modifiers: [] },
    ],
  },
  {
    id: 'extras', name: 'Extras', sortOrder: 6, isModifierSource: true,
    items: [
      { id: 'extra-shot', name: 'Extra Shot Coffee', description: '', price: 5, active: true, soldOut: false, sortOrder: 1, modifiers: [] },
      { id: 'extra-topping', name: 'Extra Topping', description: '', price: 10, active: true, soldOut: false, sortOrder: 2, modifiers: [] },
    ],
  },
];

export function normalizeMenu(menu = []) {
  return menu.map((section, sectionIndex) => ({
    ...section,
    sortOrder: section.sortOrder ?? sectionIndex + 1,
    items: (section.items || []).map((item, itemIndex) => ({
      description: '',
      active: true,
      soldOut: false,
      modifiers: [],
      sortOrder: itemIndex + 1,
      ...item,
    })),
  }));
}
