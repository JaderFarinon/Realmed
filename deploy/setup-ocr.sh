#!/bin/sh
# Install only private Realmed files. No dpkg install, apt upgrade or service restart.
set -eu
root=/qyvia/realmed/shared/ocr
mkdir -p "$root/packages" "$root/runtime" "$root/bin"
chmod 700 "$root" "$root/packages" "$root/runtime" "$root/bin"
cd "$root/packages"
apt-get download tesseract-ocr libtesseract4 liblept5 libarchive13 libgomp1 libgif7 libwebpmux3 tesseract-ocr-eng tesseract-ocr-por tesseract-ocr-osd
for package in ./*.deb; do dpkg-deb -x "$package" "$root/runtime"; done
cat > "$root/bin/tesseract" <<'WRAPPER'
#!/bin/sh
root=/qyvia/realmed/shared/ocr/runtime
export LD_LIBRARY_PATH="$root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export TESSDATA_PREFIX="$root/usr/share/tesseract-ocr/4.00/tessdata"
export OMP_THREAD_LIMIT=1
exec "$root/usr/bin/tesseract" "$@"
WRAPPER
chmod 700 "$root/bin/tesseract"
LD_LIBRARY_PATH="$root/runtime/usr/lib/x86_64-linux-gnu" ldd "$root/runtime/usr/bin/tesseract" | tee "$root/library-check.txt"
if grep -q 'not found' "$root/library-check.txt"; then echo 'Missing OCR dependencies' >&2; exit 1; fi
"$root/bin/tesseract" --version
"$root/bin/tesseract" --list-langs
