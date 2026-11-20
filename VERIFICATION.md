# تقرير التحقق — ملخص الامتحان النهائي 2026

- تاريخ التحقق: 2026-11-20
- الرابط: https://alwaqad-afk.github.io/final-exam-notes-2026/
- الفرع المنشور: `main` — المجلد الجذري `/`
- حالة الاستضافة: `built`

## الصور

| # | الملف | الأبعاد | الحجم | SHA-256 (أول 16) |
|---|-------|---------|-------|------------------|
| 1 | `portrait-01.png` | 512×512 | 267 KB | `61eacd7f74674898` |
| 2 | `portrait-02.png` | 512×512 | 261 KB | `1ea0e7b6466df436` |
| 3 | `portrait-03.png` | 512×512 | 260 KB | `f7714fe1cfa6f74f` |
| 4 | `portrait-04.png` | 512×512 | 269 KB | `5b48dafd320236fd` |
| 5 | `portrait-05.png` | 512×512 | 270 KB | `b6ae1fdadcd18463` |
| 6 | `portrait-06.png` | 512×512 | 261 KB | `50452f46878cdef3` |
| 7 | `portrait-07.png` | 512×512 | 271 KB | `1c869936ee303d46` |
| 8 | `portrait-08.png` | 512×512 | 229 KB | `abfd245e44dbce14` |
| 9 | `portrait-09.png` | 512×512 | 268 KB | `5f5833ad0a611958` |
| 10 | `portrait-10.png` | 512×512 | 265 KB | `d9910b6bd3ca0cbc` |
| 11 | `portrait-11.png` | 512×512 | 266 KB | `be75df2fd9b0c61d` |
| 12 | `portrait-12.png` | 512×512 | 261 KB | `abba7a3d8c045c25` |

**الإجمالي: 12 صورة صالحة، 0 تالفة.**

## الأرشيف

- الملف: `final-summary-2026.zip`
- الحجم: 3.08 ميغابايت
- SHA-256: `853fec28ddf3c0d557a15124050c3d6cbf2f0c6e3bbdb53e6467365a735e1505`
- اختبار CRC: سليم (`testzip()` أعاد `None`)
- العناصر: 13 (12 صورة + ملف اقرأني)
- كل صورة داخل الأرشيف أُعيد فحصها بعد الاستخراج: صالحة، وبصمتها مطابقة لملفها في `assets/img/`.

## فحص الروابط الحيّة

| المسار | الحالة | النوع |
|--------|--------|-------|
| `/` | 200 | text/html |
| `/assets/style.css` | 200 | text/css |
| `/assets/app.js` | 200 | application/javascript |
| `/assets/favicon.svg` | 200 | image/svg+xml |
| `/final-summary-2026.zip` | 200 | application/x-zip-compressed |
| `assets/img/portrait-01…12.png` | 200 ×12 | image/png |

## ملاحظة

الصور الاثنتا عشرة مرسومة برمجيًا لشخصية كرتونية خيالية («أبو الملخص»)،
ولا تمثّل أي شخص حقيقي. سكربت الفحص `tools/validate_images.py` يرفض صفحات
HTML المتخفّية بامتداد صورة، والملفات الفارغة أو المقتطعة، والصور أحادية اللون.
