// utils/config.js - 配置文件
const config = {
  // API配置
  api: {
    baseUrl: 'https://matrix-ads-backend.onrender.com', // 替换为实际的API地址
    timeout: 60000,
    
    // API端点
    endpoints: {
      // 认证相关
      login: '/auth/login',
      validate: '/auth/validate', 
      qrLogin: '/qr/validate',
      
      // 模板相关 (Content Creator endpoints)
      templates: '/content-creator/templates',
      templateDetail: '/content-creator/templates/{id}',
      subscribeTemplate: '/content-creator/users/{userId}/subscribe',
      subscribedTemplates: '/content-creator/users/{userId}/subscribed-templates',
      
      // 视频相关 (Content Creator endpoints) 
      uploadVideo: '/content-creator/videos/upload',
      submissions: '/content-creator/users/{userId}/submissions',
      checkSubmission: '/content-creator/videos/submission',
      
      // 用户相关
      profile: '/content-creator/users/{userId}',
      settings: '/content-creator/users/{userId}/settings',
      notifications: '/content-creator/users/{userId}/notifications'
    }
  },
  
  // WeChat小程序配置
  wechat: {
    appId: 'your-wechat-mini-program-app-id', // 替换为实际的小程序AppID
    version: '1.0.0'
  },
  
  // Firebase配置
  firebase: {
    storageUrl: 'gs://your-firebase-storage-bucket', // 替换为实际的Firebase Storage地址
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFormats: ['mp4', 'mov']
  },
  
  // 录制配置
  recording: {
    maxDuration: 300, // 5分钟
    minDuration: 3,   // 3秒
    quality: 'high',  // 'high' | 'medium' | 'low'
    fps: 30
  },
  
  // 界面配置
  ui: {
    theme: {
      primary: '#1f2937',
      secondary: '#6b7280',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    animation: {
      duration: 300
    }
  },
  
  // 开发环境配置
  dev: {
    enableDebug: true,
    mockApi: false,
    showLog: true
  }
}

// 根据环境切换配置
const env = 'development' // 'development' | 'production'

if (env === 'development') {
  config.api.baseUrl = 'https://matrix-ads-backend.onrender.com' // 使用实际后端地址
  config.dev.enableDebug = true
  config.dev.mockApi = false
} else {
  config.dev.enableDebug = false
  config.dev.mockApi = false
}

// Add backward compatibility
config.API_BASE_URL = config.api.baseUrl

module.exports = config