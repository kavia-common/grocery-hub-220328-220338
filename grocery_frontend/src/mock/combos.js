export const combos = [
  {
    id: 1,
    title: 'Fruit Combo',
    description: 'A refreshing selection of seasonal fruits perfect for snacking and smoothies.',
    items: [
      { productId: 1, name: 'Fresh Apples', qty: 2, price: 2.5, image_url: '/images/apple.jpg', isInstant: true, stockQty: 20 },
      { productId: 2, name: 'Bananas', qty: 6, price: 0.3, image_url: '/images/banana.jpg', isInstant: true, stockQty: 50 },
      { productId: 5, name: 'Blueberries', qty: 1, price: 3.99, image_url: '/images/blueberries.jpg', isInstant: false, stockQty: 5 }
    ],
    comboPrice: 8.99,
    originalPrice: null, // will be computed in service if null
    savingsPercent: null, // derived
    tags: ['fruit', 'instant'],
    image_url: '/images/fruit-combo.jpg'
  },
  {
    id: 2,
    title: 'Vegetable Combo',
    description: 'Core vegetables for daily cooking. Fresh and crisp!',
    items: [
      { productId: 7, name: 'Tomatoes', qty: 4, price: 0.5, image_url: '/images/tomato.jpg', isInstant: true, stockQty: 30 },
      { productId: 8, name: 'Onions', qty: 2, price: 0.6, image_url: '/images/onion.jpg', isInstant: true, stockQty: 0 }, // out of stock example
      { productId: 9, name: 'Spinach Bunch', qty: 1, price: 1.99, image_url: '/images/spinach.jpg', isInstant: false, stockQty: 12 }
    ],
    comboPrice: 3.99,
    originalPrice: null,
    savingsPercent: null,
    tags: ['vegetable'],
    image_url: '/images/veg-combo.jpg'
  },
  {
    id: 3,
    title: 'Breakfast Combo',
    description: 'Everything you need for a hearty breakfast.',
    items: [
      { productId: 12, name: 'Whole Wheat Bread', qty: 1, price: 2.49, image_url: '/images/bread.jpg', isInstant: true, stockQty: 8 },
      { productId: 13, name: 'Eggs (12 pack)', qty: 1, price: 3.29, image_url: '/images/eggs.jpg', isInstant: true, stockQty: 1 },
      { productId: 14, name: 'Milk 1L', qty: 1, price: 1.49, image_url: '/images/milk.jpg', isInstant: true, stockQty: 10 }
    ],
    comboPrice: 6.49,
    originalPrice: null,
    savingsPercent: null,
    tags: ['breakfast', 'instant'],
    image_url: '/images/breakfast-combo.jpg'
  }
];

export default combos;
