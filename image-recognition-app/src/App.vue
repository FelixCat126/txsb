<template>
  <div id="app">
    <header class="app-header">
      <h1>智能图像识别系统</h1>
    </header>
    
    <main class="app-content">
      <object-detection />
    </main>
    
    <footer class="app-footer">
      <p>© 2025 智能图像识别系统</p>
    </footer>
  </div>
</template>

<script>
import ObjectDetection from './components/ObjectDetection.vue'

export default {
  name: 'App',
  components: {
    ObjectDetection
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background-color: #f5f7fa;
  color: #333;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: #1e88e5;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.app-content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.app-footer {
  background-color: #f5f5f5;
  color: #666;
  padding: 1rem;
  text-align: center;
  font-size: 0.9rem;
}
</style> 