#!/usr/bin/env node
// Builds the demo/eval sample set from a genuine issued document:
//   copies/      re-save, screenshot, scan           -> should verify as GENUINE COPY
//   altered/     name/grade edits (PDF + image)      -> should verify as ALTERED
//   forged/      copied genuine QR on fake content,
//                unsigned fake, blank no-QR page     -> FORGED / UNABLE TO ASSESS
// Usage: node tests/make-samples.js <doc_id>
const fs = require('fs');
const path = require('path');
const http = require('http');

const WORKER = process.env.WORKER || 'http://127.0.0.1:8001';
const ROOT = path.join(__dirname, '..');
const SAMPLES = path.join(ROOT, 'samples');
const STORAGE = path.join(ROOT, 'backend-node', 'storage');

const docId = process.argv[2];
if (!docId) {
  console.error('usage: node tests/make-samples.js <doc_id>');
  process.exit(1);
}

function post(route, buffer, filename, extra = {}) {
  return new Promise((resolve, reject) => {
    const boundary = '----s' + Math.random().toString(16).slice(2);
    const parts = [];
    for (const [k, v] of Object.entries(extra)) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
    }
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
    parts.push(buffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);
    const u = new URL(WORKER + route);
    const r = http.request(
      { method: 'POST', hostname: u.hostname, port: u.port, path: u.pathname,
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length } },
      (res) => {
        const c = [];
        res.on('data', (x) => c.push(x));
        res.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(c).toString())); } catch (e) { reject(e); }
        });
      }
    );
    r.on('error', reject);
    r.write(body);
    r.end();
  });
}

function postJson(route, obj) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(obj));
    const u = new URL(WORKER + route);
    const r = http.request(
      { method: 'POST', hostname: u.hostname, port: u.port, path: u.pathname,
        headers: { 'Content-Type': 'application/json', 'Content-Length': body.length } },
      (res) => {
        const c = [];
        res.on('data', (x) => c.push(x));
        res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(c).toString())); } catch (e) { reject(e); } });
      }
    );
    r.on('error', reject);
    r.write(body);
    r.end();
  });
}

/** Runs python inline for the PDF/image surgery that needs PyMuPDF/OpenCV. */
function py(script) {
  const { execFileSync } = require('child_process');
  return execFileSync('python', ['-c', script], { encoding: 'utf8' });
}

function ensure(dir) { fs.mkdirSync(path.join(SAMPLES, dir), { recursive: true }); }

