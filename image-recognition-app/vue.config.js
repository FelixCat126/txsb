const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: './',
  devServer: {
    port: 8080,
    open: true
  },
  configureWebpack: {
    performance: {
      hints: false
    }
  }
})