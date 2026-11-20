#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
فحص برمجي صارم لملفات الصور:
  * ترفض صفحات HTML/JSON/نصوص الخطأ حتى لو كان امتدادها .png
  * ترفض الملفات الفارغة أو المقتطعة
  * تتحقق من ترويسة PNG وCRC لكل مقطع ووجود IHDR/IDAT/IEND
  * تتحقق من ترويسة JPEG ووجود SOF (الأبعاد) وEOI
  * ترفض الصور أحادية اللون (ملف فارغ بصريًا)
  * تحذف الملفات التالفة عند تمرير --delete

الاستخدام:
  python3 tools/validate_images.py assets/img --delete --json report.json
"""
import argparse
import json
import os
import struct
import sys
import zlib

SIG_PNG = b"\x89PNG\r\n\x1a\n"
SIG_JPG = b"\xff\xd8\xff"
SIG_GIF = (b"GIF87a", b"GIF89a")
SIG_WEBP = b"WEBP"
MIN_BYTES = 4096


class Bad(Exception):
    pass


def looks_like_text(head):
    h = head.lstrip()[:512].lower()
    return (h.startswith(b"<!doctype") or h.startswith(b"<html")
            or b"<html" in h or h.startswith(b"{") or h.startswith(b"<?xml")
            or b"<!doctype html" in h)


def png_info(data):
    if not data.startswith(SIG_PNG):
        raise Bad("توقيع PNG غير صالح")
    pos = 8
    w = h = None
    idat = bytearray()
    seen_iend = False
    seen_idat = False
    while pos < len(data):
        if pos + 8 > len(data):
            raise Bad("مقطع مبتور")
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        ctype = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        crc_raw = data[pos + 8 + length:pos + 12 + length]
        if len(body) != length or len(crc_raw) != 4:
            raise Bad("مقطع %s مقتطع" % ctype)
        (crc,) = struct.unpack(">I", crc_raw)
        if (zlib.crc32(ctype + body) & 0xFFFFFFFF) != crc:
            raise Bad("CRC خاطئ في %s" % ctype.decode("latin1"))
        if ctype == b"IHDR":
            w, h, depth, color, _, _, inter = struct.unpack(">IIBBBBB", body)
            if w < 16 or h < 16 or w > 12000 or h > 12000:
                raise Bad("أبعاد غير معقولة %dx%d" % (w, h))
            if depth != 8 or color not in (0, 2, 4, 6):
                raise Bad("صيغة بكسل غير مدعومة")
        elif ctype == b"IDAT":
            seen_idat = True
            idat += body
        elif ctype == b"IEND":
            seen_iend = True
            break
        pos += 12 + length
    if w is None:
        raise Bad("لا يوجد IHDR")
    if not seen_idat:
        raise Bad("لا توجد بيانات صورة IDAT")
    if not seen_iend:
        raise Bad("لا توجد نهاية IEND (ملف مقتطع)")
    try:
        raw = zlib.decompress(bytes(idat))
    except zlib.error as e:
        raise Bad("فشل فك ضغط البيانات: %s" % e)
    ch = {0: 1, 2: 3, 4: 2, 6: 4}[color]
    expected = h * (1 + w * ch)
    if len(raw) != expected:
        raise Bad("حجم البيانات لا يطابق الأبعاد (%d != %d)" % (len(raw), expected))
    if len(set(raw[:200000])) < 12:
        raise Bad("الصورة أحادية اللون تقريبًا (فارغة بصريًا)")
    return {"format": "PNG", "width": w, "height": h}


def jpeg_info(data):
    if not data.startswith(SIG_JPG):
        raise Bad("توقيع JPEG غير صالح")
    if not data.rstrip(b"\x00").endswith(b"\xff\xd9"):
        raise Bad("لا توجد نهاية EOI (ملف مقتطع)")
    pos = 2
    w = h = None
    while pos + 4 <= len(data):
        if data[pos] != 0xFF:
            pos += 1
            continue
        marker = data[pos + 1]
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            pos += 2
            continue
        (seglen,) = struct.unpack(">H", data[pos + 2:pos + 4])
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                      0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            if seglen < 7:
                raise Bad("مقطع SOF غير صالح")
            h, w = struct.unpack(">HH", data[pos + 5:pos + 9])
            break
        pos += 2 + seglen
    if not w or not h:
        raise Bad("لم يُعثر على أبعاد الصورة")
    if w < 16 or h < 16:
        raise Bad("أبعاد صغيرة جدًا")
    return {"format": "JPEG", "width": w, "height": h}


def gif_info(data):
    if not data.startswith(SIG_GIF):
        raise Bad("توقيع GIF غير صالح")
    if not data.rstrip(b"\x00").endswith(b";"):
        raise Bad("ملف GIF غير مكتمل")
    w, h = struct.unpack("<HH", data[6:10])
    return {"format": "GIF", "width": w, "height": h}


def webp_info(data):
    if len(data) < 16 or data[:4] != b"RIFF" or data[8:12] != SIG_WEBP:
        raise Bad("توقيع WEBP غير صالح")
    (riff_len,) = struct.unpack("<I", data[4:8])
    if riff_len + 8 > len(data) + 8:
        raise Bad("ملف WEBP مقتطع")
    return {"format": "WEBP", "width": None, "height": None}


def check(path):
    size = os.path.getsize(path)
    if size == 0:
        raise Bad("ملف فارغ (0 بايت)")
    if size < MIN_BYTES:
        raise Bad("حجم صغير بشكل مريب (%d بايت)" % size)
    with open(path, "rb") as f:
        data = f.read()
    if looks_like_text(data[:1024]):
        raise Bad("محتوى نصي/HTML وليس صورة (صفحة خطأ محتملة)")
    info = None
    for fn in (png_info, jpeg_info, gif_info, webp_info):
        try:
            info = fn(data)
            break
        except Bad:
            continue
    if info is None:
        raise Bad("صيغة غير معروفة أو تالفة")
    info["bytes"] = size
    info["ratio"] = round(size / max(1, (info["width"] or 1) * (info["height"] or 1)), 3)
    return info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--delete", action="store_true")
    ap.add_argument("--json")
    args = ap.parse_args()

    exts = (".png", ".jpg", ".jpeg", ".gif", ".webp")
    files = sorted(
        os.path.join(args.folder, f) for f in os.listdir(args.folder)
        if f.lower().endswith(exts)
    )

    good, bad = [], []
    for path in files:
        try:
            info = check(path)
            good.append((path, info))
            print("OK   %-28s %-5s %sx%s  %6.1f KB" % (
                os.path.basename(path), info["format"],
                info["width"], info["height"], info["bytes"] / 1024))
        except Bad as e:
            bad.append((path, str(e)))
            print("BAD  %-28s %s" % (os.path.basename(path), e))
            if args.delete:
                os.remove(path)
                print("     -> حُذف")

    print("\nالخلاصة: %d صالحة، %d تالفة، من أصل %d ملفًا." %
          (len(good), len(bad), len(files)))

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump({
                "folder": args.folder,
                "valid": [{"file": os.path.basename(p), **i} for p, i in good],
                "invalid": [{"file": os.path.basename(p), "reason": r} for p, r in bad],
                "valid_count": len(good),
                "invalid_count": len(bad),
            }, f, ensure_ascii=False, indent=2)

    return 0 if good and not bad else 1


if __name__ == "__main__":
    sys.exit(main())
