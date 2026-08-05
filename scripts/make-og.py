"""Generate the OG share image (1200x630) for OurStaff.Space — fully code-drawn."""

import math
import random

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (10, 10, 11)  # #0A0A0B
TEAL = (0, 229, 201)
AMBER = (255, 107, 53)
LINE = (39, 39, 42)
WHITE = (255, 255, 255)
BODY = (161, 161, 170)

random.seed(42)
img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img, "RGBA")

# --- particle field (mirrors the hero canvas) ---
pts = [(random.uniform(0, W), random.uniform(0, H)) for _ in range(90)]
for i, (x1, y1) in enumerate(pts):
    for x2, y2 in pts[i + 1 :]:
        dist = math.hypot(x1 - x2, y1 - y2)
        if dist < 130:
            alpha = int((1 - dist / 130) * 46)
            d.line([x1, y1, x2, y2], fill=TEAL + (alpha,), width=1)
for x, y in pts:
    d.ellipse([x - 1.6, y - 1.6, x + 1.6, y + 1.6], fill=TEAL + (90,))

# fade the field toward the left so text stays readable
for x in range(560):
    alpha = int(255 * (1 - x / 560) * 0.82)
    d.line([x, 0, x, H], fill=BG + (alpha,))

# --- logo mark (three connected nodes) ---
mx, my, s = 80, 76, 1.35
n1 = (mx + 20 * s, my + 20 * s)
n2 = (mx + 44 * s, my + 20 * s)
n3 = (mx + 32 * s, my + 44 * s)
for a, b in ((n1, n2), (n1, n3), (n2, n3)):
    d.line([a, b], fill=LINE, width=3)
for n, c in ((n1, TEAL), (n2, TEAL), (n3, AMBER)):
    r = 6 * s
    d.ellipse([n[0] - r, n[1] - r, n[0] + r, n[1] + r], fill=c)

font = "scripts/SpaceGrotesk.ttf"
word = ImageFont.truetype(font, 40)
head = ImageFont.truetype(font, 76)
sub = ImageFont.truetype(font, 30)

try:
    word.set_variation_by_name("Bold")
    head.set_variation_by_name("Bold")
    sub.set_variation_by_name("Medium")
except Exception:
    pass

# wordmark next to mark
d.text((mx + 78, my + 8), "OurStaff", font=word, fill=WHITE)
w_width = d.textlength("OurStaff", font=word)
d.text((mx + 78 + w_width, my + 8), ".Space", font=word, fill=TEAL)

# headline
d.text((80, 300), "Your Operations Team,", font=head, fill=WHITE)
d.text((80, 392), "Autonomous.", font=head, fill=WHITE)

# subline
d.text((80, 510), "Autonomous agent swarms for hospitality operations.", font=sub, fill=BODY)

# bottom-left mono-ish tag
d.text((80, 566), "ourstaff.space", font=sub, fill=TEAL)

img.save("public/og.png", optimize=True)
print("wrote public/og.png")
