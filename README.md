# se-week08-app

人物メモアプリ
1. システム概要
本システムは、ユーザーが身近な人々（家族、友人、同僚など）に関する重要な情報や日々の気づきをテキストベースで記録・閲覧するための、個人向けフルスタックWebアプリケーションである。
Next.js（フロントエンド）とSupabase（バックエンド/DB）を利用する。

目的: 友達や家族など、身近な人の情報を記録する。

非目標（スコープ外）: 画像の追加、バックアップ/エクスポート機能。

2. システム構成・技術スタック
言語: TypeScript

フロントエンド: Next.js (App Router)

バックエンド / DB: Supabase (PostgreSQL), Supabase Auth

スタイリング: Tailwind CSS

3. 機能要求（Functional Requirements）
3.1. 共通・認証機能
ユーザー認証: Supabase Authを利用したサインアップ、ログイン、ログアウトができる。

データアクセス制御: ログイン中のユーザー自身が作成したデータのみが閲覧・操作可能（RLSによる保護）。

3.2. コア機能（優先度：高）
人物の登録: 名前（必須）を入力し、新しい人物のレコードを作成する。

人物一覧表示: 登録済みの人物をリスト形式で表示する。

人物詳細表示: 選択した人物の情報と、その人に紐づくメモ一覧を表示する。

メモの追加: 人物詳細画面から、テキストエリアを用いて新規メモを保存する。

メモ一覧表示: 人物詳細画面に、過去のメモを時系列（新しい順）で表示する。

3.3. サポート機能（優先度：中〜低）
人物・メモの編集と削除: 登録済みのデータ（人物名やメモ本文）の修正、および削除ができる。

タグ・関係性の設定: 人物に対して「家族」「友人」などの属性を持たせる。

キーワード検索: 検索窓から「人物名」や「メモの内容」を横断的に検索する。

絞り込み・並び替え: 属性でのフィルタリングや、名前・更新日順でのソート機能。

4. 非機能要求（Non-Functional Requirements）
性能 (Performance): Next.jsのSPAルーティングを活かし、ページ読み込みの待ち時間を感じさせない画面遷移を実現する。

セキュリティ (Security): SupabaseのRLS（Row Level Security）を必ず有効化し、「自身のデータしか読み書きできない」状態をDBレベルで強制する。

ユーザビリティ (Usability): Tailwind CSSを用い、スマートフォンとPCの両方で最適に表示されるレスポンシブデザインとする。また、保存中やエラー時のフィードバック（トースト通知など）を適切に行う。

保守性 (Maintainability): TypeScriptによる型安全な開発と、UIのコンポーネント分割を徹底する。

5. 画面・UI構成（案）
ログイン画面 (/login)

メールアドレスとパスワードの入力フォーム。

メインダッシュボード画面 (/)

左側サイドバー: 「人物一覧（＋新規人物追加ボタン）」を表示。

右側メインコンテンツ: 選択された人物の「基本情報」「メモ入力フォーム」「過去のメモ一覧（タイムライン）」を表示。未選択時はプレースホルダーを表示。

6. モデル図
6.1. クラス図
<img width="2156" height="4390" alt="User Management and Memo-2026-06-25-020157" src="https://github.com/user-attachments/assets/99da4271-1ec5-4fe7-9104-bd463e6a0655" />


6.2. ユースケース図
<img width="5087" height="2280" alt="User-Centric Person-2026-06-25-020139" src="https://github.com/user-attachments/assets/df72df8e-ca87-433c-b15e-fe3e12416df6" />


6.3. シーケンス図
<img width="5512" height="3425" alt="User Management and Memo-2026-06-25-020245" src="https://github.com/user-attachments/assets/799739ad-f0d0-47a5-b8c3-84ba7a3c32a1" />

6.4. 状態遷移図
<img width="2407" height="2105" alt="User Management and Memo-2026-06-25-020312" src="https://github.com/user-attachments/assets/2a07bfc0-b458-4c08-bdda-b16c0be04d1e" />



8. 受け入れ基準（Acceptance Criteria）
MVP（Minimum Viable Product）達成の条件とする。

[ ] テストユーザーでサインアップ・ログインができ、自分専用のダッシュボードが表示されること。

[ ] 新しい人物（例：「田中太郎」）を入力し、一覧に追加されること（他人からは見えないこと）。

[ ] 「田中太郎」を選択し、メモ（例：「コーヒーはブラック派」）を入力・送信できること。

[ ] 画面をリロードしても、「田中太郎」の詳細画面に先ほどのメモが正しい日時で表示されていること。

[ ] 人物を削除した際、その人物に紐づいていたメモデータもデータベース上から削除されること。

9.更新記録
「Supabase」SQLテーブルの追加
-- people テーブルの作成（今回は認証を作らないため、user_idは含めません）
create table people (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  relationship text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 認証なしでフロントエンドから直接読み書きできるよう、一時的にRLSを無効化します
alter table people disable row level security;

