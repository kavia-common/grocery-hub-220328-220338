 /** 
  * PUBLIC_INTERFACE
  * getMockCoupons returns a list of available coupons/offers with metadata for validation.
  * Fields:
  * - code: string (e.g., SAVE10)
  * - description: human-friendly text
  * - discountType: "percent" | "flat"
  * - value: number (percent as 0-100, flat as currency units)
  * - eligibility: { minSubtotal?: number }
  * - expiry: ISO string (UTC). If expired, coupon is invalid.
  * - tags?: string[] (e.g., ["special", "seasonal"])
  */
 export function getMockCoupons() {
   const now = new Date();
   const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
   const inTwoWeeks = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
   return [
     {
       code: "SAVE10",
       description: "Save 10% on your order",
       discountType: "percent",
       value: 10,
       eligibility: { minSubtotal: 0 },
       expiry: nextMonth.toISOString(),
       tags: ["popular"],
     },
     {
       code: "WELCOME15",
       description: "15% off for new customers",
       discountType: "percent",
       value: 15,
       eligibility: { minSubtotal: 30 },
       expiry: nextMonth.toISOString(),
       tags: ["special", "new"],
     },
     {
       code: "FLAT5",
       description: "$5 off orders over $25",
       discountType: "flat",
       value: 5,
       eligibility: { minSubtotal: 25 },
       expiry: nextMonth.toISOString(),
       tags: ["deal"],
     },
     {
       code: "FREESHIP",
       description: "Flat $5 off to offset shipping",
       discountType: "flat",
       value: 5,
       eligibility: { minSubtotal: 20 },
       expiry: inTwoWeeks.toISOString(),
       tags: ["shipping", "limited"],
     },
   ];
 }
