// pages/progress/progress.js
/**
 * Progress Tracking Page
 * Shows overall progress for a user's template submissions
 */

const app = getApp();
const config = require('../../utils/config');

Page({
  data: {
    templateId: '',
    userId: '',
    template: null,
    submissions: [],
    progress: null,
    loading: true,
    error: null,
    
    // Filter options
    statusFilter: 'all', // all, approved, pending, rejected
    
    // Stats
    totalScenes: 0,
    completedScenes: 0,
    compilationReady: false
  },

  onLoad(options) {
    const { templateId, userId } = options;
    
    if (!templateId || !userId) {
      this.setData({
        error: 'Missing required parameters',
        loading: false
      });
      return;
    }

    this.setData({
      templateId,
      userId
    });

    this.loadProgressData();
  },

  onPullDownRefresh() {
    this.loadProgressData();
  },

  // Load progress data from API
  async loadProgressData() {
    try {
      this.setData({ loading: true, error: null });
      
      // Load template and progress data in parallel
      const [templateResponse, progressResponse] = await Promise.all([
        wx.request({
          url: `${config.API_BASE_URL}/content-manager/templates/${this.data.templateId}`,
          method: 'GET'
        }),
        wx.request({
          url: `${config.API_BASE_URL}/content-creator/scenes/template/${this.data.templateId}/user/${this.data.userId}`,
          method: 'GET'
        })
      ]);

      // Process template data
      if (templateResponse.data && templateResponse.data.scenes) {
        this.setData({
          template: templateResponse.data,
          totalScenes: templateResponse.data.scenes.length
        });
      }

      // Process progress data
      if (progressResponse.data && progressResponse.data.success) {
        const { submissions, progress } = progressResponse.data;
        
        this.setData({
          submissions: submissions || [],
          progress: progress || {},
          completedScenes: progress?.approved || 0,
          compilationReady: progress?.isComplete || false
        });
      }

    } catch (error) {
      console.error('Error loading progress:', error);
      this.setData({
        error: 'Failed to load progress data'
      });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  // Filter submissions by status
  filterSubmissions(event) {
    const { status } = event.currentTarget.dataset;
    this.setData({ statusFilter: status });
  },

  // Get filtered submissions based on current filter
  getFilteredSubmissions() {
    const { submissions, statusFilter } = this.data;
    
    if (statusFilter === 'all') {
      return submissions;
    }
    
    return submissions.filter(submission => submission.status === statusFilter);
  },

  // Navigate to specific scene
  viewScene(event) {
    const { sceneNumber } = event.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/scene-submission/scene-submission?templateId=${this.data.templateId}&userId=${this.data.userId}&sceneNumber=${sceneNumber}`
    });
  },

  // Resubmit a rejected scene
  resubmitScene(event) {
    const { sceneNumber } = event.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/scene-submission/scene-submission?templateId=${this.data.templateId}&userId=${this.data.userId}&sceneNumber=${sceneNumber}&resubmit=true`
    });
  },

  // View compiled video if available
  viewCompiledVideo() {
    if (!this.data.compilationReady) {
      wx.showToast({
        title: 'Compilation not ready',
        icon: 'none'
      });
      return;
    }

    // TODO: Navigate to compiled video view
    wx.showToast({
      title: 'Opening compiled video...',
      icon: 'none'
    });
  },

  // Get status color for UI
  getStatusColor(status) {
    switch (status) {
      case 'approved': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return '#9CA3AF';
    }
  },

  // Get status icon
  getStatusIcon(status) {
    switch (status) {
      case 'approved': return '✅';
      case 'pending': return '⏳';
      case 'rejected': return '❌';
      default: return '⚪';
    }
  },

  // Format date for display
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Calculate completion percentage
  getCompletionPercentage() {
    const { totalScenes, completedScenes } = this.data;
    if (totalScenes === 0) return 0;
    return Math.round((completedScenes / totalScenes) * 100);
  },

  // Go back to scene submission
  goToSubmission() {
    wx.navigateTo({
      url: `/pages/scene-submission/scene-submission?templateId=${this.data.templateId}&userId=${this.data.userId}`
    });
  },

  // Share progress
  shareProgress() {
    const percentage = this.getCompletionPercentage();
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });

    return {
      title: `我的视频制作进度 ${percentage}%`,
      path: `/pages/progress/progress?templateId=${this.data.templateId}&userId=${this.data.userId}`,
      imageUrl: '/images/share-progress.jpg'
    };
  }
});