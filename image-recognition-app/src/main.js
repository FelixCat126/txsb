import Vue from 'vue'
import App from './App.vue'
import router from './router'
import * as tf from '@tensorflow/tfjs'

// 设置TensorFlow.js配置
tf.setBackend('webgl').then(() => {
  console.log('TensorFlow.js已初始化，使用后端:', tf.getBackend());
}).catch(err => {
  console.error('TensorFlow.js初始化失败:', err);
});

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app') 