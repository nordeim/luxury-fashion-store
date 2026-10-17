#!/usr/bin/env python3
"""Reference head probe (session-24 continuation): what does the live
reference ship in its <head> for the seams the fresh audit opened?"""
import re
import urllib.request

URLS = {
    "ref-home": "https://pastel-aurelia-fashion-edit.base44.app/",
    "ref-login": "https://pastel-aurelia-fashion-edit.base44.app/login",
}
PATTERNS = {
    "theme-color": r'<meta[^>]*name="theme-color"[^>]*>',
    "robots": r'<meta[^>]*name="robots"[^>]*>',
    "twitter:card": r'<meta[^>]*twitter:card[^>]*>',
    "og:image": r'<meta[^>]*property="og:image"[^>]*>',
    "font-preload": r'<link[^>]*preload[^>]*font[^>]*>',
    "any-preload": r'<link[^>]*rel="preload"[^>]*>',
    "ld+json": r'<script[^>]*application/ld\+json[^>]*>',
    "mask-icon": r'<link[^>]*mask-icon[^>]*>',
    "apple-touch": r'<link[^>]*apple-touch[^>]*>',
    "manifest": r'<link[^>]*manifest[^>]*>',
    "favicon-links": r'<link[^>]*icon[^>]*>',
}

for name, url in URLS.items():
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (audit)"})
    try:
        html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    except Exception as e:
        print(name, "FETCH ERR", e)
        continue
    print(f"===== {name} ({len(html)} bytes) =====")
    for label, pat in PATTERNS.items():
        hits = re.findall(pat, html, re.I)
        print(f"  {label}: {len(hits)}")
        for h in hits[:3]:
            print("    ", h[:160])
    # any <link rel=preload as=font> or .woff2 in head?
    woff = re.findall(r'[^"\s]+\.woff2[^"\s]*', html)
    print("  woff2 urls:", len(woff), woff[:3])
