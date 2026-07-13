import os
from PIL import Image

src = r"C:\Users\prade\.gemini\antigravity-ide\brain\01f3ca3b-643e-4184-a62c-f9b62d4e98ba\media__1783862034909.jpg"
dest_dir = r"d:\Prajna Production\Projects\simplishLMS\frontend\public"

def process_icon():
    img = Image.open(src)
    # Ensure it's square
    width, height = img.size
    if width != height:
        size = max(width, height)
        new_img = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        new_img.paste(img, ((size - width) // 2, (size - height) // 2))
        img = new_img
        
    img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(os.path.join(dest_dir, "pwa-192x192.png"), format="PNG")
    
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(os.path.join(dest_dir, "pwa-512x512.png"), format="PNG")

    img_logo = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_logo.save(os.path.join(dest_dir, "logo.png"), format="PNG")
    
    print("Icons successfully generated!")

if __name__ == "__main__":
    process_icon()
