#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
يبني final-summary-2026.zip من الصور الصالحة فقط، ثم يتحقق من الأرشيف:
  * يفتح الأرشيف ويقرأ كل عضو
  * يتحقق من CRC عبر testzip()
  * يعيد فحص كل صورة مستخرجة بالمنطق نفسه في validate_images.py
  * يتأكد أن الصور هي نفسها التي في assets/img (بصمة SHA-256)

الاستخدام: python3 tools/build_zip.py
"""
import hashlib
import os
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from validate_images import check, Bad  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "assets", "img")
ZIP_PATH = os.path.join(ROOT, "final-summary-2026.zip")

README = """ملخص الامتحان النهائي 2026 — النسخة السرية
=========================================

تهانينا. لقد حمّلت الملف.
لا يوجد ملخص. لا توجد أسئلة مسرّبة. لا توجد أربع صفحات سحرية.

ما يوجد داخل هذا الأرشيف:
  صور مرسومة لشخصية كرتونية خيالية تُدعى «أبو الملخص»،
  أستاذ الملخصات الوهمي في الجامعة الوطنية الافتراضية.

كل الصور أصلية ومرسومة برمجيًا لهذا المشروع، ولا تمثّل أي شخص حقيقي.

الرسالة الوحيدة:
  اذهب وذاكر. الامتحان أقرب مما تظن.

هذا الملف جزء من موقع ترفيهي ساخر، وليس منتجًا تعليميًا.
"""


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    names = sorted(f for f in os.listdir(IMG_DIR)
                   if f.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")))
    if not names:
        print("لا توجد صور. شغّل tools/generate_assets.py أولًا.")
        return 1

    valid = []
    for n in names:
        p = os.path.join(IMG_DIR, n)
        try:
            info = check(p)
            valid.append((n, p, info))
        except Bad as e:
            print("تخطّي %s: %s" % (n, e))

    if not valid:
        print("لا توجد صور صالحة لضغطها.")
        return 1

    if os.path.exists(ZIP_PATH):
        os.remove(ZIP_PATH)

    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for n, p, _ in valid:
            z.write(p, arcname="assets/img/" + n)
        z.writestr("اقرأني.txt", README)

    # ------------------------------ التحقق من الأرشيف الناتج
    with zipfile.ZipFile(ZIP_PATH) as z:
        bad = z.testzip()
        if bad is not None:
            print("عضو تالف في الأرشيف:", bad)
            return 1
        entries = z.namelist()
        img_entries = [e for e in entries if e.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp"))]
        if len(img_entries) != len(valid):
            print("عدد الصور داخل الأرشيف لا يطابق الأصل.")
            return 1

        tmpdir = os.path.join(os.environ.get("TMPDIR", "/data/local/tmp"), "zipcheck")
        os.makedirs(tmpdir, exist_ok=True)
        for e in img_entries:
            data = z.read(e)
            tmp = os.path.join(tmpdir, os.path.basename(e))
            with open(tmp, "wb") as f:
                f.write(data)
            check(tmp)  # يرمي Bad إن كان تالفًا
            src = os.path.join(IMG_DIR, os.path.basename(e))
            if hashlib.sha256(data).hexdigest() != sha256(src):
                print("بصمة غير مطابقة:", e)
                return 1

    size = os.path.getsize(ZIP_PATH)
    print("الأرشيف: %s" % ZIP_PATH)
    print("الصور داخل الأرشيف: %d" % len(valid))
    print("الحجم: %.2f ميغابايت" % (size / (1024 * 1024)))
    print("CRC وبصمات SHA-256: سليمة")
    print("العناصر:")
    for e in entries:
        print("  -", e)
    return 0


if __name__ == "__main__":
    sys.exit(main())
