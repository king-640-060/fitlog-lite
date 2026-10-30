"""Verify exact archived evidence; optionally restore original UTF-8 files into a new directory."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

base = Path(__file__).resolve().parent
manifest = json.loads((base / 'raw-evidence-parts.json').read_text())
parts = []
for part in manifest['parts']:
    data = (base / part['file']).read_bytes()
    assert len(data) == part['bytes']
    assert hashlib.sha256(data).hexdigest() == part['sha256'], part['file']
    parts.append(data)
archive = b''.join(parts)
assert len(archive) == manifest['bytes']
assert hashlib.sha256(archive).hexdigest() == manifest['sha256']
raw = json.loads(gzip.decompress(archive))
index = json.loads((base / manifest['decodedIndex']).read_text())
output = Path(sys.argv[1]).resolve() if len(sys.argv) == 2 else None
assert len(sys.argv) <= 2, 'Use an optional output directory only'
if output:
    assert not output.exists(), 'Use a new output directory; never overwrite existing evidence'
for item in index:
    data = raw[item['file']].encode('utf-8')
    assert len(data) == item['bytes']
    assert hashlib.sha256(data).hexdigest() == item['sha256'], item['file']
    if output:
        target = (output / item['file']).resolve()
        assert output in target.parents, 'Archive path must remain inside the output directory'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
print(f"PASS: {len(parts)} exact parts, original archive SHA256, {len(index)} original files")
