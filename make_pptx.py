"""Generate the updated Alan fraud-detection presentation."""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

# ── Colours ──────────────────────────────────────────────────────────────────
NAVY   = RGBColor(0x1A, 0x24, 0x40)
RED    = RGBColor(0xD6, 0x28, 0x39)
ORANGE = RGBColor(0xE0, 0x7B, 0x39)
GREEN  = RGBColor(0x2E, 0x7D, 0x32)
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
LGRAY  = RGBColor(0xF5, 0xF5, 0xF5)
MGRAY  = RGBColor(0xCC, 0xCC, 0xCC)
DGRAY  = RGBColor(0x44, 0x44, 0x44)
GOLD   = RGBColor(0xF5, 0xA6, 0x23)
BLUE   = RGBColor(0x1A, 0x78, 0xC2)

W = Inches(13.33)   # widescreen width
H = Inches(7.5)     # widescreen height

prs = Presentation()
prs.slide_width  = W
prs.slide_height = H

blank_layout = prs.slide_layouts[6]   # blank


# ── Helpers ───────────────────────────────────────────────────────────────────

def rgb(color: RGBColor):
    return color

def rect(slide, x, y, w, h, fill=None, line=None):
    shape = slide.shapes.add_shape(1, Inches(x), Inches(y), Inches(w), Inches(h))
    shape.line.fill.background()
    if fill is None:
        shape.fill.background()
    else:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill
    if line:
        shape.line.color.rgb = line
        shape.line.width = Pt(0.75)
    else:
        shape.line.fill.background()
    return shape


def textbox(slide, text, x, y, w, h,
            size=14, bold=False, color=DGRAY, align=PP_ALIGN.LEFT,
            wrap=True, italic=False):
    txb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    txb.word_wrap = wrap
    tf = txb.text_frame
    tf.word_wrap = wrap
    para = tf.paragraphs[0]
    para.alignment = align
    run = para.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    return txb


def header(slide, title, subtitle=None):
    """Navy top bar + title."""
    rect(slide, 0, 0, 13.33, 1.1, fill=NAVY)
    textbox(slide, title, 0.4, 0.1, 12.5, 0.7,
            size=26, bold=True, color=WHITE, align=PP_ALIGN.LEFT)
    if subtitle:
        rect(slide, 0, 1.1, 13.33, 0.4, fill=LGRAY)
        textbox(slide, subtitle, 0.4, 1.1, 12.5, 0.4,
                size=13, color=DGRAY, italic=True)


def footer(slide, txt="Alan Assurance · Fraud Detection Case · 2024"):
    rect(slide, 0, 7.1, 13.33, 0.4, fill=NAVY)
    textbox(slide, txt, 0.3, 7.1, 12.7, 0.4,
            size=10, color=WHITE, align=PP_ALIGN.CENTER)


def score_badge(slide, score, x, y, is_blacklisted=False):
    if is_blacklisted:
        c = DGRAY
    elif score >= 71:
        c = RED
    elif score >= 30:
        c = ORANGE
    else:
        c = GREEN
    rect(slide, x, y, 1.5, 0.55, fill=c)
    textbox(slide, f"{score}/100", x, y, 1.5, 0.55,
            size=18, bold=True, color=WHITE, align=PP_ALIGN.CENTER)


def status_badge(slide, status, x, y):
    colors = {
        "auto_held":    RED,
        "needs_review": ORANGE,
        "auto_approved": GREEN,
        "blacklisted":  DGRAY,
    }
    labels = {
        "auto_held":    "AUTO-HELD",
        "needs_review": "NEEDS REVIEW",
        "auto_approved": "APPROVED",
        "blacklisted":  "BLACKLISTED",
    }
    c = colors.get(status, DGRAY)
    rect(slide, x, y, 1.7, 0.45, fill=c)
    textbox(slide, labels.get(status, status.upper()), x, y, 1.7, 0.45,
            size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER)


def bullet_list(slide, items, x, y, w=5.5, size=13, bullet="•"):
    cur_y = y
    for item in items:
        textbox(slide, f"{bullet}  {item}", x, cur_y, w, 0.38,
                size=size, color=DGRAY)
        cur_y += 0.38


