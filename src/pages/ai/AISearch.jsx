import { useState } from 'react'
import { Sparkles, Paperclip, Send } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'

const SUGGESTIONS = [
  'لخص مستند التوكيل الخاص بالوطنية',
  'ابحث عن سوابق قضائية في المنازعات التجارية',
  'ما هي الخطوات القادمة في قضية الزهراني؟',
]

export default function AISearch() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  function send(text) {
    const value = text ?? input
    if (!value.trim()) return
    setMessages((m) => [
      ...m,
      { role: 'user', text: value },
      { role: 'assistant', text: 'هذه نسخة تجريبية — لا يوجد اتصال فعلي بالمساعد الذكي بعد.' },
    ])
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="المساعد الذكي"
        breadcrumb={[{ label: 'يدعم بالذكاء الاصطناعي' }]}
        actions={<span className="text-sm text-ink-400">نسخة تجريبية</span>}
      />

      <div className="flex-1 bg-white rounded-xl border border-paper-line shadow-card flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Sparkles size={32} className="text-brass-500 mb-4" />
              <p className="text-ink-500 mb-6">محادثة فارغة — ابدأ بطرح سؤال</p>
              <div className="space-y-2 w-full max-w-md">
                <p className="text-xs text-ink-400 mb-2">أو جرّب:</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-right px-4 py-2.5 rounded-lg border border-paper-line text-sm text-ink-600 hover:bg-paper-soft transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-xl text-sm ${
                      m.role === 'user' ? 'bg-brass-500 text-white' : 'bg-paper-soft text-ink-700'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-paper-line">
          <button className="p-2 rounded-lg text-ink-500 hover:bg-paper-soft shrink-0">
            <Paperclip size={15} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="اكتب سؤالك هنا..."
            className="flex-1 rounded-lg border border-paper-line px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500"
          />
          <button
            onClick={() => send()}
            className="p-2.5 rounded-lg bg-brass-500 hover:bg-brass-600 text-white shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
