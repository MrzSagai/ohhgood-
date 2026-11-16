# Laporan optimasi (branch development)

Semua perubahan sudah dites secara lokal (QA script, 9 render test untuk Functions, dan browser headless untuk tampilan, tema gelap, menu mobile, filter kategori). **Belum dites di Cloudflare asli**, jadi cek di URL preview branch sebelum merge ke `main` (lihat checklist di bawah).

## Bug yang ditemukan dan diperbaiki
| Masalah | Perbaikan |
|---|---|
| Tombol Dark mode dan menu mobile tidak punya handler JS sama sekali | `site.js` (toggle tema, menu, Escape, tahun footer) + `theme.js` (tema tersimpan atau mengikuti OS tanpa flash) |
| Tahun footer kosong ("© Ohhgood!") | diisi server dan `site.js` |
| `contact.html` dan `privacy.html` tanpa `<!doctype>` (quirks mode) | ditambah di semua halaman |
| Artikel Journal dirender JS dengan canonical tunggal ke `journal.html` | halaman server-rendered `/journal/<slug>` dengan canonical sendiri, JSON-LD Article, og:image |
| Halaman produk memuat ulang `products.json` dan me-render ulang lewat JS padahal sudah SSR; tanpa font dan header | template dibuang, layout bersama (`functions/_lib/site.js`), tanpa inline script |
| Panel admin menghapus field produk yang tidak ada di form (who_for, faq, dll) saat simpan | simpan sekarang menggabungkan ke record lama, plus 4 field opsional baru di form |
| Validasi API mewajibkan brand dan menolak path gambar dengan spasi atau `%`, padahal situs mengizinkannya | disamakan |
| Workflow QA lama hanya mengecek link terakhir tiap halaman, dan hanya jalan di `main` | diganti `scripts/qa.py` (jalan di main dan development) |
| Workflow optimize-images rusak (butuh PNG master yang tidak ada) dan menimpa gambar 4 produk | diganti generator thumbnail yang aman dan idempoten |
| `_redirects` punya aturan ganda dan rantai redirect | dirapikan, semua langsung ke tujuan akhir |
| Sitemap manual berisi URL `.html` dan `?slug=` yang di-redirect | `functions/sitemap.xml.js` dibuat dari data (clean URL, draft tidak ikut) |
| 8 produk bernama "Brand not specified ..." dan spasi sebelum koma di nama | brand dikosongkan (opsional), teks dibersihkan di data dan di semua render |
| File internal (`*.md`, `scripts/`) bisa dibuka publik | dipindah ke `docs/`; `/docs/*` dan `/scripts/*` mengembalikan 404 |

## SEO
* Halaman kategori baru: `/category/tidy-space`, `/cozy-ambience`, `/slow-ritual`, `/green-corner` (intro, daftar produk, checklist "What to check before you buy" di `content/categories.json`, JSON-LD).
* Beranda dirender dengan katalog di HTML awal (`functions/index.js`); daftar "Browse all finds" tidak lagi manual. Jika Function gagal, halaman statis asli yang dikirim.
* Canonical, og:image (`assets/og-default.jpg`), twitter large card, favicon, apple-touch-icon di semua halaman. JSON-LD: Organization + WebSite, BreadcrumbList, CollectionPage/ItemList, Article, WebPage.
* Judul beranda dipendekkan (di bawah 60 karakter). Breadcrumb produk menuju halaman kategori.
* Artikel mendukung `related_products` ("Finds mentioned in this story") dan `date`/`updated`.
* Dua draft panduan baru (status `draft`, belum tayang): candle warmer dan cable management. Baca, edit dengan pengalaman lu sendiri, lalu publish.
* Tombol beli: "Check price on Amazon" (otomatis "View at retailer" untuk non-Amazon). Pernyataan Associate standar ada di footer semua halaman.

## Performa
* Logo 114-229 KB (PNG 512 px untuk tampilan 48 px) diganti WebP 3-10 KB. Total logo turun dari sekitar 614 KB menjadi sekitar 25 KB. PNG master tetap ada.
* Gambar kategori dikecilkan (contoh `category-green` 436 KB menjadi 91 KB).
* Thumbnail grid untuk 27 gambar produk (`assets/thumbs`, 20-70 KB; sebelumnya gambar penuh 100-340 KB per kartu). Field `thumb` diisi otomatis.
* Cache: aset 1 hari (+ stale-while-revalidate), halaman Function di-cache di edge 5 menit.
* `width`/`height` pada gambar untuk mencegah layout shift, `fetchpriority` pada gambar utama.

