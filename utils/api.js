// utils/api.js - Mini Program API utility functions

const app = getApp()

/**
 * Make API request with automatic Chinese language headers
 * @param {Object} options - wx.request options
 * @returns {Promise} - Promise that resolves with response data
 */
function apiRequest(options) {
    return new Promise((resolve, reject) => {
        // Automatically add Chinese language headers for all mini program requests
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'User-Agent': 'miniprogram' // This helps backend auto-detect mini program requests
        }

        // Merge with any custom headers
        const headers = Object.assign({}, defaultHeaders, options.header || {})

        // Make the request with enhanced options
        wx.request({
            ...options,
            header: headers,
            success: (res) => {
                console.log(`API Request: ${options.method || 'GET'} ${options.url}`, res)
                resolve(res)
            },
            fail: (err) => {
                console.error(`API Request Failed: ${options.method || 'GET'} ${options.url}`, err)
                reject(err)
            }
        })
    })
}

/**
 * POST request with automatic Chinese headers
 */
function post(url, data = {}) {
    return apiRequest({
        url: `${app.globalData.apiBaseUrl}${url}`,
        method: 'POST',
        data: data
    })
}

/**
 * GET request with automatic Chinese headers
 */
function get(url) {
    return apiRequest({
        url: `${app.globalData.apiBaseUrl}${url}`,
        method: 'GET'
    })
}

/**
 * PUT request with automatic Chinese headers
 */
function put(url, data = {}) {
    return apiRequest({
        url: `${app.globalData.apiBaseUrl}${url}`,
        method: 'PUT',
        data: data
    })
}

/**
 * DELETE request with automatic Chinese headers
 */
function del(url) {
    return apiRequest({
        url: `${app.globalData.apiBaseUrl}${url}`,
        method: 'DELETE'
    })
}

module.exports = {
    apiRequest,
    post,
    get,
    put,
    del
}