"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface Memo {
  id: string;
  person_id: string;
  content: string;
  created_at: string;
}

interface Person {
  id: string;
  name: string;
  relationship: string | null;
  birthday: string | null;
  created_at: string;
  memos?: Memo[];
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [birthday, setBirthday] = useState("");
  
  const [memoInputs, setMemoInputs] = useState<{ [key: string]: string }>({});
  const [selectedTab, setSelectedTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  const [editBirthday, setEditBirthday] = useState("");

  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) fetchPeople();
      else setIsLoading(false);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchPeople();
      else {
        setPeople([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPeople = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    const { data, error } = await supabase
      .from("people")
      .select("*, memos(*)")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage("データの取得に失敗しました: " + error.message);
    } else if (data) {
      const formattedData = data.map(person => ({
        ...person,
        memos: person.memos?.sort((a: Memo, b: Memo) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }));
      setPeople(formattedData);
    }
    setIsLoading(false);
  };

  const handleAuth = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        setSuccessMessage("アカウントを作成しました！");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        setSuccessMessage("ログインしました！");
      }
    } catch (error: any) {
      setErrorMessage("認証エラー: " + (error.message || "予期せぬエラーが発生しました。"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMessage(null);
    await supabase.auth.signOut();
    setSuccessMessage("ログアウトしました。");
  };

  const handlePersonSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage("名前は必須項目です。");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { error } = await supabase
        .from("people")
        .insert([{ 
          name: name.trim(), 
          relationship: relationship.trim() || null, 
          birthday: birthday || null,
          user_id: currentUser.id 
        }]);

      if (error) {
        setErrorMessage("登録に失敗しました: " + error.message + " (詳細: " + (error.details || "なし") + ")");
      } else {
        setSuccessMessage(`${name} さんを新しく登録しました！`);
        setName("");
        setRelationship("");
        setBirthday("");
        await fetchPeople();
      }
    } catch (err: any) {
      setErrorMessage("予期せぬエラーが発生しました: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStart = (person: Person) => {
    setEditingPersonId(person.id);
    setEditName(person.name);
    setEditRelationship(person.relationship || "");
    setEditBirthday(person.birthday || "");
  };

  const handleEditCancel = () => {
    setEditingPersonId(null);
    setEditName("");
    setEditRelationship("");
    setEditBirthday("");
  };

  const handleEditSubmit = async (e: React.FormEvent, personId: string) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!editName.trim()) {
      setErrorMessage("名前は必須項目です。");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("people")
        .update({
          name: editName.trim(),
          relationship: editRelationship.trim() || null,
          birthday: editBirthday || null,
        })
        .eq("id", personId);

      if (error) {
        setErrorMessage("更新に失敗しました: " + error.message + " (詳細: " + (error.details || "なし") + ")");
      } else {
        setSuccessMessage("情報を更新しました！");
        setEditingPersonId(null);
        await fetchPeople();
      }
    } catch (err: any) {
      setErrorMessage("予期せぬエラーが発生しました: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMemo = async (personId: string) => {
    const content = memoInputs[personId];
    if (!content || !content.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { error } = await supabase
        .from("memos")
        .insert([{ 
          person_id: personId, 
          content: content.trim(), 
          user_id: currentUser.id 
        }]);

      if (error) {
        setErrorMessage("メモの追加に失敗しました: " + error.message);
      } else {
        setMemoInputs({ ...memoInputs, [personId]: "" });
        await fetchPeople();
      }
    } catch (err) {
      setErrorMessage("予期せぬエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePerson = async (personId: string, personName: string) => {
    if (!confirm(`${personName} さんを削除しますか？\n（登録されているメモもすべて削除されます）`)) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase
        .from("people")
        .delete()
        .eq("id", personId);

      if (error) {
        setErrorMessage("人物の削除に失敗しました: " + error.message);
      } else {
        setSuccessMessage(`${personName} さんのデータを削除しました。`);
        await fetchPeople();
      }
    } catch (err) {
      setErrorMessage("予期せぬエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMemo = async (memoId: string) => {
    if (!confirm("このメモを削除しますか？")) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from("memos")
        .delete()
        .eq("id", memoId);

      if (error) {
        setErrorMessage("メモの削除に失敗しました: " + error.message);
      } else {
        await fetchPeople();
      }
    } catch (err) {
      setErrorMessage("予期せぬエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const uniqueRelationships = Array.from(
    new Set(people.map((p) => p.relationship).filter(Boolean))
  ) as string[];

  const filteredPeople = people.filter((person) => {
    const matchesTab = selectedTab === "ALL" || person.relationship === selectedTab;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesTab;

    const matchesName = person.name.toLowerCase().includes(query);
    const matchesMemo = person.memos?.some((m) => m.content.toLowerCase().includes(query)) ?? false;

    return matchesTab && (matchesName || matchesMemo);
  });

  const formatBirthday = (dateStr: string | null) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${year}年${parseInt(month)}月${parseInt(day)}日`;
  };

  const getCalendarDays = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();
    
    const days: (number | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    
    return days;
  };

  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + offset, 1);
    setCurrentCalendarDate(nextDate);
  };

  useEffect(() => {
    if (selectedTab !== "ALL" && !uniqueRelationships.includes(selectedTab)) {
      setSelectedTab("ALL");
    }
  }, [people, selectedTab, uniqueRelationships]);

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
        <div className="flex justify-between items-center mb-8 border-b pb-4 border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">人物メモアプリ</h1>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded">👤 {user.email}</span>
              <button onClick={handleSignOut} className="text-sm bg-gray-600 hover:bg-gray-700 text-white py-1.5 px-3 rounded transition">
                ログアウト
              </button>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded shadow-sm">
            <p className="text-xs font-mono">{errorMessage}</p>
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded shadow-sm">
            <p className="text-xs font-medium">{successMessage}</p>
          </div>
        )}

        {!user ? (
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">{isSignUp ? "新規アカウント作成" : "ログイン"}</h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:bg-gray-400">
                {isSubmitting ? "処理中..." : isSignUp ? "登録する" : "ログインする"}
              </button>
            </form>
            <div className="mt-6 text-center text-sm">
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-600 hover:underline">
                {isSignUp ? "すでにアカウントをお持ちの方（ログイン）" : "初めてご利用の方（アカウント作成）"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">新しい人物を登録</h2>
                <form onSubmit={handlePersonSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名前 *</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">関係性（任意）</label>
                    <input type="text" placeholder="例：家族、友人、仕事" value={relationship} onChange={(e) => setRelationship(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">誕生日（任意）</label>
                    <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:border-blue-500" />
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:bg-gray-400">
                    {isSubmitting ? "登録中..." : "登録する"}
                  </button>
                </form>
              </div>

              <div className="md:col-span-2">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">あなたが登録した人物一覧</h2>
                
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="🔍 名前またはメモのキーワードで探す..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {people.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
                    <button
                      onClick={() => setSelectedTab("ALL")}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                        selectedTab === "ALL" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      すべて ({people.length})
                    </button>
                    {uniqueRelationships.map((rel) => {
                      const count = people.filter((p) => p.relationship === rel).length;
                      return (
                        <button
                          key={rel}
                          onClick={() => setSelectedTab(rel)}
                          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                            selectedTab === rel ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {rel} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {filteredPeople.length === 0 ? (
                  <div className="bg-white p-8 rounded-lg shadow-sm text-center border border-gray-200">
                    <p className="text-gray-500 text-sm">
                      {searchQuery.trim() 
                        ? "キーワードに一致するデータは見つかりませんでした。" 
                        : selectedTab === "ALL" ? "データはまだありません。" : "この関係性の人物は登録されていません。"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {filteredPeople.map((person) => {
                      const isEditing = person.id === editingPersonId;

                      return (
                        <div key={person.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                          {isEditing ? (
                            <form onSubmit={(e) => handleEditSubmit(e, person.id)} className="border-b border-gray-100 pb-4 mb-3 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">名前 *</label>
                                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">関係性</label>
                                  <input type="text" value={editRelationship} onChange={(e) => setEditRelationship(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">誕生日</label>
                                  <input type="date" value={editBirthday} onChange={(e) => setEditBirthday(e.target.value)} className="w-full px-2 py-1 text-sm border rounded text-gray-700" />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={handleEditCancel} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-1 px-3 rounded transition">キャンセル</button>
                                <button type="submit" disabled={isSubmitting} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded transition disabled:bg-gray-400">
                                  {isSubmitting ? "保存中..." : "保存する"}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-lg font-bold text-gray-900">{person.name}</h3>
                                  {person.relationship && (
                                    <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                                      {person.relationship}
                                    </span>
                                  )}
                                </div>
                                {person.birthday && (
                                  <p className="text-xs text-gray-600 mt-1 font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded w-fit">
                                    🎂 {formatBirthday(person.birthday)}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleEditStart(person)} className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium py-1 px-2.5 rounded transition">編集</button>
                                <button onClick={() => handleDeletePerson(person.id, person.name)} disabled={isSubmitting} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium py-1 px-2.5 rounded transition disabled:bg-gray-50 disabled:text-gray-400">人物を削除</button>
                              </div>
                            </div>
                          )}

                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-500 mb-2">📌 メモ</h4>
                            {person.memos && person.memos.length > 0 ? (
                              <ul className="space-y-2">
                                {person.memos.map((memo) => (
                                  <li key={memo.id} className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded border border-gray-100 whitespace-pre-wrap flex justify-between items-start gap-4">
                                    <span className="flex-grow">{memo.content}</span>
                                    <button onClick={() => handleDeleteMemo(memo.id)} disabled={isSubmitting} className="text-xs text-gray-400 hover:text-red-600 transition font-medium">削除</button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400">メモはまだ登録されていません。</p>
                            )}
                          </div>

                          <div className="mt-auto pt-3 flex gap-2">
                            <input
                              type="text"
                              placeholder="新しいメモを追加..."
                              value={memoInputs[person.id] || ""}
                              onChange={(e) => setMemoInputs({ ...memoInputs, [person.id]: e.target.value })}
                              className="flex-grow px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddMemo(person.id);
                                }
                              }}
                            />
                            <button onClick={() => handleAddMemo(person.id)} disabled={isSubmitting || !memoInputs[person.id]?.trim()} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-1.5 rounded text-sm font-medium transition disabled:bg-gray-50 disabled:text-gray-400">追加</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-5">
                {/* ★ 修正：タイトルを「📅 カレンダー」のみに変更 */}
                <h2 className="text-lg font-bold text-gray-800">📅 カレンダー</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => changeMonth(-1)} className="p-1.5 border rounded-md hover:bg-gray-50 text-sm font-bold">◀</button>
                  <span className="text-sm font-bold text-gray-700 min-w-[90px] text-center">
                    {currentCalendarDate.getFullYear()}年 {currentCalendarDate.getMonth() + 1}月
                  </span>
                  <button onClick={() => changeMonth(1)} className="p-1.5 border rounded-md hover:bg-gray-50 text-sm font-bold">▶</button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-1">
                <div className="text-red-500 py-1 bg-gray-50 rounded">日</div>
                <div className="py-1 bg-gray-50 rounded">月</div>
                <div className="py-1 bg-gray-50 rounded">火</div>
                <div className="py-1 bg-gray-50 rounded">水</div>
                <div className="py-1 bg-gray-50 rounded">木</div>
                <div className="py-1 bg-gray-50 rounded">金</div>
                <div className="text-blue-500 py-1 bg-gray-50 rounded">土</div>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {getCalendarDays().map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="bg-gray-50/50 min-h-[75px] rounded-md border border-gray-100"></div>;
                  }

                  const targetMonth = String(currentCalendarDate.getMonth() + 1).padStart(2, "0");
                  const targetDay = String(day).padStart(2, "0");
                  const matchingPeople = people.filter(p => {
                    if (!p.birthday) return false;
                    const [, m, d] = p.birthday.split("-");
                    return m === targetMonth && d === targetDay;
                  });

                  return (
                    <div key={`day-${day}`} className="bg-white min-h-[75px] p-1.5 rounded-md border border-gray-200 flex flex-col justify-between hover:border-blue-300 transition">
                      <span className="text-xs font-bold text-gray-600 block">{day}</span>
                      <div className="mt-1 space-y-0.5 flex-grow overflow-y-auto max-h-[50px] scrollbar-thin">
                        {matchingPeople.map(p => (
                          <div key={p.id} className="text-[10px] leading-tight bg-amber-100 border border-amber-200 text-amber-800 rounded px-1.5 py-0.5 font-medium truncate" title={`${p.name} (${formatBirthday(p.birthday)})`}>
                            🎂 {p.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}