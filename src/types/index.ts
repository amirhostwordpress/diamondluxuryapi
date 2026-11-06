// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types for the Diamond Luxury Real Estate backend
// ─────────────────────────────────────────────────────────────────────────────

// ── Property ─────────────────────────────────────────────────────────────────
export type ListingType = "sale" | "rent" | "off-plan";
export type PropertyStatus = "active" | "sold" | "rented" | "draft";

export interface Property {
  id: number;
  slug: string;
  title: string;
  listing_type: ListingType;
  status: PropertyStatus;
  price: number;           // raw number (AED)
  price_sqft: number;
  sqft: number;
  beds: number;
  baths: number;
  parking: number;
  highlights: string;      // comma-separated
  location: string;
  community: string;
  developer: string | null;
  completion_date: string | null;   // ISO date string, off-plan only
  description: string | null;
  images: string[];        // public URLs (served from FTP)
  brochure_url: string | null;
  video_url: string | null;
  agent_id: number | null;
  created_at: string;
  updated_at: string;
}

// ── Agent ─────────────────────────────────────────────────────────────────────
export interface Agent {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  bio: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Enquiry ──────────────────────────────────────────────────────────────────
export type EnquiryInterest = "buy" | "rent" | "sell" | "offplan" | "other";
export type EnquiryStatus = "new" | "contacted" | "closed";

export interface Enquiry {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  interest: EnquiryInterest;
  budget: string | null;
  message: string | null;
  property_id: number | null;
  status: EnquiryStatus;
  created_at: string;
}

// ── Newsletter ────────────────────────────────────────────────────────────────
export interface NewsletterSubscriber {
  id: number;
  email: string;
  subscribed_at: string;
  is_active: boolean;
}

// ── News / Blog ───────────────────────────────────────────────────────────────
export type NewsCategory =
  | "Market Report"
  | "Market Insights"
  | "New Developments"
  | "Investment"
  | "Buyer's Guide"
  | "Lifestyle"
  | "Legal & Visa"
  | "Area Focus";

export interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string | null;
  category: NewsCategory;
  image_url: string | null;
  read_time: string | null;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
}

// ── Off-Plan Project ──────────────────────────────────────────────────────────
export type OffPlanTag = "NEW LAUNCH" | "SELLING FAST" | "EXCLUSIVE" | "LIMITED UNITS" | "COMING SOON";

export interface OffPlanProject {
  id: number;
  slug: string;
  title: string;
  developer: string;
  location: string;
  community: string | null;
  completion: string;        // e.g. "Q4 2027"
  price_from: number;        // raw AED
  beds: string;              // e.g. "3 – 6 BR"
  image_url: string | null;
  brochure_url: string | null;
  tag: OffPlanTag;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Admin User ────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
}

// ── Site Settings ─────────────────────────────────────────────────────────────
export interface SiteSetting {
  setting_key: string;
  value: string | null;
  section: string;
  updated_at: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
