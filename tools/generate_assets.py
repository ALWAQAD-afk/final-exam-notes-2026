#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مولّد أصول المشروع: يرسم 12 صورة شخصية أصلية (PNG) لشخصية كرتونية خيالية
هي «أبو الملخص» أستاذ الملخصات الوهمي. كل الصور مرسومة برمجيًا هنا،
ولا تُستخدم أي صورة حقيقية لأي شخص.

الخوارزمية: كانفس RGB + رسم أشكال هندسية بحدود ناعمة (Analytic AA)
+ حبيبات خفيفة، ثم ترميز PNG يدويًا عبر zlib (بدون أي مكتبات خارجية).
"""
import math
import os
import random
import struct
import zlib

W = H = 512
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "img")


# ----------------------------------------------------------------- PNG
def write_png(path, w, h, rgb):
    raw = bytearray()
    stride = w * 3
    for y in range(h):
        raw.append(0)
        raw += rgb[y * stride:(y + 1) * stride]
    comp = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", comp)
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    return len(png)


# ------------------------------------------------------------- drawing
class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.buf = bytearray(w * h * 3)

    def px(self, x, y, r, g, b, a=1.0):
        if a <= 0 or x < 0 or y < 0 or x >= self.w or y >= self.h:
            return
        i = (y * self.w + x) * 3
        buf = self.buf
        if a >= 1.0:
            buf[i] = r
            buf[i + 1] = g
            buf[i + 2] = b
        else:
            ia = 1.0 - a
            buf[i] = int(buf[i] * ia + r * a)
            buf[i + 1] = int(buf[i + 1] * ia + g * a)
            buf[i + 2] = int(buf[i + 2] * ia + b * a)

    def gradient(self, c1, c2, glow=None):
        w, h = self.w, self.h
        r1, g1, b1 = c1
        r2, g2, b2 = c2
        for y in range(h):
            t = y / (h - 1)
            # smooth vertical blend
            tr = r1 + (r2 - r1) * (t * t * (3 - 2 * t))
            tg = g1 + (g2 - g1) * (t * t * (3 - 2 * t))
            tb = b1 + (b2 - b1) * (t * t * (3 - 2 * t))
            row = y * w * 3
            for x in range(w):
                i = row + x * 3
                self.buf[i] = int(tr)
                self.buf[i + 1] = int(tg)
                self.buf[i + 2] = int(tb)
        if glow:
            cx, cy, rad, gc, gs = glow
            gr, gg, gb = gc
            for y in range(h):
                dy = (y - cy) / rad
                for x in range(w):
                    dx = (x - cx) / rad
                    d = math.sqrt(dx * dx + dy * dy)
                    if d >= 1.0:
                        continue
                    a = (1.0 - d) ** 2 * gs
                    self.px(x, y, gr, gg, gb, a)

    def ellipse(self, cx, cy, rx, ry, color, soft=1.0):
        r, g, b = color
        x0, x1 = max(0, int(cx - rx - 2)), min(self.w, int(cx + rx + 2))
        y0, y1 = max(0, int(cy - ry - 2)), min(self.h, int(cy + ry + 2))
        k = min(rx, ry) * soft
        for y in range(y0, y1):
            dy = (y + 0.5 - cy) / ry
            dy2 = dy * dy
            if dy2 > 1.6:
                continue
            for x in range(x0, x1):
                dx = (x + 0.5 - cx) / rx
                d = math.sqrt(dx * dx + dy2)
                if d < 1.0:
                    cov = min(1.0, (1.0 - d) * k + 0.5)
                    self.px(x, y, r, g, b, cov)

    def ring(self, cx, cy, rx, ry, thick, color):
        r, g, b = color
        x0, x1 = max(0, int(cx - rx - thick - 2)), min(self.w, int(cx + rx + thick + 2))
        y0, y1 = max(0, int(cy - ry - thick - 2)), min(self.h, int(cy + ry + thick + 2))
        for y in range(y0, y1):
            for x in range(x0, x1):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                d = math.sqrt(dx * dx + dy * dy)
                if d < 1e-6:
                    continue
                # approximate distance to ellipse edge
                dist = abs(d - 1.0) * min(rx, ry)
                if dist < thick:
                    cov = min(1.0, (thick - dist) + 0.5)
                    self.px(x, y, r, g, b, cov)

    def rrect(self, x0, y0, x1, y1, rad, color, alpha=1.0):
        r, g, b = color
        for y in range(max(0, int(y0)), min(self.h, int(y1) + 1)):
            for x in range(max(0, int(x0)), min(self.w, int(x1) + 1)):
                px, py = x + 0.5, y + 0.5
                qx = max(x0 + rad - px, 0, px - (x1 - rad))
                qy = max(y0 + rad - py, 0, py - (y1 - rad))
                d = math.sqrt(qx * qx + qy * qy) - rad
                if d < 0.5:
                    self.px(x, y, r, g, b, alpha * min(1.0, 0.5 - d))

    def rrect_outline(self, x0, y0, x1, y1, rad, thick, color, alpha=1.0):
        r, g, b = color
        for y in range(max(0, int(y0 - thick)), min(self.h, int(y1 + thick) + 1)):
            for x in range(max(0, int(x0 - thick)), min(self.w, int(x1 + thick) + 1)):
                px, py = x + 0.5, y + 0.5
                qx = max(x0 + rad - px, 0, px - (x1 - rad))
                qy = max(y0 + rad - py, 0, py - (y1 - rad))
                d = abs(math.sqrt(qx * qx + qy * qy) - rad)
                if d < thick:
                    self.px(x, y, r, g, b, alpha * min(1.0, (thick - d) + 0.5))

    def hair_cap(self, cx, cy, rx, ry, hairline, curve, color, wave=0.0):
        """قبعة شعر: نصف بيضوي مقصوص بخط شعر متموّج."""
        r, g, b = color
        for y in range(max(0, int(cy - ry - 2)), min(self.h, int(cy + ry + 2))):
            for x in range(max(0, int(cx - rx - 2)), min(self.w, int(cx + rx + 2))):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                d = math.sqrt(dx * dx + dy * dy)
                if d >= 1.0:
                    continue
                line = hairline + curve * (x + 0.5 - cx) ** 2
                if wave:
                    line += math.sin((x + 0.5) * 0.06) * wave
                if y + 0.5 > line:
                    continue
                cov = min(1.0, (1.0 - d) * min(rx, ry) + 0.5)
                edge = min(1.0, (line - (y + 0.5)) + 0.5)
                self.px(x, y, r, g, b, cov * max(0.0, edge))

    def poly(self, pts, color, alpha=1.0):
        r, g, b = color
        ys = [p[1] for p in pts]
        xs = [p[0] for p in pts]
        y0, y1 = max(0, int(min(ys))), min(self.h, int(max(ys)) + 1)
        x0, x1 = max(0, int(min(xs))), min(self.w, int(max(xs)) + 1)
        n = len(pts)
        for y in range(y0, y1):
            for x in range(x0, x1):
                # 2x2 supersampling
                hits = 0
                for sy in (0.25, 0.75):
                    for sx in (0.25, 0.75):
                        px, py = x + sx, y + sy
                        inside = False
                        j = n - 1
                        for i in range(n):
                            xi, yi = pts[i]
                            xj, yj = pts[j]
                            if (yi > py) != (yj > py):
                                xint = (xj - xi) * (py - yi) / (yj - yi) + xi
                                if px < xint:
                                    inside = not inside
                            j = i
                        if inside:
                            hits += 1
                if hits:
                    self.px(x, y, r, g, b, alpha * hits / 4.0)

    def arc(self, cx, cy, rx, ry, a0, a1, thick, color):
        r, g, b = color
        steps = int(max(rx, ry) * abs(a1 - a0) * 1.6) + 8
        for i in range(steps + 1):
            a = a0 + (a1 - a0) * i / steps
            x = cx + rx * math.cos(a)
            y = cy + ry * math.sin(a)
            self.ellipse(x, y, thick, thick, (r, g, b))

    def grain(self, amount, seed):
        rnd = random.Random(seed)
        buf = self.buf
        for i in range(0, len(buf), 3):
            n = int(rnd.uniform(-amount, amount))
            if n:
                buf[i] = max(0, min(255, buf[i] + n))
                buf[i + 1] = max(0, min(255, buf[i + 1] + n))
                buf[i + 2] = max(0, min(255, buf[i + 2] + n))

    def vignette(self, strength=0.35):
        w, h = self.w, self.h
        cx, cy = w / 2, h / 2
        maxd = math.hypot(cx, cy)
        for y in range(h):
            for x in range(w):
                d = math.hypot(x - cx, y - cy) / maxd
                if d > 0.55:
                    a = (d - 0.55) / 0.45 * strength
                    i = (y * w + x) * 3
                    self.buf[i] = int(self.buf[i] * (1 - a))
                    self.buf[i + 1] = int(self.buf[i + 1] * (1 - a))
                    self.buf[i + 2] = int(self.buf[i + 2] * (1 - a))


# ------------------------------------------------------------ character
VARIANTS = [
    # bg1, bg2, glow, skin, hair, suit, tie, beard, glasses, cap, expr, seed
    ((32, 42, 68), (10, 14, 26), (90, 120, 200), (232, 186, 150), (58, 42, 34), (24, 32, 52), (196, 74, 74), True, "square", False, "smile", 11),
    ((58, 40, 66), (18, 12, 26), (180, 110, 200), (214, 160, 122), (30, 26, 24), (36, 26, 44), (214, 168, 74), True, "round", False, "grin", 12),
    ((28, 56, 54), (8, 20, 20), (90, 190, 160), (240, 200, 165), (120, 96, 70), (20, 36, 34), (58, 130, 120), False, "square", True, "smile", 13),
    ((70, 46, 30), (24, 14, 8), (220, 150, 90), (204, 148, 108), (24, 20, 18), (40, 28, 20), (150, 60, 50), True, "round", False, "neutral", 14),
    ((34, 44, 70), (12, 16, 28), (120, 160, 240), (236, 192, 156), (150, 150, 150), (28, 30, 44), (90, 110, 180), False, "square", True, "grin", 15),
    ((60, 32, 48), (22, 10, 18), (220, 110, 150), (222, 172, 132), (40, 30, 26), (34, 22, 32), (200, 90, 120), True, "square", False, "smile", 16),
    ((26, 48, 66), (10, 18, 26), (100, 180, 220), (244, 206, 172), (70, 52, 40), (18, 32, 42), (230, 190, 90), True, "round", False, "grin", 17),
    ((52, 52, 40), (20, 20, 14), (200, 200, 120), (210, 158, 118), (28, 24, 22), (34, 34, 26), (110, 140, 80), False, "square", True, "neutral", 18),
    ((40, 36, 68), (14, 12, 26), (150, 130, 240), (228, 180, 142), (90, 70, 54), (26, 24, 44), (120, 100, 200), True, "round", False, "smile", 19),
    ((66, 38, 34), (24, 12, 10), (230, 130, 100), (238, 196, 160), (46, 36, 30), (38, 24, 20), (180, 120, 60), True, "square", False, "grin", 20),
    ((24, 44, 60), (8, 16, 22), (80, 170, 200), (206, 150, 112), (34, 30, 28), (16, 30, 38), (70, 150, 170), False, "round", True, "smile", 21),
    ((48, 30, 58), (16, 10, 22), (190, 120, 220), (232, 188, 152), (60, 48, 40), (30, 20, 38), (210, 200, 190), True, "square", False, "neutral", 22),
]


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)


def render(v, idx):
    bg1, bg2, glow, skin, hair, suit, tie, beard, gshape, cap, expr, seed = v
    c = Canvas(W, H)
    c.gradient(bg1, bg2, (256, 220, 160, glow, 0.40))

    # زخرفة خلفية: أقواس رقيقة
    for k in range(4):
        c.ring(256, 330, 150 + k * 42, 150 + k * 42, 1.1,
               tuple(min(255, x + 34) for x in bg1))

    skin_d = shade(skin, 0.84)
    skin_l = shade(skin, 1.07)
    suit_l = shade(suit, 1.45)
    suit_d = shade(suit, 0.62)
    line = (46, 44, 50)

    # ظل خلف الشخصية
    c.ellipse(256, 470, 200, 60, shade(bg2, 0.6), soft=0.25)

    # ---- الجسد: بدلة وقميص وياقة
    c.poly([(28, 512), (52, 452), (128, 412), (196, 394), (316, 394),
            (384, 412), (460, 452), (484, 512)], suit)
    c.poly([(52, 452), (128, 412), (196, 394), (256, 512), (150, 512)],
           suit_l)
    c.poly([(384, 412), (460, 452), (484, 512), (362, 512), (316, 394)],
           suit_d)
    # قميص
    c.poly([(214, 396), (256, 466), (298, 396), (274, 386), (238, 386)],
           (240, 242, 240))
    # ياقة
    c.poly([(214, 396), (238, 386), (256, 420), (222, 410)], (222, 226, 226))
    c.poly([(298, 396), (274, 386), (256, 420), (290, 410)], (222, 226, 226))
    # ربطة عنق
    c.poly([(256, 418), (241, 446), (256, 496), (271, 446)], tie)
    c.poly([(248, 404), (264, 404), (270, 420), (256, 430), (242, 420)],
           shade(tie, 1.22))
    # منديل جيب
    c.poly([(330, 440), (356, 432), (362, 452), (334, 456)], shade(tie, 1.1))

    # ---- الرقبة
    c.rrect(228, 320, 284, 402, 14, skin_d)
    c.ellipse(256, 336, 44, 20, shade(skin, 0.76), soft=0.5)

    # ---- الشعر الخلفي
    c.ellipse(256, 196, 98, 104, shade(hair, 0.92))

    # ---- الرأس
    c.ellipse(256, 232, 89, 106, skin)
    c.ellipse(238, 214, 70, 84, skin_l, soft=2.2)
    # الأذنان
    c.ellipse(167, 242, 15, 24, skin_d)
    c.ellipse(345, 242, 15, 24, skin_d)
    c.ellipse(167, 242, 8, 13, shade(skin, 0.72))
    c.ellipse(345, 242, 8, 13, shade(skin, 0.72))

    # ---- الشعر الأمامي (خط شعر مموّج)
    c.hair_cap(256, 168, 94, 74, 186, 0.0032, hair, wave=3.0)
    c.ellipse(222, 128, 40, 14, shade(hair, 1.7), soft=0.7)
    # سوالف
    c.poly([(168, 196), (176, 258), (188, 262), (186, 196)], hair)
    c.poly([(344, 196), (336, 258), (324, 262), (326, 196)], hair)

    # ---- اللحية (شريط على خط الفك)
    if beard:
        c.poly([(170, 250), (176, 300), (206, 330), (256, 342),
                (306, 330), (336, 300), (342, 250), (326, 258),
                (300, 306), (256, 314), (212, 306), (186, 258)],
               hair)
        c.ellipse(256, 300, 46, 12, shade(hair, 1.25), soft=0.6)
    # شارب
    c.ellipse(238, 274, 23, 8, hair)
    c.ellipse(274, 274, 23, 8, hair)

    # ---- الأنف
    c.poly([(250, 236), (262, 236), (266, 262), (256, 270), (246, 262)],
           shade(skin, 0.93))
    c.ellipse(248, 264, 5, 4, shade(skin, 0.8))
    c.ellipse(264, 264, 5, 4, shade(skin, 0.8))
    c.ellipse(256, 246, 7, 5, skin_l, soft=0.6)

    # ---- العينان
    for ex, side in ((219, -1), (293, 1)):
        c.ellipse(ex, 228, 19, 12, (250, 248, 244))
        c.ellipse(ex + side * 1, 228, 8, 9, (86, 68, 54))
        c.ellipse(ex + side * 1, 228, 4, 4.5, (28, 24, 22))
        c.ellipse(ex + side * 1 - 3, 225, 2.2, 2.2, (255, 255, 255))
        c.arc(ex, 210, 20, 7, math.pi * 1.10, math.pi * 1.90, 3.2,
              shade(hair, 0.95))

    # ---- النظارة
    lens = (206, 226, 240)
    if gshape == "round":
        c.ring(219, 228, 31, 27, 3.6, line)
        c.ring(293, 228, 31, 27, 3.6, line)
        c.ellipse(219, 228, 29, 25, lens, soft=0.0)
        c.ellipse(293, 228, 29, 25, lens, soft=0.0)
        c.rrect(246, 224, 266, 229, 2, line)
        c.rrect(160, 222, 190, 227, 2, line)
        c.rrect(322, 222, 352, 227, 2, line)
    else:
        for lx in (187, 261):
            c.rrect(lx, 204, lx + 63, 251, 8, lens, alpha=0.30)
            c.rrect_outline(lx, 204, lx + 63, 251, 8, 3.4, line)
            c.poly([(lx + 8, 246), (lx + 22, 210), (lx + 32, 210),
                    (lx + 16, 247)], (255, 255, 255), alpha=0.22)
        c.rrect(249, 224, 262, 229, 2, line)
        c.rrect(160, 220, 189, 225, 2, line)
        c.rrect(322, 220, 351, 225, 2, line)

    # ---- الفم والتعابير
    if expr == "grin":
        c.ellipse(256, 291, 27, 15, (118, 44, 46))
        c.ellipse(256, 296, 19, 8, (200, 100, 96))
        c.poly([(233, 284), (279, 284), (277, 290), (235, 290)],
               (250, 249, 246))
    elif expr == "smile":
        c.arc(256, 284, 24, 14, 0.20, math.pi - 0.20, 3.4, (124, 52, 52))
        c.arc(256, 282, 17, 9, 0.35, math.pi - 0.35, 2.0, (188, 96, 92))
    else:
        c.rrect(238, 289, 274, 294, 2, (116, 56, 56))

    # ---- خدود
    c.ellipse(198, 268, 14, 8, (212, 108, 98), soft=0.35)
    c.ellipse(314, 268, 14, 8, (212, 108, 98), soft=0.35)

    # ---- قبعة التخرج
    if cap:
        c.poly([(256, 96), (368, 138), (256, 180), (144, 138)], (20, 20, 28))
        c.poly([(256, 96), (368, 138), (256, 158), (144, 138)], (34, 34, 44))
        c.rrect(224, 84, 288, 112, 6, (28, 28, 38))
        c.arc(368, 138, 7, 7, 0, math.pi * 2, 3.0, (212, 176, 78))
        c.poly([(368, 138), (376, 182), (368, 204), (360, 182)],
               (212, 176, 78))
        c.ellipse(368, 206, 6, 9, (212, 176, 78))

    c.vignette(0.40)
    c.grain(5.0, seed)
    return c


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for i, v in enumerate(VARIANTS, start=1):
        c = render(v, i)
        path = os.path.join(OUT, "portrait-%02d.png" % i)
        size = write_png(path, W, H, c.buf)
        total += size
        print("wrote %s (%d bytes)" % (os.path.basename(path), size))
    print("total bytes:", total)


if __name__ == "__main__":
    main()
