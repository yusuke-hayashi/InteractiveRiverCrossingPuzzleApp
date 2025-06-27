# セッション管理機能実装タスク

## タスク詳細

### 1. Supabaseテーブルにセッション管理カラムを追加
- [x] game_logsテーブルにカラム追加のマイグレーション実行
  - `session_number` (integer): ユーザーの何回目のチャレンジか
  - `session_status` (text): セッション状態 ('active', 'completed', 'failed', 'abandoned')
  - `session_start_time` (timestamptz): セッション開始時刻
  - `session_end_time` (timestamptz): セッション終了時刻（NULL可）
- [x] インデックス追加（user_id + session_numberの複合インデックス）

### 2. セッション番号管理機能を実装
- [x] ユーザーの最新セッション番号を取得する関数 (getLatestSessionNumber)
- [x] 新しいセッション番号を発行する機能 (startNewSession)
- [x] セッション開始時の初期化処理 (initializeNewSession)

### 3. セッション開始・終了処理を追加
- [x] ユーザーID入力時のセッション開始処理
- [x] ゲームクリア時のセッション完了処理
- [x] 制約違反時のセッション失敗処理
- [x] リセット時のセッション中断処理

### 4. セッション状態更新機能を実装
- [x] セッション状態を更新するSupabase関数 (updateSessionStatus)
- [x] セッション終了時刻の記録

### 5. 分析用データ取得関数を作成
- [x] ユーザーのセッション一覧取得関数 (getUserSessions)
- [x] 成功セッションのみ取得する関数 (getSuccessfulSessions)
- [x] 失敗セッションのみ取得する関数 (getFailedSessions)
- [x] セッション統計情報取得関数 (getSessionStatistics)

## 実装順序
1. Supabaseテーブル拡張
2. React側のセッション管理ロジック実装
3. セッション開始・終了処理の統合
4. 分析用関数の実装とテスト