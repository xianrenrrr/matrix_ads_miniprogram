// pages/scene-submission/scene-submission.js
/**
 * Scene Submission Page
 * Allows content creators to submit individual scenes instead of full videos
 */

const app = getApp();
const config = require('../../utils/config');

Page({
  data: {
    templateId: '',
    userId: '',
    template: null,
    scenes: [],
    currentSceneIndex: 0,
    currentScene: null,
    submissions: {},
    progress: null,
    
    // Recording state
    isRecording: false,
    recordingPath: '',
    recordingDuration: 0,
    
    // Upload state
    isUploading: false,
    uploadProgress: 0,
    
    // UI state
    showInstructions: true,
    showFeedback: false,
    feedbackData: null,
    
    // Camera settings
    cameraPosition: 'back',
    enableGrid: true,
    gridOverlay: []
  },

  onLoad(options) {
    const { templateId, userId } = options;
    
    if (!templateId || !userId) {
      wx.showToast({
        title: 'Missing parameters',
        icon: 'error'
      });
      return;
    }

    this.setData({
      templateId,
      userId
    });

    this.loadTemplate();
    this.loadProgress();
  },

  // Load template data
  async loadTemplate() {
    try {
      wx.showLoading({ title: 'Loading template...' });
      
      const response = await wx.request({
        url: `${config.API_BASE_URL}/content-manager/templates/${this.data.templateId}`,
        method: 'GET'
      });

      if (response.data && response.data.scenes) {
        this.setData({
          template: response.data,
          scenes: response.data.scenes,
          currentScene: response.data.scenes[0]
        });
        
        this.setupSceneData();
      } else {
        throw new Error('Template not found');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      wx.showToast({
        title: 'Failed to load template',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // Load user's progress for this template
  async loadProgress() {
    try {
      const response = await wx.request({
        url: `${config.API_BASE_URL}/content-creator/scenes/template/${this.data.templateId}/user/${this.data.userId}`,
        method: 'GET'
      });

      if (response.data && response.data.success) {
        const { sceneMap, progress } = response.data;
        
        this.setData({
          submissions: sceneMap || {},
          progress: progress
        });

        // Find first incomplete scene
        this.findNextIncompleteScene();
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  },

  // Setup current scene data and grid overlay
  setupSceneData() {
    const { currentScene, currentSceneIndex } = this.data;
    
    if (!currentScene) return;

    // Set up grid overlay from scene data
    const gridOverlay = currentScene.screenGridOverlay || [];
    
    this.setData({
      gridOverlay,
      enableGrid: gridOverlay.length > 0
    });
  },

  // Find the next scene that needs submission
  findNextIncompleteScene() {
    const { scenes, submissions } = this.data;
    
    for (let i = 0; i < scenes.length; i++) {
      const sceneNumber = i + 1;
      const submission = submissions[sceneNumber];
      
      if (!submission || submission.status === 'rejected') {
        this.setData({
          currentSceneIndex: i,
          currentScene: scenes[i]
        });
        this.setupSceneData();
        return;
      }
    }
    
    // All scenes are complete
    this.setData({
      currentSceneIndex: 0,
      currentScene: scenes[0]
    });
  },

  // Navigate to specific scene
  selectScene(event) {
    const { index } = event.currentTarget.dataset;
    
    this.setData({
      currentSceneIndex: index,
      currentScene: this.data.scenes[index]
    });
    
    this.setupSceneData();
  },

  // Toggle scene instructions visibility
  toggleInstructions() {
    this.setData({
      showInstructions: !this.data.showInstructions
    });
  },

  // Start video recording
  startRecording() {
    const recorderManager = wx.getRecorderManager();
    
    recorderManager.start({
      duration: (this.data.currentScene.sceneDuration || 30) * 1000,
      sampleRate: 44100,
      numberOfChannels: 1,
      encodeBitRate: 192000,
      format: 'mp4'
    });

    this.setData({
      isRecording: true,
      recordingDuration: 0
    });

    // Start recording timer
    this.recordingTimer = setInterval(() => {
      this.setData({
        recordingDuration: this.data.recordingDuration + 1
      });
    }, 1000);

    recorderManager.onStop((res) => {
      clearInterval(this.recordingTimer);
      
      this.setData({
        isRecording: false,
        recordingPath: res.tempFilePath
      });
      
      // Show recording preview
      this.showRecordingPreview();
    });

    recorderManager.onError((error) => {
      clearInterval(this.recordingTimer);
      
      this.setData({
        isRecording: false
      });
      
      wx.showToast({
        title: 'Recording failed',
        icon: 'error'
      });
    });
  },

  // Stop video recording
  stopRecording() {
    const recorderManager = wx.getRecorderManager();
    recorderManager.stop();
  },

  // Show recording preview and options
  showRecordingPreview() {
    wx.showModal({
      title: 'Recording Complete',
      content: `Scene ${this.data.currentSceneIndex + 1} recorded (${this.data.recordingDuration}s). Submit this take or record again?`,
      confirmText: 'Submit',
      cancelText: 'Re-record',
      success: (res) => {
        if (res.confirm) {
          this.submitScene();
        } else {
          // Clear recording and allow re-recording
          this.setData({
            recordingPath: '',
            recordingDuration: 0
          });
        }
      }
    });
  },

  // Submit current scene
  async submitScene() {
    if (!this.data.recordingPath) {
      wx.showToast({
        title: 'No recording to submit',
        icon: 'error'
      });
      return;
    }

    try {
      this.setData({
        isUploading: true,
        uploadProgress: 0
      });

      wx.showLoading({ title: 'Uploading scene...' });

      const uploadTask = wx.uploadFile({
        url: `${config.API_BASE_URL}/content-creator/scenes/upload`,
        filePath: this.data.recordingPath,
        name: 'file',
        formData: {
          templateId: this.data.templateId,
          userId: this.data.userId,
          sceneNumber: this.data.currentSceneIndex + 1,
          sceneTitle: this.data.currentScene.sceneTitle || `Scene ${this.data.currentSceneIndex + 1}`
        }
      });

      uploadTask.onProgressUpdate((res) => {
        this.setData({
          uploadProgress: res.progress
        });
      });

      const response = await new Promise((resolve, reject) => {
        uploadTask.onSuccess(resolve);
        uploadTask.onFail(reject);
      });

      const result = JSON.parse(response.data);

      if (result.success) {
        wx.showToast({
          title: 'Scene submitted!',
          icon: 'success'
        });

        // Clear recording
        this.setData({
          recordingPath: '',
          recordingDuration: 0
        });

        // Show AI feedback if available
        if (result.aiSuggestions && result.aiSuggestions.length > 0) {
          this.showAIFeedback(result);
        }

        // Reload progress and move to next scene
        await this.loadProgress();
        this.findNextIncompleteScene();

      } else {
        throw new Error(result.message || 'Upload failed');
      }

    } catch (error) {
      console.error('Error submitting scene:', error);
      wx.showToast({
        title: 'Upload failed',
        icon: 'error'
      });
    } finally {
      this.setData({
        isUploading: false,
        uploadProgress: 0
      });
      wx.hideLoading();
    }
  },

  // Show AI feedback modal
  showAIFeedback(submissionData) {
    this.setData({
      feedbackData: {
        similarityScore: submissionData.similarityScore,
        suggestions: submissionData.aiSuggestions,
        qualityMetrics: submissionData.sceneSubmission?.qualityMetrics
      },
      showFeedback: true
    });
  },

  // Close AI feedback modal
  closeFeedback() {
    this.setData({
      showFeedback: false,
      feedbackData: null
    });
  },

  // Toggle camera position
  switchCamera() {
    this.setData({
      cameraPosition: this.data.cameraPosition === 'back' ? 'front' : 'back'
    });
  },

  // Toggle grid overlay
  toggleGrid() {
    this.setData({
      enableGrid: !this.data.enableGrid
    });
  },

  // Get scene status for display
  getSceneStatus(sceneNumber) {
    const submission = this.data.submissions[sceneNumber];
    if (!submission) return 'not-submitted';
    return submission.status;
  },

  // Get scene status color
  getSceneStatusColor(status) {
    switch (status) {
      case 'approved': return '#10B981'; // green
      case 'pending': return '#F59E0B';  // yellow
      case 'rejected': return '#EF4444'; // red
      default: return '#9CA3AF';         // gray
    }
  },

  // Format duration for display
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  // Navigate back to template selection
  goBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  // View overall progress
  viewProgress() {
    wx.navigateTo({
      url: `/pages/progress/progress?templateId=${this.data.templateId}&userId=${this.data.userId}`
    });
  },

  onUnload() {
    // Clean up timer if page is unloaded
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }
  }
});