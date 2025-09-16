// pages/index/index.js
const logger = require('../../utils/logger');
Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    stats: {
      availableTemplates: 0,
      recordedVideos: 0,
      publishedVideos: 0
    },
    allTemplates: [],
    availableDigitClass: 'num-1w',
    recordedDigitClass: 'num-1w',
    publishedDigitClass: 'num-1w',
    recentTemplates: [],
    loading: true
  },

  onLoad() {
    logger.log('首页加载')
    this._initialShown = false
    this._loadingAssigned = false
    this._loadingAll = false
    this._loadingStats = false
    this._downloading = false
    this._statusFetched = new Set()
    this.initPage()
  },

  onShow() {
    logger.log('首页显示')
    if (!this._initialShown) {
      this._initialShown = true
      return
    }
    this.refreshData()
  },

  // 初始化页面
  initPage() {
    const app = getApp()
    
    // 检查登录状态（当前不强制跳转，便于直接查看首页UI）

    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      userInfo: app.globalData.userInfo,
      loading: false
    })
    
    if (app.globalData.isLoggedIn && app.globalData.userInfo) {
      this.loadAssignedTemplates()
      this.loadDashboardStats()
    }
    // Always load all templates for the "全部模版" section
    this.loadAllTemplates()
  },

  // 刷新数据
  refreshData() {
    this.loadAssignedTemplates()
    this.loadDashboardStats()
    this.loadAllTemplates()
  },

  // 加载已分配的模板
  loadAssignedTemplates() {
    const app = getApp()
    if (!app.globalData.isLoggedIn || !app.globalData.userInfo) {
      logger.warn('用户未登录，无法加载模板')
      return
    }
    if (this._loadingAssigned) return
    this._loadingAssigned = true

    const userId = app.globalData.userInfo.id
    logger.log('开始加载用户模板，用户ID:', userId)

    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-creator/users/${userId}/assigned-templates`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        logger.log('分配模板响应:', res)
        
        // Handle new ApiResponse format: {success, message, data, error}
        const isApiSuccess = res.data && res.data.success === true;
        const responseData = res.data && res.data.data ? res.data.data : [];
        
        if (res.statusCode === 200 && isApiSuccess) {
          const templates = responseData
          logger.log('获取到的模板数量:', templates.length)
          
          // 更新统计数据
          const av = templates.length || 0
          this.setData({
            'stats.availableTemplates': av,
            availableDigitClass: this.computeDigitClass(av),
            recentTemplates: templates.slice(0, 3) // 显示最近3个模板
          })
          
          // 更新全局模板数据
          app.globalData.templates = templates
        } else {
          const errorMessage = res.data && res.data.error ? res.data.error : '获取模板失败';
          logger.warn('获取模板失败:', errorMessage)
          wx.showToast({
            title: errorMessage,
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        logger.error('获取模板请求失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      },
      complete: () => { this._loadingAssigned = false }
    })
  },

  // 加载所有模板（用于“全部模版”区块），复用已验证的分配模板接口
  loadAllTemplates() {
    const app = getApp()
    if (!app.globalData.isLoggedIn || !app.globalData.userInfo) {
      return
    }
    if (this._loadingAll) return
    this._loadingAll = true
    const userId = app.globalData.userInfo.id
    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-creator/users/${userId}/assigned-templates`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        const isApiSuccess = res.data && res.data.success === true
        const responseData = res.data && res.data.data ? res.data.data : []
        if (res.statusCode === 200 && isApiSuccess) {
          const templates = responseData.map(t => ({
            ...t,
            duration: t.totalVideoLength,
            sceneCount: (t.scenes && t.scenes.length) || 0,
            thumbnail: (t.scenes && t.scenes[0] && t.scenes[0].exampleFrame) || '/assets/default-template.jpg',
            _titleClass: this.computeTitleClass(t.templateTitle)
          }))
          this.setData({ allTemplates: templates })
          app.globalData.templates = templates
          // Fetch publish status for each template to switch button to 下载通过视频 when published
          this.populatePublishStatusForTemplates(templates)
        }
      },
      complete: () => { this._loadingAll = false }
    })
  },

  // For each template, query submitted-videos composite id to get publishStatus and compiledVideoUrl
  populatePublishStatusForTemplates(templates) {
    const app = getApp()
    const userId = app.globalData?.userInfo?.id
    if (!userId || !Array.isArray(templates)) return
    templates.forEach((tpl, idx) => {
      const compositeId = `${userId}_${tpl.id}`
      if (this._statusFetched.has(compositeId)) return
      wx.request({
        url: `${app.globalData.apiBaseUrl}/content-creator/scenes/submitted-videos/${compositeId}`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
        },
        success: (res) => {
          const ok = res.data && res.data.success === true
          const data = ok && (res.data.data || res.data)
          if (ok && data) {
            const publishStatus = data.publishStatus || null
            const compiledVideoUrl = data.compiledVideoSignedUrl || data.compiledVideoUrl || null
            const key = `allTemplates[${idx}]`
            this.setData({
              [`${key}._publishStatus`]: publishStatus,
              [`${key}._compiledVideoUrl`]: compiledVideoUrl
            })
            this._statusFetched.add(compositeId)
          }
        }
      })
    })
  },

  // 加载仪表板统计数据
  loadDashboardStats() {
    const app = getApp()
    if (!app.globalData.isLoggedIn || !app.globalData.userInfo) {
      logger.warn('用户未登录，无法加载统计数据')
      return
    }

    const userId = app.globalData.userInfo.id

    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-creator/users/${userId}/dashboard`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        logger.log('仪表板统计响应:', res)
        
        // Handle new ApiResponse format: {success, message, data, error}
        const isApiSuccess = res.data && res.data.success === true;
        const responseData = res.data && res.data.data ? res.data.data : {};
        
        if (res.statusCode === 200 && isApiSuccess) {
          const av = responseData.assignedTemplates || 0
          const rv = responseData.recordedVideos || 0
          const pv = responseData.publishedVideos || 0
          this.setData({
            stats: {
              availableTemplates: av,
              recordedVideos: rv,
              publishedVideos: pv
            },
            availableDigitClass: this.computeDigitClass(av),
            recordedDigitClass: this.computeDigitClass(rv),
            publishedDigitClass: this.computeDigitClass(pv)
          })
        } else {
          const errorMessage = res.data && res.data.error ? res.data.error : '获取统计数据失败';
          logger.warn('获取统计数据失败:', errorMessage)
      }
      },
      fail: (err) => {
        logger.error('获取统计数据请求失败:', err)
      }
    })
  },

  // 计算数字宽度class
  computeDigitClass(n) {
    const len = String(Math.abs(parseInt(n || 0, 10))).length
    if (len <= 1) return 'num-1w'
    if (len === 2) return 'num-2w'
    return 'num-3w'
  },

  // 根据标题长度决定字号（两行内尽量容纳）
  computeTitleClass(title) {
    if (!title) return ''
    const len = String(title).length
    // Only use extra small size for extremely long titles that won't fit in 2 lines
    if (len > 25) return 'tpl-title-xs'  // Very long titles only
    return ''  // Default smaller size (28rpx) for all other titles
  },

  // 选择模板进行录制
  selectTemplate(e) {
    const templateId = e.currentTarget.dataset.id
    logger.log('选择模板ID:', templateId)
    
    const app = getApp()
    const templates = app.globalData.templates || []
    const template = templates.find(t => t.id === templateId)
    
    if (template) {
      // 保存选中的模板
      app.globalData.currentTemplate = template
      
      // 跳转到场景选择页面
      wx.navigateTo({
        url: `/pages/scene-selection/scene-selection?templateId=${template.id}&userId=${app.globalData.userInfo.id}`
      })
    } else {
      wx.showToast({
        title: '模板不存在',
        icon: 'none'
      })
    }
  },

  // 下载通过视频（从模板卡片）
  downloadPublishedFromCard(e) {
    if (this._downloading) return
    this._downloading = true
    const idx = e.currentTarget.dataset.index
    const item = this.data.allTemplates[idx]
    const url = item && item._compiledVideoUrl
    if (!url) {
      wx.showToast({ title: '暂无已发布视频', icon: 'none' })
      this._downloading = false
      return
    }
    wx.showLoading({ title: '下载中...' })
    const targetPath = `${wx.env.USER_DATA_PATH}/compiled_${Date.now()}.mp4`
    wx.downloadFile({
      url,
      filePath: targetPath,
      success: (res) => {
        const filePath = res.filePath || res.tempFilePath
        if (res.statusCode !== 200 || !filePath) {
          wx.hideLoading();
          wx.showToast({ title: '下载失败', icon: 'none' })
          this._downloading = false
          return
        }
        wx.saveVideoToPhotosAlbum({
          filePath,
          success: () => { wx.hideLoading(); wx.showToast({ title: '保存成功', icon: 'success' }) },
          fail: (err) => {
            wx.hideLoading();
            if (err && /auth/.test(err.errMsg || '')) {
              wx.showModal({
                title: '需要相册权限',
                content: '请在设置中允许保存到相册后重试',
                success: (r) => { if (r.confirm) wx.openSetting({}) }
              })
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' })
            }
            this._downloading = false
          }
        })
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '下载失败', icon: 'none' }); this._downloading = false },
      complete: () => { this._downloading = false }
    })
  },

  // 登录
  handleLogin() {
    const app = getApp()
    app.redirectToLogin()
  },


  // 已移除与模板页面相关的导航

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.logout()
        }
      }
    })
  },


  // 下拉刷新
  onPullDownRefresh() {
    this.refreshData()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  }
})
