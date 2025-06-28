import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  getOverallStatistics,
  getUserDetailedStatistics,
  getRankingData,
  getAllUsers,
  subscribeToGameLogs
} from '../supabaseClient';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
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
  
  // UI状態
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [error, setError] = useState('');
  
  // カスタム日時範囲
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

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
  }, [dateFilter]);

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
  }, []);

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
  const loadCustomRangeData = () => {
    if (customStartDate && customEndDate) {
      loadData();
    }
  };

  const loadData = async () => {
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
      const [overallResult, rankingResult, usersResult] = await Promise.all([
        getOverallStatistics(dateRange),
        getRankingData('sessions', 10),
        getAllUsers()
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

    } catch (error) {
      console.error('データ読み込みエラー:', error);
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ユーザー選択時の詳細取得
  const handleUserSelect = async (userId) => {
    if (!userId) {
      setSelectedUser('');
      setUserStats(null);
      return;
    }

    setSelectedUser(userId);
    
    try {
      const result = await getUserDetailedStatistics(userId);
      if (result.success) {
        setUserStats(result.data);
      } else {
        console.error('ユーザー統計取得エラー:', result.error);
      }
    } catch (error) {
      console.error('ユーザー統計取得中にエラー:', error);
    }
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
              初回クリアランキング TOP10
            </h3>
            {ranking.length > 0 ? (
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {ranking.map((user, index) => (
                  <div
                    key={user.user_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: index < ranking.length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}
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
                        {user.user_id}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#059669'
                    }}>
                      {user.sessions_until_first_clear}回目
                    </span>
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
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
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
                  初回クリアまでの挑戦回数
                </h4>
                <p style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  margin: 0,
                  color: '#1f2937'
                }}>
                  {userStats.sessionsUntilFirstClear || 'まだクリアしていません'}
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
                  総セッション数
                </h4>
                <p style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  margin: 0,
                  color: '#1f2937'
                }}>
                  {userStats.totalSessions}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

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