import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  getOverallStatistics,
  getUserDetailedStatistics,
  getRankingData,
  getAllUsers,
  subscribeToGameLogs,
  getAllUserProfiles,
  saveUserProfile,
  getSessionDetails
} from '../supabaseClient';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

function AnalyticsDashboard() {
  const { isAuthenticated, logout } = useAdmin();
  const navigate = useNavigate();

  // 統計データ
  const [overallStats, setOverallStats] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [userStats, setUserStats] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  
  // 表示切替
  const [showNicknames, setShowNicknames] = useState(true);
  
  // ニックネーム編集
  const [editingNickname, setEditingNickname] = useState(false);
  const [editNicknameValue, setEditNicknameValue] = useState('');
  
  // UI状態
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [error, setError] = useState('');
  
  // カスタム日時範囲
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);
  
  // セッション詳細モーダル
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);

  // データ取得関数
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // 日付範囲を計算
      let dateRange = null;
      const now = new Date();
      
      if (dateFilter === 'custom') {
        // カスタム範囲
        if (customStartDate && customEndDate) {
          dateRange = {
            start: new Date(customStartDate).toISOString(),
            end: new Date(customEndDate).toISOString()
          };
        }
      } else if (dateFilter === 'today') {
        dateRange = {
          start: startOfDay(now).toISOString(),
          end: now.toISOString()
        };
      } else if (dateFilter === 'week') {
        dateRange = {
          start: startOfWeek(now, { locale: ja }).toISOString(),
          end: now.toISOString()
        };
      } else if (dateFilter === 'month') {
        dateRange = {
          start: startOfMonth(now).toISOString(),
          end: now.toISOString()
        };
      }

      // 並行してデータを取得
      const [overallResult, rankingResult, usersResult, profilesResult] = await Promise.all([
        getOverallStatistics(dateRange),
        getRankingData('sessions', 10, dateRange),
        getAllUsers(),
        getAllUserProfiles()
      ]);

      if (overallResult.success) {
        setOverallStats(overallResult.data);
      } else {
        console.error('全体統計取得エラー:', overallResult.error);
      }

      if (rankingResult.success) {
        setRanking(rankingResult.data);
      } else {
        console.error('ランキング取得エラー:', rankingResult.error);
      }

      if (usersResult.success) {
        setUsers(usersResult.data);
      } else {
        console.error('ユーザーリスト取得エラー:', usersResult.error);
      }

      if (profilesResult.success) {
        // プロフィールをuser_idをキーとしたオブジェクトに変換
        const profilesMap = {};
        profilesResult.data.forEach(profile => {
          profilesMap[profile.user_id] = profile;
        });
        setUserProfiles(profilesMap);
      } else {
        console.error('ユーザープロフィール取得エラー:', profilesResult.error);
      }

    } catch (error) {
      console.error('データ読み込みエラー:', error);
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // ユーザー選択時の詳細取得
  const handleUserSelect = useCallback(async (userId) => {
    if (!userId) {
      setSelectedUser('');
      setUserStats(null);
      return;
    }

    setSelectedUser(userId);
    
    try {
      // 現在の期間フィルターを計算
      let dateRange = null;
      const now = new Date();
      
      if (dateFilter === 'custom') {
        if (customStartDate && customEndDate) {
          dateRange = {
            start: new Date(customStartDate).toISOString(),
            end: new Date(customEndDate).toISOString()
          };
        }
      } else if (dateFilter === 'today') {
        dateRange = {
          start: startOfDay(now).toISOString(),
          end: now.toISOString()
        };
      } else if (dateFilter === 'week') {
        dateRange = {
          start: startOfWeek(now, { locale: ja }).toISOString(),
          end: now.toISOString()
        };
      } else if (dateFilter === 'month') {
        dateRange = {
          start: startOfMonth(now).toISOString(),
          end: now.toISOString()
        };
      }

      const result = await getUserDetailedStatistics(userId, dateRange);
      if (result.success) {
        setUserStats(result.data);
      } else {
        console.error('ユーザー統計取得エラー:', result.error);
      }
    } catch (error) {
      console.error('ユーザー統計取得中にエラー:', error);
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // 開始日時変更時の処理
  const handleStartDateChange = (newStartDate) => {
    setCustomStartDate(newStartDate);
    // 終了日時が未設定または開始日時より前の場合、開始日時と同じ日の23:59に設定
    if (!customEndDate || new Date(newStartDate) > new Date(customEndDate)) {
      const startDate = new Date(newStartDate);
      // 同じ日の23:59に設定
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      const endDateString = `${year}-${month}-${day}T23:59`;
      setCustomEndDate(endDateString);
    }
  };

  // 終了日時変更時の処理
  const handleEndDateChange = (newEndDate) => {
    // 開始日時より前には設定できない
    if (customStartDate && new Date(newEndDate) < new Date(customStartDate)) {
      return; // 変更を無視
    }
    setCustomEndDate(newEndDate);
  };

  // カスタム範囲でデータを取得
  const loadCustomRangeData = useCallback(() => {
    if (customStartDate && customEndDate) {
      loadData();
      // ユーザー詳細も再取得
      if (selectedUser) {
        handleUserSelect(selectedUser);
      }
    }
  }, [customStartDate, customEndDate, loadData, selectedUser, handleUserSelect]);

  // セッション詳細を取得
  const handleSessionClick = async (user) => {
    setLoadingSession(true);
    setSelectedSession(user);
    
    try {
      const result = await getSessionDetails(user.user_id, user.session_number);
      if (result.success && result.data) {
        // 成功したゲーム完了のインデックスを見つける
        const successIndex = result.data.findIndex(log => 
          log.operation === 'ゲーム完了' && log.game_completed === true
        );
        
        if (successIndex === -1) {
          // ゲーム完了が見つからない場合は空配列
          setSessionDetails([]);
          return;
        }
        
        // 成功前の最後のゲーム開始を探す（ゲーム開始ログがあるため、これが最も簡潔）
        let startIndex = 0;
        for (let i = successIndex - 1; i >= 0; i--) {
          if (result.data[i].operation === 'ゲーム開始') {
            startIndex = i;
            break;
          }
        }
        
        // 開始から成功までのデータを抽出
        const filteredData = result.data.slice(startIndex, successIndex + 1);
        
        // 操作番号を1から振り直す
        const renumberedData = filteredData.map((log, index) => ({
          ...log,
          operation_number: index + 1
        }));
        
        setSessionDetails(renumberedData);
      } else {
        console.error('セッション詳細取得エラー:', result.error);
        setSessionDetails(null);
      }
    } catch (error) {
      console.error('セッション詳細取得中にエラー:', error);
      setSessionDetails(null);
    } finally {
      setLoadingSession(false);
    }
  };

  // モーダルを閉じる
  const closeSessionModal = () => {
    setSelectedSession(null);
    setSessionDetails(null);
  };

  // 認証チェック
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  // データ取得
  useEffect(() => {
    if (dateFilter !== 'custom') {
      loadData();
    }
    // 期間フィルター変更時にユーザー詳細も再取得
    if (selectedUser) {
      handleUserSelect(selectedUser);
    }
  }, [dateFilter, handleUserSelect, loadData, selectedUser]);

  // リアルタイム更新
  useEffect(() => {
    const subscription = subscribeToGameLogs(() => {
      loadData(); // データが更新されたら再取得
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [loadData]);

  // ユーザーの表示名を取得（ニックネーム優先、切替可能）
  const getUserDisplayName = (userId) => {
    if (showNicknames && userProfiles[userId] && userProfiles[userId].nickname) {
      return userProfiles[userId].nickname;
    }
    return userId;
  };

  // ニックネーム編集開始
  const startEditNickname = () => {
    const currentNickname = userProfiles[selectedUser]?.nickname || '';
    setEditNicknameValue(currentNickname);
    setEditingNickname(true);
  };

  // ニックネーム保存
  const saveNickname = async () => {
    if (!selectedUser) return;
    
    try {
      const result = await saveUserProfile(selectedUser, editNicknameValue.trim());
      if (result.success) {
        // プロフィールを更新
        setUserProfiles(prev => ({
          ...prev,
          [selectedUser]: {
            user_id: selectedUser,
            nickname: editNicknameValue.trim() || null,
            created_at: userProfiles[selectedUser]?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }));
        setEditingNickname(false);
      } else {
        console.error('ニックネーム保存エラー:', result.error);
        alert('ニックネームの保存に失敗しました。');
      }
    } catch (error) {
      console.error('ニックネーム保存中にエラー:', error);
      alert('ニックネームの保存に失敗しました。');
    }
  };

  // ニックネーム編集キャンセル
  const cancelEditNickname = () => {
    setEditingNickname(false);
    setEditNicknameValue('');
  };

  // 制約違反の円グラフデータ
  const violationData = overallStats ? [
    { name: 'ネコ・ウサギ違反', value: overallStats.violations.catRabbit, color: '#ef4444' },
    { name: 'ウサギ・野菜違反', value: overallStats.violations.rabbitVegetable, color: '#f97316' },
    { name: 'その他違反', value: overallStats.violations.other, color: '#8b5cf6' },
  ].filter(item => item.value > 0) : [];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280' }}>データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ヘッダー */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            margin: 0,
            color: '#1f2937'
          }}>
            川渡りパズル分析ダッシュボード
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowNicknames(!showNicknames)}
              style={{
                padding: '8px 12px',
                backgroundColor: showNicknames ? '#059669' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              title={showNicknames ? 'ユーザーID表示に切替' : 'ニックネーム表示に切替'}
            >
              {showNicknames ? '👤 ニックネーム表示' : '🏷️ ユーザーID表示'}
            </button>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setShowCustomRange(e.target.value === 'custom');
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">全期間</option>
              <option value="today">今日</option>
              <option value="week">今週</option>
              <option value="month">今月</option>
              <option value="custom">カスタム範囲</option>
            </select>
            
            {showCustomRange && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="datetime-local"
                    value={customStartDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                    placeholder="開始日時"
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>〜</span>
                  <input
                    type="datetime-local"
                    value={customEndDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    min={customStartDate}
                    style={{
                      padding: '6px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                    placeholder="終了日時"
                  />
                </div>
                <button
                  onClick={loadCustomRangeData}
                  disabled={!customStartDate || !customEndDate}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: customStartDate && customEndDate ? '#3b82f6' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: customStartDate && customEndDate ? 'pointer' : 'not-allowed',
                    fontWeight: '500'
                  }}
                >
                  検索
                </button>
              </div>
            )}
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              ゲームに戻る
            </button>
            <button
              onClick={logout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px'
      }}>
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '24px'
          }}>
            {error}
          </div>
        )}

        {/* 全体統計カード */}
        {overallStats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: '0 0 8px 0',
                fontWeight: '500'
              }}>
                総ユーザー数
              </h3>
              <p style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                margin: 0,
                color: '#1f2937'
              }}>
                {overallStats.totalUsers}
              </p>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: '0 0 8px 0',
                fontWeight: '500'
              }}>
                解けた人数
              </h3>
              <p style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                margin: 0,
                color: '#059669'
              }}>
                {overallStats.solvedUsers}
              </p>
              <p style={{ 
                fontSize: '12px', 
                color: '#6b7280', 
                margin: '4px 0 0 0'
              }}>
                {overallStats.totalUsers > 0 ? 
                  Math.round((overallStats.solvedUsers / overallStats.totalUsers) * 100) : 0
                }% 解決率
              </p>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: '0 0 8px 0',
                fontWeight: '500'
              }}>
                総セッション数
              </h3>
              <p style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                margin: 0,
                color: '#1f2937'
              }}>
                {overallStats.totalSessions}
              </p>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: '0 0 8px 0',
                fontWeight: '500'
              }}>
                成功セッション
              </h3>
              <p style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                margin: 0,
                color: '#059669'
              }}>
                {overallStats.completedSessions}
              </p>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: '0 0 8px 0',
                fontWeight: '500'
              }}>
                失敗セッション
              </h3>
              <p style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                margin: 0,
                color: '#dc2626'
              }}>
                {overallStats.failedSessions}
              </p>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: '0 0 8px 0',
                fontWeight: '500'
              }}>
                正解までの平均セッション数
              </h3>
              <p style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                margin: 0,
                color: '#3b82f6'
              }}>
                {overallStats.avgSessionsUntilClear > 0 
                  ? overallStats.avgSessionsUntilClear.toFixed(1) 
                  : '-'}
              </p>
              {overallStats.avgSessionsUntilClear > 0 && (
                <p style={{ 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  margin: '4px 0 0 0'
                }}>
                  回でクリア
                </p>
              )}
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* 制約違反の円グラフ */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              marginBottom: '16px',
              color: '#1f2937'
            }}>
              制約違反の内訳
            </h3>
            {violationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={violationData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {violationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', margin: '60px 0' }}>
                制約違反データがありません
              </p>
            )}
          </div>

          {/* ランキング */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              marginBottom: '16px',
              color: '#1f2937'
            }}>
              初回クリアランキング TOP10{dateFilter !== 'all' ? ' （期間内）' : ''}
            </h3>
            {ranking.length > 0 ? (
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {ranking.map((user, index) => (
                  <div
                    key={user.user_id}
                    onClick={() => handleSessionClick(user)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: index < ranking.length - 1 ? '1px solid #f3f4f6' : 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      ':hover': { backgroundColor: '#f9fafb' }
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        backgroundColor: index < 3 ? '#fbbf24' : '#e5e7eb',
                        color: index < 3 ? 'white' : '#6b7280',
                        borderRadius: '50%',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {index + 1}
                      </span>
                      <span style={{ fontSize: '14px', color: '#374151' }}>
                        {getUserDisplayName(user.user_id)}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#059669'
                      }}>
                        {user.games_until_first_clear || user.sessions_until_first_clear}回目のゲーム
                      </div>
                      {user.moves_count && (
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginTop: '2px'
                        }}>
                          {user.moves_count}手
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', margin: '60px 0' }}>
                ランキングデータがありません
              </p>
            )}
          </div>
        </div>

        {/* ユーザー詳細分析 */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginBottom: '16px',
            color: '#1f2937'
          }}>
            ユーザー詳細分析
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedUser}
                onChange={(e) => handleUserSelect(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              >
                <option value="">ユーザーを選択してください</option>
                {users.map(user => (
                  <option key={user} value={user}>{getUserDisplayName(user)}</option>
                ))}
              </select>
              
              {selectedUser && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {editingNickname ? (
                    <>
                      <input
                        type="text"
                        value={editNicknameValue}
                        onChange={(e) => setEditNicknameValue(e.target.value)}
                        maxLength={20}
                        placeholder="ニックネームを入力"
                        style={{
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '14px',
                          width: '150px'
                        }}
                      />
                      <button
                        onClick={saveNickname}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEditNickname}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startEditNickname}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      ニックネーム設定
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {userStats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px'
              }}>
                <h4 style={{ 
                  fontSize: '14px', 
                  color: '#6b7280', 
                  margin: '0 0 8px 0',
                  fontWeight: '500'
                }}>
                  初回クリアまでのゲーム数
                </h4>
                <p style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  margin: 0,
                  color: '#1f2937'
                }}>
                  {userStats.gamesUntilFirstClear ? `${userStats.gamesUntilFirstClear}回目` : (userStats.sessionsUntilFirstClear || 'まだクリアしていません')}
                </p>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px'
              }}>
                <h4 style={{ 
                  fontSize: '14px', 
                  color: '#6b7280', 
                  margin: '0 0 8px 0',
                  fontWeight: '500'
                }}>
                  最少手数
                </h4>
                <p style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  margin: 0,
                  color: '#059669'
                }}>
                  {userStats.minMoves ? `${userStats.minMoves}手` : 'まだクリアしていません'}
                </p>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px'
              }}>
                <h4 style={{ 
                  fontSize: '14px', 
                  color: '#6b7280', 
                  margin: '0 0 8px 0',
                  fontWeight: '500'
                }}>
                  総ゲーム数
                </h4>
                <p style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  margin: 0,
                  color: '#1f2937'
                }}>
                  {userStats.totalGames || userStats.totalSessions}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* セッション詳細モーダル */}
      {selectedSession && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                margin: 0,
                color: '#1f2937'
              }}>
                {getUserDisplayName(selectedSession.user_id)} - {selectedSession.games_until_first_clear || selectedSession.sessions_until_first_clear}回目のゲーム詳細
              </h3>
              <button
                onClick={closeSessionModal}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                閉じる
              </button>
            </div>

            {loadingSession ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  display: 'inline-block',
                  width: '32px',
                  height: '32px',
                  border: '3px solid #f3f4f6',
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
            ) : sessionDetails && sessionDetails.length > 0 ? (
              <div>
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0'
                }}>
                  <p style={{ margin: 0, color: '#166534', fontWeight: '500' }}>
                    クリア成功！ 操作回数: {sessionDetails.filter(log => log.operation === '乗せる' || log.operation === '移動').length}手
                  </p>
                </div>
                
                <div style={{
                  overflowX: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>手順</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>操作</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>対象</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>左岸</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>船</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>右岸</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionDetails.map((log, index) => {
                        const leftItems = [];
                        const rightItems = [];
                        const boatItems = [];
                        
                        if (log.left_cat > 0) leftItems.push('🐈');
                        if (log.left_rabbit > 0) leftItems.push('🐰');
                        if (log.left_vegetable > 0) leftItems.push('🥬');
                        if (log.right_cat > 0) rightItems.push('🐈');
                        if (log.right_rabbit > 0) rightItems.push('🐰');
                        if (log.right_vegetable > 0) rightItems.push('🥬');
                        
                        // 船の中身をアイコンで表示
                        if (log.boat_cargo && log.boat_cargo !== 'なし') {
                          if (log.boat_cargo.includes('ネコ')) boatItems.push('🐈');
                          if (log.boat_cargo.includes('ウサギ')) boatItems.push('🐰');
                          if (log.boat_cargo.includes('野菜')) boatItems.push('🥬');
                        }
                        
                        return (
                          <tr key={index} style={{
                            borderBottom: index < sessionDetails.length - 1 ? '1px solid #e5e7eb' : 'none',
                            backgroundColor: log.operation === 'ゲーム完了' ? '#f0fdf4' : 'white'
                          }}>
                            <td style={{ padding: '12px' }}>{log.operation_number}</td>
                            <td style={{ padding: '12px' }}>{log.operation}</td>
                            <td style={{ padding: '12px' }}>{log.target || '-'}</td>
                            <td style={{ padding: '12px' }}>{leftItems.join(' ') || 'なし'}</td>
                            <td style={{ padding: '12px' }}>{boatItems.join(' ') || 'なし'}</td>
                            <td style={{ padding: '12px' }}>{rightItems.join(' ') || 'なし'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                セッションデータが見つかりません
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AnalyticsDashboard;