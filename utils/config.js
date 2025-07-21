// utils/config.js - 配置文件
const config = {
  // API配置
  api: {
    baseUrl: 'https://api.matrixads.com', // 替换为实际的API地址
    timeout: 60000,
    
    // API端点
    endpoints: {
      // 认证相关
      login: '/auth/login',
      validate: '/auth/validate',
      logout: '/auth/logout',
      
      // 模板相关
      templates: '/api/templates',
      templateDetail: '/api/templates/{id}',
      
      // 视频相关
      uploadVideo: '/api/videos/upload',
      submissions: '/api/videos/submissions',
      
      // 用户相关
      profile: '/api/user/profile',
      settings: '/api/user/settings'
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
      primary: '#3b82f6',
      secondary: '#1e293b',
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
  config.api.baseUrl = 'http://localhost:8080' // 本地开发环境
  config.dev.enableDebug = true
  config.dev.mockApi = true
} else {
  config.dev.enableDebug = false
  config.dev.mockApi = false
}

module.exports = config