# Build va deploy len Vercel

## 1. Chuan bi Supabase

1. Tao project Supabase.
2. Tao cac bang (giu ten giong app hien tai):
   - poi
   - Image
   - PoiVisit
   - Tour
   - TourPoi
3. Tao bucket storage: poi-images, dat la Public.
4. Bat Email/Password trong Authentication.
5. Tao user admin trong Auth > Users.

## 2. Cau hinh frontend

Mo file assets/js/supabase-config.js va sua:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- ADMIN_EMAIL_WHITELIST (neu muon gioi han email admin)
- TABLES (neu ten bang cua ban khac)

## 3. Chay local truoc khi deploy

Vi day la static site, ban co the mo bang Live Server hoac bat ky static server nao.

Vi du voi Node:

```bash
npx serve .
```

Sau do vao:

- /admin/login.html
- /admin/dashboard.html
- /map/map.html
- /map/scan.html?poi=1

## 4. Deploy len Vercel

### Cach A: Deploy bang dashboard

1. Day source len GitHub.
2. Vao Vercel, Import Project tu GitHub.
3. Framework Preset: Other.
4. Build Command: de trong.
5. Output Directory: de trong.
6. Deploy.

### Cach B: Deploy bang Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## 5. Luu y quan trong

- Khong can PHP runtime tren Vercel vi du an da la HTML + JS thuần.
- Do dang dung anon key, can bat RLS va policy dung de bao ve du lieu.
- De upload anh thanh cong, bucket poi-images phai public hoac policy read hop le.
- Thiet lap SQL cho QR va luot truy cap theo huong dan trong docs/QR_VISIT_SETUP.md.