async function main() {
  ['copies', 'altered', 'forged', 'unverifiable', 'revoked'].forEach(ensure);
  const genuinePath = path.join(STORAGE, 'issued', `${docId}.pdf`).replace(/\\/g, '/');
  const samplesDir = SAMPLES.replace(/\\/g, '/');
  if (!fs.existsSync(genuinePath)) throw new Error('genuine pdf not found: ' + genuinePath);
  const genuine = fs.readFileSync(genuinePath);
  console.log(`genuine: ${docId}.pdf (${(genuine.length / 1024).toFixed(1)} KB)`);

  // ---------- copies: same content, different bytes ----------
  py(`
import fitz
src = fitz.open("${genuinePath}")
# 1. re-save (round-trips through a different writer -> different bytes, same layout)
out = fitz.open()
out.insert_pdf(src)
out.save("${samplesDir}/copies/resave.pdf", garbage=3, deflate=True, clean=True)
# 2. screenshot: rasterise the page
pix = src.load_page(0).get_pixmap(dpi=150, alpha=False)
pix.save("${samplesDir}/copies/screenshot.png")
# 3. scan: jpeg, greyscale-ish, slight noise + rotation
import numpy as np, cv2
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
M = cv2.getRotationMatrix2D((img.shape[1]/2, img.shape[0]/2), 1.2, 1.0)
img = cv2.warpAffine(img, M, (img.shape[1], img.shape[0]), borderValue=(255,255,255))
img = cv2.resize(img, None, fx=0.85, fy=0.85, interpolation=cv2.INTER_AREA)
noise = np.random.normal(0, 3, img.shape).astype(np.int16)
img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
cv2.imwrite("${samplesDir}/copies/scan.jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 72])
print("copies: resave.pdf, screenshot.png, scan.jpg")
`);

  // ---------- altered: content changed ----------
  py(`
import fitz
doc = fitz.open("${genuinePath}")
page = doc.load_page(0)

def replace(old, new, out):
    hits = page.search_for(old)
    if not hits:
        print("  ! text not found:", old); return
    for r in hits:
        page.add_redact_annot(r, fill=(1,1,1))
    page.apply_redactions()
    r = hits[0]
    fs = max(8.0, r.height * 0.86)
    page.insert_text((r.x0, r.y1 - r.height*0.18), new, fontsize=fs, fontname="hebo", color=(0.1,0.14,0.22))
    doc.save(out, garbage=3, deflate=True)
    print("  wrote", out.split("/")[-1], f"({len(hits)} hit)")

replace("Aarav Sharma", "Rohan Verma", "${samplesDir}/altered/name-edited.pdf")
doc2 = fitz.open("${genuinePath}"); page = doc2.load_page(0)
hits = page.search_for("A+")
for r in hits: page.add_redact_annot(r, fill=(1,1,1))
page.apply_redactions()
if hits:
    r = hits[0]
    page.insert_text((r.x0, r.y1 - r.height*0.18), "C", fontsize=max(8.0, r.height*0.86), fontname="hebo", color=(0.1,0.14,0.22))
doc2.save("${samplesDir}/altered/grade-edited.pdf", garbage=3, deflate=True)
print("  wrote grade-edited.pdf")
`);

  // image-space edit: white out the name and draw a different one
  py(`
import fitz, numpy as np, cv2
doc = fitz.open("${genuinePath}")
page = doc.load_page(0)
hits = page.search_for("Aarav Sharma")
pix = page.get_pixmap(dpi=150, alpha=False)
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
scale = pix.height / page.rect.height
for r in hits:
    x0,y0,x1,y1 = int(r.x0*scale)-4, int(r.y0*scale)-4, int(r.x1*scale)+4, int(r.y1*scale)+4
    cv2.rectangle(img, (x0,y0), (x1,y1), (255,255,255), -1)
    cv2.putText(img, "Rohan Verma", (x0, int(r.y1*scale)-4), cv2.FONT_HERSHEY_SIMPLEX, 1.15, (20,25,45), 2, cv2.LINE_AA)
cv2.imwrite("${samplesDir}/altered/image-name-edit.png", img)
print("  wrote image-name-edit.png")
`);

  // ---------- forged: genuine QR pasted onto different content ----------
  const qrText = `http://localhost:5173/public/verify/${docId}`; // the GENUINE document's QR
  const fake = await postJson('/render-certificate', {
    fields: { name: 'Fake Candidate', certificate_number: 'AGN-FAKE-999', course: 'PhD Quantum Forgery', grade: 'A+', issue_date: '2026-02-14' },
    doc_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', // a doc_id that is NOT in the registry
    qr_text: qrText, // ...but the QR points at the real record
    issuer_name: 'Meridian Institute of Technology',
    issued_at: '2026-02-14T10:00:00.000Z',
    doc_type: 'academic_certificate',
  });
  if (!fake.ok) throw new Error('forged render failed: ' + fake.error);
  fs.writeFileSync(path.join(SAMPLES, 'forged', 'copied-qr-fake.pdf'), Buffer.from(fake.pdf_base64, 'base64'));
  console.log('forged: copied-qr-fake.pdf (genuine QR + fake content)');

  // unsigned fake: no QR at all, claims the registered issuer
  const noQr = await postJson('/render-certificate', {
    fields: { name: 'Unsigned Person', certificate_number: 'AGN-NOQR-000', course: 'B.Tech', grade: 'B', issue_date: '2026-01-01' },
    doc_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    qr_text: 'http://localhost:5173/public/verify/ffffffff-ffff-4fff-8fff-ffffffffffff',
    issuer_name: 'Meridian Institute of Technology',
    issued_at: '2026-01-01T10:00:00.000Z',
  });
  fs.writeFileSync(path.join(SAMPLES, 'forged', 'unsigned-fake.pdf'), Buffer.from(noQr.pdf_base64, 'base64'));
  console.log('forged: unsigned-fake.pdf (never registered)');

  // blank page with no QR and no text -> UNABLE TO ASSESS
  py(`
import numpy as np, cv2
img = np.full((1200, 900, 3), 255, np.uint8)
cv2.rectangle(img, (60,60), (840,1140), (10,31,68), 3)
cv2.putText(img, "SOME RANDOM DOCUMENT", (180, 400), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (10,31,68), 2, cv2.LINE_AA)
cv2.imwrite("${samplesDir}/forged/no-qr-blank.png", img)
print("forged: no-qr-blank.png")
`);

  // ---------- unverifiable: an issuer that is not registered on this platform ----------
  const other = await postJson('/render-certificate', {
    fields: { name: 'Priya Nair', certificate_number: 'XYZ-2026-777', course: 'M.Sc Physics', grade: 'A', issue_date: '2026-03-01' },
    doc_id: 'cccccccc-dddd-4eee-8fff-cccccccccccc',
    qr_text: 'http://localhost:5173/public/verify/cccccccc-dddd-4eee-8fff-cccccccccccc',
    issuer_name: 'Unknown State University',
    issued_at: '2026-03-01T10:00:00.000Z',
  });
  fs.writeFileSync(path.join(SAMPLES, 'unverifiable', 'other-issuer.pdf'), Buffer.from(other.pdf_base64, 'base64'));
  console.log('unverifiable: other-issuer.pdf (unregistered issuer, unknown doc_id)');

  // ---------- sizes ----------
  for (const d of ['copies', 'altered', 'forged', 'unverifiable']) {
    for (const f of fs.readdirSync(path.join(SAMPLES, d))) {
      const s = fs.statSync(path.join(SAMPLES, d, f));
      console.log(`  ${d}/${f}  ${(s.size / 1024).toFixed(1)} KB`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
