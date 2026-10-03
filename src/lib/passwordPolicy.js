// PRD §15.1 password policy — same pattern the backend validates new
// passwords against (ActivateAccountDto, ResetPasswordDto,
// ChangePasswordDto, OnboardEmployeeDto).
export const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,255}$/

export const PASSWORD_RULE_HINT = '8 أحرف على الأقل، تشمل حرفاً كبيراً وصغيراً (إنجليزي) ورقماً ورمزاً'

export const WEAK_PASSWORD_MESSAGE = `كلمة المرور ضعيفة — يجب أن تكون ${PASSWORD_RULE_HINT}`

export function isStrongPassword(password) {
  return STRONG_PASSWORD.test(password ?? '')
}
