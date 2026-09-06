const eggsAndBread = [
  {
    id: 'egg-style',
    label: 'How would you like your eggs?',
    required: true,
    type: 'choice',
    options: [
      { id: 'fried', label: 'Fried', priceDelta: 0 },
      { id: 'scrambled', label: 'Scrambled', priceDelta: 0 },
      { id: 'poached', label: 'Poached', priceDelta: 0 },
    ],
  },
  {
    id: 'bread-choice',
    label: 'White or brown bread?',
    required: true,
    type: 'choice',
    options: [
      { id: 'white', label: 'White Bread', priceDelta: 0 },
      { id: 'brown', label: 'Brown Bread', priceDelta: 0 },
    ],
  },
];

const drinkSizes = (prices) => [{
  id: 'size',
  label: 'Choose a size',
  required: true,
  type: 'size',
  options: [
    { id: 'small', label: 'Small', finalPrice: prices[0], priceDelta: 0 },
    { id: 'medium', label: 'Medium', finalPrice: prices[1], priceDelta: prices[1] - prices[0] },
    { id: 'large', label: 'Large', finalPrice: prices[2], priceDelta: prices[2] - prices[0] },
  ],
}];

const meal = ['Meal'];
const coffee = ['Coffee'];

export const defaultMenu = [
  {
    id: 'breakfast', name: 'Breakfast', sortOrder: 1,
    items: [
      { id: 'breakfast-special', name: 'Breakfast Special', description: '', price: 40, active: true, soldOut: false, sortOrder: 1, modifiers: [], loyaltyPrograms: meal, optionGroups: eggsAndBread },
      { id: 'farmers-breakfast', name: "Farmer's Breakfast", description: '', price: 55, active: true, soldOut: false, sortOrder: 2, modifiers: [], loyaltyPrograms: meal, optionGroups: eggsAndBread },
      { id: 'eggs-benedict', name: 'Eggs Benedict', description: '', price: 50, active: true, soldOut: false, sortOrder: 3, modifiers: [], loyaltyPrograms: meal },
      { id: 'breakfast-waffle', name: 'Breakfast Waffle', description: '', price: 35, active: true, soldOut: false, sortOrder: 4, modifiers: [], loyaltyPrograms: meal },
      { id: 'ciabatta-toast', name: 'Ciabatta Toast', description: 'Avo + Cottage Cheese', price: 30, active: true, soldOut: false, sortOrder: 5, modifiers: [], loyaltyPrograms: meal },
      { id: 'cheese-rye', name: 'Cheese on Rye Bread', description: 'Bacon / Spring Onion / Avo', price: 50, active: true, soldOut: false, sortOrder: 6, modifiers: [], loyaltyPrograms: meal },
      { id: 'cheese-omelette', name: 'Cheese Omelette', description: 'Extra toppings R10', price: 25, active: true, soldOut: false, sortOrder: 7, modifiers: ['extra-topping'], loyaltyPrograms: meal },
    ],
  },
  {
    id: 'weekday-special', name: 'R50 Weekday Special', sortOrder: 2,
    items: [
      { id: 'weekday-special-r50', name: 'R50 Weekday Special', description: 'Ask about today’s weekday special', price: 50, active: true, soldOut: false, sortOrder: 1, modifiers: [], loyaltyPrograms: meal },
    ],
  },
  {
    id: 'lunch', name: 'Lunch', sortOrder: 3,
    items: [
      { id: 'chicken-avo-salad', name: 'Chicken Avo Salad', description: '', price: 50, active: true, soldOut: false, sortOrder: 1, modifiers: [], loyaltyPrograms: meal },
      { id: 'chicken-wrap', name: 'Chicken Wrap', description: '', price: 55, active: true, soldOut: false, sortOrder: 2, modifiers: [], loyaltyPrograms: meal },
      { id: 'meatball-sub', name: 'Meatball Sub', description: 'Italian Relish / Cheese', price: 50, active: true, soldOut: false, sortOrder: 3, modifiers: [], loyaltyPrograms: meal },
      { id: 'bbq-wings', name: 'BBQ Chicken Wings', description: 'Chips or Salad', price: 50, active: true, soldOut: false, sortOrder: 4, modifiers: [], loyaltyPrograms: meal },
      { id: 'wors-roll', name: 'Wors Roll', description: '', price: 20, active: true, soldOut: false, sortOrder: 5, modifiers: [], loyaltyPrograms: meal },
      { id: 'hot-dog', name: 'Hot Dog', description: '', price: 12, active: true, soldOut: false, sortOrder: 6, modifiers: [], loyaltyPrograms: meal },
      { id: 'russian-roll', name: 'Russian Roll', description: '', price: 40, active: true, soldOut: false, sortOrder: 7, modifiers: [], loyaltyPrograms: meal },
      { id: 'deluxe-burger', name: 'Deluxe Burger', description: '', price: 70, active: true, soldOut: false, sortOrder: 8, modifiers: [], loyaltyPrograms: meal },
      { id: 'cheese-burger', name: 'Cheese Burger', description: '', price: 50, active: true, soldOut: false, sortOrder: 9, modifiers: [], loyaltyPrograms: meal },
      { id: 'chips-small', name: 'Chips (Small)', description: '', price: 20, active: true, soldOut: false, sortOrder: 10, modifiers: [] },
      { id: 'chips-large', name: 'Chips (Large)', description: '', price: 40, active: true, soldOut: false, sortOrder: 11, modifiers: [] },
      { id: 'beef-burger', name: 'Beef Burger', description: '', price: 45, active: true, soldOut: false, sortOrder: 12, modifiers: [], loyaltyPrograms: meal },
      { id: 'chicken-burger', name: 'Chicken Burger', description: '', price: 45, active: true, soldOut: false, sortOrder: 13, modifiers: [], loyaltyPrograms: meal },
      { id: 'pork-burger', name: 'Pork Burger', description: '', price: 45, active: true, soldOut: false, sortOrder: 14, modifiers: [], loyaltyPrograms: meal },
    ],
  },
  {
    id: 'toasties', name: 'Toasties', sortOrder: 4,
    items: [
      { id: 'toastie-steak-onion', name: 'Steak + Onion', description: '', price: 40, active: true, soldOut: false, sortOrder: 1, modifiers: [], loyaltyPrograms: meal },
      { id: 'toastie-chicken-mayo', name: 'Chicken + Mayo', description: '', price: 35, active: true, soldOut: false, sortOrder: 2, modifiers: [], loyaltyPrograms: meal },
      { id: 'toastie-cheese-tomato-mushroom', name: 'Cheese + Tomato or Mushroom', description: '', price: 30, active: true, soldOut: false, sortOrder: 3, modifiers: [], loyaltyPrograms: meal },
      { id: 'toastie-ham-cheese-tomato', name: 'Ham / Cheese / Tomato', description: '', price: 35, active: true, soldOut: false, sortOrder: 4, modifiers: [], loyaltyPrograms: meal },
      { id: 'club-sandwich', name: 'Club Sandwich (Dagwood)', description: '', price: 50, active: true, soldOut: false, sortOrder: 5, modifiers: [], loyaltyPrograms: meal },
      { id: 'toastie-savoury-beef', name: 'Savoury Beef Mince, Onion + Cheese', description: '', price: 40, active: true, soldOut: false, sortOrder: 6, modifiers: [], loyaltyPrograms: meal },
      { id: 'toastie-chicken-jalapeno', name: 'Chicken Jalapeño + Sweet Chilli Mayo', description: '', price: 40, active: true, soldOut: false, sortOrder: 7, modifiers: [], loyaltyPrograms: meal },
      { id: 'toastie-chicken-peri', name: 'Chicken Peri Mayo Special with Cheese', description: '', price: 40, active: true, soldOut: false, sortOrder: 8, modifiers: [], loyaltyPrograms: meal },
      { id: 'toastie-bacon-egg-cheese', name: 'Bacon, Egg & Cheese', description: '', price: 40, active: true, soldOut: false, sortOrder: 9, modifiers: [], loyaltyPrograms: meal },
      { id: 'toastie-bacon-banana', name: 'Bacon & Banana', description: '', price: 40, active: true, soldOut: false, sortOrder: 10, modifiers: [], loyaltyPrograms: meal },
    ],
  },
  {
    id: 'beverages', name: 'Beverages', sortOrder: 5,
    items: [
      { id: 'cappuccino-small', name: 'Cappuccino (Small)', description: '', price: 25, active: true, soldOut: false, sortOrder: 1, modifiers: ['extra-shot'], loyaltyPrograms: coffee },
      { id: 'cappuccino-large', name: 'Cappuccino (Large)', description: '', price: 30, active: true, soldOut: false, sortOrder: 2, modifiers: ['extra-shot'], loyaltyPrograms: coffee },
      { id: 'cappuccino-grande', name: 'Cappuccino Grande', description: '', price: 35, active: true, soldOut: false, sortOrder: 3, modifiers: ['extra-shot'], loyaltyPrograms: coffee },
      { id: 'flat-white', name: 'Flat White', description: '', price: 30, active: true, soldOut: false, sortOrder: 4, modifiers: ['extra-shot'], loyaltyPrograms: coffee },
      { id: 'latte', name: 'Latte', description: 'Choose Small / Medium / Large', price: 30, active: true, soldOut: false, sortOrder: 5, modifiers: ['extra-shot'], loyaltyPrograms: coffee, optionGroups: drinkSizes([30, 35, 40]) },
      { id: 'milkshake', name: 'Milkshake', description: '', price: 40, active: true, soldOut: false, sortOrder: 6, modifiers: [] },
      { id: 'deluxe-shake', name: 'Deluxe Shake', description: '', price: 45, active: true, soldOut: false, sortOrder: 7, modifiers: [] },
      { id: 'filter-coffee', name: 'Coffee', description: 'Choose Small / Medium / Large', price: 25, active: true, soldOut: false, sortOrder: 8, modifiers: [], loyaltyPrograms: coffee, optionGroups: drinkSizes([25, 30, 40]) },
      { id: 'tea', name: 'Tea', description: '', price: 20, active: true, soldOut: false, sortOrder: 9, modifiers: [] },
      { id: 'hot-chocolate', name: 'Hot Chocolate', description: 'Choose Small / Medium / Large', price: 30, active: true, soldOut: false, sortOrder: 10, modifiers: [], loyaltyPrograms: coffee, optionGroups: drinkSizes([30, 35, 40]) },
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

const defaultItemById = new Map(defaultMenu.flatMap((section) => section.items.map((item) => [item.id, item])));

export function normalizeMenu(menu = []) {
  return menu.map((section, sectionIndex) => ({
    ...section,
    sortOrder: section.sortOrder ?? sectionIndex + 1,
    items: (section.items || []).map((item, itemIndex) => {
      const standard = defaultItemById.get(item.id) || {};
      const structural = {
        loyaltyPrograms: standard.loyaltyPrograms || [],
        optionGroups: standard.optionGroups || [],
      };
      const forced = item.id === 'filter-coffee'
        ? { name: 'Coffee', price: 25, description: 'Choose Small / Medium / Large' }
        : item.id === 'latte'
          ? { price: 30, description: 'Choose Small / Medium / Large' }
          : item.id === 'hot-chocolate'
            ? { price: 30, description: 'Choose Small / Medium / Large' }
            : {};
      return {
        description: '',
        active: true,
        soldOut: false,
        modifiers: [],
        loyaltyPrograms: [],
        optionGroups: [],
        sortOrder: itemIndex + 1,
        ...item,
        ...structural,
        ...forced,
      };
    }),
  }));
}
