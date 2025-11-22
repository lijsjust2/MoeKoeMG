import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
import router from './router/router';
import { formatMilliseconds, getCover, applyColorTheme, setTheme, getQuality } from '../src/utils/utils';
import ModalPlugin from './plugins/ModalPlugin';
import MessagePlugin from './plugins/MessagePlugin';
import i18n from './utils/i18n';
import '@/assets/themes/dark.css';
// import { registerSW } from 'virtual:pwa-register'

// 初始化API服务器设置
let settings = {};
try {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }
} catch (error) {
    console.error('初始化API服务器设置失败:', error);
    // 如果解析失败，设置空配置，让request.js中的默认设置生效
    localStorage.setItem('settings', JSON.stringify({}));
}

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPersistedstate);
app.config.globalProperties.$getCover = getCover;
app.config.globalProperties.$getQuality = getQuality;
app.config.globalProperties.$formatMilliseconds = formatMilliseconds;
app.config.globalProperties.$applyColorTheme = applyColorTheme;
app.config.globalProperties.$setTheme = setTheme;
// 配置全局错误处理器
app.config.errorHandler = (err, vm, info) => {
  console.error(`全局捕获异常: ${info}`, err);
};
// 配置全局警告处理器
app.config.warnHandler = (msg, vm, trace) => {
  console.warn(`全局捕获警告: ${msg}`, trace);
};
// 捕获未处理的 Promise 拒绝
window.addEventListener('unhandledrejection', event => {
  console.error('未处理的 Promise 拒绝:', event.reason);
  // window.$modal.alert('系统错误');
});

// 注释掉PWA注册，因为缺少相关插件
// registerSW({
//   onNeedRefresh() {
//     console.log('有新内容可用，请刷新页面')
//   },
//   onOfflineReady() {
//     console.log('应用已准备好离线工作')
//   }
// })

app.use(pinia);
app.use(router);
app.use(i18n);
app.use(ModalPlugin);
app.use(MessagePlugin);

app.mount('#app');