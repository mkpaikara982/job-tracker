#!/usr/bin/env python3
"""Generate JobTrackr extension icons (dark rounded square + white "JT").

Run once to (re)generate icons/icon{16,48,128}.png. Requires Pillow.
"""
import os
from PIL import Image, ImageDraw, ImageFont

SLATE = (30, 41, 59, 255)  # --accent from the app
WHITE = (255, 255, 255, 255)
OUT = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(OUT, exist_ok=True)


def font_for(size):
	for name in ("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"):
		try:
			return ImageFont.truetype(name, size)
		except OSError:
			continue
	return ImageFont.load_default()


def make(px):
	# Supersample 4x for crisp rounded corners + text, then downscale.
	scale = 4
	s = px * scale
	img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
	d = ImageDraw.Draw(img)
	radius = int(s * 0.22)
	d.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=SLATE)

	label = "JT"
	font = font_for(int(s * 0.5))
	box = d.textbbox((0, 0), label, font=font)
	w, h = box[2] - box[0], box[3] - box[1]
	d.text(((s - w) / 2 - box[0], (s - h) / 2 - box[1]), label, font=font, fill=WHITE)

	img = img.resize((px, px), Image.LANCZOS)
	path = os.path.join(OUT, f"icon{px}.png")
	img.save(path)
	print("wrote", path)


for size in (16, 48, 128):
	make(size)
