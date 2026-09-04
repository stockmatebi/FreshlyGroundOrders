export const defaultMenu = [
  {
    id: 'coffee',
    name: 'Coffee',
    sortOrder: 1,
    items: [
      { id: 'americano', name: 'Americano', description: '', price: 25, active: true, soldOut: false, sortOrder: 1, modifiers: [] },
      { id: 'cappuccino', name: 'Cappuccino', description: '', price: 32, active: true, soldOut: false, sortOrder: 2, modifiers: ['extra-shot', 'almond-milk'] },
      { id: 'latte', name: 'Latte', description: '', price: 35, active: true, soldOut: false, sortOrder: 3, modifiers: ['extra-shot', 'almond-milk'] },
      { id: 'flat-white', name: 'Flat White', description: '', price: 34, active: true, soldOut: false, sortOrder: 4, modifiers: ['extra-shot', 'almond-milk'] },
      { id: 'hot-chocolate', name: 'Hot Chocolate', description: '', price: 35, active: true, soldOut: false, sortOrder: 5, modifiers: ['almond-milk'] },
    ],
  },
  {
    id: 'meals',
    name: 'Meals',
    sortOrder: 2,
    items: [
      { id: 'breakfast-roll', name: 'Breakfast Roll', description: '', price: 45, active: true, soldOut: false, sortOrder: 1, modifiers: ['cheese', 'bacon'] },
      { id: 'beef-burger', name: 'Beef Burger', description: '', price: 75, active: true, soldOut: false, sortOrder: 2, modifiers: ['cheese', 'bacon'] },
      { id: 'chicken-burger', name: 'Chicken Burger', description: '', price: 72, active: true, soldOut: false, sortOrder: 3, modifiers: ['cheese', 'bacon'] },
      { id: 'toasted-cheese', name: 'Toasted Cheese', description: '', price: 38, active: true, soldOut: false, sortOrder: 4, modifiers: ['bacon'] },
      { id: 'chips', name: 'Chips', description: '', price: 30, active: true, soldOut: false, sortOrder: 5, modifiers: [] },
    ],
  },
  {
    id: 'extras',
    name: 'Extras',
    sortOrder: 3,
    isModifierSource: true,
    items: [
      { id: 'extra-shot', name: 'Extra Shot', description: '', price: 8, active: true, soldOut: false, sortOrder: 1, modifiers: [] },
      { id: 'almond-milk', name: 'Almond Milk', description: '', price: 10, active: true, soldOut: false, sortOrder: 2, modifiers: [] },
      { id: 'cheese', name: 'Extra Cheese', description: '', price: 12, active: true, soldOut: false, sortOrder: 3, modifiers: [] },
      { id: 'bacon', name: 'Bacon', description: '', price: 18, active: true, soldOut: false, sortOrder: 4, modifiers: [] },
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
