import React, { useState, useRef } from 'react';
import { 
  saveGameLog, 
  getLatestSessionNumber, 
  startNewSession, 
  updateSessionStatus 
} from './supabaseClient';

function App() {
  // ユーザーID管理
  const [userId, setUserId] = useState('');
  const [showUserIdModal, setShowUserIdModal] = useState(true);
  const [tempUserId, setTempUserId] = useState('');
  
  // ゲームセッションID（ゲーム開始時に生成）
  const gameSessionId = useRef(null);
  
  // セッション管理
  const currentSessionNumber = useRef(null);
  const sessionStartTime = useRef(null);

  // 初期状態：すべて左岸にいる（船頭は船と一緒）
  const [gameState, setGameState] = useState({
    leftSide: ['cat', 'rabbit', 'vegetable'],
    rightSide: [],
    boat: [],
    boatSide: 'left', // 船がどちら側にあるか
    moves: 0,
    gameWon: false,
    error: '',
    warning: '', // 新しく追加：制約違反ではない警告メッセージ
    operationLog: [], // 操作ログを記録
    showCSV: false // CSV表示モーダルの状態
  });

  const items = {
    farmer: { emoji: '👨‍🌾', name: '船頭' },
    cat: { emoji: '🐱', name: 'ネコ' },
    rabbit: { emoji: '🐰', name: 'ウサギ' },
    vegetable: { emoji: '🥬', name: '野菜' }
  };

  // ユーザーID入力処理
  const handleUserIdSubmit = async () => {
    const trimmedId = tempUserId.trim();
    if (trimmedId) {
      setUserId(trimmedId);
      setShowUserIdModal(false);
      
      // 新しいセッションを開始
      await initializeNewSession(trimmedId);
    } else {
      alert('ユーザーIDを入力してください。');
    }
  };

  // 新しいセッションを初期化
  const initializeNewSession = async (userId) => {
    try {
      // 最新のセッション番号を取得
      const result = await getLatestSessionNumber(userId);
      if (!result.success) {
        console.error('セッション番号取得失敗:', result.error);
        return;
      }

      const newSessionNumber = result.data + 1;
      currentSessionNumber.current = newSessionNumber;

      // 新しいセッションを開始
      const sessionResult = await startNewSession(userId, newSessionNumber);
      if (sessionResult.success) {
        sessionStartTime.current = sessionResult.sessionStartTime;
        gameSessionId.current = crypto.randomUUID();
        console.log(`セッション ${newSessionNumber} を開始しました`);
      } else {
        console.error('セッション開始失敗:', sessionResult.error);
      }
    } catch (error) {
      console.error('セッション初期化エラー:', error);
    }
  };

  // ログエントリを作成し、Supabaseに保存するヘルパー関数
  const createLogEntry = async (operationNum, operation, target, leftSide, rightSide, boat, moves = 0, gameCompleted = false) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      ユーザーID: userId,
      タイムスタンプ: timestamp,
      操作番号: operationNum,
      操作: operation,
      対象: target,
      左岸_ネコ: leftSide.includes('cat') ? 1 : 0,
      左岸_ウサギ: leftSide.includes('rabbit') ? 1 : 0,
      左岸_野菜: leftSide.includes('vegetable') ? 1 : 0,
      右岸_ネコ: rightSide.includes('cat') ? 1 : 0,
      右岸_ウサギ: rightSide.includes('rabbit') ? 1 : 0,
      右岸_野菜: rightSide.includes('vegetable') ? 1 : 0,
      船の積み荷: boat.filter(item => item !== 'farmer').map(item => items[item]?.name).join('、') || 'なし',
      ゲームセッションID: gameSessionId.current,
      手数: moves,
      ゲーム完了: gameCompleted,
      セッション番号: currentSessionNumber.current,
      セッション開始時刻: sessionStartTime.current
    };

    // Supabaseにログを保存
    try {
      const result = await saveGameLog(logEntry);
      if (!result.success) {
        console.error('Supabaseログ保存失敗:', result.error);
      }
    } catch (error) {
      console.error('ログ保存中にエラー:', error);
    }

    return logEntry;
  };

  // CSV表示機能
  const showCSV = () => setGameState(prev => ({ ...prev, showCSV: true }));
  const closeCSV = () => setGameState(prev => ({ ...prev, showCSV: false }));
  
  // CSVをクリップボードにコピー（フォールバック機能）
  const copyCSVToClipboard = async () => {
    try {
      const csvContent = generateCSV();
      await navigator.clipboard.writeText(csvContent);
      alert('CSVデータをクリップボードにコピーしました！テキストエディタに貼り付けてファイルとして保存してください。');
    } catch (error) {
      alert('クリップボードへのコピーに失敗しました。');
    }
  };

  const generateCSV = () => {
    const headers = [
      'user_id', 'timestamp', 'operation_number', 'operation', 'target', 
      'left_cat', 'left_rabbit', 'left_vegetable', 
      'right_cat', 'right_rabbit', 'right_vegetable', 
      'boat_cargo', 'game_session_id', 'moves_count', 'game_completed',
      'session_number', 'session_status', 'session_start_time', 'session_end_time'
    ];
    
    // 現在のセッションのログのみをフィルタリング
    const currentSessionLogs = gameState.operationLog.filter(entry => 
      entry.セッション番号 === currentSessionNumber.current
    );
    
    // ログが空の場合はヘッダーのみ
    if (currentSessionLogs.length === 0) {
      return headers.join(',');
    }
    
    const csvContent = [
      headers.join(','),
      ...currentSessionLogs.map(entry => {
        // データベースのカラム名に対応するマッピング
        const row = [
          entry.ユーザーID || '',
          entry.タイムスタンプ || '',
          entry.操作番号 || '',
          entry.操作 || '',
          entry.対象 || '',
          entry.左岸_ネコ || 0,
          entry.左岸_ウサギ || 0,
          entry.左岸_野菜 || 0,
          entry.右岸_ネコ || 0,
          entry.右岸_ウサギ || 0,
          entry.右岸_野菜 || 0,
          entry.船の積み荷 || '',
          entry.ゲームセッションID || '',
          entry.手数 || 0,
          entry.ゲーム完了 ? 'true' : 'false',
          entry.セッション番号 || '',
          'active', // デフォルト値（実際の状態はデータベースで管理）
          entry.セッション開始時刻 || '',
          '' // セッション終了時刻は進行中の場合は空
        ];
        return row.map(value => `"${value}"`).join(',');
      })
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = () => {
    try {
      // 基本的な状態チェック
      if (!userId) {
        alert('ユーザーIDが設定されていません。');
        return;
      }
      
      if (!currentSessionNumber.current) {
        alert('セッションが開始されていません。');
        return;
      }
      
      // 現在のセッションのログをチェック
      const currentSessionLogs = gameState.operationLog.filter(entry => 
        entry.セッション番号 === currentSessionNumber.current
      );
      
      if (currentSessionLogs.length === 0) {
        alert('このセッションには操作ログがありません。何か操作を行ってから再度お試しください。');
        return;
      }
      
      // CSV内容を生成
      const csvContent = generateCSV();
      
      if (!csvContent) {
        alert('CSVデータの生成に失敗しました。');
        return;
      }
      
      // ファイル名を生成
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const fileName = `river-crossing-puzzle_${userId}_session${currentSessionNumber.current}_${timestamp}.csv`;
      
      // シンプルなダウンロード方法を使用
      const element = document.createElement('a');
      const file = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = fileName;
      
      // 一時的にページに追加してクリック
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      // メモリクリーンアップ
      URL.revokeObjectURL(element.href);
      
      alert(`CSVファイル「${fileName}」をダウンロードしました！`);
      
    } catch (error) {
      alert('CSVダウンロード中にエラーが発生しました: ' + error.message);
    }
  };

  // 制約条件をチェック
  const checkConstraints = (side, boatSide, currentBoatSide) => {
    // 船頭は常に船と一緒にいる
    const hasFarmer = boatSide === currentBoatSide;
    const hasCat = side.includes('cat');
    const hasRabbit = side.includes('rabbit');
    const hasVegetable = side.includes('vegetable');

    if (!hasFarmer) {
      // 船頭がいない場合の禁止組み合わせ
      if (hasCat && hasRabbit) {
        return 'ネコとウサギを一緒に置き去りにできません！';
      }
      if (hasRabbit && hasVegetable) {
        return 'ウサギと野菜を一緒に置き去りにできません！';
      }
    }
    return null;
  };

  // アイテムを船に乗せる/降ろす
  const toggleItem = async (item) => {
    if (gameState.gameWon || gameState.error) return;
    if (item === 'farmer') return; // 船頭は手動選択不可

    const newState = { ...gameState, error: '', warning: '' };
    
    let operation = '';
    let operationTarget = items[item]?.name;

    if (newState.boat.includes(item)) {
      // 船から降ろす
      operation = '降ろす';
      newState.boat = newState.boat.filter(i => i !== item);
      
      // 船がいる側に戻す
      if (newState.boatSide === 'left') {
        if (!newState.leftSide.includes(item)) {
          newState.leftSide.push(item);
        }
      } else {
        if (!newState.rightSide.includes(item)) {
          newState.rightSide.push(item);
        }
      }
      
      // アイテムを降ろす時、船頭以外に誰もいなければ船頭も降ろす
      if (newState.boat.filter(i => i !== 'farmer').length === 0) {
        newState.boat = newState.boat.filter(i => i !== 'farmer');
      }
    } else {
      // 船がいる側からのみ乗船可能チェック
      const currentSide = newState.boatSide === 'left' ? newState.leftSide : newState.rightSide;
      if (!currentSide.includes(item)) {
        newState.warning = '船がいる側からしか乗船できません！';
        setGameState(newState);
        // 2秒後に警告を消す
        setTimeout(() => {
          setGameState(prev => ({ ...prev, warning: '' }));
        }, 2000);
        return;
      }
      
      // 船に乗せる
      const nonFarmerItems = newState.boat.filter(i => i !== 'farmer');
      if (nonFarmerItems.length >= 1) {
        newState.warning = '船には1個までしか乗せられません！';
        setGameState(newState);
        // 2秒後に警告を消す
        setTimeout(() => {
          setGameState(prev => ({ ...prev, warning: '' }));
        }, 2000);
        return;
      }
      
      operation = '乗せる';
      
      // 岸からアイテムを削除
      if (newState.boatSide === 'left') {
        newState.leftSide = newState.leftSide.filter(i => i !== item);
      } else {
        newState.rightSide = newState.rightSide.filter(i => i !== item);
      }
      
      // アイテムを船に乗せる時、船頭も自動的に乗せる
      if (!newState.boat.includes('farmer')) {
        newState.boat.push('farmer');
      }
      newState.boat.push(item);
    }

    // ログエントリを追加（Supabaseに保存）
    const logEntry = await createLogEntry(
      newState.operationLog.length + 1,
      operation,
      operationTarget,
      newState.leftSide,
      newState.rightSide,
      newState.boat,
      newState.moves
    );
    newState.operationLog = [...newState.operationLog, logEntry];
    
    setGameState(newState);
  };

  // 船を移動
  const moveBoat = async () => {
    if (gameState.gameWon || gameState.error) return;

    const newState = { ...gameState, error: '', warning: '', moves: gameState.moves + 1 };
    
    // 船の乗客を対岸に移動（船頭以外）
    const passengersToMove = gameState.boat.filter(item => item !== 'farmer');
    
    passengersToMove.forEach(item => {
      if (newState.boatSide === 'left') {
        // 左岸から右岸へ移動
        newState.leftSide = newState.leftSide.filter(i => i !== item);
        newState.rightSide.push(item);
      } else {
        // 右岸から左岸へ移動
        newState.rightSide = newState.rightSide.filter(i => i !== item);
        newState.leftSide.push(item);
      }
    });

    // 船の位置を変更
    const targetSide = newState.boatSide === 'left' ? '右岸' : '左岸';
    newState.boatSide = newState.boatSide === 'left' ? 'right' : 'left';
    newState.boat = [];

    // 移動操作をログに記録（Supabaseに保存）
    const logEntry = await createLogEntry(
      newState.operationLog.length + 1,
      '移動',
      targetSide,
      newState.leftSide,
      newState.rightSide,
      newState.boat,
      newState.moves
    );
    newState.operationLog = [...newState.operationLog, logEntry];

    // 制約条件チェック
    const leftError = checkConstraints(newState.leftSide, newState.boatSide, 'left');
    const rightError = checkConstraints(newState.rightSide, newState.boatSide, 'right');
    
    if (leftError || rightError) {
      const errorMessage = leftError || rightError;
      
      // 制約違反ログを記録
      const violationLogEntry = await createLogEntry(
        newState.moves + 1,
        '制約違反',
        errorMessage,
        newState.leftSide,
        newState.rightSide,
        newState.boat,
        newState.moves,
        false
      );
      newState.operationLog = [...newState.operationLog, violationLogEntry];
      
      // セッションを失敗状態に更新
      const endTime = new Date().toISOString();
      await updateSessionStatus(userId, currentSessionNumber.current, 'failed', endTime);
      
      setGameState({ ...gameState, error: errorMessage });
      return;
    }

    // 勝利条件チェック
    if (newState.rightSide.length === 3) {
      newState.gameWon = true;
      
      // セッションを完了状態に更新
      const endTime = new Date().toISOString();
      await updateSessionStatus(userId, currentSessionNumber.current, 'completed', endTime);
      
      // 勝利ログを保存
      await createLogEntry(
        newState.operationLog.length + 1,
        'ゲーム完了',
        `${newState.moves}手でクリア`,
        newState.leftSide,
        newState.rightSide,
        newState.boat,
        newState.moves,
        true
      );
    }

    setGameState(newState);
  };

  // リセット
  const resetGame = async () => {
    // 現在のセッションが進行中の場合、中断状態に更新
    if (currentSessionNumber.current) {
      const endTime = new Date().toISOString();
      await updateSessionStatus(userId, currentSessionNumber.current, 'abandoned', endTime);
    }
    
    // 新しいセッションを開始
    await initializeNewSession(userId);
    
    setGameState({
      leftSide: ['cat', 'rabbit', 'vegetable'],
      rightSide: [],
      boat: [],
      boatSide: 'left',
      moves: 0,
      gameWon: false,
      error: '',
      warning: '',
      operationLog: [],
      showCSV: false
    });
  };

  // ユーザーIDが未入力の場合は入力モーダルを表示
  if (showUserIdModal) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{
            fontSize: '24px',
            marginBottom: '20px',
            color: '#1f2937'
          }}>
            🚣‍♂️ 川渡り問題へようこそ
          </h2>
          <p style={{
            fontSize: '16px',
            marginBottom: '24px',
            color: '#6b7280'
          }}>
            ゲーム開始前にユーザーIDを入力してください。<br/>
            操作ログにユーザー情報が記録されます。
          </p>
          <input
            type="text"
            value={tempUserId}
            onChange={(e) => setTempUserId(e.target.value)}
            placeholder="ユーザーIDを入力"
            onKeyDown={(e) => e.key === 'Enter' && handleUserIdSubmit()}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              marginBottom: '20px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            autoFocus
          />
          <button
            onClick={handleUserIdSubmit}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              fontSize: '16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ゲームを開始
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '24px', 
      backgroundColor: '#dbeafe', 
      borderRadius: '12px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: 'bold', 
        textAlign: 'center', 
        marginBottom: '24px' 
      }}>
        🚣‍♂️ 川渡り問題
      </h1>
      
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '18px', marginBottom: '8px' }}>
          <strong>目標：</strong>ネコ、ウサギ、野菜をすべて右岸に運ぼう！
        </p>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
          <strong>制約：</strong>
          船には1個まで（船頭は常に同乗） | 
          船頭がいないと：ネコ↔ウサギ ❌、ウサギ↔野菜 ❌
        </p>
        <div style={{ color: '#2563eb', display: 'flex', justifyContent: 'center', gap: '24px', alignItems: 'center' }}>
          <span>手数: {gameState.moves}</span>
          {currentSessionNumber.current && (
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              第{currentSessionNumber.current}回チャレンジ
            </span>
          )}
        </div>
      </div>

      {/* 固定メッセージスペース */}
      <div style={{
        height: '80px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {/* 常に同じサイズのコンテナを表示 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {gameState.warning && (
            <div style={{
              backgroundColor: '#fefce8',
              border: '1px solid #facc15',
              color: '#a16207',
              padding: '12px 16px',
              borderRadius: '8px',
              textAlign: 'center',
              width: '100%',
              maxWidth: '600px',
              boxSizing: 'border-box'
            }}>
              <div style={{ fontWeight: 'bold' }}>⚠️ 操作できません</div>
              <div>{gameState.warning}</div>
            </div>
          )}

          {gameState.error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #f87171',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '8px',
              textAlign: 'center',
              width: '100%',
              maxWidth: '600px',
              boxSizing: 'border-box'
            }}>
              <div style={{ fontWeight: 'bold' }}>❌ 制約違反！</div>
              <div>{gameState.error}</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>下の「リセット」ボタンを押してやり直してください</div>
            </div>
          )}

          {gameState.gameWon && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #4ade80',
              color: '#166534',
              padding: '12px 16px',
              borderRadius: '8px',
              textAlign: 'center',
              width: '100%',
              maxWidth: '600px',
              boxSizing: 'border-box'
            }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>🎉 おめでとうございます！</div>
              <div style={{ marginBottom: '12px' }}>{gameState.moves}手でクリアしました！</div>
              <button
                onClick={showCSV}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                📥 CSVダウンロード
              </button>
            </div>
          )}

          {!gameState.warning && !gameState.error && !gameState.gameWon && (
            <div style={{
              color: '#9ca3af',
              fontSize: '14px',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              メッセージエリア
            </div>
          )}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: '16px', 
        marginBottom: '24px',
        minHeight: '400px'
      }}>
        {/* 左岸 */}
        <div style={{ width: '25%' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '24px',
            backgroundColor: '#dcfce7',
            borderRadius: '8px',
            minHeight: '320px'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>左岸</div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px', 
              justifyContent: 'center', 
              alignItems: 'center',
              flexGrow: 1
            }}>
              {gameState.leftSide.filter(item => item !== 'farmer').map(item => (
                <button
                  key={`left-${item}`}
                  onClick={() => toggleItem(item)}
                  disabled={gameState.error}
                  style={{
                    fontSize: '48px',
                    padding: '8px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: gameState.error ? 'not-allowed' : 'pointer',
                    opacity: gameState.error ? 0.5 : 1,
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => !gameState.error && (e.target.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                  title={`${items[item]?.name}をクリック`}
                >
                  {items[item]?.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 川と船 */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '24px', 
          width: '50%' 
        }}>
          <div style={{ fontSize: '24px', color: '#2563eb', fontWeight: 'bold' }}>🌊 川 🌊</div>
          
          {/* 船の移動軌道 */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '400px',
            height: '128px',
            background: 'linear-gradient(to right, #bfdbfe, #93c5fd, #bfdbfe)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            border: '4px solid #3b82f6'
          }}>
            {/* 船 */}
            <div style={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              backgroundColor: '#fefce8',
              borderRadius: '8px',
              border: '3px solid #eab308',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'all 0.7s',
              left: gameState.boatSide === 'left' ? '16px' : 'calc(100% - 120px)'
            }}>
              <span style={{ fontSize: '24px' }}>🚤</span>
              <span style={{ fontSize: '20px' }}>{items.farmer.emoji}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {gameState.boat.filter(item => item !== 'farmer').map((item, index) => (
                  <span key={index} style={{ fontSize: '20px' }}>
                    {items[item].emoji}
                  </span>
                ))}
              </div>
            </div>
            
            {/* 左右の岸マーカー */}
            <div style={{ color: '#166534', fontWeight: 'bold', fontSize: '18px' }}>←左岸</div>
            <div style={{ color: '#166534', fontWeight: 'bold', fontSize: '18px' }}>右岸→</div>
          </div>

          <button
            onClick={moveBoat}
            disabled={gameState.gameWon || gameState.error}
            style={{
              padding: '12px 32px',
              backgroundColor: gameState.gameWon || gameState.error ? '#9ca3af' : '#2563eb',
              color: 'white',
              fontSize: '18px',
              borderRadius: '8px',
              border: 'none',
              cursor: gameState.gameWon || gameState.error ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s'
            }}
          >
            🚤 船を移動 {gameState.boatSide === 'left' ? '→' : '←'}
          </button>
          
          {/* 船の乗客表示（常に表示） */}
          <div style={{
            padding: '12px',
            backgroundColor: '#fefce8',
            borderRadius: '8px',
            textAlign: 'center',
            border: '2px solid #facc15'
          }}>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>
              船の乗客: 船頭{gameState.boat.filter(item => item !== 'farmer').length > 0 
                ? ` + ${gameState.boat.filter(item => item !== 'farmer').map(item => items[item].name).join(', ')}`
                : ' のみ'
              }
            </p>
          </div>
        </div>

        {/* 右岸 */}
        <div style={{ width: '25%' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '24px',
            backgroundColor: '#dcfce7',
            borderRadius: '8px',
            minHeight: '320px'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>右岸</div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px', 
              justifyContent: 'center', 
              alignItems: 'center',
              flexGrow: 1
            }}>
              {gameState.rightSide.filter(item => item !== 'farmer').map(item => (
                <button
                  key={`right-${item}`}
                  onClick={() => toggleItem(item)}
                  disabled={gameState.error}
                  style={{
                    fontSize: '48px',
                    padding: '8px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: gameState.error ? 'not-allowed' : 'pointer',
                    opacity: gameState.error ? 0.5 : 1,
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => !gameState.error && (e.target.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                  title={`${items[item]?.name}をクリック`}
                >
                  {items[item]?.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          💡 <strong>遊び方：</strong>
          アイテムをクリックして船に乗せ、「船を移動」ボタンで対岸へ！船頭は自動的に同乗します。
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button
            onClick={resetGame}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            リセット
          </button>
          {gameState.operationLog.filter(entry => 
            entry.セッション番号 === currentSessionNumber.current
          ).length > 0 && !gameState.gameWon && (
            <button
              onClick={showCSV}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              📥 途中経過をCSVダウンロード
            </button>
          )}
        </div>
        {gameState.operationLog.length > 0 && (
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            このセッションの操作ログ: {gameState.operationLog.filter(entry => 
              entry.セッション番号 === currentSessionNumber.current
            ).length}件記録中
          </p>
        )}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={() => window.location.href = '/admin/login'}
            style={{
              color: '#6b7280',
              fontSize: '12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            📊 管理者分析ページ
          </button>
        </div>
      </div>

      {/* CSVモーダル */}
      {gameState.showCSV && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            margin: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>📥 CSVダウンロード</h3>
              <button
                onClick={closeCSV}
                style={{
                  color: '#6b7280',
                  fontSize: '20px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '16px', color: '#374151', marginBottom: '16px' }}>
                現在のセッション（第{currentSessionNumber.current}回チャレンジ）の操作ログをCSVファイルでダウンロードできます。
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                ファイル名: river-crossing-puzzle_{userId}_session{currentSessionNumber.current}_[タイムスタンプ].csv
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={downloadCSV}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#059669',
                    color: 'white',
                    fontSize: '16px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  📥 CSVファイルをダウンロード
                </button>
                
                <button
                  onClick={copyCSVToClipboard}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📋 クリップボードにコピー（代替方法）
                </button>
              </div>
            </div>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                onClick={closeCSV}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;