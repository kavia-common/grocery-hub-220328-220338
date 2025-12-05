/**
 * PUBLIC_INTERFACE
 * getMockProducts provides seeded sample products used by ProductGrid and ProductDetail.
 * Each product includes: id, name, price, weightOrQuality, discountPercent (or isDiscounted),
 * image_url, description, and category. A mix of discounted and non-discounted items is included.
 *
 * Note for consumers:
 * - ProductGrid currently reads p.weight || p.quality for a compact display. We continue to include
 *   either weight or quality alongside weightOrQuality for backward compatibility.
 * - ProductDetail uses: id, name, description, category, image_url, price.
 * - Instant delivery: products may include isInstant: boolean and instantEta: string (e.g., "10 min").
 */
// PUBLIC_INTERFACE
export function getMockProducts() {
  /** Returns a list of sample products with name, price, weight/quality and discount info. */
  return [
    {
      id: 1,
      name: "Honeycrisp Apples",
      category: "Fruits",
      description: "Crisp, sweet apples perfect for snacking. Juicy and aromatic with a balanced tartness.",
      image_url: "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?q=80&w=800&auto=format&fit=crop",
      price: 3.49,
      weightOrQuality: "1 lb",
      weight: "1 lb",
      discountPercent: 10,
      isDiscounted: true,
      isInstant: true,
      instantEta: "10 min"
    },
    {
      id: 2,
      name: "Organic Bananas",
      category: "Fruits",
      description: "Naturally sweet and rich in potassium. Great for smoothies and snacks.",
      image_url: "https://images.unsplash.com/photo-1508747703725-719777637510?q=80&w=800&auto=format&fit=crop",
      price: 1.29,
      weightOrQuality: "Organic",
      quality: "Organic",
      discountPercent: 0,
      isDiscounted: false,
      isInstant: true,
      instantEta: "15 min"
    },
    {
      id: 3,
      name: "Whole Milk",
      category: "Dairy",
      description: "Rich and creamy whole milk. Excellent source of calcium and vitamin D.",
      image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=800&auto=format&fit=crop",
      price: 4.19,
      weightOrQuality: "1 gal",
      weight: "1 gal",
      discountPercent: 15,
      isDiscounted: true,
      isInstant: false
    },
    {
      id: 4,
      name: "Sourdough Bread",
      category: "Bakery",
      description: "Artisan loaf with a crisp crust and soft interior. Naturally leavened for deep flavor.",
      image_url: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=800&auto=format&fit=crop",
      price: 5.25,
      weightOrQuality: "700 g",
      weight: "700 g",
      discountPercent: 0,
      isDiscounted: false,
      isInstant: true,
      instantEta: "12 min"
    },
    {
      id: 5,
      name: "Baby Spinach",
      category: "Vegetables",
      description: "Fresh and tender baby spinach leaves. Ideal for salads, sautés, and smoothies.",
      image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop",
      price: 2.99,
      weightOrQuality: "8 oz • Organic",
      weight: "8 oz",
      quality: "Organic",
      discountPercent: 20,
      isDiscounted: true,
      isInstant: false
    },
    {
      id: 6,
      name: "Free-Range Eggs",
      category: "Dairy",
      description: "Large grade AA free-range eggs with rich, golden yolks.",
      image_url: "https://images.unsplash.com/photo-1517959105821-eaf2591984c2?q=80&w=800&auto=format&fit=crop",
      price: 3.99,
      weightOrQuality: "12 count",
      discountPercent: 0,
      isDiscounted: false,
      isInstant: true,
      instantEta: "20 min"
    },
    {
      id: 7,
      name: "Heirloom Tomatoes",
      category: "Vegetables",
      description: "Sweet and vibrant tomatoes perfect for salads and sandwiches.",
      image_url: "https://images.unsplash.com/photo-1592924357228-91d7dc8a0c48?q=80&w=800&auto=format&fit=crop",
      price: 2.79,
      weightOrQuality: "500 g",
      weight: "500 g",
      discountPercent: 12,
      isDiscounted: true,
      isInstant: false
    },
    {
      id: 8,
      name: "Croissants",
      category: "Bakery",
      description: "Buttery, flaky pastries baked fresh every morning.",
      image_url: "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=800&auto=format&fit=crop",
      price: 4.59,
      weightOrQuality: "4 pack",
      discountPercent: 0,
      isDiscounted: false,
      isInstant: true,
      instantEta: "10 min"
    },
    {
      id: 9,
      name: "Avocados",
      category: "Fruits",
      description: "Creamy Hass avocados, perfect for toast and guacamole.",
      image_url: "https://images.unsplash.com/photo-1551360021-0ff7982d13e8?q=80&w=800&auto=format&fit=crop",
      price: 1.59,
      weightOrQuality: "Each",
      discountPercent: 5,
      isDiscounted: true,
      isInstant: false
    },
    {
      id: 10,
      name: "Almond Milk (Unsweetened)",
      category: "Dairy",
      description: "Lactose-free alternative with a smooth, nutty taste.",
      image_url: "https://images.unsplash.com/photo-1604909052743-0fa2b60c8a4d?q=80&w=800&auto=format&fit=crop",
      price: 3.29,
      weightOrQuality: "64 fl oz",
      discountPercent: 0,
      isDiscounted: false,
      isInstant: false
    },
    {
      id: 11,
      name: "Blueberries",
      category: "Fruits",
      description: "Sweet blueberries bursting with antioxidants.",
      image_url: "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?q=80&w=800&auto=format&fit=crop",
      price: 3.89,
      weightOrQuality: "6 oz • Organic",
      quality: "Organic",
      discountPercent: 18,
      isDiscounted: true,
      isInstant: true,
      instantEta: "10 min"
    },
    {
      id: 12,
      name: "Greek Yogurt",
      category: "Dairy",
      description: "Plain, thick Greek yogurt—high in protein and creamy.",
      image_url: "https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=800&auto=format&fit=crop",
      price: 5.49,
      weightOrQuality: "32 oz",
      discountPercent: 0,
      isDiscounted: false,
      isInstant: false
    }
  ];
}
