import Link from "next/link";
import { Button } from "@/components/ui";
import { Card, CardBody } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | applippliportal",
  description:
    "applippliportal についての紹介ページ。サービスの目的・特徴・チームをご紹介します。",
};

const features = [
  {
    title: "中立・公平な情報提供",
    description:
      "広告に左右されない中立的な視点で、アプリの情報を正直に掲載します。ユーザーファーストの情報収集を徹底しています。",
  },
  {
    title: "豊富なカテゴリ対応",
    description:
      "ビジネス・エンタメ・教育・健康など、幅広いカテゴリのアプリを網羅。目的から絞り込める検索機能を提供します。",
  },
  {
    title: "常に最新の情報",
    description:
      "アプリのアップデート情報や新着リリースを定期的に更新。常に最新の情報でアプリ選びをサポートします。",
  },
];

/**
 * About ページ
 * サービスの概要・特徴・ミッションを紹介する
 */
export default function AboutPage() {
  return (
    <>
      {/* ページヘッダー */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            About
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            applippliportal は、スマートフォンアプリを探すすべての人に向けた総合ポータルサイトです。
          </p>
        </div>
      </section>

      {/* ミッション */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              私たちのミッション
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              世界には無数のアプリが存在し、毎日新しいアプリがリリースされています。しかし、本当に自分に合ったアプリを見つけることは簡単ではありません。
            </p>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              applippliportal は、<strong className="text-gray-900">「アプリ選びの迷いをなくす」</strong>をミッションに掲げ、
              信頼できる情報とわかりやすいインターフェースでアプリ探しをサポートします。
            </p>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              applippliportal の特徴
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              ユーザーに寄り添ったサービス設計を心がけています。
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardBody className="flex flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <svg
                      className="h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-6 text-gray-600">
                    {feature.description}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            さっそくアプリを探してみましょう
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            登録不要・無料でご利用いただけます。
          </p>
          <div className="mt-8">
            <Link href="/">
              <Button size="lg" variant="primary">
                トップページへ戻る
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
