// Fictional data for the landing-page demo. Nothing here is real or sent anywhere.
const day = (offset, time = '10:00') => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return { date: d.toISOString().slice(0, 10), time }
}

export const FIRM = 'مكتب النخبة للمحاماة والاستشارات القانونية'
export const OWNER = 'أ. محمد عبد الرحمن'
export const LAWYERS = ['أ. سارة محمود', 'أ. أحمد فؤاد', 'أ. منى السيد']
export const CASE_TYPES = ['مدني', 'تجاري', 'عمالي', 'أسرة', 'جنائي', 'إداري']
export const COURTS = [
  'محكمة استئناف القاهرة',
  'محكمة القاهرة الاقتصادية',
  'محكمة حلوان الابتدائية',
  'محكمة القاهرة الجديدة الابتدائية',
  'محكمة شمال القاهرة الابتدائية',
  'محكمة جنوب القاهرة الابتدائية',
]

export function initialDemoState() {
  return {
    seq: 100,
    cases: [
      { id: 'c1', title: 'دعوى تعويض عن حادث سيارة', client: 'مصطفى كامل حسن', clientType: 'فرد', opponent: 'سامي رشاد', court: COURTS[0], number: '1200', year: 2026, type: 'مدني', status: 'ACTIVE', lawyer: LAWYERS[0], opened: day(-280).date, fee: 85000, payments: [{ id: 'p1', amount: 40000, method: 'نقدي', date: day(-20).date }] },
      { id: 'c2', title: 'نزاع تجاري حول عقد توريد', client: 'شركة الأفق للتجارة', clientType: 'شركة', opponent: 'شركة المستقبل', court: COURTS[1], number: '1237', year: 2026, type: 'تجاري', status: 'ACTIVE', lawyer: LAWYERS[1], opened: day(-250).date, fee: 150000, payments: [{ id: 'p2', amount: 90000, method: 'تحويل بنكي', date: day(-12).date }] },
      { id: 'c3', title: 'دعوى إخلاء عين مؤجرة', client: 'نادية إبراهيم علي', clientType: 'فرد', opponent: 'عماد حلمي', court: COURTS[2], number: '1274', year: 2026, type: 'مدني', status: 'ACTIVE', lawyer: LAWYERS[0], opened: day(-210).date, fee: 30000, payments: [{ id: 'p3', amount: 30000, method: 'شيك', date: day(-30).date }] },
      { id: 'c4', title: 'قضية عمالية — فصل تعسفي', client: 'خالد يوسف عبد الله', clientType: 'فرد', opponent: 'شركة الدلتا', court: COURTS[3], number: '1311', year: 2026, type: 'عمالي', status: 'ON_HOLD', lawyer: LAWYERS[2], opened: day(-180).date, fee: 25000, payments: [{ id: 'p4', amount: 10000, method: 'نقدي', date: day(-8).date }] },
      { id: 'c5', title: 'دعوى صحة توقيع', client: 'هشام عادل منصور', clientType: 'فرد', opponent: 'رامي فاروق', court: COURTS[4], number: '1348', year: 2026, type: 'مدني', status: 'DRAFT', lawyer: LAWYERS[1], opened: day(-40).date, fee: 12000, payments: [] },
      { id: 'c6', title: 'منازعة ضريبية', client: 'مؤسسة النيل للمقاولات', clientType: 'شركة', opponent: 'مصلحة الضرائب', court: COURTS[5], number: '1385', year: 2026, type: 'إداري', status: 'ACTIVE', lawyer: LAWYERS[2], opened: day(-120).date, fee: 200000, payments: [{ id: 'p6', amount: 120000, method: 'تحويل بنكي', date: day(-25).date }] },
    ],
    hearings: [
      { id: 'h1', caseId: 'c1', ...day(0, '10:00'), kind: 'نطق بالحكم', status: 'SCHEDULED' },
      { id: 'h2', caseId: 'c2', ...day(0, '11:30'), kind: 'جلسة أولى', status: 'SCHEDULED' },
      { id: 'h3', caseId: 'c3', ...day(2, '10:00'), kind: 'مرافعة', status: 'SCHEDULED' },
      { id: 'h4', caseId: 'c4', ...day(5, '12:00'), kind: 'استئناف', status: 'SCHEDULED' },
      { id: 'h5', caseId: 'c6', ...day(8, '11:00'), kind: 'جلسة أولى', status: 'SCHEDULED' },
      { id: 'h6', caseId: 'c1', ...day(-7, '10:00'), kind: 'جلسة أولى', status: 'COMPLETED' },
    ],
    tasks: [
      { id: 't1', caseId: 'c1', title: 'تجهيز مذكرة الدفاع', due: day(1).date, priority: 'HIGH', done: false, owner: LAWYERS[0] },
      { id: 't2', caseId: 'c2', title: 'مراجعة عقد التوريد', due: day(2).date, priority: 'MEDIUM', done: false, owner: LAWYERS[1] },
      { id: 't3', caseId: 'c3', title: 'إعداد حافظة المستندات', due: day(-1).date, priority: 'URGENT', done: false, owner: LAWYERS[0] },
      { id: 't4', caseId: 'c6', title: 'متابعة تقرير الخبير', due: day(4).date, priority: 'HIGH', done: false, owner: LAWYERS[2] },
      { id: 't5', caseId: 'c4', title: 'التواصل مع الموكل', due: day(3).date, priority: 'LOW', done: true, owner: LAWYERS[2] },
    ],
    notifications: [
      { id: 'n1', title: 'تذكير بجلسة', message: 'جلسة «دعوى تعويض عن حادث سيارة» اليوم 10:00 ص', read: false, at: 'منذ ساعة' },
      { id: 'n2', title: 'مهمة متأخرة', message: '«إعداد حافظة المستندات» تجاوزت موعدها', read: false, at: 'أمس' },
    ],
  }
}

