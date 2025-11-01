// utils/translations.js
const translations = {
  zh: {
    // Camera page translations
    recording: '录制中',
    scene: '场景',
    secondsShort: '秒',
    backButton: '返回',
    flashOff: '🔦',
    flashOn: '💡',
    flashAuto: '⚡',
    cameraSwitch: '🔄',
    gridOverlay: '📏',
    gridOverlayOff: '📐',
    scriptToggle: '<',
    scriptToggleExpand: '>',
    movementInstructions: '动作指导',
    cameraInstructions: '摄像要求',
    unspecified: '未指定',
    noSpecialRequirements: '无特殊要求',
    followTemplate: '按模板拍摄',
    scriptLabel: '提词器',
    personPresent: '是否有人出现',
    deviceOrientation: '设备方向',
    backgroundInstructions: '背景说明',
    audioNotes: '音频备注',
    exampleFrame: '示例画面',
    yes: '是',
    no: '否',
    recordingComplete: '录制完成',
    recordingCompleteMessage: '场景录制成功！',
    duration: '时长',
    reRecord: '重新录制',
    submitScene: '提交场景',
    selectTemplate: '请选择录制模板',
    selectTemplateDesc: '选择合适的模板开始录制',
    chooseTemplate: '选择模板',
    cameraPermissionNeeded: '需要相机权限',
    cameraPermissionMessage: '请在设置中开启相机权限以使用录制功能',
    cameraPermissionOk: '好的',
    microphonePermissionNeeded: '需要麦克风权限',
    microphonePermissionMessage: '请在设置中开启麦克风权限以录制带声音的视频',
    openSettings: '去设置',
    templateNotFound: '模板加载失败',
    networkError: '网络错误',
    recordingFailed: '录制失败',
    loadingTemplate: '加载模板中...',
    uploadingScene: '上传场景中...',
    cameraError: '相机出现错误',
    cameraPermissionOk: '好的',
    
    // Scene selection page translations  
    loadingScenes: '加载场景中...',
    templateInfo: '模板说明',
    templateInfoDefault: '请按照具体说明录制每个场景',
    scenes: '场景',
    scenesSubtitle: '点击"录制"开始拍摄每个场景',
    aiSimilarity: 'AI相似度',
    aiSuggestions: 'AI建议',
    record: '录制',
    reRecordApproved: '重新录制',
    reRecordPending: '重新录制', 
    reRecordRejected: '修改重录',
    overallProgress: '总体进度',
    approved: '已通过',
    pending: '待审核',
    completionRate: '完成度',
    
    // Status translations
    statusApproved: '已批准',
    statusPending: '待审核', 
    statusRejected: '已拒绝',
    statusNotStarted: '未开始',
    
    // AI feedback
    sceneUploadSuccess: '场景上传成功！',
    similarityScore: '相似度分数',
    aiAnalysisResults: 'AI分析结果',
    continueButton: '继续',
    reRecordButton: '重新录制',
    
    // Error messages
    noRecordingToSubmit: '没有录制内容可提交',
    uploadFailed: '上传失败',
    uploadFailedInvalidResponse: '上传失败 - 响应无效',
    networkErrorPrefix: '网络错误: ',
    
    // Additional scene selection translations
    missingParameters: '缺少参数',
    templateNotFoundOrNoScenes: '模板未找到或无场景',
    failedToLoadTemplate: '加载模板失败',
    sceneNotFound: '场景未找到',
    noSubmissionFound: '未找到提交',
    status: '状态',
    feedback: '反馈',
    sceneFeedback: '场景反馈',
    loadingSceneDetails: '加载场景详情...',
    sceneDetails: '场景详情',
    managerFeedback: '管理员反馈',
    close: '关闭'
  },
  
  en: {
    // Camera page translations
    recording: 'Recording',
    scene: 'Scene',
    secondsShort: 's',
    backButton: 'Back',
    flashOff: '🔦',
    flashOn: '💡', 
    flashAuto: '⚡',
    cameraSwitch: '🔄',
    gridOverlay: '📏',
    gridOverlayOff: '📐',
    scriptToggle: '<',
    scriptToggleExpand: '>',
    personPosition: 'Person Position',
    movementInstructions: 'Movement Instructions',
    cameraInstructions: 'Camera Instructions',
    unspecified: 'Unspecified',
    noSpecialRequirements: 'No special requirements',
    followTemplate: 'Follow template',
    scriptLabel: 'Script',
    personPresent: 'Person Present',
    deviceOrientation: 'Device Orientation',
    backgroundInstructions: 'Background Instructions',
    audioNotes: 'Audio Notes',
    exampleFrame: 'Example Frame',
    yes: 'Yes',
    no: 'No',
    recordingComplete: 'Recording Complete',
    recordingCompleteMessage: 'Scene recorded successfully!',
    duration: 'Duration',
    reRecord: 'Re-record',
    submitScene: 'Submit Scene',
    selectTemplate: 'Please select recording template',
    selectTemplateDesc: 'Choose appropriate template to start recording',
    chooseTemplate: 'Choose Template',
    cameraPermissionNeeded: 'Camera permission needed',
    cameraPermissionMessage: 'Please enable camera permission in settings to use recording feature',
    cameraPermissionOk: 'OK',
    microphonePermissionNeeded: 'Microphone permission needed',
    microphonePermissionMessage: 'Please enable microphone to record videos with audio',
    openSettings: 'Open Settings',
    templateNotFound: 'Template loading failed',
    networkError: 'Network error',
    recordingFailed: 'Recording failed',
    loadingTemplate: 'Loading template...',
    uploadingScene: 'Uploading scene...',
    cameraError: 'Camera error occurred',
    cameraPermissionOk: 'OK',
    
    // Scene selection page translations
    loadingScenes: 'Loading scenes...',
    templateInfo: 'Template Instructions',
    templateInfoDefault: 'Please record each scene according to specific instructions',
    scenes: 'Scenes',
    scenesSubtitle: 'Click "Record" to start filming each scene',
    aiSimilarity: 'AI Similarity',
    aiSuggestions: 'AI Suggestions',
    record: 'Record',
    reRecordApproved: 'Re-record',
    reRecordPending: 'Re-record',
    reRecordRejected: 'Fix & Re-record',
    overallProgress: 'Overall Progress',
    approved: 'Approved',
    pending: 'Pending',
    completionRate: 'Completion',
    
    // Status translations
    statusApproved: 'Approved',
    statusPending: 'Pending',
    statusRejected: 'Rejected',
    statusNotStarted: 'Not Started',
    
    // AI feedback
    sceneUploadSuccess: 'Scene uploaded successfully!',
    similarityScore: 'Similarity Score',
    aiAnalysisResults: 'AI Analysis Results',
    continueButton: 'Continue',
    reRecordButton: 'Re-record',
    
    // Error messages
    noRecordingToSubmit: 'No recording to submit',
    uploadFailed: 'Upload failed',
    uploadFailedInvalidResponse: 'Upload failed - Invalid response',
    networkErrorPrefix: 'Network error: ',
    
    // Additional scene selection translations
    missingParameters: 'Missing parameters',
    templateNotFoundOrNoScenes: 'Template not found or no scenes',
    failedToLoadTemplate: 'Failed to load template',
    sceneNotFound: 'Scene not found',
    noSubmissionFound: 'No submission found',
    status: 'Status',
    feedback: 'Feedback',
    sceneFeedback: 'Scene Feedback',
    loadingSceneDetails: 'Loading scene details...',
    sceneDetails: 'Scene Details',
    managerFeedback: 'Manager Feedback',
    close: 'Close'
  }
}

// Get system language preference
const getSystemLanguage = () => {
  const systemInfo = wx.getSystemInfoSync()
  const language = systemInfo.language || 'zh_CN'
  return language.startsWith('zh') ? 'zh' : 'en'
}

// Get saved language preference or default to system language
const getLanguage = () => {
  return wx.getStorageSync('language') || getSystemLanguage()
}

// Save language preference
const setLanguage = (lang) => {
  wx.setStorageSync('language', lang)
}

// Translation function
const t = (key) => {
  const currentLang = getLanguage()
  return translations[currentLang][key] || translations['en'][key] || key
}

module.exports = {
  t,
  getLanguage,
  setLanguage,
  translations
}
