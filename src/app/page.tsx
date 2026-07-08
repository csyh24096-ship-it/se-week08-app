"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

// 人物データの型定義
interface Person {
  id: string;
  name: string;
  relationship: string | null;
  created_at: string;
}

export default function Home() {
  // 認証関連の状態管理
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false); // ログインと新規登録の切り替え用

  // アプリのデータ関連の状態管理
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  
  // 共通の状態管理（ローディング・エラー表示・成功表示）
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. ログイン状態の監視
  useEffect(() => {
    // 現在ログインしているユーザーがいるか確認
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchPeople(); // ログインしていればデータ取得
      } else {
        setIsLoading(false);
      }
    };
    checkUser();

    // ログイン・ログアウトの変更をリアルタイムで監視するリスナー
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchPeople();
      } else {
        setPeople([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. ログイン中のユーザーの人物一覧を取得する関数
  const fetchPeople = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    // RLSポリシーが効いているため、自動的に「ログイン中ユーザーのデータ」だけが取得されます
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage("データの取得に失敗しました: " + error.message);
    } else if (data) {
      setPeople(data);
    }
    setIsLoading(false);
  };

  // 3. 認証処理（サインアップ・ログイン）
  const handleAuth = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 【方針4】認証時の簡易バリデーション
    if (!authEmail.trim() || !authPassword.trim()) {
      setErrorMessage("メールアドレスとパスワードを入力してください。");
      return;
    }
    if (authPassword.length < 6) {
      setErrorMessage("パスワードはセキュリティ上、6文字以上で入力してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        // ① 新規アカウント作成処理
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        setSuccessMessage("アカウントを作成しました！");
      } else {
        // ② ログイン処理
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        setSuccessMessage("ログインしました！");
      }
    } catch (error: any) {
      setErrorMessage("認証エラー: " + (error.message || "予期せぬエラーが発生しました。"));
    } finally {
      // ③ 成功しても失敗しても、必ず「処理中」を解除する
      setIsSubmitting(false);
    }
  };

  // 4. ログアウト処理
  const handleSignOut = async () => {
    setErrorMessage(null);
    await supabase.auth.signOut();
    setSuccessMessage("ログアウトしました。");
  };

  // 5. 人物の登録処理
  const handlePersonSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // ユーザー入力の検証
    if (!name.trim()) {
      setErrorMessage("名前は必須項目です。");
      return;
    }

    setIsSubmitting(true);

    try {
      // ★【修正ポイント】現在ログインしているユーザーの情報を確実に取得します
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setErrorMessage("ログインセッションが切れています。もう一度ログインし直してください。");
        setIsSubmitting(false);
        return;
      }

      // ★【修正ポイント】user_id を明示的に指定してインサートします
      const { error } = await supabase
        .from("people")
        .insert([
          { 
            name: name.trim(), 
            relationship: relationship.trim() || null,
            user_id: currentUser.id // 👈 ログイン中のユーザーIDをセットする
          }
        ]);

      if (error) {
        setErrorMessage("データベースへの登録に失敗しました: " + error.message);
      } else {
        setSuccessMessage(`${name} さんを新しく登録しました！`);
        setName("");
        setRelationship("");
        await fetchPeople(); // 一覧を更新
      }
    } catch (err) {
      setErrorMessage("予期せぬエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ローディング中の画面表示
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* ヘッダーエリア（ログイン時はユーザー情報とログアウトボタンを表示） */}
        <div className="flex justify-between items-center mb-8 border-b pb-4 border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">身近な人 メモアプリ (Auth版)</h1>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded">
                👤 {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm bg-gray-600 hover:bg-gray-700 text-white py-1.5 px-3 rounded transition"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>

        {/* 共通のメッセージ表示エリア */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded shadow-sm">
            <p className="font-medium text-sm">エラー</p>
            <p className="text-xs">{errorMessage}</p>
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded shadow-sm">
            <p className="text-xs font-medium">{successMessage}</p>
          </div>
        )}

        {/* ------------------ 【画面の切り替え】 ------------------ */}
        {!user ? (
          /* ① 未ログイン：認証フォームを表示 */
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
              {isSignUp ? "新規アカウント作成" : "ログイン"}
            </h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                <input
                  type="password"
                  placeholder="6文字以上"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium disabled:bg-gray-400 transition"
              >
                {isSubmitting ? "処理中..." : isSignUp ? "登録する" : "ログインする"}
              </button>
            </form>
            <div className="mt-6 text-center text-sm text-gray-600">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-blue-600 hover:underline"
              >
                {isSignUp ? "すでにアカウントをお持ちの方（ログイン）" : "初めてご利用の方（アカウント作成）"}
              </button>
            </div>
          </div>
        ) : (
          /* ② ログイン済：メインの登録・一覧画面を表示 */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 左側：登録フォーム */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">新しい人物を登録</h2>
              <form onSubmit={handlePersonSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名前 *</label>
                  <input
                    type="text"
                    placeholder="例：山田 太郎"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">関係性（任意）</label>
                  <input
                    type="text"
                    placeholder="例：家族、友人"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {isSubmitting ? "登録中..." : "登録する"}
                </button>
              </form>
            </div>

            {/* 右側：一覧表示（自分専用） */}
            <div className="md:col-span-2">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">あなたが登録した人物一覧</h2>
              {people.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
                  <p className="text-gray-500 text-sm">あなたが登録したデータはまだありません。</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{person.name}</h3>
                        {person.relationship && (
                          <span className="inline-block mt-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
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
        )}

      </div>
    </main>
  );
}