// pages/camera/camera.js
const { t } = require('../../utils/translations')
const { toZh } = require('../../utils/objectLabels')

Page({
  data: {
    t: t, // Translation function
    toZh: toZh, // Chinese label function
    selectedTemplate: null,
    currentScene: 0,
    isRecording: false,
    recordedVideos: [],
    cameraPosition: 'back', // 'front' | 'back'
    flashMode: 'off', // 'off' | 'on' | 'auto'
    recordTime: 0,
    maxRecordTime: 60,
    showOverlay: true,
    currentScript: '',
    sceneProgress: 0,
    showScriptSidebar: false, // 显示脚本侧边栏
    showRecordingCompleteModal: false, // 显示录制完成弹窗
    showUploadFailureModal: false, // 显示上传失败弹窗
    uploadErrorMessage: '', // 上传错误信息
    pendingUploadData: null, // 待上传的数据
    // 九宫格网格
    gridOverlay: [], // 选中的网格块编号 [1,2,3,4,5,6,7,8,9]
    gridLabels: [], // 每个网格块的标签
    // 对象覆盖层
    overlayType: 'grid', // 'grid' | 'objects' | 'polygons'
    objectOverlay: [], // 对象覆盖数据 {label, confidence, x, y, w, h}
    polygonOverlay: [], // 多边形覆盖数据
    polygonOverlayPixels: [], // 多边形覆盖像素坐标
    overlayRectsPixels: [], // MVP: [{left, top, width, height, colorHex, label, labelLocalized, confidence}]
    legend: [], // 图例数据 from backend scene.legend, or derived from overlayObjects order
    sourceAspect: '9:16', // 源视频比例
    // 指导信息
    backgroundInstructions: '',
    cameraInstructions: '',
    movementInstructions: '',
    // Translated strings for modal buttons
    reRecordText: t('reRecord'),
    submitSceneText: t('submitScene'),
    recordingCompleteText: t('recordingComplete'),
    recordingCompleteMessageText: t('recordingCompleteMessage'),
    durationText: t('duration'),
    secondsShortText: t('secondsShort')
  },

  onLoad(options) {
    console.log('录制页面加载', options)
    
    // 保存传入的参数
    this.setData({
      templateId: options.templateId,
      userId: options.userId,
      sceneIndex: parseInt(options.sceneIndex || '0'),
      sceneNumber: parseInt(options.sceneNumber || '1'),
      returnPage: options.returnPage || 'scene-selection'
    })
    
    // 如果传入了模板ID，加载模板数据
    if (options.templateId) {
      this.loadTemplate(options.templateId)
    } else {
      // 显示模板选择
      this.showTemplateSelector()
    }
  },

  onShow() {
    console.log('录制页面显示')
    this.initCamera()
    // 更新覆盖层像素坐标（处理屏幕旋转等）
    if (this.data.selectedTemplate) {
      this.updateOverlayPixels()
    }
  },

  onHide() {
    console.log('录制页面隐藏')
    this.stopRecording()
  },

  // 初始化相机
  initCamera() {
    const cameraContext = wx.createCameraContext()
    this.cameraContext = cameraContext
    
    // 检查相机权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.camera']) {
          wx.authorize({
            scope: 'scope.camera',
            success: () => {
              console.log('相机权限获取成功')
            },
            fail: () => {
              wx.showModal({
                title: t('cameraPermissionNeeded'),
                content: t('cameraPermissionMessage'),
                showCancel: false,
                confirmText: t('cameraPermissionOk')
              })
            }
          })
        }
      }
    })
  },

  // 加载模板
  loadTemplate(templateId) {
    const app = getApp()
    
    // 优先使用全局已选中的模板
    if (app.globalData.currentTemplate && app.globalData.currentTemplate.id === templateId) {
      this.setupTemplate(app.globalData.currentTemplate)
      return
    }
    
    // 从已加载的模板中查找
    if (app.globalData.templates) {
      const template = app.globalData.templates.find(t => t.id === templateId)
      if (template) {
        this.setupTemplate(template)
        return
      }
    }
    
    // 如果没有找到，从API加载
    wx.showLoading({ title: t('loadingTemplate') })
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-creator/templates/${templateId}`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        console.log('加载模板响应:', res)
        
        // Handle new ApiResponse format: {success, message, data, error}
        const isApiSuccess = res.data && res.data.success === true;
        const responseData = res.data && res.data.data ? res.data.data : {};
        
        if (res.statusCode === 200 && isApiSuccess) {
          this.setupTemplate(responseData)
        } else {
          const errorMessage = res.data && res.data.error ? res.data.error : t('templateNotFound');
          wx.showToast({
            title: errorMessage,
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('加载模板失败:', err)
        wx.showToast({
          title: t('networkError'),
          icon: 'none'
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  // 设置模板数据
  setupTemplate(template) {
    console.log('设置模板:', template)
    
    const scenes = template.scenes || []
    const sceneIndex = this.data.sceneIndex || 0
    const currentScene = scenes[sceneIndex] || {}
    
    // 检查当前场景的覆盖类型
    const overlayType = currentScene.overlayType || 'grid'
    const isPolygonOverlay = overlayType === 'polygons'
    const isObjectOverlay = overlayType === 'objects'
    
    console.log(`场景 ${sceneIndex + 1} 覆盖类型:`, overlayType)
    
    // 设置基础数据
    let updateData = {
      selectedTemplate: template,
      currentScene: sceneIndex,
      maxRecordTime: currentScene.sceneDurationInSeconds || 30,
      currentScript: currentScene.scriptLine || '',
      sceneProgress: scenes.length > 0 ? (sceneIndex + 1) / scenes.length : 0,
      overlayType: overlayType,
      sourceAspect: currentScene.sourceAspect || '9:16',
      legend: currentScene.legend || [],
      // 相机设置
      cameraPosition: this.getCameraPosition(currentScene.personPosition),
      // 指导信息
      backgroundInstructions: currentScene.backgroundInstructions || '',
      cameraInstructions: currentScene.specificCameraInstructions || '',
      movementInstructions: currentScene.movementInstructions || ''
    }
    
    if (isPolygonOverlay && currentScene.overlayPolygons && currentScene.overlayPolygons.length > 0) {
      // 使用多边形覆盖模式
      console.log('使用多边形覆盖模式，多边形数量:', currentScene.overlayPolygons.length)
      updateData.polygonOverlay = currentScene.overlayPolygons
      updateData.objectOverlay = []
      updateData.gridOverlay = []
      updateData.gridLabels = []
    } else if (isObjectOverlay && currentScene.overlayObjects && currentScene.overlayObjects.length > 0) {
      // MVP: 使用对象覆盖模式
      console.log('MVP: 使用对象覆盖模式，对象数量:', currentScene.overlayObjects.length)
      updateData.objectOverlay = this.processOverlayObjects(currentScene.overlayObjects)
      // Process legend to add confidencePercent
      const legend = currentScene.legend || []
      updateData.legend = legend.map(item => ({
        ...item,
        confidencePercent: Math.round((item.confidence || 0) * 100)
      }))
      updateData.polygonOverlay = []
      updateData.gridOverlay = []
      updateData.gridLabels = []
    } else {
      // 使用网格覆盖模式（默认或回退）
      console.log('使用网格覆盖模式')
      updateData.overlayType = 'grid'
      updateData.gridOverlay = currentScene.screenGridOverlay || []
      updateData.gridLabels = currentScene.screenGridOverlayLabels || []
      updateData.objectOverlay = []
      updateData.polygonOverlay = []
      updateData.legend = [] // Clear legend for grid mode
      updateData.overlayRectsPixels = [] // Clear rect pixels for grid mode
    }
    
    this.setData(updateData)
    
    // 更新覆盖层像素坐标
    this.updateOverlayPixels()
    
    console.log('模板设置完成，当前场景:', currentScene)
    console.log('覆盖模式:', updateData.overlayType, '对象数量:', updateData.objectOverlay.length)
  },
  
  // 颜色调色板 - 第一个是红色
  getColorPalette() {
    return [
      '#FF3B30', // Red - FIRST overlay
      '#0A84FF', // Blue
      '#34C759', // Green  
      '#FF9F0A', // Orange
      '#AF52DE', // Purple
      '#32ADE6', // Light Blue
      '#FF375F'  // Pink
    ]
  },
  
  // 更新覆盖层像素坐标
  updateOverlayPixels() {
    const that = this
    
    // 获取预览容器尺寸
    wx.createSelectorQuery()
      .select('#previewContainer')
      .boundingClientRect(rect => {
        if (!rect) return
        
        const containerW = rect.width
        const containerH = rect.height
        const sourceAspect = that.data.sourceAspect || '9:16'
        
        // 解析比例
        const [vw, vh] = sourceAspect.split(':').map(Number)
        
        // 计算 object-fit: cover 的缩放和偏移
        const scale = Math.max(containerW / vw, containerH / vh)
        const drawnW = vw * scale
        const drawnH = vh * scale
        const offsetX = (containerW - drawnW) / 2
        const offsetY = (containerH - drawnH) / 2
        
        const colors = that.getColorPalette()
        
        // 处理多边形覆盖
        if (that.data.overlayType === 'polygons' && that.data.polygonOverlay.length > 0) {
          that.drawPolygonCanvas(containerW, containerH, that.data.polygonOverlay)
        }
        
        // MVP: 处理对象覆盖 (Canvas based)
        if (that.data.overlayType === 'objects' && that.data.objectOverlay.length > 0) {
          const scene = {
            overlayObjects: that.data.objectOverlay,
            sourceAspect: sourceAspect,
            legend: that.data.legend
          }
          that.updateOverlayPixelsForScene(scene, containerW, containerH, offsetX, offsetY, drawnW, drawnH, colors)
        }
      })
      .exec()
  },
  
  // MVP: Update overlay pixels for scene
  updateOverlayPixelsForScene(scene, containerW, containerH, offsetX, offsetY, drawnW, drawnH, colors) {
    const objs = scene.overlayObjects || []
    
    // Compute pixel rectangles  
    const overlayRectsPixels = []
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i]
      const left = offsetX + (o.x || 0) * drawnW
      const top = offsetY + (o.y || 0) * drawnH
      const width = (o.width || o.w || 0) * drawnW
      const height = (o.height || o.h || 0) * drawnH
      const color = (scene.legend && scene.legend[i]) ? scene.legend[i].colorHex : colors[i % colors.length]
      const labelZh = o.labelZh || o.labelLocalized || toZh(o.label) || o.label || '未知'
      
      overlayRectsPixels.push({
        left, top, width, height, 
        colorHex: color, 
        label: o.label, 
        labelZh: labelZh,
        labelLocalized: o.labelLocalized || labelZh, 
        confidence: o.confidence
      })
    }
    
    this.setData({ overlayRectsPixels })
    
    // Draw on canvas
    this.drawOverlayCanvas(containerW, containerH, overlayRectsPixels)
  },
  
  // MVP: Draw overlay canvas with rectangles
  drawOverlayCanvas(containerW, containerH, rects) {
    const ctx = wx.createCanvasContext('overlayCanvas', this)
    ctx.clearRect(0, 0, containerW, containerH)
    
    // Set canvas size to container size
    ctx.setCanvasSize ? ctx.setCanvasSize(containerW, containerH) : null
    
    rects.forEach((rect, index) => {
      const { left, top, width, height, colorHex, labelLocalized, label } = rect
      
      // Draw dashed rectangle (stroke only)
      ctx.setStrokeStyle(colorHex)
      ctx.setLineWidth(2)
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.rect(left, top, width, height)
      ctx.stroke()
      
      // Draw Chinese label chip at top-left
      const labelText = rect.labelZh || labelLocalized || toZh(label) || label || '未知'
      if (labelText) {
        const chipX = left + 4
        const chipY = top + 4
        const chipWidth = 80
        const chipHeight = 20
        
        // Background chip
        ctx.setFillStyle(colorHex)
        ctx.fillRect(chipX, chipY, chipWidth, chipHeight)
        
        // Label text
        ctx.setFillStyle('#FFFFFF')
        ctx.setFontSize(12)
        ctx.fillText(labelText, chipX + 4, chipY + 14)
      }
    })
    
    ctx.draw()
  },
  
  // 绘制多边形
  drawPolygons(offsetX, offsetY, drawnW, drawnH, colors) {
    const ctx = wx.createCanvasContext('polygonCanvas')
    const polygons = this.data.polygonOverlay
    
    polygons.forEach((polygon, index) => {
      const color = colors[index % colors.length]
      ctx.setStrokeStyle(color)
      ctx.setLineWidth(2)
      ctx.setLineDash([5, 5])
      
      // 绘制多边形
      if (polygon.points && polygon.points.length > 0) {
        ctx.beginPath()
        polygon.points.forEach((point, i) => {
          const px = offsetX + point.x * drawnW
          const py = offsetY + point.y * drawnH
          if (i === 0) {
            ctx.moveTo(px, py)
          } else {
            ctx.lineTo(px, py)
          }
        })
        ctx.closePath()
        ctx.stroke()
        
        // 绘制标签
        const labelX = offsetX + polygon.points[0].x * drawnW + 10
        const labelY = offsetY + polygon.points[0].y * drawnH + 20
        
        ctx.setFillStyle(color)
        ctx.fillRect(labelX - 2, labelY - 14, 80, 20)
        
        ctx.setFillStyle('#FFFFFF')
        ctx.setFontSize(12)
        const labelText = polygon.labelLocalized || toZh(polygon.label) || polygon.label || ''
        ctx.fillText(labelText, labelX, labelY)
      }
    })
    
    ctx.draw()
  },
  
  // 根据人物位置确定相机方向
  getCameraPosition(personPosition) {
    // 默认使用后置摄像头（拍摄其他人或物品）
    // 只有在特殊情况下才使用前置摄像头（比如自拍场景）
    if (personPosition && personPosition.includes('自拍') || personPosition === 'Selfie') {
      return 'front'
    }
    return 'back'  // 默认后置摄像头
  },

  /**
   * 处理覆盖对象数组，规范化字段名称并验证数据
   * @param {Array} overlayObjects - 原始覆盖对象数组
   * @returns {Array} 处理后的覆盖对象数组
   */
  processOverlayObjects(overlayObjects) {
    if (!Array.isArray(overlayObjects)) {
      console.warn('overlayObjects is not an array:', overlayObjects)
      return []
    }
    
    return overlayObjects.map((obj, index) => {
      // 规范化字段名称（向后兼容）
      const confidence = Math.max(0, Math.min(1, obj.confidence || 0))
      const processed = {
        label: obj.label || '',
        confidence: confidence,
        confidencePercent: Math.round(confidence * 100),
        x: Math.max(0, Math.min(1, obj.x || 0)),
        y: Math.max(0, Math.min(1, obj.y || 0)),
        // 优先使用新字段名，后备到旧字段名
        width: Math.max(0, Math.min(1, obj.width || obj.w || 0)),
        height: Math.max(0, Math.min(1, obj.height || obj.h || 0))
      }
      
      // 验证边界框完整性
      if (processed.x + processed.width > 1) {
        console.warn(`Object ${index}: x + width exceeds bounds, clamping`)
        processed.width = 1 - processed.x
      }
      
      if (processed.y + processed.height > 1) {
        console.warn(`Object ${index}: y + height exceeds bounds, clamping`)
        processed.height = 1 - processed.y
      }
      
      // 保留旧字段名用于向后兼容
      processed.w = processed.width
      processed.h = processed.height
      
      return processed
    }).filter(obj => {
      // 过滤掉无效对象
      return obj.width > 0 && obj.height > 0 && obj.label.length > 0
    })
  },

  /**
   * 将归一化边界框转换为像素矩形
   * @param {Object} normalizedBox - 归一化边界框 {x, y, width, height} 范围 [0,1]
   * @param {number} containerWidth - 预览容器宽度 (px)
   * @param {number} containerHeight - 预览容器高度 (px) 
   * @param {string} objectFit - 对象适应模式 ('cover' | 'contain' | 'fill')
   * @returns {Object} 像素矩形 {left, top, width, height}
   */
  convertNormalizedToPixelRect(normalizedBox, containerWidth, containerHeight, objectFit = 'cover') {
    const { x, y, width, height } = normalizedBox
    
    // 验证输入参数
    if (typeof x !== 'number' || typeof y !== 'number' || 
        typeof width !== 'number' || typeof height !== 'number' ||
        x < 0 || y < 0 || width <= 0 || height <= 0 ||
        x + width > 1 || y + height > 1) {
      console.warn('Invalid normalized box coordinates:', normalizedBox)
      return { left: 0, top: 0, width: 0, height: 0 }
    }
    
    if (containerWidth <= 0 || containerHeight <= 0) {
      console.warn('Invalid container dimensions:', { containerWidth, containerHeight })
      return { left: 0, top: 0, width: 0, height: 0 }
    }
    
    let scaleX, scaleY, offsetX = 0, offsetY = 0
    
    switch (objectFit) {
      case 'contain':
        // 保持宽高比，全部内容可见，可能有黑边
        const containScale = Math.min(containerWidth, containerHeight)
        scaleX = scaleY = containScale
        offsetX = (containerWidth - containScale) / 2
        offsetY = (containerHeight - containScale) / 2
        break
        
      case 'fill':
        // 拉伸填满容器，可能变形
        scaleX = containerWidth
        scaleY = containerHeight
        break
        
      case 'cover':
      default:
        // 保持宽高比，填满容器，可能裁剪
        const coverScale = Math.max(containerWidth, containerHeight)
        scaleX = scaleY = coverScale
        offsetX = (containerWidth - coverScale) / 2
        offsetY = (containerHeight - coverScale) / 2
        break
    }
    
    // 转换坐标
    const pixelRect = {
      left: Math.round(x * scaleX + offsetX),
      top: Math.round(y * scaleY + offsetY),
      width: Math.round(width * scaleX),
      height: Math.round(height * scaleY)
    }
    
    // 确保像素坐标在容器范围内
    pixelRect.left = Math.max(0, Math.min(containerWidth - pixelRect.width, pixelRect.left))
    pixelRect.top = Math.max(0, Math.min(containerHeight - pixelRect.height, pixelRect.top))
    pixelRect.width = Math.min(containerWidth - pixelRect.left, pixelRect.width)
    pixelRect.height = Math.min(containerHeight - pixelRect.top, pixelRect.height)
    
    return pixelRect
  },

  // 显示模板选择器
  showTemplateSelector() {
    wx.showActionSheet({
      itemList: ['产品展示模板', '品牌故事模板', '用户评价模板'],
      success: (res) => {
        const templateIds = ['template1', 'template2', 'template3']
        this.loadTemplate(templateIds[res.tapIndex])
      },
      fail: () => {
        wx.navigateBack()
      }
    })
  },

  // 开始录制
  startRecording() {
    if (!this.data.selectedTemplate) {
      wx.showToast({
        title: t('selectTemplate'),
        icon: 'none'
      })
      return
    }

    const cameraContext = this.cameraContext
    
    cameraContext.startRecord({
      success: () => {
        console.log('开始录制')
        this.setData({ 
          isRecording: true,
          recordTime: 0
        })
        this.startTimer()
      },
      fail: (err) => {
        console.error('录制失败', err)
        wx.showToast({
          title: t('recordingFailed'),
          icon: 'none'
        })
      }
    })
  },

  // 停止录制
  stopRecording() {
    if (!this.data.isRecording) return

    const cameraContext = this.cameraContext
    
    cameraContext.stopRecord({
      success: (res) => {
        console.log('录制完成', res)
        this.setData({ isRecording: false })
        this.stopTimer()
        
        // 保存录制的视频
        this.saveRecordedVideo(res.tempVideoPath)
      },
      fail: (err) => {
        console.error('停止录制失败', err)
        this.setData({ isRecording: false })
        this.stopTimer()
      }
    })
  },

  // 保存录制的视频
  saveRecordedVideo(tempPath) {
    const sceneIndex = this.data.sceneIndex || 0
    const sceneNumber = this.data.sceneNumber || 1
    const template = this.data.selectedTemplate
    
    const videoData = {
      sceneNumber: sceneNumber,
      sceneTitle: template.scenes[sceneIndex].sceneTitle,
      tempPath: tempPath,
      duration: this.data.recordTime,
      timestamp: Date.now()
    }
    
    this.setData({ 
      currentRecording: videoData,
      showRecordingCompleteModal: true
    })
  },

  // 提交当前场景
  submitCurrentScene() {
    const recording = this.data.currentRecording
    if (!recording) {
      wx.showToast({
        title: t('noRecordingToSubmit'),
        icon: 'error'
      })
      return
    }

    wx.showLoading({ title: t('uploadingScene') })
    this.uploadSceneVideo(recording)
  },

  // 重录当前场景
  retakeScene() {
    this.setData({ 
      showRecordingCompleteModal: false,
      currentRecording: null,
      recordTime: 0
    })
  },

  // 上传场景视频
  uploadSceneVideo(recording) {
    const app = getApp()
    var config = require('../../utils/config')
    
    console.log('Starting scene upload:', {
      url: config.api.baseUrl + '/content-creator/scenes/upload',
      templateId: this.data.templateId,
      userId: this.data.userId,
      sceneNumber: recording.sceneNumber,
      filePath: recording.tempPath
    })
    
    wx.uploadFile({
      url: config.api.baseUrl + '/content-creator/scenes/upload',
      filePath: recording.tempPath,
      name: 'file',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('access_token'),
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      formData: {
        templateId: this.data.templateId,
        userId: this.data.userId,
        sceneNumber: recording.sceneNumber,
        sceneTitle: recording.sceneTitle || ('Scene ' + recording.sceneNumber)
      },
      success: (response) => {
        console.log('Upload response:', {
          statusCode: response.statusCode,
          data: response.data,
          header: response.header
        })
        
        try {
          var parsedResponse = JSON.parse(response.data)
          wx.hideLoading()

          // Handle new ApiResponse format: {success, message, data, error}
          const isApiSuccess = parsedResponse && parsedResponse.success === true;
          const responseData = parsedResponse && parsedResponse.data ? parsedResponse.data : {};

          if (response.statusCode === 200 && isApiSuccess) {
            console.log('Upload successful, showing AI feedback')
            // Show AI feedback if available
            this.showAIFeedback(responseData)
          } else {
            const errorMessage = parsedResponse && (parsedResponse.error || parsedResponse.message) || t('uploadFailed');
            console.error('Upload failed with message:', errorMessage)
            wx.showToast({
              title: errorMessage,
              icon: 'error'
            })
          }
        } catch (error) {
          console.error('Error parsing response:', error, 'Raw response:', response.data)
          wx.hideLoading()
          wx.showToast({
            title: t('uploadFailedInvalidResponse'),
            icon: 'error'
          })
        }
      },
      fail: (error) => {
        console.error('Upload request failed:', error)
        wx.hideLoading()
        wx.showToast({
          title: t('networkErrorPrefix') + (error.errMsg || t('uploadFailed')),
          icon: 'error'
        })
      }
    })
  },

  // 显示AI反馈
  showAIFeedback(submissionData) {
    const similarity = Math.round((submissionData.similarityScore || 0) * 100)
    const suggestions = submissionData.aiSuggestions || []
    
    let message = t('sceneUploadSuccess') + '\n\n'
    message += t('similarityScore') + ': ' + similarity + '%\n'
    
    if (suggestions.length > 0) {
      message += '\n' + t('aiSuggestions') + ':\n'
      for (var i = 0; i < suggestions.length; i++) {
        message += '• ' + suggestions[i] + '\n'
      }
    }

    wx.showModal({
      title: t('aiAnalysisResults'),
      content: message,
      showCancel: true,
      confirmText: t('continueButton'),
      cancelText: t('reRecordButton'),
      success: (res) => {
        this.setData({ showRecordingCompleteModal: false })
        
        if (res.confirm) {
          this.returnToSceneSelection()
        } else {
          // Allow re-recording
          this.retakeScene()
        }
      }
    })
  },

  // 返回场景选择页面
  returnToSceneSelection() {
    const returnPage = this.data.returnPage
    if (returnPage === 'scene-selection') {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.switchTab({ url: '/pages/templates/templates' })
    }
  },

  // 切换相机
  switchCamera() {
    const newPosition = this.data.cameraPosition === 'front' ? 'back' : 'front'
    this.setData({ cameraPosition: newPosition })
  },

  // 切换闪光灯
  toggleFlash() {
    const flashModes = ['off', 'on', 'auto']
    const currentIndex = flashModes.indexOf(this.data.flashMode)
    const nextIndex = (currentIndex + 1) % flashModes.length
    this.setData({ flashMode: flashModes[nextIndex] })
  },

  // 切换网格覆盖
  toggleOverlay() {
    this.setData({ showOverlay: !this.data.showOverlay })
  },

  // 切换脚本侧边栏显示
  toggleScriptSidebar() {
    this.setData({ showScriptSidebar: !this.data.showScriptSidebar })
  },

  // 重录当前场景（从模态框调用）
  retakeCurrentScene() {
    this.setData({ showRecordingCompleteModal: false })
    this.retakeScene()
  },

  // 提交场景（从模态框调用）
  submitScene() {
    this.setData({ showRecordingCompleteModal: false })
    this.submitCurrentScene()
  },


  // 返回上一页
  goBack() {
    console.log('返回按钮被点击')
    
    // 如果正在录制，先停止录制
    if (this.data.isRecording) {
      this.stopRecording()
    }
    
    this.returnToSceneSelection()
  },


  // 开始计时器
  startTimer() {
    this.timer = setInterval(() => {
      const recordTime = this.data.recordTime + 1
      this.setData({ recordTime })
      
      // 获取当前场景的时长限制
      const currentScene = this.data.selectedTemplate && this.data.selectedTemplate.scenes && this.data.selectedTemplate.scenes[this.data.currentScene]
      const sceneMaxTime = (currentScene && currentScene.sceneDurationInSeconds) || this.data.maxRecordTime
      
      // 自动停止录制
      if (recordTime >= sceneMaxTime) {
        console.log(`场景 ${this.data.currentScene + 1} 录制时间到达 ${sceneMaxTime} 秒，自动停止`)
        this.stopRecording()
      }
    }, 1000)
  },

  // 停止计时器
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  // 相机错误处理
  onCameraError(e) {
    console.error('相机错误', e)
    wx.showToast({
      title: t('cameraError'),
      icon: 'none'
    })
  },

  onUnload() {
    this.stopTimer()
  },
  
  // Draw polygon overlay on canvas
  drawPolygonCanvas(containerW, containerH, polygons) {
    const ctx = wx.createCanvasContext('polygonCanvas', this)
    ctx.clearRect(0, 0, containerW, containerH)
    
    // Calculate aspect ratio mapping (cover)
    const sourceAspect = this.data.sourceAspect || '9:16'
    const [sourceW, sourceH] = sourceAspect.split(':').map(Number)
    const sourceRatio = sourceH / sourceW
    const containerRatio = containerH / containerW
    
    let drawnW, drawnH, offsetX = 0, offsetY = 0
    
    if (containerRatio > sourceRatio) {
      drawnW = containerW
      drawnH = containerW * sourceRatio
      offsetY = (containerH - drawnH) / 2
    } else {
      drawnH = containerH
      drawnW = containerH / sourceRatio
      offsetX = (containerW - drawnW) / 2
    }
    
    const colors = this.getColorPalette()
    
    // Draw each polygon
    polygons.forEach((polygon, index) => {
      const color = colors[index % colors.length]
      
      // Draw dashed polygon stroke
      ctx.setStrokeStyle(color)
      ctx.setLineWidth(2)
      ctx.setLineDash([5, 5])
      
      ctx.beginPath()
      if (polygon.points && polygon.points.length > 0) {
        polygon.points.forEach((point, i) => {
          const x = offsetX + point.x * drawnW
          const y = offsetY + point.y * drawnH
          
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        ctx.closePath()
      }
      ctx.stroke()
      
      // Draw Chinese label chip near first vertex
      if (polygon.points && polygon.points.length > 0) {
        const labelX = offsetX + polygon.points[0].x * drawnW
        const labelY = offsetY + polygon.points[0].y * drawnH + 20
        
        const labelText = polygon.labelZh || polygon.labelLocalized || toZh(polygon.label) || polygon.label || '未知'
        
        // Label background
        ctx.setFillStyle(color)
        ctx.fillRect(labelX - 2, labelY - 14, 80, 20)
        
        // Label text
        ctx.setFillStyle('#FFFFFF')
        ctx.setFontSize(12)
        ctx.fillText(labelText, labelX, labelY)
      }
    })
    
    ctx.draw()
  },
  
  // Color palette (RED first)
  getColorPalette() {
    return [
      '#FF3B30', // Red - FIRST overlay
      '#0A84FF', // Blue
      '#34C759', // Green  
      '#FF9F0A', // Orange
      '#AF52DE', // Purple
      '#32ADE6', // Light Blue
      '#FF375F'  // Pink
    ]
  }
})