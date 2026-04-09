# Fix Upload POI Image Error

## ✅ Information Gathered
- Lỗi 400 không phải Storage mà là INSERT table `Image` 
- Policy `Image` table: chỉ `authenticated` users
- Session có thể expired → cần refresh

## 📋 Tasks còn lại

### 1. [x] Code improvements (assets/js/admin-poi-pages.js) ✅
- Session refresh trước upload
- Log chi tiết error source (Storage vs DB Image)  
- File validation (size, type)

### 2. [ ] Test
- Login admin → add_poi.html → chọn ảnh → submit
- **Check Console logs** để xem chính xác lỗi ở bước nào:
  * `[SESSION]` → có active không?
  * `[POI INSERT]` → POI tạo OK?
  * `[UPLOAD]` → Storage OK? 
  * `[IMAGE INSERT]` → DB Image fail?

### 3. [ ] Supabase verify
- Policy table `Image`: authenticated INSERT ✓
- Bucket `poi-images`: 
  * INSERT: authenticated users
  * SELECT: public (cho xem ảnh)

## Next step: Update code logging