## Keamanan
* `_headers`: CSP, HSTS (180 hari, tanpa includeSubDomains/preload), nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy. Header yang sama dipasang di kode untuk respons Function (karena `_headers` tidak berlaku untuk Function).
* `/admin/` noindex dan no-store; `/api/*` nosniff dan noindex; token instalasi GitHub di-cache; branch/repo bisa diatur lewat variabel (default tetap `main`).
* Link retailer: `nofollow sponsored noopener noreferrer`.

## Koreksi atas audit saya sebelumnya
Setelah membaca kode, beberapa temuan awal saya ternyata keliru karena saya hanya melihat teks hasil ekstraksi:
* Link logo **punya** `aria-label`, jadi bukan masalah aksesibilitas.
* Anchor `#about` **ada**, bukan link mati.
* Soal hak gambar: dokumen lu menyebut gambar adalah concept render, tetapi beberapa gambar produk yang lebih baru (misalnya lilin dengan teks "100 hours burn time", label brand terbaca) terlihat seperti foto gaya listing retailer. Gw tidak bisa memastikan sumbernya. **Cek manual**: kalau diambil dari halaman Amazon, ganti dengan foto sendiri atau gambar dari SiteStripe/PA-API. Aturan Amazon Associates setahu gw melarang menyalin gambar produk ke situs sendiri.

## Checklist sebelum merge ke main
1. Push ke `development`, tunggu preview deploy Cloudflare, lalu cek: `/`, `/product/benq-screenbar-halo`, `/category/cozy-ambience`, `/journal/small-desk-improvements`, `/sitemap.xml`, `/stories/small-desk-improvements` (301), `/journal.html?slug=a-kinder-daily-routine` (301), `/docs/README.md` (404), `/admin/`.
2. Buka DevTools Console: harus tidak ada pesan "Refused to load ... Content Security Policy". Jika Cloudflare Web Analytics aktif dan beacon-nya diblokir, CSP sudah mengizinkan `static.cloudflareinsights.com`; jika ada skrip baru (Pinterest tag, dll.) tambahkan hostnya di `_headers` **dan** `functions/_lib/site.js` (QA akan gagal bila keduanya beda).
3. Jika route Function tidak jalan (halaman produk/jurnal 404 atau beranda tanpa katalog): kemungkinan nama file route. Fallback aman: beranda otomatis kembali ke HTML statis; hubungi gw dengan hasilnya.
4. Setelah deploy: kirim `https://ohhgood.store/sitemap.xml` ke Google Search Console, lalu Request Indexing untuk beranda, 4 kategori, dan artikel.
5. Jalankan `curl -I https://ohhgood.store/` dan pastikan header keamanan muncul.

## Belum dikerjakan (butuh keputusan atau konten dari lu)
* 13 produk masih memakai gambar concept SVG (jurnal, teh, plant stand, monstera). Ganti dengan foto asli atau gambar yang sah; QA menandainya sebagai warning.
* Konten per produk (`who_for`, `who_skip`, `check_before`, `how_to`) masih kosong. Isi hanya dengan hal yang benar-benar lu tahu; field sudah didukung halaman dan admin.
* Font masih dari Google Fonts (permintaan ke dua domain tambahan). Self-host WOFF2 akan lebih cepat dan lebih privat; butuh file font (tidak bisa gw unduh dari sandbox).
* Aset yatim di `assets/` (VintageWarmer.webp, GoldWarmer.webp, dll.) tidak gw hapus karena mungkin dipakai di perpustakaan CMS. Hapus manual jika memang tidak dipakai.
* Cover artikel masih hotlink Unsplash; pertimbangkan menyimpan versi lokal.
* ASIN JOYROOM di data (`B0CGRQYCPT`) berbeda dari yang tertulis di `docs/LAUNCH_READINESS.md` (`B0CH159ZNT`). Pastikan yang benar.
* Tidak ada rate limit pada login admin; Cloudflare WAF rate-limiting rule untuk `/api/auth/*` disarankan.
