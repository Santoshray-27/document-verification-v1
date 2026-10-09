#!/usr/bin/env python3
"""Builds the 40-file evaluation set and writes eval/labels.csv (ground truth).

Class mix (from the plan):
  10 genuine · 5 copies · 12 altered · 6 forged · 3 unverifiable · 4 revoked

Every file is synthetic. Labels are written next to the files so run_eval.js can score
without any human in the loop.
"""
from __future__ import annotations

import csv
import json
import os
import sys
import urllib.request

import cv2
import fitz
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.environ.get("API", "http://localhost:4000")
WORKER = os.environ.get("WORKER", "http://127.0.0.1:8001")
OUT = os.path.join(ROOT, "eval", "dataset")
ISSUED = os.path.join(ROOT, "backend-node", "storage", "issued")

FIRST = ["Aarav Sharma", "Diya Patel", "Rohan Verma", "Isha Nair", "Kabir Singh",
         "Meera Iyer", "Arjun Rao", "Sara Khan", "Vivaan Joshi", "Ananya Das",
         "Neel Kapoor", "Ritu Aggarwal", "Farhan Ali", "Tara Bhatt"]
COURSES = ["B.Tech Computer Science", "B.Sc Physics", "MBA Finance", "M.Sc Chemistry",
           "B.A Economics", "B.Tech Mechanical", "MCA", "LLB", "B.Des Interaction", "M.Tech VLSI",
           "B.Com Honours", "M.Sc Mathematics", "B.Tech Electronics", "M.A English"]
GRADES = ["A+", "A", "A-", "B+", "O", "A+", "A", "B", "A+", "A-", "A", "A+", "B+", "A"]


def api_json(path: str, payload=None, token=None):
    req = urllib.request.Request(API + path, method="POST" if payload is not None else "GET")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(payload).encode() if payload is not None else None
    with urllib.request.urlopen(req, data) as r:
        return json.loads(r.read())


