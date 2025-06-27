import React, { useState, useEffect } from 'react';

const RiverCrossingPuzzle = () => {
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
    <div className="max-w-4xl mx-auto p-6 bg-blue-50 rounded-lg">
      <h1 className="text-3xl font-bold text-center mb-6">🚣‍♂️ 川渡り問題</h1>
      
      <div className="text-center mb-4">
        <p className="text-lg mb-2">
          <strong>目標：</strong>ネコ、ウサギ、野菜をすべて右岸に運ぼう！
        </p>
        <p className="text-sm text-gray-600 mb-2">
          <strong>制約：</strong>
          船には1個まで（船頭は常に同乗） | 
          船頭がいないと：ネコ↔ウサギ ❌、ウサギ↔野菜 ❌
        </p>
        <p className="text-blue-600">手数: {gameState.moves}</p>
      </div>

      {gameState.warning && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 text-center">
          <div className="font-bold">操作できません</div>
          <div>{gameState.warning}</div>
        </div>
      )}

      {gameState.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center">
          <div className="font-bold">制約違反！</div>
          <div>{gameState.error}</div>
          <div className="text-sm mt-1">下の「リセット」ボタンを押してやり直してください</div>
        </div>
      )}

      {gameState.gameWon && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-center">
          <div className="text-xl font-bold">🎉 おめでとうございます！</div>
          <div className="mb-3">{gameState.moves}手でクリアしました！</div>
          <button
            onClick={showCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            📊 操作ログを表示
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-6 min-h-96">
        {/* 左岸 */}
        <div className="w-1/4">
          <div className="flex flex-col items-center space-y-4 p-6 bg-green-100 rounded-lg min-h-80">
            <div className="text-xl font-bold text-green-800">左岸</div>
            <div className="flex flex-col gap-4 justify-center items-center flex-grow">
              {gameState.leftSide.filter(item => item !== 'farmer').map(item => (
                <button
                  key={`left-${item}`}
                  onClick={() => toggleItem(item)}
                  disabled={gameState.error}
                  className="text-5xl hover:scale-110 transition-transform cursor-pointer p-2 bg-white rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`${items[item]?.name}をクリック`}
                >
                  {items[item]?.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 川と船 */}
        <div className="flex flex-col items-center justify-center space-y-6 w-1/2">
          <div className="text-3xl text-blue-600 font-bold">🌊 川 🌊</div>
          
          {/* 船の移動軌道 */}
          <div className="relative w-full max-w-md h-32 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 rounded-lg flex items-center justify-between px-6 border-4 border-blue-400">
            {/* 船 */}
            <div className={`absolute flex items-center space-x-2 p-3 bg-yellow-100 rounded-lg border-3 border-yellow-500 shadow-lg transition-all duration-700 ${
              gameState.boatSide === 'left' ? 'left-4' : 'right-4'
            }`}>
              <span className="text-2xl">🚤</span>
              <span className="text-xl">{items.farmer.emoji}</span>
              <div className="flex space-x-1">
                {gameState.boat.filter(item => item !== 'farmer').map((item, index) => (
                  <span key={index} className="text-xl">
                    {items[item].emoji}
                  </span>
                ))}
              </div>
            </div>
            
            {/* 左右の岸マーカー */}
            <div className="text-green-700 font-bold text-lg">←左岸</div>
            <div className="text-green-700 font-bold text-lg">右岸→</div>
          </div>

          <button
            onClick={moveBoat}
            disabled={gameState.gameWon || gameState.error}
            className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            🚤 船を移動 {gameState.boatSide === 'left' ? '→' : '←'}
          </button>
          
          {/* 船の乗客表示 */}
          {gameState.boat.filter(item => item !== 'farmer').length > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg text-center border-2 border-yellow-300">
              <p className="text-sm font-medium">船の乗客: 船頭 + 
                {gameState.boat.filter(item => item !== 'farmer').map(item => ` ${items[item].name}`).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* 右岸 */}
        <div className="w-1/4">
          <div className="flex flex-col items-center space-y-4 p-6 bg-green-100 rounded-lg min-h-80">
            <div className="text-xl font-bold text-green-800">右岸</div>
            <div className="flex flex-col gap-4 justify-center items-center flex-grow">
              {gameState.rightSide.filter(item => item !== 'farmer').map(item => (
                <button
                  key={`right-${item}`}
                  onClick={() => toggleItem(item)}
                  disabled={gameState.error}
                  className="text-5xl hover:scale-110 transition-transform cursor-pointer p-2 bg-white rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`${items[item]?.name}をクリック`}
                >
                  {items[item]?.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600">
          💡 <strong>遊び方：</strong>
          アイテムをクリックして船に乗せ、「船を移動」ボタンで対岸へ！船頭は自動的に同乗します。
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            リセット
          </button>
          {gameState.operationLog.length > 0 && !gameState.gameWon && (
            <button
              onClick={showCSV}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              📊 途中経過ログを表示
            </button>
          )}
        </div>
        {gameState.operationLog.length > 0 && (
          <p className="text-xs text-gray-500">
            操作ログ: {gameState.operationLog.length}件記録中
          </p>
        )}
      </div>

      {/* CSVモーダル */}
      {gameState.showCSV && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-96 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">📊 操作ログ（CSV形式）</h3>
              <button
                onClick={closeCSV}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                以下のCSVデータをコピーして、テキストファイルとして保存できます：
              </p>
              <div className="flex space-x-2 mb-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  📋 クリップボードにコピー
                </button>
                <span className="text-xs text-gray-500 py-1">
                  ファイル名例: 川渡り問題_ログ_{gameState.moves}手.csv
                </span>
              </div>
            </div>
            <textarea
              value={generateCSV()}
              readOnly
              className="w-full h-64 p-3 border border-gray-300 rounded text-sm font-mono resize-none"
              onClick={(e) => e.target.select()}
            />
            <div className="mt-4 text-center">
              <button
                onClick={closeCSV}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiverCrossingPuzzle;