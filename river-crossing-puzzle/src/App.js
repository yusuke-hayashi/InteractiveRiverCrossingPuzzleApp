import React, { useState } from 'react';

function App() {
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

  // ログエントリを作成するヘルパー関数
  const createLogEntry = (operationNum, operation, target, leftSide, rightSide, boat) => {
    return {
      操作番号: operationNum,
      操作: operation,
      対象: target,
      左岸_ネコ: leftSide.includes('cat') ? 1 : 0,
      左岸_ウサギ: leftSide.includes('rabbit') ? 1 : 0,
      左岸_野菜: leftSide.includes('vegetable') ? 1 : 0,
      右岸_ネコ: rightSide.includes('cat') ? 1 : 0,
      右岸_ウサギ: rightSide.includes('rabbit') ? 1 : 0,
      右岸_野菜: rightSide.includes('vegetable') ? 1 : 0,
      船の積み荷: boat.filter(item => item !== 'farmer').map(item => items[item]?.name).join('、') || 'なし'
    };
  };

  // CSV表示機能（ダウンロードの代わり）
  const showCSV = () => {
    setGameState(prev => ({ ...prev, showCSV: true }));
  };

  const closeCSV = () => {
    setGameState(prev => ({ ...prev, showCSV: false }));
  };

  const generateCSV = () => {
    const headers = [
      '操作番号', '操作', '対象', '左岸_ネコ', '左岸_ウサギ', '左岸_野菜', 
      '右岸_ネコ', '右岸_ウサギ', '右岸_野菜', '船の積み荷'
    ];
    
    const csvContent = [
      headers.join(','),
      ...gameState.operationLog.map(entry => 
        headers.map(header => `"${entry[header]}"`).join(',')
      )
    ].join('\n');

    return csvContent;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateCSV());
      alert('CSVデータがクリップボードにコピーされました！');
    } catch (err) {
      alert('コピーに失敗しました。テキストエリアから手動でコピーしてください。');
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
  const toggleItem = (item) => {
    if (gameState.gameWon || gameState.error) return;
    if (item === 'farmer') return; // 船頭は手動選択不可

    const newState = { ...gameState, error: '', warning: '' };
    
    // 船がいる側からのみ乗船可能
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

    let operation = '';
    let operationTarget = items[item]?.name;

    if (newState.boat.includes(item)) {
      // 船から降ろす
      operation = '降ろす';
      newState.boat = newState.boat.filter(i => i !== item);
      // アイテムを降ろす時、船頭以外に誰もいなければ船頭も降ろす
      if (newState.boat.filter(i => i !== 'farmer').length === 0) {
        newState.boat = newState.boat.filter(i => i !== 'farmer');
      }
    } else {
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
      // アイテムを船に乗せる時、船頭も自動的に乗せる
      if (!newState.boat.includes('farmer')) {
        newState.boat.push('farmer');
      }
      newState.boat.push(item);
    }

    // ログエントリを追加
    const logEntry = createLogEntry(
      newState.operationLog.length + 1,
      operation,
      operationTarget,
      newState.leftSide,
      newState.rightSide,
      newState.boat
    );
    newState.operationLog = [...newState.operationLog, logEntry];
    
    setGameState(newState);
  };

  // 船を移動
  const moveBoat = () => {
    if (gameState.gameWon || gameState.error) return;

    const newState = { ...gameState, error: '', warning: '', moves: gameState.moves + 1 };
    
    // 船の乗客を対岸に移動（船頭以外）
    gameState.boat.filter(item => item !== 'farmer').forEach(item => {
      if (newState.boatSide === 'left') {
        newState.leftSide = newState.leftSide.filter(i => i !== item);
        if (!newState.rightSide.includes(item)) {
          newState.rightSide.push(item);
        }
      } else {
        newState.rightSide = newState.rightSide.filter(i => i !== item);
        if (!newState.leftSide.includes(item)) {
          newState.leftSide.push(item);
        }
      }
    });

    // 船の位置を変更
    const targetSide = newState.boatSide === 'left' ? '右岸' : '左岸';
    newState.boatSide = newState.boatSide === 'left' ? 'right' : 'left';
    newState.boat = [];

    // 移動操作をログに記録
    const logEntry = createLogEntry(
      newState.operationLog.length + 1,
      '移動',
      targetSide,
      newState.leftSide,
      newState.rightSide,
      newState.boat
    );
    newState.operationLog = [...newState.operationLog, logEntry];

    // 制約条件チェック
    const leftError = checkConstraints(newState.leftSide, newState.boatSide, 'left');
    const rightError = checkConstraints(newState.rightSide, newState.boatSide, 'right');
    
    if (leftError || rightError) {
      const errorMessage = leftError || rightError;
      setGameState({ ...gameState, error: errorMessage });
      return;
    }

    // 勝利条件チェック
    if (newState.rightSide.length === 3) {
      newState.gameWon = true;
    }

    setGameState(newState);
  };

  // リセット
  const resetGame = () => {
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
        <p style={{ color: '#2563eb' }}>手数: {gameState.moves}</p>
      </div>

      {gameState.warning && (
        <div style={{
          backgroundColor: '#fefce8',
          border: '1px solid #facc15',
          color: '#a16207',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold' }}>操作できません</div>
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
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold' }}>制約違反！</div>
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
          marginBottom: '16px',
          textAlign: 'center'
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
            📊 操作ログを表示
          </button>
        </div>
      )}

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
          
          {/* 船の乗客表示 */}
          {gameState.boat.filter(item => item !== 'farmer').length > 0 && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fefce8',
              borderRadius: '8px',
              textAlign: 'center',
              border: '2px solid #facc15'
            }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>
                船の乗客: 船頭 + 
                {gameState.boat.filter(item => item !== 'farmer').map(item => ` ${items[item].name}`).join(', ')}
              </p>
            </div>
          )}
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
          {gameState.operationLog.length > 0 && !gameState.gameWon && (
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
              📊 途中経過ログを表示
            </button>
          )}
        </div>
        {gameState.operationLog.length > 0 && (
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            操作ログ: {gameState.operationLog.length}件記録中
          </p>
        )}
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
            padding: '24px',
            maxWidth: '800px',
            width: '100%',
            margin: '16px',
            maxHeight: '600px',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>📊 操作ログ（CSV形式）</h3>
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
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                以下のCSVデータをコピーして、テキストファイルとして保存できます：
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  📋 クリップボードにコピー
                </button>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  ファイル名例: 川渡り問題_ログ_{gameState.moves}手.csv
                </span>
              </div>
            </div>
            <textarea
              value={generateCSV()}
              readOnly
              onClick={(e) => e.target.select()}
              style={{
                width: '100%',
                height: '300px',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                resize: 'none'
              }}
            />
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