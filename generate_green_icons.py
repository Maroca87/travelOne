"""
TravelOne High-Definition Icon Generator
Generates 100% opaque, emerald green icons with crisp white centered airplane silhouettes.
Guaranteed immune to iOS Safari Dark Mode and Android maskable icon clipping.
"""
from PIL import Image, ImageDraw, ImageFilter

raw_points = [
    (357.47, 154.53), (349.21, 171.04), (331.05, 194.15), (307.11, 219.74),
    (295.56, 232.95), (326.10, 331.18), (318.67, 338.61), (262.54, 265.97),
    (232.00, 293.21), (241.90, 332.83), (236.13, 338.61), (213.84, 308.07),
    (196.50, 320.45), (190.73, 321.27), (191.55, 315.50), (203.93, 298.16),
    (173.39, 275.87), (179.17, 270.10), (218.79, 280.00), (246.03, 249.46),
    (173.39, 193.33), (180.82, 185.90), (279.05, 216.44), (292.26, 204.89),
    (317.85, 180.95), (340.96, 162.79)
]

cx_orig = (173.39 + 357.47) / 2 # 265.43
cy_orig = (154.53 + 338.61) / 2 # 246.57

def make_gradient(width, height):
    # Diagonal 45deg Emerald Green Gradient (#0ea35d -> #09874c)
    base = Image.new('RGB', (2, 2))
    base.putpixel((0, 0), (14, 163, 93))
    base.putpixel((1, 0), (12, 150, 85))
    base.putpixel((0, 1), (11, 145, 82))
    base.putpixel((1, 1), (9, 135, 76))
    return base.resize((width, height), Image.Resampling.BICUBIC).convert('RGBA')

def generate_green_icon(size, filename, is_rgb=False):
    canvas_size = 1024
    
    # 1. Base Emerald Green Gradient (100% Solid Full Bleed)
    im = make_gradient(canvas_size, canvas_size)
    draw = ImageDraw.Draw(im)
    
    # 2. Subtle soft concentric glow ring
    ring_radius = int(canvas_size * 0.38)
    ring_cx = canvas_size // 2
    ring_cy = canvas_size // 2
    ring_width = max(2, int(canvas_size * 0.012))
    draw.ellipse(
        [ring_cx - ring_radius, ring_cy - ring_radius, ring_cx + ring_radius, ring_cy + ring_radius],
        outline=(255, 255, 255, 70),
        width=ring_width
    )
    
    # 3. Scaled & Centered Airplane Silhouette (with 24% safe margin)
    plane_scale = (canvas_size * 0.52) / 184.08
    scaled_points = []
    for px, py in raw_points:
        nx = (px - cx_orig) * plane_scale + (canvas_size / 2)
        ny = (py - cy_orig) * plane_scale + (canvas_size / 2)
        scaled_points.append((nx, ny))
    
    # Soft drop shadow for airplane
    shadow_offset_y = int(canvas_size * 0.018)
    shadow_points = [(x, y + shadow_offset_y) for x, y in scaled_points]
    
    shadow_img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_img)
    s_draw.polygon(shadow_points, fill=(0, 40, 20, 85))
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(radius=canvas_size * 0.012))
    im = Image.alpha_composite(im, shadow_img)
    
    # Crisp Pure White Airplane Silhouette
    draw = ImageDraw.Draw(im)
    draw.polygon(scaled_points, fill=(255, 255, 255, 255))
    
    # Resize to target dimension with Lanczos anti-aliasing
    final_img = im.resize((size, size), Image.Resampling.LANCZOS)
    
    if is_rgb:
        final_img = final_img.convert('RGB')
        
    final_img.save(filename, 'PNG')
    print(f'Generated {filename} ({size}x{size}) Mode: {final_img.mode}')

if __name__ == '__main__':
    for name, sz, rgb in [
        ('apple-touch-icon.png', 180, True),
        ('apple-touch-icon-180x180.png', 180, True),
        ('apple-touch-icon-precomposed.png', 180, True),
        ('icon-192.png', 192, False),
        ('icon-512.png', 512, False),
        ('app-logo.png', 512, False),
        ('favicon.png', 64, False)
    ]:
        generate_green_icon(sz, name, rgb)