def worker_render(fields, doc_id, qr_text, issuer, issued_at="2026-02-14T10:00:00.000Z"):
    body = json.dumps({
        "fields": fields, "doc_id": doc_id, "qr_text": qr_text,
        "issuer_name": issuer, "issued_at": issued_at, "doc_type": "academic_certificate",
    }).encode()
    req = urllib.request.Request(WORKER + "/render-certificate", data=body,
                                headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        out = json.loads(r.read())
    if not out.get("ok"):
        raise RuntimeError(out.get("error"))
    return __import__("base64").b64decode(out["pdf_base64"])


def issue_one(token, name, cert_no, course, grade):
    j = api_json("/api/issue/start", {
        "doc_type": "academic_certificate",
        "fields": {"name": name, "certificate_number": cert_no, "course": course,
                   "grade": grade, "issue_date": "2026-02-14"},
    }, token)
    for _ in range(120):
        job = api_json(f"/api/issue/jobs/{j['job_id']}", token=token)
        if job["status"] != "running":
            break
        __import__("time").sleep(0.4)
    if job["status"] != "done":
        raise RuntimeError(f"issue failed: {job.get('error')}")
    return job["result"]


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))

    token = api_json("/api/auth/login", {"email": "issuer@agnitia.io", "password": os.environ.get("PW", "Agnitia@123")})["token"]
    rows = []

    docs = []
    print("issuing 14 genuine certificates…")
    for i in range(14):
        cert = f"EVAL-{i+1:03d}"
        res = issue_one(token, FIRST[i], cert, COURSES[i], GRADES[i])
        pdf = open(os.path.join(ISSUED, f"{res['doc_id']}.pdf"), "rb").read()
        docs.append({"doc_id": res["doc_id"], "pdf": pdf, "fields": res["fields"], "cert": cert})
        print(f"  {cert} -> {res['doc_id'][:8]}")

    def save(name, data, label, note=""):
        p = os.path.join(OUT, name)
        with open(p, "wb") as fh:
            fh.write(data)
        rows.append({"file": name, "expected": label, "note": note})

    # ---------- 1. genuine (10): the exact issued bytes ----------
    for d in docs[:10]:
        save(f"genuine_{d['cert']}.pdf", d["pdf"], "GENUINE", "exact issued file")

    # ---------- 2. copies (5): same content, different bytes ----------
    d = docs[0]
    src = fitz.open(stream=d["pdf"], filetype="pdf")
    out = fitz.open(); out.insert_pdf(src)
    buf = fitz.open(); buf.insert_pdf(out)
    save("copy_01_resave.pdf", buf.tobytes(garbage=3, deflate=True, clean=True), "GENUINE COPY", "writer round-trip")

    pix = src.load_page(0).get_pixmap(dpi=150, alpha=False)
    save("copy_02_screenshot.png", pix.tobytes("png"), "GENUINE COPY", "150 dpi raster")

    img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    ok, jpg = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 70])
    save("copy_03_jpeg70.jpg", jpg.tobytes(), "GENUINE COPY", "jpeg q70")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    ok, g = cv2.imencode(".png", gray)
    save("copy_04_grayscale.png", g.tobytes(), "GENUINE COPY", "greyscale")

    M = cv2.getRotationMatrix2D((img.shape[1] / 2, img.shape[0] / 2), 3, 1.0)
    rot = cv2.warpAffine(img, M, (img.shape[1], img.shape[0]), borderValue=(255, 255, 255))
    noise = np.random.normal(0, 4, rot.shape).astype(np.int16)
    rot = np.clip(rot.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    rot = cv2.resize(rot, None, fx=0.88, fy=0.88, interpolation=cv2.INTER_AREA)
    ok, sc = cv2.imencode(".jpg", rot, [cv2.IMWRITE_JPEG_QUALITY, 74])
    save("copy_05_scan.jpg", sc.tobytes(), "GENUINE COPY", "rotate 3deg + noise + downscale")

    # ---------- 3. altered (12) ----------
    def edit_pdf(pdf_bytes, old, new, out_name, label, note):
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc.load_page(0)
        hits = page.search_for(old)
        if not hits:
            print(f"  ! '{old}' not found for {out_name}")
            return
        for r in hits:
            page.add_redact_annot(r, fill=(1, 1, 1))
        page.apply_redactions()
        r = hits[0]
        page.insert_text((r.x0, r.y1 - r.height * 0.18), new,
                         fontsize=max(8.0, r.height * 0.86), fontname="hebo", color=(0.1, 0.14, 0.22))
        save(out_name, doc.tobytes(garbage=3, deflate=True), label, note)

    # 4 PDF text edits on critical fields
    edit_pdf(docs[1]["pdf"], docs[1]["fields"]["name"], "Rahul Mehra", "altered_01_name.pdf", "ALTERED", "name replaced (PDF text)")
    edit_pdf(docs[2]["pdf"], docs[2]["fields"]["grade"], "O+", "altered_02_grade.pdf", "ALTERED", "grade replaced")
    edit_pdf(docs[3]["pdf"], docs[3]["fields"]["certificate_number"], "EVAL-999", "altered_03_certno.pdf", "ALTERED", "certificate number replaced")
    edit_pdf(docs[4]["pdf"], "2026-02-14", "2020-01-01", "altered_04_date.pdf", "ALTERED", "issue date replaced")

    # 4 PDF text edits on secondary fields
    edit_pdf(docs[5]["pdf"], docs[5]["fields"]["course"], "B.Tech Civil", "altered_05_course.pdf", "ALTERED", "course replaced")
    edit_pdf(docs[1]["pdf"], docs[1]["fields"]["course"], "MBA Marketing", "altered_06_course2.pdf", "ALTERED", "course replaced #2")
    edit_pdf(docs[2]["pdf"], docs[2]["fields"]["name"], "Neha Gupta", "altered_07_name2.pdf", "ALTERED", "name replaced #2")
    edit_pdf(docs[3]["pdf"], docs[3]["fields"]["grade"], "C", "altered_08_grade2.pdf", "ALTERED", "grade replaced #2")

    # 4 image-space edits
    def edit_image(pdf_bytes, old, new, out_name, note):
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc.load_page(0)
        hits = page.search_for(old)
        pix = page.get_pixmap(dpi=150, alpha=False)
        img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        scale = pix.height / page.rect.height
        for r in hits:
            x0, y0 = int(r.x0 * scale) - 4, int(r.y0 * scale) - 4
            x1, y1 = int(r.x1 * scale) + 4, int(r.y1 * scale) + 4
            cv2.rectangle(img, (x0, y0), (x1, y1), (255, 255, 255), -1)
            cv2.putText(img, new, (x0, int(r.y1 * scale) - 4), cv2.FONT_HERSHEY_SIMPLEX,
                        1.05, (20, 25, 45), 2, cv2.LINE_AA)
        ok, enc = cv2.imencode(".png", img)
        save(out_name, enc.tobytes(), "ALTERED", note)

    edit_image(docs[6]["pdf"], docs[6]["fields"]["name"], "Simran Kaur", "altered_09_img_name.png", "name painted over (image)")
    edit_image(docs[7]["pdf"], docs[7]["fields"]["grade"], "O", "altered_10_img_grade.png", "grade painted over (image)")
    edit_image(docs[8]["pdf"], docs[8]["fields"]["name"], "Tanmay Bose", "altered_11_img_name2.png", "name painted over #2")
    edit_image(docs[9]["pdf"], docs[9]["fields"]["course"], "B.Tech Civil", "altered_12_img_course.png", "course painted over (image)")

    # ---------- 4. forged (6) ----------
    genuine_qr = f"{os.environ.get('PUBLIC_BASE_URL','http://localhost:5173')}/public/verify/{docs[0]['doc_id']}"
    for i, (nm, cn) in enumerate([("Fake One", "FORGE-001"), ("Fake Two", "FORGE-002")]):
        pdf = worker_render({"name": nm, "certificate_number": cn, "course": "PhD Forgery",
                            "grade": "A+", "issue_date": "2026-02-14"},
                           f"aaaaaaaa-000{i}-4000-8000-{i:012d}", genuine_qr, "Meridian Institute of Technology")
        save(f"forged_0{i+1}_copied_qr.pdf", pdf, "FORGED", "genuine QR on rebuilt content")

    for i, (nm, cn) in enumerate([("Nobody Here", "FAKE-100"), ("Ghost Person", "FAKE-101")]):
        pdf = worker_render({"name": nm, "certificate_number": cn, "course": "B.Tech",
                            "grade": "A", "issue_date": "2026-02-14"},
                           f"bbbbbbbb-000{i}-4000-8000-{i:012d}",
                           f"http://localhost:5173/public/verify/bbbbbbbb-000{i}-4000-8000-{i:012d}",
                           "Meridian Institute of Technology")
        save(f"forged_0{i+3}_never_registered.pdf", pdf, "NOT ISSUED", "claims our issuer, unknown doc_id")

    blank = np.full((1200, 900, 3), 255, np.uint8)
    cv2.rectangle(blank, (60, 60), (840, 1140), (10, 31, 68), 3)
    cv2.putText(blank, "SOME RANDOM DOCUMENT", (170, 400), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (10, 31, 68), 2, cv2.LINE_AA)
    ok, enc = cv2.imencode(".png", blank)
    save("forged_05_no_qr.png", enc.tobytes(), "UNABLE TO ASSESS", "no QR, no ID, no content match")

    pdf = worker_render({"name": "Unsigned Person", "certificate_number": "NOSIG-1", "course": "B.Tech",
                        "grade": "B", "issue_date": "2026-01-01"},
                       "cccccccc-0000-4000-8000-000000000000",
                       "http://localhost:5173/public/verify/cccccccc-0000-4000-8000-000000000000",
                       "Meridian Institute of Technology")
    save("forged_06_unsigned.pdf", pdf, "NOT ISSUED", "template copy, never registered")

    # ---------- 5. unverifiable (3): a different, unregistered issuer ----------
    for i, (nm, cn) in enumerate([("Priya Nair", "XYZ-001"), ("Om Prakash", "XYZ-002"), ("Lakshmi Menon", "XYZ-003")]):
        did = f"dddddddd-000{i}-4000-8000-{i:012d}"
        pdf = worker_render({"name": nm, "certificate_number": cn, "course": "M.Sc Physics",
                            "grade": "A", "issue_date": "2026-03-01"}, did,
                           f"http://localhost:5173/public/verify/{did}", "Unknown State University")
        # An unregistered issuer's ID is simply not in our registry -> NOT ISSUED.
        # UNVERIFIABLE is exercised separately by suspending a registered issuer.
        save(f"unverifiable_0{i+1}_other_issuer.pdf", pdf, "NOT ISSUED", "unregistered issuer, unknown doc_id")

    # ---------- 6. revoked (4) ----------
    for i, d in enumerate(docs[10:14]):
        api_json(f"/api/issuer/documents/{d['doc_id']}/revoke", {"reason": f"evaluation revoke #{i+1}"}, token)
        save(f"revoked_0{i+1}_{d['cert']}.pdf", d["pdf"], "REVOKED", "original bytes, record revoked")

    labels = os.path.join(ROOT, "eval", "labels.csv")
    with open(labels, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["file", "expected", "note"])
        w.writeheader()
        w.writerows(rows)

    print(f"\nwrote {len(rows)} files to {OUT}")
    print(f"labels -> {labels}")
    from collections import Counter
    for k, v in sorted(Counter(r["expected"] for r in rows).items()):
        print(f"  {k:20s} {v}")


if __name__ == "__main__":
    sys.exit(main())
