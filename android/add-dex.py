"""把 classes.dex 写入 aapt2 生成的 APK。"""
import sys
import zipfile

base, dex, out = sys.argv[1], sys.argv[2], sys.argv[3]

with zipfile.ZipFile(base) as source, zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as target:
    for item in source.infolist():
        if item.filename == "classes.dex":
            continue
        target.writestr(item, source.read(item.filename))
    target.write(dex, "classes.dex")

print("classes.dex 已写入 " + out)
