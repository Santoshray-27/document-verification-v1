// Semantic consistency checks
// These checks do not change the verdict, they just provide advisory findings.

function checkSemantics(registryFields, ocrFields) {
  const findings = [];
  
  if (!registryFields) return findings;
  
  const ocr = ocrFields || {};

  // Helper to add finding
  const add = (rule_id, field, status, severity, observed, expected, reason) => {
    findings.push({ rule_id, field, status, severity, observed_value: observed, expected_rule: expected, reason });
  };

  // 1. Missing required fields (from registered fields)
  // If a field exists in registry but is empty in OCR
  for (const [key, expectedValue] of Object.entries(registryFields)) {
    if (expectedValue && !ocr[key]) {
      add('SEM_MISSING_FIELD', key, 'FLAGGED', 'WARNING', null, 'Must be present', `Field "${key}" is missing from extracted text.`);
    }
  }

  // 2. Marks exceeding a known maximum
  // Let's assume if there's a field like "marks", "obtained_marks", "score", or "grade" 
  // We can't strictly enforce a max unless we know it. But if "grade" is a percentage (> 100).
  if (ocr.grade) {
    const gradeStr = String(ocr.grade).replace(/[^0-9.]/g, '');
    const gradeNum = parseFloat(gradeStr);
    if (!isNaN(gradeNum)) {
      // If it looks like a percentage or score out of 100
      if (gradeNum > 100) {
         // It might not be out of 100, but if it says % or we assume max is 100.
         // Let's just flag if > 100 for safety as a semantic check
         if (String(ocr.grade).includes('%') || gradeNum > 100) {
            add('SEM_EXCEEDS_MAX', 'grade', 'FLAGGED', 'WARNING', ocr.grade, '<= 100', 'Grade/Marks extracted appears to exceed 100.');
         }
      } else {
         add('SEM_EXCEEDS_MAX', 'grade', 'PASS', 'INFO', ocr.grade, '<= 100', 'Grade is within normal bounds.');
      }
    }
  }

  // 3. Invalid dates or impossible date ordering
  // Check if issue_date is in the future
  if (ocr.issue_date) {
    const parsedDate = new Date(ocr.issue_date);
    if (!isNaN(parsedDate.getTime())) {
      if (parsedDate > new Date()) {
        add('SEM_FUTURE_DATE', 'issue_date', 'FLAGGED', 'ERROR', ocr.issue_date, 'Past or present date', 'Issue date is in the future.');
      } else {
        add('SEM_FUTURE_DATE', 'issue_date', 'PASS', 'INFO', ocr.issue_date, 'Past or present date', 'Issue date is valid.');
      }
    }
  }

  // Check expires_at if available
  if (ocr.expires_at && ocr.issue_date) {
    const issueDate = new Date(ocr.issue_date);
    const expDate = new Date(ocr.expires_at);
    if (!isNaN(issueDate.getTime()) && !isNaN(expDate.getTime())) {
      if (expDate <= issueDate) {
        add('SEM_DATE_ORDER', 'expires_at', 'FLAGGED', 'ERROR', ocr.expires_at, 'After issue date', 'Expiration date is before or equal to issue date.');
      } else {
        add('SEM_DATE_ORDER', 'expires_at', 'PASS', 'INFO', ocr.expires_at, 'After issue date', 'Expiration date is after issue date.');
      }
    }
  }

  return findings;
}

module.exports = { checkSemantics };
