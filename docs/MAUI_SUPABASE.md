# C# MAUI goi Supabase API

Ban co 2 cach:

## Cach 1: Goi REST API truc tiep (don gian)

Supabase REST endpoint:

- Base URL: https://YOUR_PROJECT_REF.supabase.co/rest/v1
- Header bat buoc:
  - apikey: YOUR_SUPABASE_ANON_KEY
  - Authorization: Bearer YOUR_SUPABASE_ANON_KEY

Vi du lay danh sach POI:

```csharp
using System.Net.Http.Headers;
using System.Text.Json;

var client = new HttpClient();
client.BaseAddress = new Uri("https://YOUR_PROJECT_REF.supabase.co/rest/v1/");
client.DefaultRequestHeaders.Add("apikey", "YOUR_SUPABASE_ANON_KEY");
client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "YOUR_SUPABASE_ANON_KEY");

var response = await client.GetAsync("poi?select=*&order=id.desc");
response.EnsureSuccessStatusCode();

var json = await response.Content.ReadAsStringAsync();
var pois = JsonSerializer.Deserialize<List<PoiDto>>(json);
```

## Cach 2: Dung Supabase C# SDK

Ban co the dung package community cho Supabase C# de auth, query, storage.
Neu uu tien on dinh va chu dong, REST API (cach 1) thuong de kiem soat hon.

## Goi y bao mat cho MAUI

- Neu app public, khong nen de role key service trong app.
- Chi dung anon key va policy RLS.
- Neu can thao tac admin, dung Edge Function hoac backend rieng de ky request.
