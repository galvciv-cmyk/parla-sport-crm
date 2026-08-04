import os
import tkinter as tk

root = tk.Tk()
root.withdraw()

user_uploaded_dir = r"C:\Users\linar\.gemini\antigravity\brain\ecc355bf-ce1a-451b-8cbe-ff0d52d5e430\.user_uploaded"
target_dir = r"C:\Users\linar\.gemini\antigravity\scratch\parla-sport-crm\public"

files = [os.path.join(user_uploaded_dir, f) for f in os.listdir(user_uploaded_dir) if f.endswith('.png')]
files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
latest_file = files[0]
print("Cargando imagen oficial:", latest_file)

img = tk.PhotoImage(file=latest_file)
width = img.width()
height = img.height()
print(f"Dimensiones de la imagen oficial: {width}x{height}")

out_img = tk.PhotoImage(width=width, height=height)

# 1. Transformar píxeles manteniendo la tipografía exacta 100%
for y in range(height):
    for x in range(width):
        color = img.get(x, y) # Retorna tupla (r, g, b)
        r, g, b = color
        
        # Si el pixel es texto negro (PARLA / SPORT)
        if r < 100 and g < 100 and b < 100:
            # Texto PARLA y SPORT -> Cambiar a Blanco (#FFFFFF)
            out_img.put("#ffffff", (x, y))
        elif r > 150 and g > 120 and b < 120:
            # Detalles de estrellas y líneas doradas -> Resaltar a Dorado Brillante (#FBBF24)
            out_img.put("#fbbf24", (x, y))

# Guardar logo.png
logo_path = os.path.join(target_dir, "logo.png")
out_img.write(logo_path, format="png")
print("Logo transformado exitosamente en:", logo_path)

# 2. GENERAR FAVICON CON LA 'P' EXACTA DEL LOGO SOBRE AZUL Y BORDE DORADO
p_w = int(width * 0.28)
p_h = int(height * 0.72)

fav_size = 128
fav_img = tk.PhotoImage(width=fav_size, height=fav_size)

# Dibujar Fondo Azul Marino Profundo (#060D1E) y Borde Dorado (#FBBF24)
for y in range(fav_size):
    for x in range(fav_size):
        # Borde exterior dorado (primeros 6px)
        if x < 6 or x >= fav_size - 6 or y < 6 or y >= fav_size - 6:
            fav_img.put("#fbbf24", (x, y))
        else:
            fav_img.put("#060d1e", (x, y))

# Escalar la 'P' recortada del logo oficial y pegarla centrada en el favicon
scale_x = p_w / (fav_size * 0.55)
scale_y = p_h / (fav_size * 0.55)

offset_x = int((fav_size - (p_w / scale_x)) / 2)
offset_y = int((fav_size - (p_h / scale_y)) / 2)

for y in range(fav_size):
    for x in range(fav_size):
        src_x = int((x - offset_x) * scale_x)
        src_y = int((y - offset_y) * scale_y)

        if 0 <= src_x < p_w and 0 <= src_y < p_h:
            r, g, b = img.get(src_x, src_y)
            if r < 100 and g < 100 and b < 100:
                # Dibujar la P del logo oficial en Blanco
                fav_img.put("#ffffff", (x, y))

fav_path = os.path.join(target_dir, "favicon.png")
fav_img.write(fav_path, format="png")
print("Favicon generado con la P oficial en:", fav_path)
