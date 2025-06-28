import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ゲームログを保存する関数
export const saveGameLog = async (logData) => {
  try {
    const { data, error } = await supabase
      .from('game_logs')
      .insert([{
        user_id: logData.ユーザーID,
        operation_number: logData.操作番号,
        operation: logData.操作,
        target: logData.対象,
        left_cat: logData.左岸_ネコ,
        left_rabbit: logData.左岸_ウサギ,
        left_vegetable: logData.左岸_野菜,
        right_cat: logData.右岸_ネコ,
        right_rabbit: logData.右岸_ウサギ,
        right_vegetable: logData.右岸_野菜,
        boat_cargo: logData.船の積み荷,
        timestamp: logData.タイムスタンプ,
        game_session_id: logData.ゲームセッションID,
        moves_count: logData.手数,
        game_completed: logData.ゲーム完了,
        session_number: logData.セッション番号,
        session_status: 'active',
        session_start_time: logData.セッション開始時刻,
        session_end_time: null
      }])

    if (error) {
      console.error('ログ保存エラー:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('ログ保存中にエラーが発生:', error)
    return { success: false, error }
  }
}

// ユーザーのゲームログを取得する関数
export const getUserGameLogs = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('game_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('ログ取得エラー:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('ログ取得中にエラーが発生:', error)
    return { success: false, error }
  }
}

// セッション管理関数

// ユーザーの最新セッション番号を取得
export const getLatestSessionNumber = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('game_logs')
      .select('session_number')
      .eq('user_id', userId)
      .order('session_number', { ascending: false })
      .limit(1)

    if (error) {
      console.error('セッション番号取得エラー:', error)
      return { success: false, error }
    }

    const latestSessionNumber = data.length > 0 ? data[0].session_number : 0
    return { success: true, data: latestSessionNumber }
  } catch (error) {
    console.error('セッション番号取得中にエラー:', error)
    return { success: false, error }
  }
}

// 新しいセッションを開始
export const startNewSession = async (userId, sessionNumber) => {
  try {
    const sessionStartTime = new Date().toISOString()
    
    // 最初のセッション開始ログを作成
    const { data, error } = await supabase
      .from('game_logs')
      .insert([{
        user_id: userId,
        operation_number: 0,
        operation: 'セッション開始',
        target: `第${sessionNumber}回チャレンジ`,
        left_cat: 1,
        left_rabbit: 1,
        left_vegetable: 1,
        right_cat: 0,
        right_rabbit: 0,
        right_vegetable: 0,
        boat_cargo: 'なし',
        timestamp: sessionStartTime,
        game_session_id: crypto.randomUUID(),
        moves_count: 0,
        game_completed: false,
        session_number: sessionNumber,
        session_status: 'active',
        session_start_time: sessionStartTime,
        session_end_time: null
      }])

    if (error) {
      console.error('セッション開始エラー:', error)
      return { success: false, error }
    }

    return { success: true, data, sessionStartTime }
  } catch (error) {
    console.error('セッション開始中にエラー:', error)
    return { success: false, error }
  }
}

