import os
from PIL import Image, ImageDraw

user_uploaded_dir = r"C:\Users\linar\.gemini\antigravity\brain\ecc355bf-ce1a-451b-8cbe-ff0d52d5e430\.user_uploaded"
target_dir = r"C:\Users\linar\.gemini\antigravity\scratch\parla-sport-crm\public"

# Buscar las imágenes subidas
files = [os.path.join(user_uploaded_dir, f) for f in os.listdir(user_uploaded_dir) if f.endswith('.png')]
print("Archivos encontrados:", files)

# Tomamos la más reciente
files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
latest_file = files[0]
print("Usando imagen principal:", latest_file)

img = Image.open(latest_file).convert("RGBA")
width, height = img.size

# 1. GENERAR LOGO CON LETRAS EN BLANCO Y DORADO RESALTADO
new_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
pixels = img.load()
new_pixels = new_img.load()

for x in range(width):
    for y in range(height):
        r, g, b, a = pixels[x, y]
        if a > 10:
            # Si el pixel es oscuro (Texto PARLA / SPORT en negro)
            if r < 100 and g < 100 and b < 100:
                # Convertir a Blanco manteniendo transparencia suave (antialiasing)
                new_pixels[x, y] = (255, 255, 255, a)
            else:
                # Si es el detalle dorado (líneas o estrellas), resaltarlo ligeramente
                # Dorado radiante (#FBBF24 / #E5C158)
                new_pixels[x, y] = (245, 190, 40, a)

logo_path = os.path.join(target_dir, "logo.png")
new_img.save(logo_path, "PNG")
print("✅ logo.png guardado en:", logo_path)

# 2. GENERAR FAVICON CON LA 'P' EXACTA DEL LOGO EN BLANCO SOBRE AZUL Y BORDE DORADO
# Encontrar la caja delimitadora de la letra P (arriba a la izquierda)
# La 'P' de PARLA se encuentra aproximadamente en el primer 30% del ancho y 70% de la altura superior
p_box = (0, 0, int(width * 0.28), int(height * 0.72))
p_crop = new_img.crop(p_box)

# Obtener la bounding box del contenido no transparente en la sección de la P
p_bbox = p_crop.getbbox()
if p_bbox:
    p_letter = p_crop.crop(p_bbox)
else:
    p_letter = p_crop

# Crear Favicon de 512x512
fav_size = 512
favicon = Image.new("RGBA", (fav_size, fav_size), (0, 0, 0, 0))
draw = ImageDraw.Draw(favicon)

# Fondo Azul Marino Profundo (#060D1E) con bordes redondeados
radius = 120
draw.rounded_rectangle([10, 10, fav_size - 10, fav_size - 10], radius=radius, fill=(6, 13, 30, 255))

# Anillo Borde Dorado Rodeando (#FBBF24 / #D4AF37)
border_width = 24
draw.rounded_rectangle([10, 10, fav_size - 10, fav_size - 10], radius=radius, outline=(245, 190, 40, 255), width=border_width)

# Ajustar y centrar la 'P' exacta dentro del favicon
p_w, p_h = p_letter.size
max_dim = int(fav_size * 0.55)
scale = min(max_dim / p_w, max_dim / p_h)
new_p_w = int(p_w * scale)
new_p_h = int(p_h * scale)

p_resized = p_letter.resize((new_p_w, new_p_h), Image.Resampling.LANCZOS)

# Pegar centrada
offset_x = (fav_size - new_p_w) // 2
offset_y = (fav_size - new_p_h) // 2
favicon.paste(p_resized, (offset_x, offset_y), p_resized)

fav_png_path = os.path.join(target_dir, "favicon.png")
favicon.save(fav_png_path, "PNG")
print("✅ favicon.png guardado en:", fav_png_path)
