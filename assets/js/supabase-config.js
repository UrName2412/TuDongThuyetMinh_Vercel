export const SUPABASE_URL = "https://vkicutmxykziwygemslh.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraWN1dG14eWt6aXd5Z2Vtc2xoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTc1NDAsImV4cCI6MjA5MDk5MzU0MH0.SVNFu7wpI-TTLRXDvAOX_KPRXIvX7TEQapi0DjNX2z0";
// Optional: only allow these emails to access the admin UI.
// Leave empty to allow any authenticated user.
export const ADMIN_EMAIL_WHITELIST = [
  "admin@admin.com"
];

// Keep table names aligned with your Supabase schema.
export const TABLES = {
  POI: "poi",
  IMAGE: "Image",
  POI_VISIT: "PoiVisit",
  TOUR: "Tour",
  TOUR_POI: "TourPoi"
};

// Storage bucket used for POI images.
export const POI_IMAGE_BUCKET = "poi-images";

// Default map center (HCMC)
export const DEFAULT_MAP_CENTER = [10.762622, 106.660172];
export const DEFAULT_MAP_ZOOM = 14;
