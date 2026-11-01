"""Losslessly compress the complete upstream fonts, retaining their OFL metadata."""
from pathlib import Path
import hashlib
import json
import urllib.request
from fontTools.ttLib import TTFont

tools = Path(__file__).resolve().parent
root = tools.parent / 'public' / 'observatory'
cache = tools / '.cache' / 'fonts'
cache.mkdir(parents=True, exist_ok=True)
manifest = json.loads((root / 'assets-manifest.json').read_text())
expected = {
    400: 'a7fdc993f9f0387caedba4e42521136fa97e4c0837ae6239bf0413ccf8af00c2',
    500: '4fc14a73ca53ba9d32fd759ae1ca1a3133326035d0dd337862b3ee1633cc156e',
    700: '5b2232ff598dd39860f606526399f64be06f0c286a638bad8a83e98c44c41ff6',
}
for weight, digest in expected.items():
    target = f'ibm-plex-mono-{weight}.woff2'
    record = next(a for a in manifest['assets'] if a['file'] == target)
    original = cache / f'ibm-plex-mono-{weight}.ttf'
    if not original.exists():
        with urllib.request.urlopen(record['source'], timeout=60) as response:
            original.write_bytes(response.read())
    assert hashlib.sha256(original.read_bytes()).hexdigest() == digest, target
    font = TTFont(original)
    font.flavor = 'woff2'
    font.save(root / target)
print('Fonts converted. Run update-manifest.mjs, then verify:data.')
