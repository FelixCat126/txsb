/**
 * TensorFlow.js模拟实现
 * 用于在没有真实TensorFlow.js库的情况下提供基本兼容性
 */

const tf = {
  // 基本张量操作
  ready: async () => Promise.resolve(),
  browser: {
    fromPixels: () => ({
      resizeNearestNeighbor: () => ({
        expandDims: () => ({
          div: () => ({
            dataSync: () => new Float32Array(100),
            dispose: () => {}
          }),
          dispose: () => {}
        }),
        dispose: () => {}
      }),
      dispose: () => {}
    })
  },
  zeros: () => ({
    expandDims: () => ({}),
    dispose: () => {},
    dataSync: () => new Float32Array(100)
  }),
  image: {
    resizeBilinear: () => ({
      dispose: () => {}
    })
  },
  pad: (tensor) => ({
    dispose: () => {}
  }),
  tensor: (data) => ({
    reshape: () => ({}),
    dispose: () => {}
  }),
  tensor2d: (data) => ({
    dispose: () => {}
  }),
  dispose: () => {},
  tidy: (fn) => fn(),
  loadGraphModel: async (path, options) => {
    // 模拟加载进度
    if (options && options.onProgress) {
      for (let i = 0; i <= 10; i++) {
        await new Promise(r => setTimeout(r, 100));
        options.onProgress(i / 10);
      }
    }
    
    return {
      predict: (input) => ({
        dataSync: () => new Float32Array(100),
        dispose: () => {}
      }),
      executeAsync: async (input) => ({
        dataSync: () => new Float32Array(100),
        dispose: () => {}
      }),
      dispose: () => {}
    };
  }
};

export default tf; 