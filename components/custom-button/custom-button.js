// components/custom-button/custom-button.js
Component({
  /**
   * Component properties
   */
  properties: {
    text: {
      type: String,
      value: '按钮'
    },
    type: {
      type: String,
      value: 'primary' // primary, secondary, success, warning, danger
    },
    size: {
      type: String,
      value: 'default' // mini, small, default, large
    },
    icon: {
      type: String,
      value: ''
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },

  /**
   * Component initial data
   */
  data: {

  },

  /**
   * Component methods
   */
  methods: {
    handleTap: function(e) {
      if (this.properties.disabled) {
        return;
      }
      
      // Trigger custom event with all data
      this.triggerEvent('tap', {
        text: this.properties.text,
        type: this.properties.type,
        dataset: e.currentTarget.dataset
      });
    }
  }
});