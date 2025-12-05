//
// PUBLIC_INTERFACE
// getMockProducts provides seeded sample products with fields needed by the Product Grid.
// This mock is used when a live backend is not available.
//
export function getMockProducts() {
  /** Returns a list of sample products with name, price, weight/quality and discount info. */
  return [
    {
      id: 1,
      name: "Honeycrisp Apples",
      category: "Fruits",
      description: "Crisp, sweet apples perfect for snacking.",
      image_url: "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?q=80&w=800&auto=format&fit=crop",
      price: 3.49,
      weight: "1 lb",
      quality: "Premium",
      discountPercent: 10,
      isDiscounted: true
    },
    {
      id: 2,
      name: "Organic Bananas",
      category: "Fruits",
      description: "Naturally sweet and rich in potassium.",
      image_url: "https://images.unsplash.com/photo-1508747703725-719777637510?q=80&w=800&auto=format&fit=crop",
      price: 1.29,
      weight: "1 lb",
      quality: "Organic",
      discountPercent: 0,
      isDiscounted: false
    },
    {
      id: 3,
      name: "Whole Milk",
      category: "Dairy",
      description: "Rich and creamy whole milk.",
      image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=800&auto=format&fit=crop",
      price: 4.19,
      weight: "1 gal",
      quality: "Grade A",
      discountPercent: 15,
      isDiscounted: true
    },
    {
      id: 4,
      name: "Sourdough Bread",
      category: "Bakery",
      description: "Artisan loaf with a crisp crust.",
      image_url: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=800&auto=format&fit=crop",
      price: 5.25,
      weight: "700 g",
      quality: "Artisan",
      discountPercent: 0,
      isDiscounted: false
    },
    {
      id: 5,
      name: "Baby Spinach",
      category: "Vegetables",
      description: "Fresh and tender baby spinach leaves.",
      image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop",
      price: 2.99,
      weight: "8 oz",
      quality: "Organic",
      discountPercent: 20,
      isDiscounted: true
    }
  ];
}
