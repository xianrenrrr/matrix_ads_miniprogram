// pages/index/index.js
const logger = require('../../utils/logger');
Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    allTemplates: [],
    recentTemplates: [],
    loading: true,
    managerName: null
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
      userInfo: app.globalData.userInfo
      // Keep loading: true until templates are loaded
    })

    if (app.globalData.isLoggedIn && app.globalData.userInfo) {
      // Load manager name and templates
      this.loadManagerName()
      this.loadAssignedTemplates()
    } else {
      // Not logged in, show page immediately
      this.setData({ loading: false })
    }
  },

  // 刷新数据
  refreshData() {
    this.loadManagerName()
    this.loadAssignedTemplates()
    this.loadAllTemplates()
  },

  // 加载管理员名称
  loadManagerName() {
    const app = getApp()
    if (!app.globalData.isLoggedIn || !app.globalData.userInfo) {
      return
    }

    const groupId = app.globalData.userInfo.groupId
    if (!groupId) {
      return
    }

    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-manager/groups/${groupId}`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        const isApiSuccess = res.data && res.data.success === true
        const responseData = res.data && res.data.data ? res.data.data : null

        if (res.statusCode === 200 && isApiSuccess && responseData) {
          this.setData({
            managerName: responseData.managerName || responseData.managerUsername
          })
          logger.log('管理员名称:', responseData.managerName || responseData.managerUsername)
        }
      },
      fail: (err) => {
        logger.error('获取管理员名称失败:', err)
      }
    })
  },

  // 加载已分配的模板（从 assignments）
  loadAssignedTemplates() {
    const app = getApp()
    if (!app.globalData.isLoggedIn || !app.globalData.userInfo) {
      logger.warn('用户未登录，无法加载模板')
      return
    }
    if (this._loadingAssigned) return
    this._loadingAssigned = true

    const groupId = app.globalData.userInfo.groupId
    if (!groupId) {
      logger.warn('用户没有分组，无法加载模板')
      this._loadingAssigned = false
      this.setData({ loading: false })
      return
    }

    logger.log('开始加载组模板，组ID:', groupId)

    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-manager/groups/${groupId}/templates`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        logger.log('分配模板响应:', res)

        const isApiSuccess = res.data && res.data.success === true;
        const responseData = res.data && res.data.data ? res.data.data : [];

        if (res.statusCode === 200 && isApiSuccess) {
          // Filter out expired templates
          const templates = responseData.filter(t => t.status !== 'expired')
          logger.log('获取到的有效模板数量:', templates.length)

          this.setData({
            recentTemplates: templates.slice(0, 3)
          })

          // 更新全局模板数据
          app.globalData.templates = templates

          // Now load all templates for display
          this.loadAllTemplates()
        } else {
          const errorMessage = (res.data && res.data.message) || (res.data && res.data.error) || '获取模板失败';
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
      complete: () => {
        this._loadingAssigned = false
        this.setData({ loading: false })
      }
    })
  },

  // 加载所有模板（用于“全部模版”区块），复用已验证的分配模板接口
  loadAllTemplates() {
    const app = getApp()
    if (!app.globalData.templates || !app.globalData.templates.length) return

    const templates = app.globalData.templates.map(t => ({
      ...t,
      // Use thumbnailUrl from API and convert to thumbnail for display
      thumbnail: t.thumbnailUrl && t.thumbnailUrl.startsWith('/')
        ? app.globalData.apiBaseUrl + t.thumbnailUrl
        : t.thumbnailUrl,
      _publishStatus: t.publishStatus || null,
      _titleClass: this.computeTitleClass(t.templateTitle)
    }))

    this.setData({ allTemplates: templates })
  },





  // 加载仪表板统计数据


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
      // Don't set currentTemplate here - let scene-selection fetch full template data
      // The lightweight template doesn't have scenes array

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
