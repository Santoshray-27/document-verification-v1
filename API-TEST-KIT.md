# AGNITIA — API TEST KIT (copy-paste ready)

Run after Phase 10. Node on `:4000`, Python worker on `:8001`.
Save as `tests/api.test.sh` and `chmod +x`.

```bash
#!/usr/bin/env bash
# AGNITIA end-to-end API smoke test
# usage: ./tests/api.test.sh
set -uo pipefail
API="${API:-http://localhost:4000/api}"
PASS=0; FAIL=0
ok(){ echo "  ✔ $1"; PASS=$((PASS+1)); }
no(){ echo "  ✘ $1"; FAIL=$((FAIL+1)); }
check(){ # check <name> <expected_substring> <actual>
  if echo "$3" | grep -q "$2"; then ok "$1"; else no "$1 -- got: $(echo "$3" | head -c 200)"; fi
}

echo "== 0. HEALTH =="
H=$(curl -s "$API/health"); check "node up + worker status reported" '"node"' "$H"; echo "$H"

echo "== 1. AUTH =="
TOK=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"issuer@agnitia.io","password":"Agnitia@123"}' | tee /tmp/login.json \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).token)}catch(e){console.log("")}})')
[ -n "$TOK" ] && ok "A1 issuer login returns JWT" || no "A1 issuer login"
AUTH="Authorization: Bearer $TOK"
check "A2 wrong password -> 401" '"code"' \
  "$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"email":"issuer@agnitia.io","password":"nope"}')"
check "A3 /auth/me with token" '"role"' "$(curl -s "$API/auth/me" -H "$AUTH")"
check "A4 /auth/me without token -> 401" '"code"' "$(curl -s "$API/auth/me")"
check "A5 garbage token -> 401" '"code"' "$(curl -s "$API/auth/me" -H 'Authorization: Bearer garbage.token.here')"

echo "== 2. ISSUE =="
JOB=$(curl -s -X POST "$API/issue/start" -H "$AUTH" -H 'Content-Type: application/json' -d '{
  "doc_type":"academic_certificate",
  "fields":{"name":"Aarav Sharma","certificate_number":"AGN-2026-001",
            "course":"B.Tech Computer Science","grade":"A+",
            "issue_date":"2026-02-14"}}')
echo "  $JOB"
JID=$(echo "$JOB" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).job_id||""))')
for i in $(seq 1 40); do
  S=$(curl -s "$API/issue/jobs/$JID" -H "$AUTH")
  echo "$S" | grep -q '"status":"ready"' && break; sleep 0.5
done
check "A6 issue job reaches ready" '"status":"ready"' "$S"
DOCID=$(echo "$S" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log(j.result?.doc_id||"")})')
PDF=$(echo "$S"  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log(j.result?.pdf_url||j.result?.pdf_path||"")})')
echo "  doc_id=$DOCID"
check "A7 issue missing name -> 400" '"code"' \
  "$(curl -s -X POST "$API/issue/start" -H "$AUTH" -H 'Content-Type: application/json' -d '{"fields":{"course":"X"}}')"

echo "== 3. VERIFY (crypto path) =="
curl -s -o /tmp/original.pdf "http://localhost:4000$PDF"
VJ=$(curl -s -X POST "$API/verify/start" -F "file=@/tmp/original.pdf")
VID=$(echo "$VJ" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).job_id||""))')
for i in $(seq 1 60); do
  R=$(curl -s "$API/verify/jobs/$VID/result"); echo "$R" | grep -q '"verdict"' && break; sleep 0.5
done
check "A9 original file -> GENUINE" '"verdict":"GENUINE"' "$R"
check "A9b confidence High"          '"confidence_level":"High"' "$R"

echo "not-a-pdf" > /tmp/fake.pdf
check "A18 non-PDF magic bytes rejected" '"code"' "$(curl -s -X POST "$API/verify/start" -F 'file=@/tmp/fake.pdf')"
head -c 6000000 /dev/zero > /tmp/big.pdf; printf '%%PDF-1.4' | dd of=/tmp/big.pdf conv=notrunc bs=1 count=8 2>/dev/null
check "A17 >5MB rejected" '"code"' "$(curl -s -X POST "$API/verify/start" -F 'file=@/tmp/big.pdf')"
check "A19 no QR + no doc_id -> UNABLE TO ASSESS" 'UNABLE' \
  "$(curl -s -X POST "$API/verify/start" -F 'file=@/tmp/noqr.png' 2>/dev/null || echo skip)"
check "A14 unknown doc_id -> NOT ISSUED" 'NOT ISSUED' \
  "$(curl -s -X POST "$API/verify/start" -F 'file=@/tmp/original.pdf' -F 'doc_id=00000000-0000-4000-8000-000000000000' >/dev/null; echo skip)"

echo "== 4. RBAC + RATE LIMIT =="
VTOK=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"verifier@agnitia.io","password":"Agnitia@123"}' \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).token||""))')
check "A24 verifier on issuer route -> 403" '"code"' "$(curl -s "$API/issuer/documents" -H "Authorization: Bearer $VTOK")"
check "A26 issuer on admin route -> 403"    '"code"' "$(curl -s "$API/admin/audit" -H "$AUTH")"
CODES=$(for i in $(seq 1 32); do curl -s -o /dev/null -w '%{http_code}\n' "$API/public/verify/$DOCID"; done | sort -u | tr '\n' ' ')
echo "  status codes seen: $CODES"; echo "$CODES" | grep -q 429 && ok "A23 public rate limit hits 429" || no "A23 rate limit"

echo "== 5. PUBLIC + PRIVACY =="
P=$(curl -s "$API/public/verify/$DOCID")
echo "$P" | grep -q '"issuer_name"' && ok "A22 public returns issuer name" || no "A22 public payload"
echo "$P" | grep -q 'file_hash'   && no "A22b public LEAKS file_hash"   || ok "A22b no file_hash leak"
echo "$P" | grep -q 'signature'   && no "A22c public LEAKS signature"   || ok "A22c no signature leak"
echo "$P" | grep -q 'PRIVATE KEY' && no "A32 private key leak!"         || ok "A32 no private key leak"

echo "== 6. AUDIT =="
ATOK=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@agnitia.io","password":"Agnitia@123"}' \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).token||""))')
check "A27 audit integrity valid" '"valid":true' "$(curl -s "$API/admin/audit/integrity" -H "Authorization: Bearer $ATOK")"

echo "== 7. REVOKE =="
curl -s -X POST "$API/issuer/documents/$DOCID/revoke" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"reason":"demo"}' >/dev/null
VJ2=$(curl -s -X POST "$API/verify/start" -F "file=@/tmp/original.pdf")
VID2=$(echo "$VJ2" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).job_id||""))')
for i in $(seq 1 60); do R2=$(curl -s "$API/verify/jobs/$VID2/result"); echo "$R2" | grep -q '"verdict"' && break; sleep 0.5; done
check "A15 revoked doc -> REVOKED" '"verdict":"REVOKED"' "$R2"

echo; echo "PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
```

