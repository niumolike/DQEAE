"""生成 DQEAE 图标：青柠底 + 深色 DQ，含自适应图标与单色版。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "res" / "dqeae"
LIME = (200, 245, 106, 255)
INK = (14, 17, 22, 255)
DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"


def draw_glyph(size, color, ratio=0.46, background=None):
    image = Image.new("RGBA", (size, size), background if background else (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(FONT_BOLD, int(size * ratio))
    draw.text((size / 2, size / 2 + size * 0.012), "DQ", font=font, fill=color, anchor="mm")
    return image


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    # 传统图标（Android 8 以下 / 部分启动器）
    for density, size in DENSITIES.items():
        target = OUT / f"mipmap-{density}"
        target.mkdir(parents=True, exist_ok=True)
        draw_glyph(size, INK, 0.46, LIME).save(target / "ic_launcher.png", "PNG")
        print(f"  mipmap-{density}/ic_launcher.png  {size}px")

    # 自适应图标前景（432，安全区内）
    foreground = draw_glyph(432, INK, 0.34)
    foreground.save(OUT / "mipmap-xxxhdpi" / "ic_launcher_foreground.png", "PNG")
    print("  mipmap-xxxhdpi/ic_launcher_foreground.png  432px")

    # Android 13 主题图标（单色，系统染色）
    monochrome = draw_glyph(432, (0, 0, 0, 255), 0.34)
    monochrome.save(OUT / "mipmap-xxxhdpi" / "ic_launcher_monochrome.png", "PNG")
    print("  mipmap-xxxhdpi/ic_launcher_monochrome.png  432px")

    # 自适应图标描述
    anydpi26 = OUT / "mipmap-anydpi-v26"
    anydpi26.mkdir(parents=True, exist_ok=True)
    (anydpi26 / "ic_launcher.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@color/ic_launcher_background" />\n'
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
        '</adaptive-icon>\n',
        encoding="utf-8",
    )

    anydpi33 = OUT / "mipmap-anydpi-v33"
    anydpi33.mkdir(parents=True, exist_ok=True)
    (anydpi33 / "ic_launcher.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@color/ic_launcher_background" />\n'
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
        '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />\n'
        '</adaptive-icon>\n',
        encoding="utf-8",
    )

    values = OUT / "values"
    values.mkdir(parents=True, exist_ok=True)
    (values / "colors.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<resources>\n'
        '    <color name="ic_launcher_background">#C8F56A</color>\n'
        '</resources>\n',
        encoding="utf-8",
    )
    print("  自适应图标 XML + colors.xml")


if __name__ == "__main__":
    main()
