"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPageBody() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-white border-b">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-6">
            製造プロセスを、<span className="text-primary">もっとスマートに。</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            SN-923 Systemは、最新のテクノロジーを活用した次世代の製造管理プラットフォームです。
            仮のランディングページとして構成されています。
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              プロジェクトを開始する <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="px-6 py-3 border rounded-lg font-medium hover:bg-slate-50 transition-colors">
              詳細を見る
            </button>
          </div>
        </div>
      </section>

      {/* Placeholder Features */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "効率的な進捗管理", desc: "リアルタイムで製造ラインの状況を把握し、ボトルネックを解消します。" },
            { title: "確実な品質管理", desc: "データの自動収集と分析により、高い品質を安定して維持できます。" },
            { title: "柔軟なカスタマイズ", desc: "現場のニーズに合わせて、最適なワークフローを構築可能です。" }
          ].map((feature, i) => (
            <div key={i} className="p-6 bg-white rounded-xl border hover:shadow-lg transition-shadow">
              <CheckCircle2 className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WIP Banner */}
      <div className="fixed bottom-4 right-4 bg-amber-100 border border-amber-200 text-amber-800 px-4 py-2 rounded-full text-sm font-medium animate-pulse shadow-sm">
        Construction in Progress: Converting from HTML...
      </div>
    </div>
  );
}
