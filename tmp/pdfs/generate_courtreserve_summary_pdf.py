from pathlib import Path
from datetime import date

PAGE_WIDTH = 612
PAGE_HEIGHT = 792
LEFT = 54
TOP = 752
BOTTOM = 54

lines = []


def add_line(text: str, y: float, font: str = "F1", size: int = 10):
    lines.append((font, size, LEFT, y, text))


def esc(text: str) -> str:
    return text.replace('\\', r'\\').replace('(', r'\(').replace(')', r'\)')


def wrap_text(text: str, max_chars: int):
    words = text.split()
    out = []
    cur = ""
    for w in words:
        nxt = w if not cur else f"{cur} {w}"
        if len(nxt) <= max_chars:
            cur = nxt
        else:
            if cur:
                out.append(cur)
            cur = w
    if cur:
        out.append(cur)
    return out


y = TOP

add_line("CourtReserve - One-Page App Summary", y, "F2", 18)
y -= 20
add_line(f"Generated: {date.today().isoformat()}", y, "F1", 9)
y -= 20

add_line("What it is", y, "F2", 12)
y -= 14
what_it_is = [
    "CourtReserve is a full-stack badminton group slot-booking app with calendar booking, activity tracking, comments, participation analytics, and an AI chat tab.",
    "It combines a React frontend with an Express API backed by PostgreSQL via Drizzle ORM.",
]
for sentence in what_it_is:
    for ln in wrap_text(sentence, 100):
        add_line(ln, y)
        y -= 12

y -= 4
add_line("Who it's for", y, "F2", 12)
y -= 14
who = "Primary users are badminton group members and a lightweight group organizer who coordinate daily weekday slot reservations."
for ln in wrap_text(who, 100):
    add_line(ln, y)
    y -= 12

y -= 4
add_line("What it does", y, "F2", 12)
y -= 14
features = [
    "Member picker for quick book/cancel actions; remembers the last selected member in a browser cookie.",
    "Weekday booking window in the UI (next 4 weeks) with slot-capacity limits and duplicate-booking prevention.",
    "Same-day change lock after 9:30 AM IST for booking and cancellation requests.",
    "Calendar day cards show booked members, slot usage counts, and booking state by date.",
    "Recent Activity feed shows latest bookings/cancellations with device and browser details.",
    "Monthly Participation table computes per-member bookings and participation rate, with sortable columns.",
    "AI Chat tab streams request-stage progress and can show decision summaries and SQL trace details.",
]
for bullet in features:
    wrapped = wrap_text(f"- {bullet}", 102)
    for i, ln in enumerate(wrapped):
        add_line(ln if i == 0 else f"  {ln}", y)
        y -= 11

y -= 2
add_line("How it works", y, "F2", 12)
y -= 14
arch = [
    "- Client: React 18 + Vite + Wouter + TanStack Query (`client/src`).",
    "- API: Express routes for members, bookings, activities, comments, and AI chat (`server/routes.ts`).",
    "- Shared contracts: schema and booking policies reused across runtimes (`shared/*.ts`).",
    "- Data layer: Drizzle + PostgreSQL with environment-based schema selection (`server/db.ts`).",
    "- AI pipeline: scope gate -> SQL generation -> SQL validation -> read-only execution -> answer synthesis (`server/ai/*`).",
    "- Data flow: UI actions -> API calls -> route handlers -> storage/DB -> JSON responses -> React Query cache refresh.",
]
for bullet in arch:
    for i, ln in enumerate(wrap_text(bullet, 102)):
        add_line(ln if i == 0 else f"  {ln}", y)
        y -= 11

y -= 2
add_line("How to run (minimal)", y, "F2", 12)
y -= 14
run_steps = [
    "1. Install dependencies: `npm install`.",
    "2. Create `.env.local` with `DATABASE_URL=...`; add `GEMINI_API_KEY=...` for AI Chat responses.",
    "3. Apply DB schema: `npm run db:push`.",
    "4. Start development server: `npm run dev` (serves on `http://localhost:5000`).",
    "5. Required Node.js version: Not found in repo.",
]
for step in run_steps:
    for ln in wrap_text(step, 102):
        add_line(ln, y)
        y -= 11

if y < BOTTOM:
    raise SystemExit(f"Layout overflow: final y={y}")

# Build content stream
content_parts = ["0 0 0 rg"]
for font, size, x, yy, text in lines:
    content_parts.append(f"BT /{font} {size} Tf {x} {yy:.2f} Td ({esc(text)}) Tj ET")
content_stream = "\n".join(content_parts).encode("latin-1", errors="replace")

objects = []
objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
objects.append(
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
    b"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> "
    b"/Contents 6 0 R >>"
)
objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
objects.append(f"<< /Length {len(content_stream)} >>\nstream\n".encode("latin-1") + content_stream + b"\nendstream")

pdf = bytearray()
pdf.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
offsets = [0]

for i, obj in enumerate(objects, start=1):
    offsets.append(len(pdf))
    pdf.extend(f"{i} 0 obj\n".encode("latin-1"))
    pdf.extend(obj)
    pdf.extend(b"\nendobj\n")

xref_pos = len(pdf)
pdf.extend(f"xref\n0 {len(objects)+1}\n".encode("latin-1"))
pdf.extend(b"0000000000 65535 f \n")
for off in offsets[1:]:
    pdf.extend(f"{off:010d} 00000 n \n".encode("latin-1"))

pdf.extend(
    (
        f"trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    ).encode("latin-1")
)

out = Path("output/pdf/courtreserve-app-summary.pdf")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(pdf)
print(out.resolve())
print(f"final_y={y:.2f}")