// Allowed status changes — same rules as the real app.
export const TRANSITIONS = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['ON_HOLD', 'CLOSED'],
  ON_HOLD: ['ACTIVE', 'CLOSED'],
  CLOSED: ['ACTIVE'],
}

export const CASE_STATUS = {
  DRAFT: { label: 'مسودة', dot: 'bg-ink-300', cls: 'bg-ink-100 text-ink-600' },
  ACTIVE: { label: 'نشطة', dot: 'bg-emerald-600', cls: 'bg-emerald-100 text-emerald-700' },
  ON_HOLD: { label: 'معلّقة', dot: 'bg-brass-500', cls: 'bg-brass-100 text-brass-700' },
  CLOSED: { label: 'مغلقة', dot: 'bg-ink-400', cls: 'bg-ink-100 text-ink-500' },
}

export const HEARING_STATUS = {
  SCHEDULED: { label: 'مجدولة', cls: 'bg-emerald-100 text-emerald-700' },
  COMPLETED: { label: 'انعقدت', cls: 'bg-ink-100 text-ink-600' },
  POSTPONED: { label: 'مؤجلة', cls: 'bg-brass-100 text-brass-700' },
}

export const PRIORITY = {
  LOW: { label: 'منخفضة', cls: 'bg-ink-100 text-ink-500' },
  MEDIUM: { label: 'متوسطة', cls: 'bg-brass-100 text-brass-700' },
  HIGH: { label: 'عالية', cls: 'bg-[#f6e3d3] text-[#9a4b17]' },
  URGENT: { label: 'عاجلة', cls: 'bg-rust-100 text-rust-600' },
}

export const num = (n) => Number(n).toLocaleString('ar-EG')
export const money = (n) => `${num(n)} ج.م`
export const paidOf = (c) => c.payments.reduce((sum, p) => sum + p.amount, 0)
export const todayIso = () => new Date().toISOString().slice(0, 10)
export const longDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
export const shortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
export const initials = (name) => name.replace(/^أ\.\s*/, '').trim().slice(0, 1)