// セッション状態を更新
export const updateSessionStatus = async (userId, sessionNumber, status, endTime = null) => {
  try {
    const updateData = {
      session_status: status
    }
    
    if (endTime) {
      updateData.session_end_time = endTime
    }

    const { data, error } = await supabase
      .from('game_logs')
      .update(updateData)
      .eq('user_id', userId)
      .eq('session_number', sessionNumber)
      .eq('operation', 'セッション開始')

    if (error) {
      console.error('セッション状態更新エラー:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('セッション状態更新中にエラー:', error)
    return { success: false, error }
  }
}

// 分析用データ取得関数

// ユーザーのセッション一覧を取得
export const getUserSessions = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('game_logs')
      .select('session_number, session_status, session_start_time, session_end_time, moves_count, game_completed')
      .eq('user_id', userId)
      .eq('operation', 'セッション開始')
      .order('session_number', { ascending: false })

    if (error) {
      console.error('セッション一覧取得エラー:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('セッション一覧取得中にエラー:', error)
    return { success: false, error }
  }
}

// 成功セッションのみ取得
export const getSuccessfulSessions = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('game_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('session_status', 'completed')
      .order('session_number', { ascending: false })

    if (error) {
      console.error('成功セッション取得エラー:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('成功セッション取得中にエラー:', error)
    return { success: false, error }
  }
}

// 失敗セッションのみ取得
export const getFailedSessions = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('game_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('session_status', 'failed')
      .order('session_number', { ascending: false })

    if (error) {
      console.error('失敗セッション取得エラー:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('失敗セッション取得中にエラー:', error)
    return { success: false, error }
  }
}

// セッション統計情報を取得
export const getSessionStatistics = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('game_logs')
      .select('session_status')
      .eq('user_id', userId)
      .eq('operation', 'セッション開始')

    if (error) {
      console.error('セッション統計取得エラー:', error)
      return { success: false, error }
    }

    const stats = {
      total: data.length,
      completed: data.filter(s => s.session_status === 'completed').length,
      failed: data.filter(s => s.session_status === 'failed').length,
      abandoned: data.filter(s => s.session_status === 'abandoned').length,
      active: data.filter(s => s.session_status === 'active').length
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('セッション統計取得中にエラー:', error)
    return { success: false, error }
  }
}

// 分析ツール用関数

// 全体統計情報を取得
export const getOverallStatistics = async (dateRange = null) => {
  try {
    let query = supabase.from('game_logs').select('*')
    
    if (dateRange) {
      query = query.gte('timestamp', dateRange.start).lte('timestamp', dateRange.end)
    }

    const { data, error } = await query

    if (error) {
      console.error('全体統計取得エラー:', error)
      return { success: false, error }
    }

    // ユニークユーザー数
    const uniqueUsers = [...new Set(data.map(log => log.user_id))]
    
    // ゲーム完了したユーザーを取得（game_completedがtrueのログから）
    const gameCompletedLogs = data.filter(log => 
      log.game_completed === true && log.operation === 'ゲーム完了'
    )
    
    // セッション開始ログを取得してステータス別にカウント
    const sessionStartLogs = data.filter(log => log.operation === 'セッション開始')
    
    // セッションごとのステータスを取得
    const sessionStatusMap = {}
    sessionStartLogs.forEach(log => {
      const sessionKey = `${log.user_id}_${log.session_number}`
      sessionStatusMap[sessionKey] = log.session_status
    })
    
    // ステータス別にカウント
    let completedSessionsCount = 0
    let failedSessionsCount = 0
    let activeSessionsCount = 0
    let abandonedSessionsCount = 0
    
    Object.values(sessionStatusMap).forEach(status => {
      switch(status) {
        case 'completed':
          completedSessionsCount++
          break
        case 'failed':
          failedSessionsCount++
          break
        case 'active':
          activeSessionsCount++
          break
        case 'abandoned':
          abandonedSessionsCount++
          break
      }
    })
    
    // 実際のゲーム完了・失敗ログからカウント
    const actualCompletedSessions = new Set()
    const actualFailedSessions = new Set()
    const sessionStatus = {}
    
    // セッションごとの状態を追跡
    data.forEach(log => {
      const sessionKey = `${log.user_id}_${log.session_number}`
      
      // セッション開始時刻を記録
      if (log.operation === 'セッション開始') {
        sessionStatus[sessionKey] = {
          startTime: new Date(log.timestamp),
          hasCompletion: false,
          hasFailed: false
        }
      }
      
      // 成功完了ログがあるセッション（game_completed=trueかつ制約違反でない）
      if (log.game_completed === true && log.operation === 'ゲーム完了' && 
          !log.target.includes('制約違反')) {
        actualCompletedSessions.add(sessionKey)
        if (sessionStatus[sessionKey]) {
          sessionStatus[sessionKey].hasCompletion = true
        }
      }
      
      // 制約違反で終了したセッション
      if (log.operation === 'ゲーム完了' && log.target && log.target.includes('制約違反')) {
        actualFailedSessions.add(sessionKey)
        if (sessionStatus[sessionKey]) {
          sessionStatus[sessionKey].hasFailed = true
        }
      }
    })
    
    // 放置・離脱セッションの判定（30分以上経過してゲーム完了していない）
    const now = new Date()
    const timeoutMinutes = 30
    
    Object.keys(sessionStatus).forEach(sessionKey => {
      const session = sessionStatus[sessionKey]
      const timeDiff = (now - session.startTime) / (1000 * 60) // 分単位
      
      // 30分以上経過してゲーム完了していないセッションは失敗扱い
      if (timeDiff > timeoutMinutes && !session.hasCompletion && !session.hasFailed) {
        actualFailedSessions.add(sessionKey)
      }
    })

    // 制約違反の分析（制約違反で終了したログから）
    const violations = { catRabbit: 0, rabbitVegetable: 0, other: 0 }
    data.forEach(log => {
      if (log.operation === 'ゲーム完了' && log.target && log.target.includes('制約違反')) {
        if (log.target.includes('ネコとウサギ')) {
          violations.catRabbit++
        } else if (log.target.includes('ウサギと野菜')) {
          violations.rabbitVegetable++
        } else {
          violations.other++
        }
      }
    })

    // 解けた人数（ゲーム完了したユニークユーザー）
    const solvedUsers = [...new Set(gameCompletedLogs.map(log => log.user_id))]

    // 正解までの平均セッション数を計算
    let avgSessionsUntilClear = 0
    if (solvedUsers.length > 0) {
      // 各解けたユーザーの初回クリアまでのセッション数を取得
      const sessionsUntilClearList = []
      
      solvedUsers.forEach(userId => {
        const userLogs = data.filter(log => log.user_id === userId)
        
        // セッション別にグループ化
        const sessionGroups = {}
        userLogs.forEach(log => {
          if (!sessionGroups[log.session_number]) {
            sessionGroups[log.session_number] = []
          }
          sessionGroups[log.session_number].push(log)
        })

        // 初回クリアセッションを探す
        let firstClearSession = null
        Object.keys(sessionGroups).sort((a, b) => a - b).forEach(sessionNum => {
          const session = sessionGroups[sessionNum]
          const isCompleted = session.some(log => log.game_completed === true && log.operation === 'ゲーム完了')
          
          if (!firstClearSession && isCompleted) {
            firstClearSession = parseInt(sessionNum)
          }
        })

        if (firstClearSession) {
          sessionsUntilClearList.push(firstClearSession)
        }
      })

      // 平均を計算
      if (sessionsUntilClearList.length > 0) {
        const sum = sessionsUntilClearList.reduce((acc, val) => acc + val, 0)
        avgSessionsUntilClear = sum / sessionsUntilClearList.length
      }
    }

    return {
      success: true,
      data: {
        totalUsers: uniqueUsers.length,
        solvedUsers: solvedUsers.length,
        totalSessions: sessionStartLogs.length,
        completedSessions: actualCompletedSessions.size,
        failedSessions: actualFailedSessions.size,
        avgSessionsUntilClear: avgSessionsUntilClear,
        violations
      }
    }
  } catch (error) {
    console.error('全体統計取得中にエラー:', error)
    return { success: false, error }
  }
}

// ユーザー別統計の詳細を取得
export const getUserDetailedStatistics = async (userId, dateRange = null) => {
  try {
    let query = supabase
      .from('game_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })
    
    if (dateRange) {
      query = query.gte('timestamp', dateRange.start).lte('timestamp', dateRange.end)
    }

    const { data, error } = await query

    if (error) {
      console.error('ユーザー詳細統計取得エラー:', error)
      return { success: false, error }
    }

    // セッション別にグループ化
    const sessionGroups = {}
    data.forEach(log => {
      if (!sessionGroups[log.session_number]) {
        sessionGroups[log.session_number] = []
      }
      sessionGroups[log.session_number].push(log)
    })

    // 初回クリアまでのセッション数（ゲーム完了したセッションから判定）
    let firstClearSession = null
    Object.keys(sessionGroups).sort((a, b) => a - b).forEach(sessionNum => {
      const session = sessionGroups[sessionNum]
      const isCompleted = session.some(log => log.game_completed === true && log.operation === 'ゲーム完了')
      if (!firstClearSession && isCompleted) {
        firstClearSession = parseInt(sessionNum)
      }
    })

    // 最小手数（ゲーム完了したセッションから）
    const completedSessionLogs = Object.values(sessionGroups).filter(session => 
      session.some(log => log.game_completed === true && log.operation === 'ゲーム完了')
    )
    
    let minMoves = null
    if (completedSessionLogs.length > 0) {
      const movesCounts = completedSessionLogs.map(session => {
        const gameCompletedLog = session.find(log => log.game_completed === true && log.operation === 'ゲーム完了')
        return gameCompletedLog ? gameCompletedLog.moves_count : 0
      }).filter(moves => moves > 0)
      
      if (movesCounts.length > 0) {
        minMoves = Math.min(...movesCounts)
      }
    }

    return {
      success: true,
      data: {
        sessionsUntilFirstClear: firstClearSession || 0,
        minMoves,
        totalSessions: Object.keys(sessionGroups).length,
        sessionDetails: sessionGroups
      }
    }
  } catch (error) {
    console.error('ユーザー詳細統計取得中にエラー:', error)
    return { success: false, error }
  }
}

// ランキングデータを取得（初回クリアまでのセッション数）
export const getRankingData = async (type = 'sessions', limit = 10) => {
  try {
    // 全ユーザーのデータを取得
    const { data, error } = await supabase
      .from('game_logs')
      .select('*')
      .order('user_id', { ascending: true })
      .order('session_number', { ascending: true })

    if (error) {
      console.error('ランキングデータ取得エラー:', error)
      return { success: false, error }
    }

    // ユーザーごとに初回クリアまでのセッション数を計算
    const userFirstClearSessions = {}
    
    // ユーザー別にデータをグループ化
    const userDataGroups = {}
    data.forEach(log => {
      if (!userDataGroups[log.user_id]) {
        userDataGroups[log.user_id] = []
      }
      userDataGroups[log.user_id].push(log)
    })

    // 各ユーザーの初回クリアまでのセッション数を計算
    Object.keys(userDataGroups).forEach(userId => {
      const userLogs = userDataGroups[userId]
      
      // セッション別にグループ化
      const sessionGroups = {}
      userLogs.forEach(log => {
        if (!sessionGroups[log.session_number]) {
          sessionGroups[log.session_number] = []
        }
        sessionGroups[log.session_number].push(log)
      })

      // 初回クリアセッションを探す
      let firstClearSession = null
      let firstClearTimestamp = null
      
      Object.keys(sessionGroups).sort((a, b) => a - b).forEach(sessionNum => {
        const session = sessionGroups[sessionNum]
        const isCompleted = session.some(log => log.game_completed === true && log.operation === 'ゲーム完了')
        
        if (!firstClearSession && isCompleted) {
          firstClearSession = parseInt(sessionNum)
          const gameCompletedLog = session.find(log => log.game_completed === true && log.operation === 'ゲーム完了')
          firstClearTimestamp = gameCompletedLog ? gameCompletedLog.timestamp : null
        }
      })

      // 初回クリアした場合のみランキングに追加
      if (firstClearSession) {
        userFirstClearSessions[userId] = {
          user_id: userId,
          sessions_until_first_clear: firstClearSession,
          timestamp: firstClearTimestamp,
          session_number: firstClearSession
        }
      }
    })

    const ranking = Object.values(userFirstClearSessions)
      .sort((a, b) => a.sessions_until_first_clear - b.sessions_until_first_clear)
      .slice(0, limit)

    return {
      success: true,
      data: ranking
    }
  } catch (error) {
    console.error('ランキングデータ取得中にエラー:', error)
    return { success: false, error }
  }
}

// 全ユーザーのリストを取得
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('game_logs')
      .select('user_id')
      .neq('user_id', '')

    if (error) {
      console.error('ユーザーリスト取得エラー:', error)
      return { success: false, error }
    }

    const uniqueUsers = [...new Set(data.map(log => log.user_id))]
    return { success: true, data: uniqueUsers }
  } catch (error) {
    console.error('ユーザーリスト取得中にエラー:', error)
    return { success: false, error }
  }
}

// リアルタイム更新のサブスクリプション
export const subscribeToGameLogs = (callback) => {
  const subscription = supabase
    .channel('game_logs_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'game_logs' },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()

  return subscription
}

// ユーザープロフィール管理関数

// ユーザープロフィールを保存
export const saveUserProfile = async (userId, nickname) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert([{
        user_id: userId,
        nickname: nickname || null,
        updated_at: new Date().toISOString()
      }])

    if (error) {
      console.error('ユーザープロフィール保存エラー:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('ユーザープロフィール保存中にエラー:', error)
    return { success: false, error }
  }
}

// ユーザープロフィールを取得
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116は「データが見つからない」エラー
      console.error('ユーザープロフィール取得エラー:', error)
      return { success: false, error }
    }

    return { success: true, data: data || null }
  } catch (error) {
    console.error('ユーザープロフィール取得中にエラー:', error)
    return { success: false, error }
  }
}

// ユーザープロフィールを更新
export const updateUserProfile = async (userId, nickname) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        nickname: nickname || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) {
      console.error('ユーザープロフィール更新エラー:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('ユーザープロフィール更新中にエラー:', error)
    return { success: false, error }
  }
}

// 全ユーザーのプロフィールを取得
export const getAllUserProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('全ユーザープロフィール取得エラー:', error)
      return { success: false, error }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('全ユーザープロフィール取得中にエラー:', error)
    return { success: false, error }
  }
}

// ユーザーの表示名を取得（ニックネーム優先、未設定時はユーザーID）
export const getUserDisplayName = async (userId) => {
  try {
    const result = await getUserProfile(userId)
    if (result.success && result.data && result.data.nickname) {
      return result.data.nickname
    }
    return userId
  } catch (error) {
    console.error('ユーザー表示名取得中にエラー:', error)
    return userId
  }
}