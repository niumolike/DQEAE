"""解压 SDK / JDK 压缩包。"""
import sys
import zipfile

source, target = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(source) as archive:
    archive.extractall(target)
print("解压完成：" + source)
