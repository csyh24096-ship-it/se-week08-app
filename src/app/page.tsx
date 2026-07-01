"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// 人物データの型定義
interface Person {
  id: string;
  name: string;
  relationship: string | null;
  created_at: string;
}

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. 人物一覧の取得
  const fetchPeople = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("データの取得に失敗しました: " + error.message);
    } else if (data) {
      setPeople(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  // 2. 人物の登録処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from("people")
      .insert([{ name, relationship: relationship || null }]);

    if (error) {
      alert("登録に失敗しました: " + error.message);
    } else {
      // フォームをクリアして一覧を再取得
      setName("");
      setRelationship("");
      await fetchPeople();
    }
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">身近な人 メモアプリ</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 左側：登録フォーム */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">新しい人物を登録</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例：山田 太郎"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  関係性（任意）
                </label>
                <input
                  type="text"
                  placeholder="例：家族、友人、同僚"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 transition"
              >
                {isSubmitting ? "登録中..." : "登録する"}
              </button>
            </form>
          </div>

          {/* 右側：一覧表示 */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">登録された人物一覧</h2>
            {isLoading ? (
              <p className="text-gray-500">読み込み中...</p>
            ) : people.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
                <p className="text-gray-500">まだ誰も登録されていません。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {people.map((person) => (
                  <div
                    key={person.id}
                    className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{person.name}</h3>
                      {person.relationship && (
                        <span className="inline-block mt-1 bg-gray-100 text-gray-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                          {person.relationship}
                        </span>
                      )}
                    </div>
                    <div className="text-right mt-4">
                      <span className="text-xs text-gray-400">
                        登録日: {new Date(person.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}