// pages/camera/camera.js
const logger = require('../../utils/logger');
const { t, getLanguage } = require('../../utils/translations')
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
    showScriptSidebar: false, // 显示提词器侧边栏
    showRecordingCompleteModal: false, // 显示录制完成弹窗
    showUploadFailureModal: false, // 显示上传失败弹窗
    showHints: false, // 显示指导
    uploadErrorMessage: '', // 上传错误信息
    pendingUploadData: null, // 待上传的数据
    // 关键要素覆盖层 (unified system)
    keyElements: [], // 关键要素数据 [{name, box: [x,y,w,h] or null, confidence}]
    overlayRectsPixels: [], // 像素坐标矩形 [{left, top, width, height, colorHex, name, confidence}]
    sourceAspect: '9:16', // 源视频比例
    isLandscape: false, // 是否横屏拍摄 (16:9)
    // 指导信息
    backgroundInstructions: '',
    cameraInstructions: '',
    movementInstructions: '',
    deviceOrientationText: '',
    audioNotesText: ''
  },

  onLoad(options) {
    logger.log('录制页面加载', options)

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
    logger.log('录制页面显示')
    this.initCamera()
    // 更新覆盖层像素坐标（处理屏幕旋转等）
    if (this.data.selectedTemplate) {
      this.updateOverlayPixels()
    }
  },

  onHide() {
    logger.log('录制页面隐藏')
    this.stopRecording()
  },

  // 初始化相机
  initCamera() {
    const cameraContext = wx.createCameraContext()
    this.cameraContext = cameraContext

    // 检查相机与麦克风权限
    wx.getSetting({
      success: (res) => {
        const needCamera = !res.authSetting['scope.camera']
        const needRecord = !res.authSetting['scope.record']
        if (needCamera) {
          wx.authorize({ scope: 'scope.camera' })
        }
        if (needRecord) {
          wx.authorize({ scope: 'scope.record' })
        }
      }
    })
  },

  // 加载模板
  loadTemplate(templateId) {
    const app = getApp()

    // Always fetch full template from API
    // (globalData.templates only has lightweight summaries without scenes)
    // 从API加载完整模板数据
    wx.showLoading({ title: t('loadingTemplate') })

    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-creator/templates/${templateId}`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`,
        'Accept-Language': getLanguage() === 'zh' ? 'zh-CN,zh;q=0.9' : 'en-US,en;q=0.9'
      },
      success: (res) => {
        logger.log('加载模板响应:', res)

        // Handle new ApiResponse format: {success, message, data, error}
        const isApiSuccess = res.data && res.data.success === true;
        const responseData = res.data && res.data.data ? res.data.data : {};

        if (res.statusCode === 200 && isApiSuccess) {
          this.setupTemplate(responseData)
        } else {
          const errorMessage = (res.data && res.data.message) || (res.data && res.data.error) || t('templateNotFound');
          wx.showToast({
            title: errorMessage,
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        logger.error('加载模板失败:', err)
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
    logger.log('设置模板:', template)

    const scenes = template.scenes || []
    const sceneIndex = this.data.sceneIndex || 0
    const currentScene = scenes[sceneIndex] || {}

    // 检查当前场景是否有关键要素
    const hasKeyElements = currentScene.keyElementsWithBoxes && currentScene.keyElementsWithBoxes.length > 0

    logger.log(`场景 ${sceneIndex + 1} 关键要素数量:`, hasKeyElements ? currentScene.keyElementsWithBoxes.length : 0)

    // Helper: strip leading full/half width colons and spaces
    const strip = (v) => (typeof v === 'string' ? v.replace(/^[\s:：]+/, '') : v);

    // 设置基础数据
    const sourceAspect = currentScene.sourceAspect || '9:16'
    const isLandscape = this.checkIfLandscape(sourceAspect)
    
    let updateData = {
      selectedTemplate: template,
      currentScene: sceneIndex,
      maxRecordTime: currentScene.sceneDurationInSeconds || 30,
      currentScript: strip(currentScene.scriptLine || ''),
      sceneProgress: scenes.length > 0 ? (sceneIndex + 1) / scenes.length : 0,
      sourceAspect: sourceAspect,
      isLandscape: isLandscape,
      // 相机设置
      cameraPosition: 'back', // 默认使用后置摄像头
      // 指导信息
      backgroundInstructions: strip(currentScene.backgroundInstructions || ''),
      cameraInstructions: strip(currentScene.specificCameraInstructions || ''),
      movementInstructions: strip(currentScene.movementInstructions || ''),
      deviceOrientationText: this.getOrientationText(sourceAspect),
      audioNotesText: strip(currentScene.audioNotes || ''),
      personPresentText: currentScene.presenceOfPerson ? t('yes') : t('no')
    }

    // 使用统一的关键要素系统
    if (hasKeyElements) {
      console.log('使用关键要素覆盖，数量:', currentScene.keyElementsWithBoxes.length)
      updateData.keyElements = this.processKeyElements(currentScene.keyElementsWithBoxes)
    } else {
      console.log('无关键要素数据')
      updateData.keyElements = []
      updateData.overlayRectsPixels = []
    }

    // Initialize KTV view state
    const script = (updateData.currentScript || '').trim()
    const totalLen = script.length
    Object.assign(updateData, {
      showKtv: false,
      ktvHighlighted: '',
      ktvRest: script,
      ktvTotalLen: totalLen
    })

    this.setData(updateData)

    // 更新覆盖层像素坐标
    this.updateOverlayPixels()

    console.log('模板设置完成，当前场景:', currentScene)
    console.log('isLandscape:', isLandscape, 'sourceAspect:', sourceAspect)
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

        let containerW = rect.width
        let containerH = rect.height
        const sourceAspect = that.data.sourceAspect || '9:16'
        const isLandscape = that.data.isLandscape

        // For landscape, swap dimensions because camera will be rotated
        if (isLandscape) {
          const temp = containerW
          containerW = containerH
          containerH = temp
        }

        // 解析比例
        const [vw, vh] = sourceAspect.split(':').map(Number)

        // 计算 object-fit: cover 的缩放和偏移
        const scale = Math.max(containerW / vw, containerH / vh)
        const drawnW = vw * scale
        const drawnH = vh * scale
        const offsetX = (containerW - drawnW) / 2
        const offsetY = (containerH - drawnH) / 2

        const colors = that.getColorPalette()

        // 处理关键要素覆盖 (只显示有边界框的要素)
        if (that.data.keyElements && that.data.keyElements.length > 0) {
          that.updateKeyElementsPixels(containerW, containerH, offsetX, offsetY, drawnW, drawnH, colors)
        }
      })
      .exec()
  },

  // 更新关键要素像素坐标
  updateKeyElementsPixels(containerW, containerH, offsetX, offsetY, drawnW, drawnH, colors) {
    const elements = this.data.keyElements || []

    // Scale factor: 0.7 to make boxes 30% smaller
    const SCALE_FACTOR = 0.7

    // Compute pixel rectangles (only for elements with boxes)
    const overlayRectsPixels = []
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      
      // Skip elements without bounding boxes (text-only elements)
      if (!element.box) {
        console.log(`KeyElement "${element.name}" has no box, skipping visual overlay`)
        continue
      }
      
      const box = element.box
      // Original dimensions
      const origWidth = box.width * drawnW
      const origHeight = box.height * drawnH
      const origLeft = offsetX + box.x * drawnW
      const origTop = offsetY + box.y * drawnH
      
      // Scaled dimensions (30% smaller)
      const width = origWidth * SCALE_FACTOR
      const height = origHeight * SCALE_FACTOR
      
      // Center the scaled box within the original position
      const left = origLeft + (origWidth - width) / 2
      const top = origTop + (origHeight - height) / 2
      
      const color = colors[i % colors.length]

      overlayRectsPixels.push({
        left, top, width, height,
        colorHex: color,
        name: element.name,
        confidence: element.confidence
      })
    }

    this.setData({ overlayRectsPixels })

    // Draw on canvas
    this.drawOverlayCanvas(containerW, containerH, overlayRectsPixels)
  },

  // 绘制关键要素覆盖层
  drawOverlayCanvas(containerW, containerH, rects) {
    const ctx = wx.createCanvasContext('overlayCanvas', this)
    ctx.clearRect(0, 0, containerW, containerH)

    // Set canvas size to container size
    ctx.setCanvasSize ? ctx.setCanvasSize(containerW, containerH) : null

    rects.forEach((rect, index) => {
      const { left, top, width, height, colorHex, name } = rect

      // Draw dashed rectangle (stroke only)
      ctx.setStrokeStyle(colorHex)
      ctx.setLineWidth(2)
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.rect(left, top, width, height)
      ctx.stroke()

      // Draw name chip at top-left
      if (name) {
        const chipX = left + 4
        const chipY = top + 4
        const chipWidth = 80
        const chipHeight = 20

        // Background chip
        ctx.setFillStyle(colorHex)
        ctx.fillRect(chipX, chipY, chipWidth, chipHeight)

        // Name text
        ctx.setFillStyle('#FFFFFF')
        ctx.setFontSize(12)
        ctx.fillText(name, chipX + 4, chipY + 14)
      }
    })

    ctx.draw()
  },



  // 检查是否横屏拍摄
  checkIfLandscape(sourceAspect) {
    if (!sourceAspect) return false
    const parts = sourceAspect.split(':')
    if (parts.length !== 2) return false
    const width = parseFloat(parts[0])
    const height = parseFloat(parts[1])
    if (isNaN(width) || isNaN(height)) return false
    return width > height
  },

  // 根据宽高比确定拍摄方向
  getOrientationText(sourceAspect) {
    if (!sourceAspect) return '竖拍'

    const parts = sourceAspect.split(':')
    if (parts.length !== 2) return '竖拍'

    const width = parseFloat(parts[0])
    const height = parseFloat(parts[1])

    if (isNaN(width) || isNaN(height)) return '竖拍'

    // 如果宽度 > 高度，横拍；否则竖拍
    return width > height ? '横拍 (手机竖握，画面横向)' : '竖拍'
  },

  /**
   * 处理关键要素数组，规范化字段名称并验证数据
   * @param {Array} keyElements - 关键要素数组 [{name, box: [x,y,w,h] or null, confidence}]
   * @returns {Array} 处理后的关键要素数组
   */
  processKeyElements(keyElements) {
    if (!Array.isArray(keyElements)) {
      console.warn('keyElements is not an array:', keyElements)
      return []
    }

    return keyElements.map((element, index) => {
      const confidence = Math.max(0, Math.min(1, element.confidence || 0))
      const processed = {
        name: element.name || '',
        confidence: confidence,
        confidencePercent: Math.round(confidence * 100),
        box: null // Will be set below if box exists
      }

      // 处理边界框（如果存在）
      if (element.box && Array.isArray(element.box) && element.box.length === 4) {
        const [x, y, width, height] = element.box
        
        // 验证并规范化坐标
        processed.box = {
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          width: Math.max(0, Math.min(1, width)),
          height: Math.max(0, Math.min(1, height))
        }

        // 验证边界框完整性
        if (processed.box.x + processed.box.width > 1) {
          console.warn(`KeyElement ${index} (${processed.name}): x + width exceeds bounds, clamping`)
          processed.box.width = 1 - processed.box.x
        }

        if (processed.box.y + processed.box.height > 1) {
          console.warn(`KeyElement ${index} (${processed.name}): y + height exceeds bounds, clamping`)
          processed.box.height = 1 - processed.box.y
        }

        // 过滤掉无效的边界框
        if (processed.box.width <= 0 || processed.box.height <= 0) {
          console.warn(`KeyElement ${index} (${processed.name}): invalid box dimensions, treating as text-only`)
          processed.box = null
        }
      }

      return processed
    }).filter(element => {
      // 保留所有有名称的要素（无论是否有边界框）
      return element.name.length > 0
    })
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
    console.log('[UI] startRecording tapped')
    
    // Reset KTV debug flags for new recording
    this._ktvDebugLogged = false
    this._ktvFallbackLogged = false
    
    if (!this.data.selectedTemplate) {
      wx.showToast({
        title: t('selectTemplate'),
        icon: 'none'
      })
      return
    }

    const cameraContext = this.cameraContext

    // Ensure permissions
    wx.getSetting({
      success: (res) => {
        const hasCamera = !!res.authSetting['scope.camera']
        const hasRecord = !!res.authSetting['scope.record']
        if (!hasCamera || !hasRecord) {
          wx.showModal({
            title: !hasRecord ? t('microphonePermissionNeeded') : t('cameraPermissionNeeded'),
            content: !hasRecord ? t('microphonePermissionMessage') : t('cameraPermissionMessage'),
            confirmText: t('openSettings'),
            cancelText: t('close'),
            success: (r) => {
              if (r.confirm) {
                wx.openSetting({})
              }
            }
          })
          return
        }

        // Permissions ok, start record with timeout
        const currentScene = this.data.selectedTemplate && this.data.selectedTemplate.scenes && this.data.selectedTemplate.scenes[this.data.currentScene]
        const sceneMaxTime = (currentScene && currentScene.sceneDurationInSeconds) || this.data.maxRecordTime

        cameraContext.startRecord({
          timeout: sceneMaxTime * 1000,  // Set max recording duration in milliseconds
          timeoutCallback: (res) => {
            console.log('录制时间到达上限，自动停止', res)
            this.setData({ isRecording: false })
            this.stopTimer()
            // Save the recorded video
            if (res.tempVideoPath) {
              this.saveRecordedVideo(res.tempVideoPath)
            }
          },
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
            const msg = (err && err.errMsg) || ''
            if (msg.includes('microphone') || msg.includes('not allowed')) {
              wx.showModal({
                title: t('microphonePermissionNeeded'),
                content: t('microphonePermissionMessage'),
                confirmText: t('openSettings'),
                cancelText: t('close'),
                success: (r) => { if (r.confirm) wx.openSetting({}) }
              })
            } else {
              wx.showToast({ title: t('recordingFailed'), icon: 'none' })
            }
          }
        })
      },
      fail: () => {
        wx.showToast({ title: t('recordingFailed'), icon: 'none' })
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
        this.setData({
          isRecording: false,
          // Close all overlays when recording stops
          showOverlay: false,
          showKtv: false,
          showHints: false
        })
        this.stopTimer()

        // 保存录制的视频
        this.saveRecordedVideo(res.tempVideoPath)
      },
      fail: (err) => {
        console.error('停止录制失败', err)
        this.setData({
          isRecording: false,
          // Close all overlays even on failure
          showOverlay: false,
          showKtv: false,
          showHints: false
        })
        this.stopTimer()
      }
    })
  },

  // 保存录制的视频
  saveRecordedVideo(tempPath) {
    const sceneIndex = this.data.sceneIndex || 0
    const sceneNumber = this.data.sceneNumber || 1
    const template = this.data.selectedTemplate
    
    // Auto-extend duration to minimum 2 seconds if less than 1 second
    let recordDuration = this.data.recordTime
    if (recordDuration < 1) {
      console.log(`录制时长 ${recordDuration}秒 < 1秒，自动延长至2秒`)
      recordDuration = 2
    }

    const videoData = {
      sceneNumber: sceneNumber,
      sceneTitle: template.scenes[sceneIndex].sceneTitle,
      tempPath: tempPath,
      duration: recordDuration,  // Use adjusted duration
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

    wx.showLoading({ title: '上传场景中...' })
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
      assignmentId: this.data.templateId,  // Note: templateId is actually assignment ID
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
        assignmentId: this.data.templateId,  // Note: templateId is actually assignment ID now
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
            wx.showModal({
              title: '上传成功',
              content: '正在AI处理，请继续录制下一个场景',
              showCancel: false,
              confirmText: '好的',
              success: () => {
                // Return to scene selection after user confirms
                this.returnToSceneSelection()
              }
            })
          } else {
            const errorMessage = parsedResponse && (parsedResponse.error || parsedResponse.message) || '上传失败';
            console.error('Upload failed with message:', errorMessage)
            wx.showToast({
              title: '上传失败',
              icon: 'error'
            })
          }
        } catch (error) {
          console.error('Error parsing response:', error, 'Raw response:', response.data)
          wx.hideLoading()
          wx.showToast({
            title: '上传失败',
            icon: 'error'
          })
        }
      },
      fail: (error) => {
        console.error('Upload request failed:', error)
        wx.hideLoading()
        wx.showToast({
          title: '上传失败',
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
      const app = getApp();
      app.globalData.justRecorded = true;
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
    const newShowOverlay = !this.data.showOverlay
    this.setData({ showOverlay: newShowOverlay })
    console.log('Overlay toggled to:', newShowOverlay)

    // 如果关闭覆盖层，确保清除所有canvas内容
    if (!newShowOverlay) {
      this.clearAllOverlays()
    } else {
      // 重新绘制覆盖层
      this.updateOverlayPixels()
    }
  },

  // 清除所有覆盖层
  clearAllOverlays() {
    // 清除关键要素覆盖canvas
    const overlayCtx = wx.createCanvasContext('overlayCanvas', this)
    overlayCtx.clearRect(0, 0, 1000, 1000)
    overlayCtx.draw()
  },

  // 切换指导显示
  toggleHints() {
    this.setData({ showHints: !this.data.showHints })
    console.log('Hints toggled to:', this.data.showHints)
  },

  // 切换提词器侧边栏显示
  toggleScriptSidebar() {
    this.setData({ showScriptSidebar: !this.data.showScriptSidebar })
  },

  // 顶部按钮：切换KTV提词器显示
  toggleKtv() {
    const next = !this.data.showKtv
    this.setData({
      showKtv: next,
      showHints: next ? false : this.data.showHints  // Auto-close hints when opening script
    })
    if (next) this.updateKtvProgress()
  },

  // 根据当前进度更新KTV高亮
  // Uses subtitleSegments for accurate word-by-word/phrase-by-phrase timing
  updateKtvProgress() {
    try {
      const script = (this.data.currentScript || '').trim()
      if (!this.data.showKtv || !script) return
      
      const currentScene = this.data.selectedTemplate && this.data.selectedTemplate.scenes && this.data.selectedTemplate.scenes[this.data.currentScene]
      const elapsed = this.data.recordTime || 0
      const elapsedMs = elapsed * 1000
      
      // Try to use subtitleSegments for accurate timing
      if (currentScene && currentScene.subtitleSegments && currentScene.subtitleSegments.length > 0) {
        const segments = currentScene.subtitleSegments
        const sceneStartMs = currentScene.startTimeMs || 0
        
        // Debug log (only on first call)
        if (!this._ktvDebugLogged) {
          console.log('[KTV] ========================================')
          console.log('[KTV] Using subtitleSegments for accurate timing')
          console.log('[KTV] Scene #' + (this.data.currentScene + 1))
          console.log('[KTV] Scene absolute start:', sceneStartMs, 'ms')
          console.log('[KTV] Scene duration:', currentScene.sceneDurationInSeconds, 's')
          console.log('[KTV] Subtitle segments:', segments.length)
          console.log('[KTV] Segments timing (absolute → relative):')
          segments.forEach((seg, idx) => {
            const relativeMs = seg.startTimeMs - sceneStartMs
            console.log(`[KTV]   ${idx + 1}. "${seg.text}"`)
            console.log(`[KTV]      Absolute: ${seg.startTimeMs}ms → Relative: ${relativeMs}ms (${(relativeMs/1000).toFixed(2)}s)`)
          })
          console.log('[KTV] ========================================')
          this._ktvDebugLogged = true
        }
        
        // Find which segments should be highlighted based on elapsed time
        let highlighted = ''
        let rest = ''
        let foundCurrent = false
        
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i]
          
          // IMPORTANT: Convert absolute timing to scene-relative timing
          // subtitleSegments.startTimeMs is absolute (relative to entire video)
          // We need to subtract scene.startTimeMs to get timing relative to scene start
          const segmentRelativeStartMs = segment.startTimeMs - sceneStartMs
          
          // Handle edge case: segment might be from previous scene (negative relative time)
          if (segmentRelativeStartMs < 0) {
            console.warn('[KTV] Segment has negative relative time, skipping:', segment.text)
            continue
          }
          
          if (elapsedMs >= segmentRelativeStartMs) {
            // This segment should be highlighted
            if (highlighted.length > 0) highlighted += ' '
            highlighted += segment.text
          } else {
            // This and remaining segments are not yet highlighted
            if (!foundCurrent) {
              foundCurrent = true
            }
            if (rest.length > 0) rest += ' '
            rest += segment.text
          }
        }
        
        // If no segments matched, show all as rest
        if (highlighted.length === 0 && rest.length === 0) {
          rest = script
        }
        
        this.setData({ 
          ktvHighlighted: highlighted, 
          ktvRest: rest, 
          ktvTotalLen: script.length 
        })
      } else {
        // Debug log for fallback
        if (!this._ktvFallbackLogged) {
          console.log('[KTV] No subtitleSegments, using linear fallback')
          this._ktvFallbackLogged = true
        }
        // Fallback: Simple linear progress (old behavior)
        const total = script.length || 1
        const sceneMaxTime = (currentScene && currentScene.sceneDurationInSeconds) || this.data.maxRecordTime || 30
        const progress = Math.max(0, Math.min(1, elapsed / sceneMaxTime))
        const highlightCount = Math.floor(total * progress)
        const highlighted = script.substring(0, highlightCount)
        const rest = script.substring(highlightCount)
        this.setData({ ktvHighlighted: highlighted, ktvRest: rest, ktvTotalLen: total })
      }
    } catch (e) { 
      console.error('KTV progress update error:', e)
    }
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
    // 获取当前场景的时长限制
    const currentScene = this.data.selectedTemplate && this.data.selectedTemplate.scenes && this.data.selectedTemplate.scenes[this.data.currentScene]
    const sceneMaxTime = (currentScene && currentScene.sceneDurationInSeconds) || this.data.maxRecordTime

    // 对于1秒或以下的场景，设置自动停止定时器
    if (sceneMaxTime <= 1) {
      setTimeout(() => {
        if (this.data.isRecording) {
          console.log(`场景 ${this.data.currentScene + 1} 录制时间到达 ${sceneMaxTime} 秒，自动停止`)
          this.stopRecording()
        }
      }, sceneMaxTime * 1000)
    }

    this.timer = setInterval(() => {
      const recordTime = this.data.recordTime + 1

      // 自动停止录制（对于大于1秒的场景）- check BEFORE updating time to prevent overage
      if (recordTime > sceneMaxTime && sceneMaxTime > 1) {
        console.log(`场景 ${this.data.currentScene + 1} 录制时间到达 ${sceneMaxTime} 秒，自动停止`)
        this.stopRecording()
        return // Exit early to prevent time update
      }

      // Update time after checking limit
      this.setData({ recordTime })
      // Update KTV highlight on each tick
      this.updateKtvProgress()
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
    logger.error('相机错误', e)
    const msg = (e && e.detail && e.detail.errMsg) || ''
    if (msg.includes('microphone') || msg.includes('not allowed')) {
      wx.showModal({
        title: t('microphonePermissionNeeded'),
        content: t('microphonePermissionMessage'),
        confirmText: t('openSettings'),
        cancelText: t('close'),
        success: (r) => { if (r.confirm) wx.openSetting({}) }
      })
    } else {
      wx.showToast({ title: t('cameraError'), icon: 'none' })
    }
  },

  onUnload() {
    this.stopTimer()
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
  },

})
