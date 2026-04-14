export const SUPABASE_URL = "https://dzzstmszxyjekhkznldd.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6enN0bXN6eHlqZWtoa3pubGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjIwMzcsImV4cCI6MjA5MTI5ODAzN30.TdFHdJNdk8_R5UAJq3mBJOK-NAGmKD2IoPzA6-ixo0o";

// Optional: only allow these emails to access the admin UI.
// Leave empty to allow any authenticated user.
export const ADMIN_EMAIL_WHITELIST = [
  "admin@gmail.com"
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
