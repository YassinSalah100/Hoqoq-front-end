// How a case is named in the UI. The internal HQ-… number is a backend key and
// is deliberately not shown to users; the official court case number and the
// title are. Accepts a case from any endpoint (title may come as caseTitle).
export function caseReference(caseItem) {
  if (!caseItem?.courtCaseNumber) return ''
  return caseItem.courtCaseYear ? `${caseItem.courtCaseNumber} / ${caseItem.courtCaseYear}` : caseItem.courtCaseNumber
}

export function caseLabel(caseItem) {
  if (!caseItem) return ''
  return caseReference(caseItem) || caseItem.title || caseItem.caseTitle || ''
}
