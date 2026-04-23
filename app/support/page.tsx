import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "サポート | ZUMEN",
  robots: { index: true, follow: false },
};

const FAQS = [
  {
    q: "対応しているホームセンターはどこですか？",
    a: "現在はカインズ・コメリに対応しています。順次拡大予定です。",
  },
  {
    q: "材料リストの価格はリアルタイムですか？",
    a: "価格は定期的に更新していますが、実際の店頭価格と異なる場合があります。購入前に店頭またはECサイトでご確認ください。",
  },
  {
    q: "作例を削除したい",
    a: "現在アプリ内からの削除機能は準備中です。削除をご希望の場合は下記のお問い合わせフォームよりご連絡ください。",
  },
  {
    q: "アカウントデータを削除したい",
    a: "下記のお問い合わせフォームに「アカウント削除希望」とご記入のうえご連絡ください。",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function SupportPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">サポート</h1>
      <p className="text-sm text-gray-500 mb-10">お困りのことがあればお気軽にご連絡ください。</p>

      <div className="space-y-8">

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">よくある質問</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <p className="font-medium text-gray-800 mb-1">{q}</p>
                <p className="text-sm text-gray-600">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">お問い合わせ</h2>
          <p className="text-sm text-gray-600 mb-4">
            バグ報告・ご要望・アカウント削除のご依頼は以下のメールアドレスまでご連絡ください。
          </p>
          <a
            href="mailto:scoooop.team@gmail.com"
            className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            メールで問い合わせる
          </a>
          <p className="text-xs text-gray-400 mt-3">
            通常 2〜3 営業日以内にご返信します。
          </p>
        </section>

        <div className="text-center">
          <a href="https://www.scoooop.com/privacy-policy/" className="text-sm text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
            プライバシーポリシー
          </a>
        </div>

      </div>
    </div>
  );
}