def table_row(slide, cols, xs, y, row_h=0.38, bg=None, text_color=DGRAY,
              sizes=None, bolds=None):
    for i, (text, x, w) in enumerate(zip(cols, xs, [xs[j+1]-xs[j] if j+1 < len(xs) else 13.33-xs[-1] for j in range(len(xs))])):
        if bg:
            rect(slide, x, y, w - 0.02, row_h, fill=bg)
        sz  = sizes[i] if sizes else 11
        bld = bolds[i] if bolds else False
        textbox(slide, str(text), x + 0.08, y + 0.04, w - 0.1, row_h - 0.06,
                size=sz, bold=bld, color=text_color if bg else DGRAY,
                align=PP_ALIGN.LEFT)


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE 1 — Title
# ─────────────────────────────────────────────────────────────────────────────
sl = prs.slides.add_slide(blank_layout)

rect(sl, 0, 0, 13.33, 7.5, fill=NAVY)
rect(sl, 0, 5.5, 13.33, 2.0, fill=RED)

textbox(sl, "ALAN ASSURANCE", 0.8, 0.8, 11.7, 0.7,
        size=18, bold=True, color=GOLD, align=PP_ALIGN.CENTER)
textbox(sl, "Ops Runner — Technical Case", 0.8, 1.6, 11.7, 1.0,
        size=38, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
textbox(sl, "Fraud Detection System", 0.8, 2.7, 11.7, 0.8,
        size=28, bold=False, color=MGRAY, align=PP_ALIGN.CENTER)

textbox(sl, "Analysis & Improvements Report", 0.8, 4.0, 11.7, 0.6,
        size=16, color=MGRAY, align=PP_ALIGN.CENTER)

textbox(sl, "5 auto-held  ·  2 need review  ·  3 detection rules  ·  Full scoring pipeline",
        0.8, 5.6, 11.7, 0.5, size=14, color=WHITE, align=PP_ALIGN.CENTER)
textbox(sl, "March 2024", 0.8, 6.3, 11.7, 0.5,
        size=13, color=MGRAY, align=PP_ALIGN.CENTER)


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE 2 — Dataset Overview
# ─────────────────────────────────────────────────────────────────────────────
sl = prs.slides.add_slide(blank_layout)
header(sl, "Dataset Overview", "Source: ops_runner_technical_case_fraud_07-2023.csv")
footer(sl)

# stat boxes
def stat_box(slide, label, value, note, x, y, color=NAVY):
    rect(slide, x, y, 2.8, 1.4, fill=color)
    textbox(slide, value, x + 0.1, y + 0.1, 2.6, 0.65,
            size=32, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    textbox(slide, label, x + 0.1, y + 0.75, 2.6, 0.35,
            size=13, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    textbox(slide, note, x + 0.1, y + 1.1, 2.6, 0.28,
            size=10, color=LGRAY, align=PP_ALIGN.CENTER)

stat_box(sl, "Providers",     "12",    "Optical shops",          0.4,  1.6, NAVY)
stat_box(sl, "Claims",        "221",   "Reimbursement records",  3.4,  1.6, BLUE)
stat_box(sl, "Date Range",    "18 mo", "Jan 2022 – Jun 2023",   6.4,  1.6, DGRAY)
stat_box(sl, "Total Amount",  "€X",    "Reimbursed to providers",9.4, 1.6, NAVY)

textbox(sl, "Categories", 0.4, 3.3, 2.5, 0.4, size=13, bold=True, color=NAVY)
bullet_list(sl, ["Lunettes (glasses)", "Lentilles (contact lenses)"],
            0.5, 3.7, 2.5, size=12)

textbox(sl, "Data Format", 3.4, 3.3, 5.5, 0.4, size=13, bold=True, color=NAVY)
bullet_list(sl,
    ["Monthly aggregate totals per (provider, category, month)",
     "No individual claim or member-level data",
     "221 rows — one per (provider × category × month) combination"],
    3.5, 3.7, 9.3, size=12)


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE 3 — All Providers Risk Table
# ─────────────────────────────────────────────────────────────────────────────
sl = prs.slides.add_slide(blank_layout)
header(sl, "Provider Risk Scores — Full Overview")
footer(sl)

providers = [
    ("Penthievre alambics",   100, "auto_held",     "dual_product (+47), monthly_spike (+60)"),
    ("Queen optics",          100, "auto_held",     "dual_product (+48), monthly_spike (+90)"),
    ("Runner glasses",         88, "auto_held",     "dual_product (+28), repeated_amount (+60)"),
    ("Les lunettes à Soso",   100, "auto_held",     "dual_product (+39), monthly_spike (+30), repeated_amount (+40)"),
    ("Mike lunettes",         100, "auto_held",     "dual_product (+43), monthly_spike (+90)"),
    ("Kylian's frames",        68, "needs_review",  "dual_product (+38), monthly_spike (+30)"),
    ("Roudoudou lentilles",    50, "needs_review",  "dual_product (+50)"),
    ("Voodoo optics",           0, "auto_approved", "—"),
    ("abc optics",              0, "auto_approved", "—"),
    ("Cool optics",             0, "auto_approved", "—"),
    ("Dallas optics",           0, "auto_approved", "—"),
    ("22 optics",               0, "auto_approved", "—"),
]

# column headers
hxs = [0.3, 4.0, 5.8, 7.7, 9.5]
rect(sl, 0.3, 1.6, 12.73, 0.4, fill=NAVY)
for txt, x in zip(["Provider", "Score", "Status", "Flags Triggered"], hxs):
    textbox(sl, txt, x + 0.08, 1.62, 1.8, 0.35,
            size=11, bold=True, color=WHITE)

row_y = 2.05
for i, (name, score, status, flags) in enumerate(providers):
    bg = LGRAY if i % 2 == 0 else WHITE
    row_colors = {
        "auto_held": RGBColor(0xFF, 0xEB, 0xEB),
        "auto_approved": RGBColor(0xEB, 0xFF, 0xEB),
    }
    bg = row_colors.get(status, bg)
    rect(sl, 0.3, row_y, 12.73, 0.38, fill=bg)

    score_c = RED if score >= 71 else (ORANGE if score >= 30 else GREEN)
    textbox(sl, name,        hxs[0]+0.08, row_y+0.04, 3.5, 0.3, size=11, color=DGRAY)
    textbox(sl, f"{score}",  hxs[1]+0.08, row_y+0.04, 1.5, 0.3, size=12, bold=True, color=score_c)
    status_labels = {"auto_held": "Auto-Held", "auto_approved": "Approved", "needs_review": "Review"}
    textbox(sl, status_labels.get(status, status), hxs[2]+0.08, row_y+0.04, 1.7, 0.3, size=10, color=score_c, bold=True)
    textbox(sl, flags,       hxs[3]+0.08, row_y+0.04, 5.5, 0.3, size=10, color=DGRAY)
    row_y += 0.38

textbox(sl, "5 providers auto-held (score > 70)  ·  2 need review (score 1–70)  ·  5 auto-approved (score = 0)",
        0.3, 7.0, 12.7, 0.35, size=11, bold=True, color=RED, align=PP_ALIGN.CENTER)


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE 4 — Detection Engine
# ─────────────────────────────────────────────────────────────────────────────
sl = prs.slides.add_slide(blank_layout)
header(sl, "Detection Engine — 3 Rules + Scoring Thresholds")
footer(sl)

# Rule cards
def rule_card(slide, num, title, desc, score_txt, x, y, color=NAVY):
    rect(slide, x, y, 3.8, 3.2, fill=color)
    rect(slide, x, y, 3.8, 0.55, fill=RED)
    textbox(slide, f"Rule {num}", x+0.15, y+0.05, 3.5, 0.45,
            size=18, bold=True, color=WHITE)
    textbox(slide, title, x+0.15, y+0.65, 3.5, 0.5,
            size=14, bold=True, color=GOLD)
    # description lines
    cur = y + 1.2
    for line in desc:
        textbox(slide, f"• {line}", x+0.15, cur, 3.5, 0.4, size=11, color=WHITE)
        cur += 0.4
    rect(slide, x, y+2.65, 3.8, 0.55, fill=GOLD)
    textbox(slide, score_txt, x+0.15, y+2.7, 3.5, 0.45,
            size=13, bold=True, color=NAVY, align=PP_ALIGN.CENTER)

rule_card(sl, 1, "Monthly Spike",
          ["6-month rolling median", "per (provider, category)", "Flag if current > 5× median"],
          "Score +40  (max once per (cat, month))",
          0.3, 1.5)

rule_card(sl, 2, "Dual Product",
          ["Both Lunettes + Lentilles", "billed same month", "Flag if ≥ 50% of active months"],
          "Score = min(80, ratio × 80)  — one flag per provider",
          4.5, 1.5)

rule_card(sl, 3, "Repeated Amount",
          ["Same € amount ≥ 3×", "in rolling 12-month window", "per (provider, category)"],
          "Score +30  (one flag per (cat, amount))",
          8.7, 1.5)

# Thresholds
rect(sl, 0.3, 4.9, 12.73, 0.5, fill=NAVY)
textbox(sl, "Routing Thresholds", 0.5, 4.93, 12.3, 0.42,
        size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

for label, rng, status, c, xi in [
    ("AUTO-APPROVED", "score = 0  (no flags)", "auto_approved", GREEN, 0.5),
    ("NEEDS REVIEW",  "1 ≤ score ≤ 70", "needs_review", ORANGE, 4.3),
    ("AUTO-HELD",     "score > 70", "auto_held", RED, 8.1),
]:
    rect(sl, xi, 5.5, 3.8, 0.85, fill=c)
    textbox(sl, label, xi+0.1, 5.53, 3.6, 0.4,
            size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    textbox(sl, rng, xi+0.1, 5.93, 3.6, 0.35,
            size=12, color=WHITE, align=PP_ALIGN.CENTER)

textbox(sl, "Final score = sum of all rule contributions, capped at 100",
        0.3, 6.55, 12.7, 0.35, size=12, color=DGRAY,
        align=PP_ALIGN.CENTER, italic=True)


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE 5 — Kylian's Frames
# ─────────────────────────────────────────────────────────────────────────────
sl = prs.slides.add_slide(blank_layout)
header(sl, "Provider Deep Dive: Kylian's Frames", "Score: 68/100 · Status: Needs Review")
footer(sl)

score_badge(sl, 68, 11.5, 1.65)
status_badge(sl, "needs_review", 11.5, 2.35)

textbox(sl, "Flags Detected", 0.4, 1.6, 5.0, 0.4, size=14, bold=True, color=NAVY)

flags_data = [
    ("dual_product",  "+38", "Systematic co-billing: 76% of active months had both Lunettes + Lentilles"),
    ("monthly_spike", "+30", "Monthly spike in Lunettes claims — ratio > 5× rolling median"),
]
fy = 2.05
for rule, score_c, desc in flags_data:
    rect(sl, 0.4, fy, 10.8, 0.7, fill=LGRAY)
    rect(sl, 0.4, fy, 0.08, 0.7, fill=ORANGE)
    textbox(sl, rule.replace("_", " ").title(), 0.6, fy+0.04, 2.0, 0.3, size=12, bold=True, color=NAVY)
    textbox(sl, score_c, 2.7, fy+0.04, 0.7, 0.3, size=12, bold=True, color=RED)
    textbox(sl, desc, 3.5, fy+0.04, 7.5, 0.55, size=11, color=DGRAY, wrap=True)
    fy += 0.78

textbox(sl, "Dual Product Evidence", 0.4, 3.75, 5.0, 0.4, size=13, bold=True, color=NAVY)
textbox(sl, "Co-billing months (Lunettes & Lentilles same month)", 0.4, 4.1, 9.0, 0.35,
        size=11, color=DGRAY, italic=True)

# mini table header
rect(sl, 0.4, 4.5, 10.5, 0.38, fill=NAVY)
for txt, xi in zip(["Month / Year", "Lunettes (€)", "Lentilles (€)", "Total (€)"],
                   [0.4, 3.3, 6.0, 8.8]):
    textbox(sl, txt, xi+0.08, 4.52, 2.7, 0.3, size=10, bold=True, color=WHITE)

dual_months = [
    ("Jan 2022", "850.00", "320.00", "1 170.00"),
    ("Mar 2022", "920.00", "280.00", "1 200.00"),
    ("Jun 2022", "1 100.00", "350.00", "1 450.00"),
    ("Sep 2022", "750.00", "290.00", "1 040.00"),
    ("Dec 2022", "880.00", "310.00", "1 190.00"),
]
ry = 4.9
for i, (m, lu, le, tot) in enumerate(dual_months):
    bg = LGRAY if i % 2 == 0 else WHITE
    rect(sl, 0.4, ry, 10.5, 0.35, fill=bg)
    for val, xi in zip([m, lu, le, tot], [0.4, 3.3, 6.0, 8.8]):
        textbox(sl, val, xi+0.08, ry+0.04, 2.7, 0.27, size=10, color=DGRAY)
    ry += 0.35


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE 6 — Roudoudou Lentilles
# ─────────────────────────────────────────────────────────────────────────────
sl = prs.slides.add_slide(blank_layout)
header(sl, "Provider Deep Dive: Roudoudou Lentilles", "Score: 50/100 · Status: Needs Review")
footer(sl)

score_badge(sl, 50, 11.5, 1.65)
status_badge(sl, "needs_review", 11.5, 2.35)

textbox(sl, "Flag Detected", 0.4, 1.6, 5.0, 0.4, size=14, bold=True, color=NAVY)

rect(sl, 0.4, 2.05, 10.8, 0.7, fill=LGRAY)
rect(sl, 0.4, 2.05, 0.08, 0.7, fill=ORANGE)
textbox(sl, "Dual Product", 0.6, 2.09, 2.0, 0.3, size=12, bold=True, color=NAVY)
textbox(sl, "+80", 2.7, 2.09, 0.7, 0.3, size=12, bold=True, color=RED)
textbox(sl, "Systematic co-billing: 100% of active months had both Lunettes + Lentilles (dual_ratio = 1.0)",
        3.5, 2.09, 7.5, 0.55, size=11, color=DGRAY, wrap=True)

textbox(sl, "Summary Statistics", 0.4, 3.0, 5.0, 0.4, size=13, bold=True, color=NAVY)

stats = [
    ("Co-billing ratio",  "100%",  "Every active month included both categories"),
    ("Dual months",       "12/12", "All 12 active months triggered the rule"),
    ("Score contribution","+50",   "min(50, 1.0 × 50) = 50  → needs review"),
    ("Only rule flagged", "Yes",   "No monthly spike or repeated amount detected"),
]
sy = 3.5
for label, val, desc in stats:
    idx = stats.index((label, val, desc))
    rect(sl, 0.4, sy, 10.8, 0.45, fill=LGRAY if idx % 2 == 0 else WHITE)
    textbox(sl, label, 0.6, sy+0.06, 2.5, 0.33, size=11, bold=True, color=NAVY)
    textbox(sl, val,   3.3, sy+0.06, 1.2, 0.33, size=12, bold=True, color=RED)
    textbox(sl, desc,  4.7, sy+0.06, 6.3, 0.33, size=11, color=DGRAY)
    sy += 0.46

textbox(sl,
        "Note: Score = 80 puts this provider just above the 70-point auto-held threshold. "
        "The systematic 100% co-billing rate is the only but definitive signal.",
        0.4, 5.6, 12.5, 0.6, size=11, color=DGRAY, italic=True, wrap=True)


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE 7 — Mike Lunettes & Penthievre Alambics & Queen Optics
# ─────────────────────────────────────────────────────────────────────────────
sl = prs.slides.add_slide(blank_layout)
header(sl, "Deep Dive: High-Scoring Providers — Multiple Rules", "Score: 100/100 · Status: Auto-Held")
footer(sl)

rows = [
    ("Mike Lunettes",         100, "dual_product (+43)", "monthly_spike (+90 = 3×30)",        ""),
    ("Penthievre Alambics",   100, "dual_product (+47)", "monthly_spike (+60 = 2×30)",        ""),
    ("Queen Optics",          100, "dual_product (+48)", "monthly_spike (+90 = 3×30)",        ""),
]

textbox(sl, "These providers triggered both Dual Product and Monthly Spike rules:",
        0.4, 1.6, 12.5, 0.4, size=13, color=DGRAY, italic=True)

col_xs = [0.4, 3.3, 5.5, 9.0]
rect(sl, 0.4, 2.1, 12.5, 0.42, fill=NAVY)
for txt, xi in zip(["Provider", "Score", "Flag 1", "Flag 2"], col_xs):
    textbox(sl, txt, xi+0.08, 2.13, 2.7, 0.32, size=11, bold=True, color=WHITE)

ry = 2.55
for i, (name, score, f1, f2, _) in enumerate(rows):
    bg = RGBColor(0xFF, 0xEB, 0xEB)
    rect(sl, 0.4, ry, 12.5, 0.48, fill=bg)
    textbox(sl, name,       col_xs[0]+0.08, ry+0.06, 2.8, 0.36, size=12, bold=True, color=NAVY)
    textbox(sl, str(score), col_xs[1]+0.08, ry+0.06, 1.8, 0.36, size=14, bold=True, color=RED)
    textbox(sl, f1,         col_xs[2]+0.08, ry+0.06, 3.4, 0.36, size=11, color=DGRAY)
    textbox(sl, f2,         col_xs[3]+0.08, ry+0.06, 3.8, 0.36, size=11, color=DGRAY)
    ry += 0.5

textbox(sl, "Monthly Spike Pattern", 0.4, 4.05, 5.0, 0.4, size=13, bold=True, color=NAVY)
bullet_list(sl, [
    "Spike occurs when a single month's total exceeds 5× the 6-month rolling median",
    "Often coincides with a dual-billing month — both rules fire simultaneously",
    "Score can exceed 100 before capping — signals very clear fraud pattern",
], 0.5, 4.5, 12.3, size=12)

textbox(sl, "Dual Product Pattern", 0.4, 5.55, 5.0, 0.4, size=13, bold=True, color=NAVY)
bullet_list(sl, [
    "Co-billing rate > 75% for all three providers → score contribution near 80",
    "Scheme: fictitious contact-lens charges added to glasses sales to lower reste à charge",
    "Flag triggers once per provider — one consolidated record with all affected months",
], 0.5, 5.95, 12.3, size=12)


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE 8 — Runner Glasses & Les Lunettes à Soso
# ─────────────────────────────────────────────────────────────────────────────
sl = prs.slides.add_slide(blank_layout)
header(sl, "Deep Dive: Runner Glasses & Les Lunettes à Soso", "Scores: 88/100 and 100/100 · Status: Auto-Held")
footer(sl)

# Left column: Runner Glasses
rect(sl, 0.3, 1.55, 6.2, 5.5, fill=LGRAY, line=MGRAY)
textbox(sl, "Runner Glasses", 0.5, 1.65, 5.8, 0.45, size=16, bold=True, color=NAVY)
score_badge(sl, 88, 5.3, 1.65)

bullet_list(sl, [
    "dual_product  +28  (55% dual-billing months)",
    "repeated_amount  +60  (3 flags of +20 each)",
], 0.5, 2.25, 5.8, size=12)

textbox(sl, "Repeated Amount Detail:", 0.5, 3.15, 5.8, 0.35, size=12, bold=True, color=NAVY)
bullet_list(sl, [
    "Same €850 (Lunettes) appeared 4× in 12 months  (+20)",
    "Same €320 (Lentilles) appeared 3× in 12 months  (+20)",
    "Same €650 (Lunettes) appeared 3× in 12 months  (+20)",
], 0.5, 3.5, 5.8, size=11)

textbox(sl, "Pattern suggests fixed-price fictitious claims recycled month after month.",
        0.5, 5.4, 5.8, 0.5, size=11, color=DGRAY, italic=True, wrap=True)

# Right column: Les Lunettes à Soso
rect(sl, 6.8, 1.55, 6.2, 5.5, fill=LGRAY, line=MGRAY)
textbox(sl, "Les Lunettes à Soso", 7.0, 1.65, 5.5, 0.45, size=14, bold=True, color=NAVY)
score_badge(sl, 100, 12.3, 1.65)

bullet_list(sl, [
    "dual_product  +39  (77% dual-billing months)",
    "monthly_spike  +30  (1 spike event)",
    "repeated_amount  +40  (2 flags of +20 each)",
], 7.0, 2.25, 5.8, size=12)

textbox(sl, "Only provider triggering all 3 rules.", 7.0, 3.5, 5.8, 0.35,
        size=12, bold=True, color=RED)

bullet_list(sl, [
    "Strong co-billing pattern (77% of months)",
    "Isolated spike on top of baseline fraud",
    "Two repeated-amount patterns in parallel",
    "Compound risk: multiple independent signals",
], 7.0, 3.9, 5.8, size=11)

textbox(sl, "Highest confidence fraud case in the dataset.",
        7.0, 5.7, 5.8, 0.4, size=11, color=DGRAY, italic=True)


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE 9 — Detection Logic Improvements
# ─────────────────────────────────────────────────────────────────────────────
sl = prs.slides.add_slide(blank_layout)
header(sl, "Detection Logic — Improvements Made", "Bugs fixed vs. original naive implementation")
footer(sl)

improvements = [
    (
        "Dual Product — False positives",
        "Original fired for any month with both categories, even occasional ones. "
        "Legitimate opticians naturally serve both glasses and contacts customers.",
        "Added ≥ 50% systematic threshold: only flag if co-billing occurs in the majority "
        "of active months. Below that, co-occurrence is likely coincidental.",
        ORANGE,
    ),
    (
        "Dual Product — €0 amounts",
        "Original included months where one category had €0 reimbursement (e.g. claim was "
        "processed but refunded €0). These are billing artifacts, not fraud signals.",
        "Added guard: require cats[\"Lunettes\"] > 0 AND cats[\"Lentilles\"] > 0 before "
        "counting a month as a dual-billing month.",
        ORANGE,
    ),
    (
        "Dual Product — One flag per provider (not per month)",
        "Original generated one FraudFlag per qualifying month, inflating flag counts "
        "(e.g. 17 flags for a single provider) and making scores incoherent.",
        "Changed to one consolidated summary flag per provider with all qualifying months "
        "stored in details.months[]. Score scales with dual_ratio (min(80, ratio × 80)).",
        RED,
    ),
    (
        "Repeated Amount — €0 false positives",
        "A provider with €0.00 amounts repeated ≥ 3× (refund artifacts) triggered the rule.",
        "Added: if amount == 0: continue — zero-amount claims are billing artifacts.",
        ORANGE,
    ),
    (
        "Routing — Any flagged provider now escalated (score > 0)",
        "Original: score < 30 → auto_approved. Providers with small scores (e.g. 10) slipped "
        "through as auto-approved despite having fraud flags.",
        "Changed threshold: score == 0 → auto_approved, any score > 0 → needs_review minimum. "
        "No flagged provider is silently approved.",
        RED,
    ),
]

iy = 1.65
for title, problem, fix, color in improvements:
    rect(sl, 0.3, iy, 12.7, 1.15, fill=LGRAY)
    rect(sl, 0.3, iy, 0.12, 1.15, fill=color)
    textbox(sl, title, 0.55, iy+0.05, 12.0, 0.32, size=12, bold=True, color=NAVY)
    textbox(sl, f"Before: {problem}", 0.55, iy+0.38, 12.0, 0.35, size=10, color=DGRAY, wrap=True)
    textbox(sl, f"After:  {fix}",    0.55, iy+0.73, 12.0, 0.35, size=10, color=GREEN, bold=True, wrap=True)
    iy += 1.22


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE 10 — Methodology & Data Limitations
# ─────────────────────────────────────────────────────────────────────────────
sl = prs.slides.add_slide(blank_layout)
header(sl, "Methodology & Data Limitations")
footer(sl)

textbox(sl, "Why provider-level co-billing detection?", 0.4, 1.6, 12.5, 0.4,
        size=14, bold=True, color=NAVY)
bullet_list(sl, [
    "Ideal check: same member billed for both Lunettes + Lentilles in same month",
    "Source data is monthly aggregates — no individual member IDs available",
    "Seed script generates one synthetic unique member_id per CSV row (not real identifiers)",
    "Provider-level systematic detection is the correct approach for aggregate data",
], 0.5, 2.05, 12.3, size=12)

textbox(sl, "Score Capping Logic", 0.4, 3.7, 12.5, 0.4, size=14, bold=True, color=NAVY)
bullet_list(sl, [
    "Individual rule scores can sum above 100 (e.g. Queen Optics: +76 + +120 = +196)",
    "Final score capped at 100 — scores above 70 all route to auto_held equally",
    "Cap prevents over-penalising individual rules while preserving routing accuracy",
], 0.5, 4.15, 12.3, size=12)

textbox(sl, "Possible Improvements", 0.4, 5.3, 12.5, 0.4, size=14, bold=True, color=NAVY)
bullet_list(sl, [
    "Ingest individual claim-level data to enable member-level dual-product detection",
    "Add geographic clustering: multiple providers in same address/postal code",
    "Seasonal adjustment in spike rule to avoid flagging legitimate holiday spikes",
    "ML model trained on confirmed fraud cases to weight features dynamically",
], 0.5, 5.75, 12.3, size=12)


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE 11 — Summary Table & Recommendations
# ─────────────────────────────────────────────────────────────────────────────
sl = prs.slides.add_slide(blank_layout)
header(sl, "Summary — Flagged Providers & Recommended Actions")
footer(sl)

cols   = ["Provider", "Score", "Status", "Rules Triggered", "Recommended Action"]
col_xs = [0.3, 3.5, 5.2, 7.0, 10.2]
col_ws = [3.1, 1.6, 1.7, 3.1, 3.0]

rect(sl, 0.3, 1.58, 12.7, 0.42, fill=NAVY)
for txt, xi in zip(cols, col_xs):
    textbox(sl, txt, xi+0.08, 1.6, 2.8, 0.36, size=11, bold=True, color=WHITE)

summary = [
    ("Les lunettes à Soso",   100, "AUTO-HELD",    "3 rules",            "Immediate audit + payment suspension"),
    ("Penthievre alambics",   100, "AUTO-HELD",    "dual + spike",       "Full audit + legal referral"),
    ("Queen optics",          100, "AUTO-HELD",    "dual + spike",       "Full audit + legal referral"),
    ("Runner glasses",         88, "AUTO-HELD",    "dual + repeated",    "Full audit — repeated billing pattern"),
    ("Mike lunettes",         100, "AUTO-HELD",    "dual + spike",       "Audit + payment suspension"),
    ("Kylian's frames",        68, "NEEDS REVIEW", "dual + spike",       "Review — borderline score, co-billing pattern"),
    ("Roudoudou lentilles",    50, "NEEDS REVIEW", "dual_product only",  "Review — systematic co-billing, monitor closely"),
]

ry = 2.05
for i, (name, score, status, rules, action) in enumerate(summary):
    bg = RGBColor(0xFF, 0xEB, 0xEB) if i % 2 == 0 else RGBColor(0xFF, 0xF0, 0xF0)
    rect(sl, 0.3, ry, 12.7, 0.42, fill=bg)
    score_c = RED if score >= 71 else ORANGE
    for val, xi in zip([name, str(score), status, rules, action], col_xs):
        bld = (val == str(score) or val == status)
        c   = score_c if (val == str(score) or val == status) else DGRAY
        textbox(sl, val, xi+0.08, ry+0.06, 2.9, 0.3, size=10, bold=bld, color=c)
    ry += 0.43

rect(sl, 0.3, ry+0.1, 12.7, 0.52, fill=NAVY)
textbox(sl,
        "5 providers auto-held  ·  2 need review  ·  "
        "5 auto-approved  ·  Any provider with score > 0 is flagged for review",
        0.5, ry+0.13, 12.3, 0.42,
        size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER)


# ─────────────────────────────────────────────────────────────────────────────
# Save
# ─────────────────────────────────────────────────────────────────────────────
out = "/home/max/workspace/alan/interview/fraud_ops_presentation_updated.pptx"
prs.save(out)
print(f"Saved → {out}")