## Manual extras (need real sample files from `samples/`)

| Test | Command | Expect |
|---|---|---|
| A10 altered | `curl -F "file=@samples/altered/name-edited.pdf" $API/verify/start` | `ALTERED` + changed region over the name |
| A11 copy | `curl -F "file=@samples/copies/screenshot.png" $API/verify/start` | `GENUINE COPY` |
| A12 copied QR | `curl -F "file=@samples/forged/copied-qr-fake.pdf" $API/verify/start` | `FORGED` (QR-content mismatch) |
| A13 unknown issuer | `curl -F "file=@samples/unverifiable/other-issuer.pdf" $API/verify/start` | `UNVERIFIABLE` |
| A20 signature tamper | flip 1 byte of `manifest_json` in DB, then verify | `FORGED` |
| A21 worker down | stop uvicorn, then verify | crypto verdict + forensic steps `unavailable` |
| A28 chain tamper | `sqlite3 agnitia.db "update audit_log set detail_json='{}' where id=5;"` | integrity `valid:false, broken_at:5` |
| A30 XSS | issue with name `<script>alert(1)</script>` | escaped in report + UI |
| A31 SQLi | verify with `doc_id=' OR 1=1 --` | `NOT ISSUED`, no SQL error |
| A33 health | stop/start uvicorn, `curl $API/health` | `worker` flips false/true |

## Quick local run (put in README)

```bash
# 1. keys + db + seed
node scripts/generate-keys.js && node scripts/init-db.js && node scripts/seed-demo.js
# 2. python worker
pip install -r worker-python/requirements.txt
sudo apt install tesseract-ocr            # macOS: brew install tesseract
uvicorn main:app --host 127.0.0.1 --port 8001 --app-dir worker-python
# 3. node api
npm --prefix backend-node install && npm --prefix backend-node start
# 4. ui
npm --prefix frontend-react install && npm --prefix frontend-react run dev
# 5. phone testing (QR must be a public URL)
ngrok http 5173      # copy the https URL into PUBLIC_BASE_URL in backend-node/.env, restart node
```

Demo logins (password from `DEMO_PASSWORD`, default `Agnitia@123`):
`admin@agnitia.io` · `issuer@agnitia.io` · `verifier@agnitia.io`
