"use client";

import React from "react";
import Link from "next/link";

export default function LandingPageBody() {
  return (
    <div className="flex flex-col w-full bg-white font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="flex flex-col order-2 lg:order-1 gap-6">
              <div className="inline-flex self-start px-3 py-1 bg-[#D0E1FB] text-[#38485D] text-xs font-bold tracking-widest uppercase rounded">
                THE DIGITAL FOREMAN
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-black leading-tight lg:leading-[1.1]">
                工程管理に<br className="hidden lg:block" />革命を。
              </h1>
              <p className="text-xl lg:text-2xl text-[#45474C] font-medium leading-relaxed max-w-xl">
                設計データと実製作のギャップを埋める、BOM中心の工程管理システム。現代の工場のために設計された精密なプロセス管理を実現。
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/projects" className="px-8 py-4 bg-gradient-to-br from-black to-[#141B2C] text-white text-lg font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity">
                  今すぐ始める
                </Link>
                <button className="flex items-center gap-2 px-8 py-4 bg-[#E6E8EA] text-black text-lg font-bold rounded-lg hover:bg-gray-200 transition-colors">
                  <div className="w-5 h-5 bg-black rounded-sm" />
                  デモを見る
                </button>
              </div>
            </div>

            {/* Right: Visual Content */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[500px] h-[600px] rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 rotate-2">
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url(https://placehold.co/504x621)" }}
                />
                <img 
                  className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[85%] rounded-xl shadow-lg border border-white/20"
                  src="/lp/images/landing/hero-product.png" 
                  alt="Product Screenshot"
                />
                <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/70 backdrop-blur-xl rounded-xl border border-white/30 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex shrink-0 w-12 h-12 bg-[#FFDBCA] rounded-lg items-center justify-center">
                      <div className="w-5 h-5 bg-[#341100] rounded-sm" />
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-xs font-bold text-[#45474C] tracking-widest uppercase">
                        現在のステータス
                      </div>
                      <div className="text-lg font-black text-[#191C1E]">
                        加工中
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section className="bg-[#F2F4F6] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col gap-16">
            <div className="flex flex-col gap-4">
              <h2 className="text-4xl font-black text-black">
                現場の混乱を、終わらせる。
              </h2>
              <div className="w-20 h-1 bg-black" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col gap-4">
                <div className="w-8 h-[30px] bg-[#BA1A1A]" />
                <h3 className="text-xl font-bold text-[#191C1E]">
                  設計データの乖離
                </h3>
                <p className="text-[#45474C] leading-relaxed">
                  構造化されていないCADデータや古いバージョンの使用は、致命的な製造ミスや高価な資材の無駄を招きます。
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="w-7 h-[30px] bg-[#BA1A1A]" />
                <h3 className="text-xl font-bold text-[#191C1E]">
                  手動による進捗管理
                </h3>
                <p className="text-[#45474C] leading-relaxed">
                  紙のログや口頭での報告に頼ることで、製造工程全体で情報の不透明化が発生します。
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="w-7 h-[30px] bg-[#BA1A1A]" />
                <h3 className="text-xl font-bold text-[#191C1E]">
                  保管場所の断片化
                </h3>
                <p className="text-[#45474C] leading-relaxed">
                  不正確な保管箱マッピングは部品の紛失を招き、組み立て工程の致命的な遅延に繋がります。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="bg-white py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-black text-[#191C1E]">
              精密に構築されたモジュール。
            </h2>
            <p className="text-xl text-[#45474C]">
              製造現場の厳しい要求に応えるために構築された統合ツール群。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-8 pb-4">
                <div className="w-12 h-12 bg-[#D0E1FB] rounded-lg flex items-center justify-center mb-6">
                  <div className="w-5 h-5 bg-black" />
                </div>
                <h3 className="text-2xl font-black text-[#191C1E] mb-6">
                  設計データ管理
                </h3>
                <ul className="space-y-4 text-lg text-[#45474C]">
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-black shrink-0" />
                    STL/3Dデータのネイティブ統合
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-black shrink-0" />
                    階層型部品管理システム
                  </li>
                </ul>
              </div>
              <div className="mt-auto px-8 pb-8">
                <img 
                  className="w-full aspect-video object-cover rounded-xl shadow-sm"
                  src="/lp/images/landing/models-design.png" 
                  alt="Design data management" 
                />
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col h-full bg-[#141B2C] rounded-2xl shadow-sm p-8 text-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                <div className="w-4 h-4 bg-white" />
              </div>
              <h3 className="text-2xl font-black mb-4">
                製造・工程管理
              </h3>
              <p className="text-[#7C8498] text-lg leading-relaxed mb-8">
                製造指示から最終出荷までをカンバン方式で追跡。すべての部品に対して完全な監査ログを保持します。
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-[#505F76] text-xs font-bold rounded">加工準備完了</span>
                <span className="px-3 py-1 bg-[#FFDBCA] text-[#341100] text-xs font-bold rounded">品質検査中</span>
                <span className="px-3 py-1 bg-[#E6E8EA] text-black text-xs font-bold rounded">出荷済み</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col h-full bg-[#FFDBCA] rounded-2xl shadow-sm p-8 text-[#341100] hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-[#341100] rounded-lg flex items-center justify-center mb-6">
                <div className="w-5 h-4.5 bg-white" />
              </div>
              <h3 className="text-2xl font-black mb-4">
                物理・在庫管理
              </h3>
              <p className="text-[#783200] text-lg leading-relaxed">
                インポートされた３Dデータに基づき製造個体データを生成、物理的なトレーサビリティを提供します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="bg-[#F7F9FB] py-20 lg:py-32">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="mb-20 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-black text-[#191C1E]">
              直感的なワークフロー
            </h2>
            <p className="text-[#45474C] text-lg">
              信頼性のために自動化された、設計から出荷までのプロセス
            </p>
          </div>

          <div className="relative border-l-2 border-gray-200 ml-4 lg:ml-0 flex flex-col gap-16 lg:gap-24">
            {[
              { num: "01", title: "CADデータインポート", desc: "CADデータをアップロードします。システムが自動的にSTLファイルを解析し、マスターBOMを生成します。" },
              { num: "02", title: "製造指示", desc: "3Dデータに基づいて製造指示を生成します。使用する機械や材質を選択して個体データを生成し、物理管理を行います。" },
              { num: "03", title: "工程管理", desc: "デジタルカンバンボードでリアルタイムの進捗を監視。カスタムワークフローの各ステートへ、ユニットをドラッグ＆ドロップで移動させます。" }
            ].map((step, idx) => (
              <div key={idx} className="relative pl-12">
                <div className="absolute -left-[17px] top-0 w-8 h-8 bg-black text-white text-sm font-bold rounded-full flex items-center justify-center">
                  {step.num}
                </div>
                <h3 className="text-2xl font-bold text-[#191C1E] mb-2">{step.title}</h3>
                <p className="text-[#45474C] leading-relaxed text-lg max-w-xl">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Field Design Section */}
      <section className="bg-white py-20 lg:py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl lg:text-5xl font-black text-[#191C1E]">
                現場のための設計。
              </h2>
              <p className="text-xl text-[#45474C] leading-relaxed">
                管理部門から過酷な現場端末まで、本システムは多様なデバイスでシームレスかつ高性能なインターフェースを提供します。<br />
                タブレット、モバイル端末、デスクトップワークステーションがすべてリアルタイムで同期されます。
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-6 bg-[#F2F4F6] rounded-xl">
                  <div className="w-[18px] h-[22px] bg-black" />
                  <span className="font-bold text-[#191C1E]">高耐久タブレット</span>
                </div>
                <div className="flex items-center gap-4 p-6 bg-[#F2F4F6] rounded-xl">
                  <div className="w-[20px] h-[18px] bg-black" />
                  <span className="font-bold text-[#191C1E]">現場用端末</span>
                </div>
              </div>
            </div>
            <div className="relative p-4 bg-[#E0E3E5] rounded-[32px] overflow-hidden">
              <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-inner flex items-center justify-center p-4">
                <div 
                  className="w-full h-full bg-cover bg-center rounded-lg"
                  style={{ backgroundImage: "url(https://placehold.co/512x512)" }}
                >
                  <img 
                    className="w-[90%] mx-auto mt-20 rounded-xl shadow-2xl"
                    src="/lp/images/landing/field-device.png" 
                    alt="Device representation" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 px-6">
        <div className="mx-auto max-w-5xl bg-gradient-to-br from-black to-[#141B2C] rounded-[48px] p-12 lg:p-24 text-center space-y-10 overflow-hidden relative shadow-2xl">
          <h2 className="text-4xl lg:text-6xl font-black text-white leading-tight">
            生産体制を最適化しませんか？
          </h2>
          <p className="text-[#7C8498] text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed">
            ロジックのスピードで進化する次世代のメーカーに加わりましょう。今すぐ無料トライアルを開始してください。
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/projects" className="px-10 py-4 bg-white text-black text-xl font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-lg">
              今すぐ始める
            </Link>
            <button className="px-10 py-4 bg-transparent text-white text-xl font-bold rounded-xl border border-white/20 hover:bg-white/5 transition-colors">
              営業担当に相談する
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
