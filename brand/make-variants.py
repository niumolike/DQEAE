"""生成 DQEAE 的图标变体与封面草案。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
FONT_REG = r"C:\Windows\Fonts\arial.ttf"
FONT_CN_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
FONT_CN = r"C:\Windows\Fonts\msyh.ttc"

LIME = (200, 245, 106, 255)
DARK = (14, 17, 22, 255)
ORANGE = (255, 159, 67, 255)
BLUE = (77, 107, 254, 255)
WHITE = (255, 255, 255, 255)
MUTED = (150, 158, 173, 255)


def font(size, bold=True):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def cn_font(size, bold=True):
    return ImageFont.truetype(FONT_CN_BOLD if bold else FONT_CN, size)


def icon(size, bg, fg, outline=None, outline_w=0):
    image = Image.new("RGBA", (size, size), bg)
    draw = ImageDraw.Draw(image)
    draw.text(
        (size / 2, size / 2 + size * 0.015),
        "DQ",
        font=font(int(size * 0.46)),
        fill=fg,
        anchor="mm",
        stroke_width=outline_w,
        stroke_fill=outline,
    )
    return image


def make_contact():
    variants = [
        ("A  青柠底 / 深色字", icon(192, LIME, DARK)),
        ("B  青柠底 / 橙字描边", icon(192, LIME, ORANGE, DARK, 6)),
        ("C  深色底 / 青柠字", icon(192, DARK, LIME)),
        ("D  现有蓝底", icon(192, BLUE, WHITE)),
    ]
    cell_w, cell_h = 300, 300
    sheet = Image.new("RGBA", (cell_w * 2, cell_h * 2 + 140), (245, 246, 248, 255))
    draw = ImageDraw.Draw(sheet)
    for index, (label, image) in enumerate(variants):
        col, row = index % 2, index // 2
        x = col * cell_w + (cell_w - 192) // 2
        y = row * cell_h + 30
        sheet.paste(image, (x, y), image)
        draw.text((col * cell_w + cell_w / 2, y + 210), label, font=cn_font(17, False), fill=(40, 44, 52, 255), anchor="mm")

    # 小尺寸可读性：48px 实际大小
    draw.text((24, 610), "48px 实际大小（上排浅色桌面 / 下排深色桌面）", font=cn_font(16, False), fill=(40, 44, 52, 255))
    for index, (_, image) in enumerate(variants):
        small = image.resize((48, 48), Image.LANCZOS)
        sheet.paste(small, (24 + index * 56, 640), small)
        sheet.paste(small, (24 + index * 56, 700), small)
    strip = Image.new("RGBA", (sheet.width, 48), (20, 22, 28, 255))
    sheet.paste(strip, (0, 700))
    for index, (_, image) in enumerate(variants):
        small = image.resize((48, 48), Image.LANCZOS)
        sheet.paste(small, (24 + index * 56, 700), small)

    sheet.save(ROOT / "contact.png")
    print("contact.png")


def make_cover():
    width, height = 1200, 630
    cover = Image.new("RGBA", (width, height), (11, 13, 18, 255))
    draw = ImageDraw.Draw(cover)
    # 左侧圆形标志
    draw.ellipse([80, 175, 440, 535], fill=LIME)
    draw.text((260, 350), "DQ", font=font(150), fill=DARK, anchor="mm")
    # 右侧文字
    draw.text((510, 205), "DQEAE", font=font(96), fill=WHITE)
    draw.text((512, 330), "把角色接回来", font=cn_font(42), fill=LIME)
    draw.text((514, 400), "非官方 DeepSeek 角色客户端", font=cn_font(24, False), fill=MUTED)
    draw.text((514, 470), "本地数据 · 自带 API Key · 开源", font=cn_font(20, False), fill=(110, 118, 132, 255))
    cover.save(ROOT / "cover.png")
    print("cover.png")


if __name__ == "__main__":
    make_contact()
    make_cover()
