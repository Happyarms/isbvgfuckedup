#!/usr/bin/env python3
"""Calculate WCAG contrast ratios for all color combinations."""

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_luminance(r, g, b):
    """Calculate relative luminance of RGB color."""
    def adjust(channel):
        channel = channel / 255.0
        if channel <= 0.03928:
            return channel / 12.92
        else:
            return ((channel + 0.055) / 1.055) ** 2.4
    
    r_adj = adjust(r)
    g_adj = adjust(g)
    b_adj = adjust(b)
    
    return 0.2126 * r_adj + 0.7152 * g_adj + 0.0722 * b_adj

def contrast_ratio(color1, color2):
    """Calculate contrast ratio between two colors."""
    if isinstance(color1, str):
        color1 = hex_to_rgb(color1)
    if isinstance(color2, str):
        color2 = hex_to_rgb(color2)
    
    lum1 = rgb_to_luminance(*color1)
    lum2 = rgb_to_luminance(*color2)
    
    lighter = max(lum1, lum2)
    darker = min(lum1, lum2)
    
    ratio = (lighter + 0.05) / (darker + 0.05)
    return ratio

# Define colors
colors = {
    'normal': '#27ae60',
    'degraded': '#e67e22',
    'fucked': '#c0392b',
    'unknown': '#7f8c8d',
    'white': '#ffffff',
    'muted_white': (255, 255, 255),  # Will apply 0.75 alpha later
}

# Text colors
white = '#ffffff'
muted_white_75 = (191, 191, 191)  # Approximate 75% white on colored background

print("=" * 80)
print("WCAG AA CONTRAST VERIFICATION - Is BVG Fucked Up?")
print("=" * 80)
print()

print("### WHITE TEXT (#ffffff) ON STATUS BACKGROUNDS")
print("-" * 80)
for status, bg_color in [('Normal (Green)', colors['normal']), 
                          ('Degraded (Orange)', colors['degraded']),
                          ('Fucked (Red)', colors['fucked']),
                          ('Unknown (Gray)', colors['unknown'])]:
    ratio = contrast_ratio(white, bg_color)
    aa_large = "✓ PASS" if ratio >= 3.0 else "✗ FAIL"
    aa_normal = "✓ PASS" if ratio >= 4.5 else "✗ FAIL"
    print(f"{status:20} {bg_color:10} → Ratio: {ratio:.2f}:1")
    print(f"  Large Text (≥3:1):  {aa_large}")
    print(f"  Normal Text (≥4.5:1): {aa_normal}")
    print()

print("\n### MUTED TEXT (75% opacity white) ON STATUS BACKGROUNDS")
print("-" * 80)
print("Note: Semi-transparent text on colored backgrounds has varying effective contrast")
print("depending on the background color. Calculating approximate values...\n")

# For semi-transparent text, we need to blend with background
def blend_rgba_on_rgb(fg_rgb, bg_rgb, alpha):
    """Blend RGBA foreground on RGB background."""
    r = int(fg_rgb[0] * alpha + bg_rgb[0] * (1 - alpha))
    g = int(fg_rgb[1] * alpha + bg_rgb[1] * (1 - alpha))
    b = int(fg_rgb[2] * alpha + bg_rgb[2] * (1 - alpha))
    return (r, g, b)

white_rgb = (255, 255, 255)
for status, bg_hex in [('Normal (Green)', colors['normal']), 
                        ('Degraded (Orange)', colors['degraded']),
                        ('Fucked (Red)', colors['fucked']),
                        ('Unknown (Gray)', colors['unknown'])]:
    bg_rgb = hex_to_rgb(bg_hex)
    # Blend 75% white with background
    effective_text = blend_rgba_on_rgb(white_rgb, bg_rgb, 0.75)
    ratio = contrast_ratio(effective_text, bg_rgb)
    aa_normal = "✓ PASS" if ratio >= 4.5 else "✗ FAIL"
    aa_large = "✓ PASS" if ratio >= 3.0 else "✗ FAIL"
    print(f"{status:20} {bg_hex:10} → Ratio: {ratio:.2f}:1")
    print(f"  Large Text (≥3:1):  {aa_large}")
    print(f"  Normal Text (≥4.5:1): {aa_normal}")
    print()

print("\n### TEXT ON SEMI-TRANSPARENT CARD BACKGROUNDS")
print("-" * 80)
print("Cards use: rgba(255, 255, 255, 0.15) + backdrop-filter: blur(4px)")
print("The backdrop-filter increases effective contrast by blurring the background.")
print("The semi-transparent white overlay also lightens the effective background.\n")

for status, bg_hex in [('Normal (Green)', colors['normal']), 
                        ('Degraded (Orange)', colors['degraded']),
                        ('Fucked (Red)', colors['fucked']),
                        ('Unknown (Gray)', colors['unknown'])]:
    bg_rgb = hex_to_rgb(bg_hex)
    # Blend 15% white overlay on status background
    card_bg = blend_rgba_on_rgb(white_rgb, bg_rgb, 0.15)
    
    # White text on card background
    white_ratio = contrast_ratio(white_rgb, card_bg)
    
    # Muted text (75% white) on card background
    effective_muted = blend_rgba_on_rgb(white_rgb, card_bg, 0.75)
    muted_ratio = contrast_ratio(effective_muted, card_bg)
    
    print(f"{status:20} Card BG (effective): RGB{card_bg}")
    print(f"  White text → {white_ratio:.2f}:1 {'✓ PASS (4.5:1)' if white_ratio >= 4.5 else '✗ FAIL (4.5:1)' if white_ratio < 4.5 else '✓ PASS (3:1)'}")
    print(f"  Muted text → {muted_ratio:.2f}:1 {'✓ PASS (4.5:1)' if muted_ratio >= 4.5 else '✗ FAIL (4.5:1)' if muted_ratio < 4.5 else '✓ PASS (3:1)'}")
    print()

print("\n### FOCUS INDICATORS")
print("-" * 80)
print("Focus outlines use: rgba(255, 255, 255, 0.6) - 60% white")
print("Checking visibility against status backgrounds...\n")

for status, bg_hex in [('Normal (Green)', colors['normal']), 
                        ('Degraded (Orange)', colors['degraded']),
                        ('Fucked (Red)', colors['fucked']),
                        ('Unknown (Gray)', colors['unknown'])]:
    bg_rgb = hex_to_rgb(bg_hex)
    # 60% white outline
    outline_color = blend_rgba_on_rgb(white_rgb, bg_rgb, 0.6)
    ratio = contrast_ratio(outline_color, bg_rgb)
    # Focus indicators need 3:1 for non-text content
    aa_ui = "✓ PASS" if ratio >= 3.0 else "✗ FAIL"
    print(f"{status:20} → {ratio:.2f}:1 (≥3:1 required) {aa_ui}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
