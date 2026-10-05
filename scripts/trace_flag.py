"""Trace a flag image into an SVG path for assets/img/flags/.

Used to produce sa.svg, whose calligraphy cannot be drawn with system
fonts. Reads a reference image, crops the field, thresholds the white ink,
walks the contours with marching squares and simplifies them, then emits a
single even-odd path in a 30x20 viewBox.

    python3 scripts/trace_flag.py [trace_width] [simplify_tolerance]

Requires pillow and numpy, which are not needed for the normal data build.
"""
from PIL import Image
import numpy as np, sys

SRC = "/tmp/claude-0/-home-user-gulf-cdc-portal/69869b9c-c016-5ce6-9239-00eedb1c64a0/images/11.png"
W_TRACE = int(sys.argv[1]) if len(sys.argv) > 1 else 640
TOL     = float(sys.argv[2]) if len(sys.argv) > 2 else 0.9

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.int16)

# --- crop the dark frame: keep the green field -----------------------------
green = (np.abs(a[:,:,0]-42) < 55) & (np.abs(a[:,:,1]-107) < 60) & (np.abs(a[:,:,2]-58) < 55)
rows = np.where(green.sum(1) > green.shape[1]*0.5)[0]
cols = np.where(green.sum(0) > green.shape[0]*0.5)[0]
y0,y1,x0,x1 = rows[0], rows[-1]+1, cols[0], cols[-1]+1
im = im.crop((x0,y0,x1,y1))
print(f"cropped to {im.size} (from {a.shape[1]}x{a.shape[0]})")

# --- resample and threshold the white ink ----------------------------------
h = max(1, round(W_TRACE * im.size[1] / im.size[0]))
im = im.resize((W_TRACE, h), Image.LANCZOS)
b = np.asarray(im).astype(np.float32)
lum = b.mean(2)
mask = lum > 150                      # white ink vs green field
print("ink pixels:", int(mask.sum()), f"({mask.mean()*100:.1f}%)")

# pad so contours of ink touching the edge still close
M = np.zeros((mask.shape[0]+2, mask.shape[1]+2), bool)
M[1:-1,1:-1] = mask

# --- marching squares: emit segments, then join into closed loops ----------
H, Wd = M.shape
segs = {}
def add(p, q):
    segs.setdefault(p, []).append(q)

for i in range(H-1):
    for j in range(Wd-1):
        tl, tr, br, bl = M[i,j], M[i,j+1], M[i+1,j+1], M[i+1,j]
        c = (tl<<3) | (tr<<2) | (br<<1) | bl
        if c in (0, 15): continue
        T = (j+0.5, i);   R = (j+1, i+0.5);  B = (j+0.5, i+1);  L = (j, i+0.5)
        # segments oriented so the ink stays on the left
        if   c == 1:  add(L,B)
        elif c == 2:  add(B,R)
        elif c == 3:  add(L,R)
        elif c == 4:  add(R,T)
        elif c == 5:  add(L,T); add(R,B)
        elif c == 6:  add(B,T)
        elif c == 7:  add(L,T)
        elif c == 8:  add(T,L)
        elif c == 9:  add(T,B)
        elif c == 10: add(T,R); add(B,L)
        elif c == 11: add(T,R)
        elif c == 12: add(R,L)
        elif c == 13: add(R,B)
        elif c == 14: add(B,L)

loops = []
while segs:
    start = next(iter(segs))
    loop = [start]
    cur = start
    while True:
        nxt = segs.get(cur)
        if not nxt:
            break
        n = nxt.pop()
        if not nxt: del segs[cur]
        loop.append(n)
        cur = n
        if cur == start:
            break
    if len(loop) > 3:
        loops.append(loop)
print("loops:", len(loops), "| points:", sum(len(l) for l in loops))

# --- Douglas-Peucker -------------------------------------------------------
def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False]*len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts)-1)]
    while stack:
        s,e = stack.pop()
        if e <= s+1: continue
        x1,y1 = pts[s]; x2,y2 = pts[e]
        dx,dy = x2-x1, y2-y1
        nrm = (dx*dx+dy*dy) ** .5 or 1e-9
        best, bi = -1, -1
        for k in range(s+1, e):
            x,y = pts[k]
            d = abs(dy*x - dx*y + x2*y1 - y2*x1) / nrm
            if d > best: best, bi = d, k
        if best > tol:
            keep[bi] = True
            stack += [(s,bi),(bi,e)]
    return [p for p,k in zip(pts,keep) if k]

def dp_closed(loop, tol):
    """Douglas-Peucker on a closed ring.

    DP anchors on the first and last point; on a ring those coincide, so the
    chord is degenerate and every distance collapses to zero. Split the ring at
    the vertex farthest from its start, simplify the two open chains, rejoin.
    """
    pts = loop[:-1] if loop[0] == loop[-1] else loop[:]
    if len(pts) < 4: return []
    x0, y0 = pts[0]
    far = max(range(len(pts)), key=lambda k: (pts[k][0]-x0)**2 + (pts[k][1]-y0)**2)
    a = dp(pts[:far+1], tol)
    b = dp(pts[far:] + [pts[0]], tol)
    ring = a[:-1] + b[:-1]
    return ring

simple = []
for l in loops:
    s = dp_closed(l, TOL)
    if len(s) > 3:
        simple.append(s + [s[0]])
pts_after = sum(len(l) for l in simple)
print(f"after simplify (tol={TOL}): loops {len(simple)} | points {pts_after}")

# --- emit SVG in a 30x20 viewBox ------------------------------------------
VW, VH = 30.0, 20.0
sx, sy = VW/(Wd-2), VH/(H-2)
def fmt(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")
d = []
for l in simple:
    pp = [(fmt((x-1)*sx), fmt((y-1)*sy)) for x,y in l]
    d.append("M" + " L".join(f"{x},{y}" for x,y in pp) + "Z")
path = "".join(d)

svg = (
 '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" role="img" aria-label="Saudi Arabia">'
 '<title>Saudi Arabia</title>'
 '<rect width="30" height="20" fill="#2A6B3A"/>'
 f'<path fill="#FFFFFF" fill-rule="evenodd" d="{path}"/>'
 '</svg>')
open("sa_traced.svg","w").write(svg)
print("svg bytes:", len(svg))
