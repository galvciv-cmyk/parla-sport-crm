import os
from PIL import Image, ImageDraw

user_uploaded_dir = r"C:\Users\linar\.gemini\antigravity\brain\ecc355bf-ce1a-451b-8cbe-ff0d52d5e430\.user_uploaded"
target_dir = r"C:\Users\linar\.gemini\antigravity\scratch\parla-sport-crm\public"

# Obtener archivos de imagen subidos por el usuario
files = [os.path.join(user_uploaded_dir, f) for f in os.listdir(user_uploaded_dir) if f.endswith('.png')]
files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
latest_file = files[0]
print("Procesando imagen oficial sin fondo:", latest_file)

img = Image.open(latest_file).convert("RGBA")
width, height = img.size

# Crear una nueva imagen RGBA transparente
transparent_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))

pixels = img.load()
trans_pixels = transparent_img.load()

for x in range(width):
    for y in range(height):
        r, g, b, a = pixels[x, y]
        
        # Si el pixel es el fondo blanco / claro (r,g,b altos)
        if r > 180 and g > 180 and b > 180:
            # Hacer completamente transparente (alpha = 0)
            trans_pixels[x, y] = (0, 0, 0, 0)
        # Si es el texto en negro (PARLA / SPORT)
        elif r < 120 and g < 120 and b < 120:
            # Convertir a blanco puro
            trans_pixels[x, y] = (255, 255, 255, a)
        # Si es el detalle dorado (estrellas / líneas)
        elif r > 150 and g > 110 and b < 120:
            # Convertir a dorado radiante (#FBBF24)
            trans_pixels[x, y] = (245, 191, 36, a)
        else:
            brightness = (r + g + b) / 3.0
            if brightness > 160:
                trans_pixels[x, y] = (0, 0, 0, 0)
            else:
                alpha_val = int((255 - brightness))
                trans_pixels[x, y] = (255, 255, 255, alpha_val)

logo_path = os.path.join(target_dir, "logo.png")
transparent_img.save(logo_path, "PNG")
print("Logo transparente guardado exitosamente en:", logo_path)

# 2. GENERAR FAVICON CON LA 'P' EXACTA EN BLANCO SOBRE AZUL CON BORDE DORADO
p_box = (0, 0, int(width * 0.28), int(height * 0.72))
p_crop = transparent_img.crop(p_box)

p_bbox = p_crop.getbbox()
if p_bbox:
    p_letter = p_crop.crop(p_bbox)
else:
    p_letter = p_crop

fav_size = 512
favicon = Image.new("RGBA", (fav_size, fav_size), (0, 0, 0, 0))
draw = ImageDraw.Draw(favicon)

# Fondo Azul Marino Profundo (#060D1E)
radius = 120
draw.rounded_rectangle([10, 10, fav_size - 10, fav_size - 10], radius=radius, fill=(6, 13, 30, 255))

# Anillo Borde Dorado (#FBBF24)
border_width = 24
draw.rounded_rectangle([10, 10, fav_size - 10, fav_size - 10], radius=radius, outline=(245, 191, 36, 255), width=border_width)

# Centrar la P exacta del logo en blanco
p_w, p_h = p_letter.size
max_dim = int(fav_size * 0.52)
scale = min(max_dim / p_w, max_dim / p_h)
new_p_w = int(p_w * scale)
new_p_h = int(p_h * scale)

p_resized = p_letter.resize((new_p_w, new_p_h), Image.Resampling.LANCZOS)

offset_x = (fav_size - new_p_w) // 2
offset_y = (fav_size - new_p_h) // 2
favicon.paste(p_resized, (offset_x, offset_y), p_resized)

fav_png_path = os.path.join(target_dir, "favicon.png")
favicon.save(fav_png_path, "PNG")
print("Favicon transparente guardado en:", fav_png_path)
