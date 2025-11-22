import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath, URL } from 'url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 暂时注释PWA插件以避免配置问题
    // pwa({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.ico'],
    //   manifest: {
    //     name: 'MoeKoe Music',
    //     short_name: 'MoeKoe',
    //     description: 'MoeKoe Music Player',
    //     theme_color: '#ffffff',
    //     icons: [
    //       {
    //         src: 'favicon.ico',
    //         sizes: '64x64 32x32 24x24 16x16',
    //         type: 'image/x-icon'
    //       }
    //     ]
    //   }
    // })
  ],
  resolve: {
    alias: {
      // 使用fileURLToPath确保在所有环境中路径解析一致
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 同时保留path.resolve作为备选
      '@src': path.resolve(__dirname, 'src')
    },
    // 确保正确解析各种文件扩展名
    extensions: ['.js', '.vue', '.json', '.css', '.scss']
  },
  server: {
    port: 8080
  },
  build: {
    // 确保在Docker环境中正确处理路径
    outDir: 'dist',
    assetsDir: 'assets',
    // 确保CSS文件正确处理
    cssCodeSplit: true,
    rollupOptions: {
      // 添加输入配置
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        // 改进输出配置
        preserveModules: false,
        format: 'es',
        // 确保在Docker环境中路径正确
        dir: 'dist',
        preserveModulesRoot: path.resolve(__dirname, 'src')
      },
      // 确保正确解析模块
      preserveEntrySignatures: 'strict'
    },
    // 确保构建过程中不使用外部依赖
    externalLiveBindings: false,
    // 确保构建过程中的路径处理
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
})