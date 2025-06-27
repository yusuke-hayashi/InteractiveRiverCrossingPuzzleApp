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