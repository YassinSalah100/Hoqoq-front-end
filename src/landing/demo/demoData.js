// Fictional data for the landing-page demo. Nothing here is real or sent anywhere.
const day = (offset, time = '10:00') => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return { date: d.toISOString().slice(0, 10), time }
}

export const LAWYERS = ['أ. سارة محمود', 'أ. أحمد فؤاد', 'أ. منى السيد']

export function initialDemoState() {
  return {
    cases: [
      { id: 'c1', title: 'دعوى تعويض عن حادث سيارة', client: 'مصطفى كامل حسن', court: 'محكمة استئناف القاهرة', number: '1200 / 2026', type: 'مدني', status: 'ACTIVE', lawyer: LAWYERS[0], fee: 85000, payments: [{ id: 'p1', amount: 40000, method: 'نقدي', date: day(-20).date }] },
      { id: 'c2', title: 'نزاع تجاري حول عقد توريد', client: 'شركة الأفق للتجارة', court: 'محكمة القاهرة الاقتصادية', number: '1237 / 2026', type: 'تجاري', status: 'ACTIVE', lawyer: LAWYERS[1], fee: 150000, payments: [{ id: 'p2', amount: 90000, method: 'تحويل بنكي', date: day(-12).date }] },
      { id: 'c3', title: 'دعوى إخلاء عين مؤجرة', client: 'نادية إبراهيم علي', court: 'محكمة حلوان الابتدائية', number: '1274 / 2026', type: 'مدني', status: 'ACTIVE', lawyer: LAWYERS[0], fee: 30000, payments: [{ id: 'p3', amount: 30000, method: 'شيك', date: day(-30).date }] },
      { id: 'c4', title: 'قضية عمالية — فصل تعسفي', client: 'خالد يوسف عبد الله', court: 'محكمة القاهرة الجديدة الابتدائية', number: '1311 / 2026', type: 'عمالي', status: 'ON_HOLD', lawyer: LAWYERS[2], fee: 25000, payments: [{ id: 'p4', amount: 10000, method: 'نقدي', date: day(-8).date }] },
      { id: 'c5', title: 'دعوى صحة توقيع', client: 'هشام عادل منصور', court: 'محكمة شمال القاهرة الابتدائية', number: '1348 / 2026', type: 'مدني', status: 'DRAFT', lawyer: LAWYERS[1], fee: 12000, payments: [] },
    ],
    hearings: [
      { id: 'h1', caseId: 'c1', ...day(0, '10:00'), kind: 'نطق بالحكم', status: 'SCHEDULED' },
      { id: 'h2', caseId: 'c2', ...day(0, '11:30'), kind: 'جلسة أولى', status: 'SCHEDULED' },
      { id: 'h3', caseId: 'c3', ...day(2, '10:00'), kind: 'مرافعة', status: 'SCHEDULED' },
      { id: 'h4', caseId: 'c4', ...day(5, '12:00'), kind: 'استئناف', status: 'SCHEDULED' },
      { id: 'h5', caseId: 'c1', ...day(-7, '10:00'), kind: 'جلسة أولى', status: 'COMPLETED' },
    ],
    tasks: [
      { id: 't1', caseId: 'c1', title: 'تجهيز مذكرة الدفاع', due: day(1).date, priority: 'HIGH', done: false, owner: LAWYERS[0] },
      { id: 't2', caseId: 'c2', title: 'مراجعة عقد التوريد', due: day(2).date, priority: 'MEDIUM', done: false, owner: LAWYERS[1] },
      { id: 't3', caseId: 'c3', title: 'إعداد حافظة المستندات', due: day(-1).date, priority: 'URGENT', done: false, owner: LAWYERS[0] },
      { id: 't4', caseId: 'c4', title: 'التواصل مع الموكل', due: day(3).date, priority: 'LOW', done: true, owner: LAWYERS[2] },
    ],
  }
}

export const CASE_STATUS = {
  DRAFT: { label: 'مسودة', cls: 'bg-[#efe8d8] text-brand-brown/70' },
  ACTIVE: { label: 'نشطة', cls: 'bg-emerald-100 text-emerald-700' },
  ON_HOLD: { label: 'معلّقة', cls: 'bg-brand-gold/15 text-brand-tagline' },
  CLOSED: { label: 'مغلقة', cls: 'bg-[#e9e4dc] text-brand-brown/60' },
}

export const HEARING_STATUS = {
  SCHEDULED: { label: 'مجدولة', cls: 'bg-brand-gold/15 text-brand-tagline' },
  COMPLETED: { label: 'انعقدت', cls: 'bg-emerald-100 text-emerald-700' },
  POSTPONED: { label: 'مؤجلة', cls: 'bg-[#efe8d8] text-brand-brown/70' },
}

export const PRIORITY = {
  LOW: { label: 'منخفضة', cls: 'text-brand-brown/50' },
  MEDIUM: { label: 'متوسطة', cls: 'text-brand-tagline' },
  HIGH: { label: 'عالية', cls: 'text-[#a3551f]' },
  URGENT: { label: 'عاجلة', cls: 'text-rust-500' },
}

export const money = (n) => `${Number(n).toLocaleString('ar-EG')} ج.م`
export const paidOf = (c) => c.payments.reduce((sum, p) => sum + p.amount, 0)
export const todayIso = () => new Date().toISOString().slice(0, 10)
export const prettyDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })
