<template>
    <div class="settings-page">
        <!-- 直接显示设置内容 -->
        <div class="settings-content">
            <div v-for="(section, sectionIndex) in settingSections" :key="sectionIndex" 
                 class="setting-section">
            <h3>{{ section.title }}</h3>
            <ExtensionManager v-if="section.title === '插件'" />
            <div v-else class="settings-cards">
                <div v-for="(item, itemIndex) in section.items" :key="itemIndex"
                    class="setting-card" @click="item.action ? item.action(item.helpLink) : openSelection(item.key, item.helpLink)">
                    <div class="setting-card-header">
                        <i :class="getItemIcon(item.key)"></i>
                        <span>{{ item.label }}</span>
                        <span v-if="item.showRefreshHint && showRefreshHint[item.key]" class="refresh-hint">
                            {{ item.refreshHintText }}
                        </span>
                    </div>
                    <div class="setting-card-value">
                        <span>{{ item.icon }}{{ item.customText || selectedSettings[item.key]?.displayText }}</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
        </div>

            <!-- 移除版本信息 -->
        </div>

        <div v-if="isSelectionOpen" class="modal">
            <div class="modal-content">
                <a
                    v-if="currentHelpLink"
                    class="help-link"
                    @click="openHelpLink"
                    title="帮助"
                    aria-label="帮助"
                >
                    <i class="fas fa-question-circle"></i>
                </a>
                <h3>{{ selectionTypeMap[selectionType].title }}</h3>
                <ul v-if="selectionType !== 'font'">
                    <li v-for="option in selectionTypeMap[selectionType].options" :key="option" @click="selectOption(option)">
                        {{ option.displayText }}
                    </li>
                </ul>

                <div v-if="selectionType === 'font'" class="api-settings-container" @focusout="handleFontFocusOut">
                    <div class="api-setting-item">
                        <label>字体URL地址</label>
                        <input type="text" v-model="fontUrlInput" class="api-input" placeholder="请输入字体URL地址" />
                    </div>
                    <div class="api-setting-item">
                        <label>字体名称</label>
                        <input type="text" v-model="fontFamilyInput" class="api-input" placeholder="请输入字体名称" />
                    </div>
                </div>
                
                

                <div v-if="selectionType === 'quality'" class="compatibility-option">
                    <label>
                        <input type="checkbox" v-model="qualityCompatibilityMode" />
                        兼容模式(mp3格式)
                        <div class="compatibility-hint">如果高音质播放失败，请开启此选项</div>
                    </label>
                </div>

                <div v-if="selectionType === 'highDpi'" class="scale-slider-container">
                    <div class="scale-slider-label">缩放因子: {{ dpiScale }} <span class="scale-slider-hint">调整后需要重启应用生效</span></div>
                    <div class="scale-slider-wrapper">
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            v-model="dpiScale"
                            class="scale-slider"
                        />
                        <div class="scale-marks">
                            <span>0.5</span>
                            <span>1.0</span>
                            <span>1.5</span>
                            <span>2.0</span>
                        </div>
                    </div>
                </div>

                <div v-if="selectionType === 'apiMode' && selectedSettings.apiMode.value === 'on'" class="api-settings-container">
                    <div class="api-setting-item">
                        <label>API 地址</label>
                        <input type="text" value="http://127.0.0.1:6521" readonly class="api-input" />
                    </div>
                    <div class="api-setting-item">
                        <label>WebSocket 地址</label>
                        <input type="text" value="ws://127.0.0.1:6520" readonly class="api-input" />
                    </div>
                    <div class="api-hint">
                        这些是默认的 API 地址，当前版本不支持自定义修改
                    </div>
                </div>

            </div>
        </div>

        <!-- 快捷键设置弹窗 -->
        <div v-if="showShortcutModal" class="shortcut-modal">
            <div class="shortcut-modal-content">
                <h3>{{ $t('kuai-jie-jian-she-zhi') }}</h3>
                <div class="shortcut-list">
                    <div class="shortcut-item" v-for="(config, key) in shortcutConfigs" :key="key">
                        <span>{{ config.label }}</span>
                        <div class="shortcut-input"
                             @click="startRecording(key)"
                             :class="{ 'recording': recordingKey === key }">
                            {{ shortcuts[key] || '点击设置快捷键' }}
                            <div v-if="shortcuts[key]"
                                 class="clear-shortcut"
                                 @click.stop="clearShortcut(key)">
                                ×
                            </div>
                        </div>
                    </div>
                </div>
                <div class="shortcut-modal-footer">
                    <button @click="closeShortcutSettings">{{ $t('qu-xiao') }}</button>
                    <button @click="saveShortcuts" class="primary">{{ $t('bao-cun') }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MoeAuthStore } from '../stores/store';
import ExtensionManager from '@/components/ExtensionManager.vue';

const MoeAuth = MoeAuthStore();
const { t } = useI18n();
const { proxy } = getCurrentInstance();
const appVersion = ref('');
const platform = ref('');
const activeTab = ref(0);

// 设置配置
const selectedSettings = ref({
    downloadQuality: { displayText: '普通音质 (128K)', value: 128 },
    quality: { displayText: '普通音质 (128K)', value: 128 }
});

// 设置分区配置
const settingSections = computed(() => [
    {
        title: '设置',
        items: [

            {
                key: 'quality',
                label: '播放音质',
                icon: '🎵 '
            },
            {
                key: 'downloadQuality',
                label: '默认下载音质',
                icon: '⬇️ '
            },
            {
                key: 'batchDownload',
                label: '歌手批量下载',
                icon: '📥 ',
                action: () => router.push('/batchDownload')
            },
            {
                key: 'batchAlbumDownload',
                label: '专辑批量下载',
                icon: '📥 ',
                action: () => router.push('/batchAlbumDownload')
            },
            {
                key: 'batchArtistAlbumDownload',
                label: '歌手专辑批量下载',
                icon: '📥 ',
                action: () => router.push('/batchArtistAlbumDownload')
            }
        ]
    }
]);

// 移除所有其他设置项配置

// 获取每个部分的图标
const getSectionIcon = (title) => {
    const iconMap = {
        [t('jie-mian')]: 'fas fa-palette',
        [t('sheng-yin')]: 'fas fa-volume-up',
        [t('ge-ci')]: 'fas fa-music',
        '插件': 'fas fa-puzzle-piece',
        [t('xi-tong')]: 'fas fa-cog'
    };
    return iconMap[title] || 'fas fa-cog';
};

import { useRouter } from 'vue-router';

// 获取路由实例
const router = useRouter();

// 获取每个设置项的图标
const getItemIcon = (key) => {
    const iconMap = {
        'language': 'fas fa-language',
        'themeColor': 'fas fa-paint-brush',
        'theme': 'fas fa-moon',
        'nativeTitleBar': 'fas fa-window-maximize',
        'font': 'fas fa-font',
        'quality': 'fas fa-headphones',
        'downloadQuality': 'fas fa-download',
        'greetings': 'fas fa-comment',
        'lyricsBackground': 'fas fa-image',
        'lyricsFontSize': 'fas fa-text-height',
        'desktopLyrics': 'fas fa-desktop',
        'lyricsTranslation': 'fas fa-language',
        'lyricsAlign': 'fas fa-align-center',
        'gpuAcceleration': 'fas fa-microchip',
        'highDpi': 'fas fa-expand',
        'minimizeToTray': 'fas fa-window-minimize',
        'autoStart': 'fas fa-power-off',
        'startMinimized': 'fas fa-compress',
        'preventAppSuspension': 'fas fa-clock',
        'apiMode': 'fas fa-code',
        
        'touchBar': 'fas fa-tablet-alt',
        'shortcuts': 'fas fa-keyboard',
        'pwa': 'fas fa-mobile-alt',
        'batchDownload': 'fas fa-download',
        'batchArtistAlbumDownload': 'fas fa-download'
    };
    return iconMap[key] || 'fas fa-sliders-h';
};

const isSelectionOpen = ref(false);
const currentHelpLink = ref('');
const selectionType = ref('');
const fontUrlInput = ref('');
const fontFamilyInput = ref('');


// 选项配置
const selectionTypeMap = {
    language: {
        title: t('xuan-ze-yu-yan'),
        options: [
            { displayText: '🇨🇳 简体中文', value: 'zh-CN' },
            { displayText: '🇨🇳 繁体中文', value: 'zh-TW' },
            { displayText: '🇺🇸 English', value: 'en' },
            { displayText: '🇯🇵 日本語', value: 'ja' },
            { displayText: '🇰🇷 한국어', value: 'ko' }
        ]
    },
    quality: {
        title: '选择播放音质',
        options: [
            { displayText: '普通音质 (128K)', value: 128 },
            { displayText: '高音质 (320K)', value: 320 },
            { displayText: '无损音质 (FLAC)', value: 999 }
        ]
    },
    downloadQuality: {
        title: '选择默认下载音质',
        options: [
            { displayText: '普通音质 (128K)', value: 128 },
            { displayText: '高音质 (320K)', value: 320 },
            { displayText: '无损音质 (FLAC)', value: 999 }
        ]
    },
    themeColor: {
        title: t('xuan-ze-zhu-se-tiao'),
        options: [
            { displayText: t('shao-nv-fen'), value: 'pink' },
            { displayText: t('nan-nan-lan'), value: 'blue' },
            { displayText: t('tou-ding-lv'), value: 'green' },
            { displayText: t('mi-gan-cheng'), value: 'orange' }
        ]
    },
    theme: {
        title: t('xuan-ze-wai-guan'),
        options: [
            { displayText: '🌗 ' + t('zi-dong'), value: 'auto' },
            { displayText: '☀️ ' + t('qian-se'), value: 'light' },
            { displayText: '🌙 ' + t('shen-se'), value: 'dark' }
        ]
    },
    nativeTitleBar: {
        title: t('native-title-bar'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },

    lyricsBackground: {
        title: t('xian-shi-ge-ci-bei-jing'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    desktopLyrics: {
        title: t('xian-shi-zhuo-mian-ge-ci'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    lyricsFontSize: {
        title: t('ge-ci-zi-ti-da-xiao'),
        options: [
            { displayText: t('xiao'), value: '20px' },
            { displayText: t('zhong'), value: '24px' },
            { displayText: t('da'), value: '32px' }
        ]
    },
    greetings: {
        title: t('qi-dong-wen-hou-yu'),
        options: [
            { displayText: t('kai-qi'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    gpuAcceleration: {
        title: t('jin-yong-gpu-jia-su-zhong-qi-sheng-xiao'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    minimizeToTray: {
        title: t('guan-bi-shi-minimize-to-tray'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    highDpi: {
        title: t('shi-pei-gao-dpi'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    lyricsTranslation: {
        title: '歌词翻译',
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    lyricsAlign: {
        title: '歌词对齐',
        options: [
            { displayText: '左对齐', value: 'left' },
            { displayText: '居中', value: 'center' },
        ]
    },
    qualityCompatibility: {
        title: '兼容模式',
        options: [
            { displayText: t('kai-qi'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    dpiScale: {
        title: '缩放因子',
        options: [
            { displayText: '1.0', value: '1.0' }
        ]
    },
    font: {
        title: '字体设置',
        options: [
            { displayText: '默认字体', value: '' }
        ]
    },
    fontUrl: {
        title: '字体文件地址',
        options: [
            { displayText: '默认字体', value: '' }
        ]
    },
    apiMode: {
        title: 'API模式',
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    touchBar: {
        title: 'TouchBar',
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    autoStart: {
        title: '开机自启动',
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    startMinimized: {
        title: '启动时最小化',
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    preventAppSuspension: {
        title: '阻止系统休眠',
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    networkMode: {
        title: '网络节点',
        options: [
            { displayText: '主网', value: 'mainnet' },
            { displayText: '测试网', value: 'testnet' },
            { displayText: '开发网', value: 'devnet' }
        ]
    },

};

const showRefreshHint = ref({
    nativeTitleBar: false,
    lyricsBackground: false,
    lyricsFontSize: false,
    lyricsAlign: false,
    gpuAcceleration: false,
    highDpi: false,
    font: false,
    touchBar: false,
    preventAppSuspension: false,
    networkMode: false,

    downloadQuality: false
});

const openSelection = (type, helpLink) => {
    isSelectionOpen.value = true;
    selectionType.value = type;
    currentHelpLink.value = helpLink || selectionTypeMap[type]?.helpLink || '';

    if (type === 'quality') {
        qualityCompatibilityMode.value = selectedSettings.value.qualityCompatibility?.value === 'on';
    }

    if (type === 'highDpi') {
        dpiScale.value = parseFloat(selectedSettings.value.dpiScale?.value || '1.0');
    }

    if (type === 'font') {
        fontUrlInput.value = selectedSettings.value.fontUrl?.value || '';
        fontFamilyInput.value = selectedSettings.value.font?.value || '';
    }
    

    
    // 不需要特殊处理downloadQuality，因为它直接使用选项列表
};

const openHelpLink = () => {
    const url = currentHelpLink.value;
    if (!url) return;
    if (isElectron()) {
        window.electron.ipcRenderer.send('open-url', url);
    } else {
        window.open(url, '_blank');
    }
};

const selectOption = (option) => {
    const electronFeatures = ['desktopLyrics', 'gpuAcceleration', 'minimizeToTray', 'highDpi', 'nativeTitleBar', 'touchBar', 'autoStart', 'startMinimized', 'preventAppSuspension', 'networkMode'];
    if (!isElectron() && electronFeatures.includes(selectionType.value)) {
        window.$modal.alert(t('fei-ke-hu-duan-huan-jing-wu-fa-qi-yong'));
        return;
    }
    if(selectionType.value == 'touchBar' && window.electron.platform != 'darwin'){
        window.$modal.alert('非Mac设备不支持TouchBar');
        return;
    }
    selectedSettings.value[selectionType.value] = option;
    const actions = {
        'themeColor': () => proxy.$applyColorTheme(option.value),
        'theme': () => proxy.$setTheme(option.value),
        'nativeTitleBar': () => {
            showRefreshHint.value.nativeTitleBar = true;
        },
        'language': () => {
            proxy.$i18n.locale = option.value;
            document.documentElement.lang = option.value;
        },
        'quality': () => {
            if (!MoeAuth.isAuthenticated) {
                window.$modal.alert(t('gao-pin-zhi-yin-le-xu-yao-deng-lu-hou-cai-neng-bo-fango'));
                return;
            }
            selectedSettings.value.qualityCompatibility = {
                value: qualityCompatibilityMode.value ? 'on' : 'off',
                displayText: qualityCompatibilityMode.value ? t('kai-qi') : t('guan-bi')
            };
        },
        'downloadQuality': () => {
            // 对于下载音质，不需要特殊处理，直接保存即可
            if (!MoeAuth.isAuthenticated && option.value > 128) {
                window.$modal.alert('高音质下载需要登录后才能使用');
            }
        },
        'highDpi': () => {
            selectedSettings.value.dpiScale = {
                value: dpiScale.value.toString(),
                displayText: dpiScale.value.toString()
            };
        },
        'desktopLyrics': () => {
            const action = option.value === 'on' ? 'display-lyrics' : 'close-lyrics';
            window.electron.ipcRenderer.send('desktop-lyrics-action', action);
        },
        'preventAppSuspension': () => {
            showRefreshHint.value.preventAppSuspension = true;
        },
        'networkMode': () => {
            showRefreshHint.value.networkMode = true;
        },
        'apiServer': () => {
            showRefreshHint.value.apiServer = true;
        }
    };
    actions[selectionType.value]?.();
    saveSettings();
    if(!['apiMode','font','fontUrl'].includes(selectionType.value)) closeSelection();
    const refreshHintTypes = ['lyricsBackground', 'lyricsFontSize', 'gpuAcceleration', 'highDpi', 'apiMode', 'touchBar', 'preventAppSuspension', 'networkMode', 'font', 'downloadQuality'];
    if (refreshHintTypes.includes(selectionType.value)) {
        showRefreshHint.value[selectionType.value] = true;
    }
};

const updateFontSetting = (key) => {
    const prevType = selectionType.value;
    const value = key === 'font' ? (fontFamilyInput.value || '') : (fontUrlInput.value || '');
    const displayText = key === 'font' ? (value || '默认字体') : (value || '默认字体');
    selectionType.value = key;
    selectOption({ displayText, value });
    selectionType.value = prevType;
};

const handleFontFocusOut = (e) => {
    const container = e.currentTarget;
    if (container && e.relatedTarget && container.contains(e.relatedTarget)) return;
    updateFontSetting('fontUrl');
    updateFontSetting('font');
};

// 移除焦点自动保存，改为通过确定按钮保存
// const handleApiServerFocusOut = (e) => {
//     const container = e.currentTarget;
//     if (container && e.relatedTarget && container.contains(e.relatedTarget)) return;
//     updateApiServerSetting();
// };



const isElectron = () => {
    return typeof window !== 'undefined' && typeof window.electron !== 'undefined';
};
const saveSettings = () => {
    const settingsToSave = Object.fromEntries(
        Object.entries(selectedSettings.value).map(([key, setting]) => [key, setting.value])
    );
    settingsToSave.shortcuts = shortcuts.value;
    localStorage.setItem('settings', JSON.stringify(settingsToSave));
    isElectron() && window.electron.ipcRenderer.send('save-settings', JSON.parse(JSON.stringify(settingsToSave)));
};

const closeSelection = () => {
    isSelectionOpen.value = false;
};

onMounted(() => {
    const savedSettings = JSON.parse(localStorage.getItem('settings'));
    if (savedSettings) {
        for (const key in savedSettings) {
            if (key === 'shortcuts') continue;
            if (selectionTypeMap[key] && selectionTypeMap[key].options) {
                if (key === 'font') {
                    const value = savedSettings[key];
                    selectedSettings.value[key] = {
                        displayText: value || '默认字体',
                        value: value
                    };
                } else {
                    const displayText = selectionTypeMap[key].options.find(
                        (option) => option.value === savedSettings[key]
                    )?.displayText || '🌏 ' + t('zi-dong');
                    selectedSettings.value[key] = { displayText, value: savedSettings[key] };
                }
            }
        }
    }
    if (savedSettings?.shortcuts) {
        shortcuts.value = savedSettings.shortcuts;
    } else {
        shortcuts.value = Object.entries(shortcutConfigs.value).reduce((acc, [key, config]) => {
            acc[key] = config.defaultValue;
            return acc;
        }, {});
    }
    if(isElectron()){
        appVersion.value = localStorage.getItem('version');
        platform.value = window.electron.platform;
    }
});

const showShortcutModal = ref(false);
const recordingKey = ref('');
const shortcuts = ref({});

const shortcutConfigs = ref({
    mainWindow: {
        label: t('xian-shi-yin-cang-zhu-chuang-kou'),
        defaultValue: 'Ctrl+Shift+S'
    },
    quitApp: {
        label: t('tui-chu-zhu-cheng-xu'),
        defaultValue: 'Ctrl+Q'
    },
    prevTrack: {
        label: t('shang-yi-shou'),
        defaultValue: 'Alt+Ctrl+Left'
    },
    nextTrack: {
        label: t('xia-yi-shou'),
        defaultValue: 'Alt+Ctrl+Right'
    },
    playPause: {
        label: t('zan-ting-bo-fang'),
        defaultValue: 'Alt+Ctrl+Space'
    },
    volumeUp: {
        label: t('yin-liang-zeng-jia'),
        defaultValue: 'Alt+Ctrl+Up'
    },
    volumeDown: {
        label: t('yin-liang-jian-xiao'),
        defaultValue: 'Alt+Ctrl+Down'
    },
    mute: {
        label: t('jing-yin'),
        defaultValue: 'Alt+Ctrl+M'
    },
    like: {
        label: t('tian-jia-wo-xi-huan'),
        defaultValue: 'Alt+Ctrl+L'
    },
    mode: {
        label: t('qie-huan-bo-fang-mo-shi'),
        defaultValue: 'Alt+Ctrl+P'
    },
    toggleDesktopLyrics: {
        label: '显示/隐藏桌面歌词',
        defaultValue: 'Alt+Ctrl+D'
    }
});

const openShortcutSettings = () => {
    showShortcutModal.value = true;
};

const closeShortcutSettings = () => {
    showShortcutModal.value = false;
    recordingKey.value = '';
};

const startRecording = (key) => {
    recordingKey.value = key;
    shortcuts.value[key] = t('qing-an-xia-xiu-shi-jian');
    window.addEventListener('keydown', recordShortcut);
};

const recordShortcut = (e) => {
    if (!recordingKey.value) return;

    e.preventDefault();
    const keys = [];

    // 修饰键
    if (e.metaKey) keys.push('CommandOrControl');
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');

    // 如果按下了修饰键，更新提示
    if (keys.length > 0 && ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        shortcuts.value[recordingKey.value] = keys.join('+') + t('qing-an-xia-qi-ta-jian');
        return;
    }

    // 特殊键映射
    const specialKeys = {
        ' ': 'Space',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'Escape': 'Esc',
        'Backspace': 'Backspace',
        'Delete': 'Delete',
        'Enter': 'Return',
        'Tab': 'Tab',
        'PageUp': 'PageUp',
        'PageDown': 'PageDown',
        'Home': 'Home',
        'End': 'End',
        '+': 'numadd',
        '-': 'numsub',
        '*': 'nummult',
        '/': 'numdiv',
        '=': 'Equal'
    };

    const key = specialKeys[e.key] || e.key.toUpperCase();

    // 只有当按下的不是单独的修饰键时才结束记录
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        keys.push(key);

        if (keys.length > 0) {
            // 检查是否包含必要的修饰键
            if (!keys.some(k => ['Ctrl', 'Alt', 'Shift', 'CommandOrControl'].includes(k))) {
                window.$modal.alert(t('kuai-jie-jian-bi-xu-bao-han-zhi-shao-yi-ge-xiu-shi-jian-ctrlaltshiftcommand'));
                return;
            }

            // 检查快捷键冲突
            const newShortcut = keys.join('+');
            const conflictKey = Object.entries(shortcuts.value).find(([k, v]) =>
                v === newShortcut && k !== recordingKey.value
            );

            if (conflictKey) {
                window.$modal.alert(t('gai-kuai-jie-jian-yu')+conflictKey[0]+t('de-kuai-jie-jian-chong-tu'));
                return;
            }

            shortcuts.value[recordingKey.value] = newShortcut;
            recordingKey.value = '';
            window.removeEventListener('keydown', recordShortcut);
        }
    }
};

// 添加快捷键验证函数
const validateShortcut = (shortcut) => {
    const keys = shortcut.split('+');
    return keys.some(k => ['Ctrl', 'Alt', 'Shift', 'Command'].includes(k));
};

// 修改 saveShortcuts 函数，添加检查
const saveShortcuts = () => {
    if (!isElectron()) {
        window.$modal.alert(t('fei-ke-hu-duan-huan-jing-wu-fa-qi-yong'));
        return;
    }

    // 验证所有快捷键
    const invalidShortcuts = Object.entries(shortcuts.value).filter(([key, value]) =>
        value && !validateShortcut(value)
    );

    if (invalidShortcuts.length > 0) {
        window.$modal.alert(t('cun-zai-wu-xiao-de-kuai-jie-jian-she-zhi-qing-que-bao-mei-ge-kuai-jie-jian-du-bao-han-xiu-shi-jian'));
        return;
    }

    try {
        let settingsToSave = JSON.parse(localStorage.getItem('settings')) || {};
        settingsToSave.shortcuts = shortcuts.value;
        localStorage.setItem('settings', JSON.stringify(settingsToSave));
        window.electron.ipcRenderer.send('save-settings',  JSON.parse(JSON.stringify(settingsToSave)));
        window.electron.ipcRenderer.send('custom-shortcut');
    } catch (error) {
        console.error('保存设置失败:', error);
        window.$modal.alert(t('bao-cun-she-zhi-shi-bai'));
    }

    closeShortcutSettings();
};

onUnmounted(() => {
    window.removeEventListener('keydown', recordShortcut);
});

const clearShortcut = (key) => {
    shortcuts.value[key] = '';
};

const qualityCompatibilityMode = ref(false);
const dpiScale = ref(1.0);

const openResetConfirmation = async () => {
    const result = await window.$modal.confirm('你确定要恢复出厂设置吗？此操作不可逆！');
    if(result){
        localStorage.clear();
        isElectron() && window.electron.ipcRenderer.send('clear-settings');
        window.$modal.alert('恢复出厂设置成功，重启生效');
    }
};

let deferredPrompt;
if(!isElectron()){
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });
}

const installPWA = async () => {
    if(isElectron()){
        window.$modal.alert('请在Web环境下安装');
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('User accepted the PWA installation');
        deferredPrompt = null;
    } else {
        console.log('User declined the PWA installation');
    }
};
</script>

<style scoped>
.settings-page {
    background: #ffffff;
    color: var(--text-primary);
    min-height: calc(100vh - 80px); /* 减去顶部导航栏高度，使用最小高度 */
}

.settings-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    box-sizing: border-box;
}

.setting-section {
    margin-bottom: 32px;
}

.setting-section h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--text-primary);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
}

.settings-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.setting-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: var(--card-hover);
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.setting-card:hover {
    background: var(--background-color);
    border-color: var(--border-color);
}

.setting-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.setting-card-header i {
    font-size: 18px;
    color: var(--primary-color);
}

.setting-card-value {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 14px;
}

.setting-card-value i {
    font-size: 12px;
}

.refresh-hint {
    margin-left: 8px;
    padding: 2px 8px;
    background: var(--primary-color);
    color: white;
    font-size: 12px;
    font-weight: 500;
}

.version-info {
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 14px;
}

.version-info p {
    margin: 0 0 8px 0;
}

/* 弹窗样式 */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: var(--card-background);
    padding: 24px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-content h3 {
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 18px;
    color: var(--text-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.help-link {
    color: var(--primary-color);
    font-size: 20px;
    cursor: pointer;
    padding: 4px;
    transition: background-color 0.2s ease;
}

.help-link:hover {
    background: var(--primary-color-light);
}

.modal-content ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.modal-content li {
    padding: 12px;
    margin-bottom: 8px;
    background: var(--card-hover);
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.modal-content li:hover {
    background: var(--background-color);
    border-color: var(--border-color);
}

/* API设置样式 */
.api-settings-container {
    margin-bottom: 20px;
}

.api-setting-item {
    margin-bottom: 16px;
}

.api-setting-item label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-primary);
    font-size: 14px;
}

.api-input {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border-color);
    background: var(--background-color);
    color: var(--text-primary);
    font-size: 14px;
    box-sizing: border-box;
    transition: border-color 0.2s ease;
}

.api-input:focus {
    outline: none;
    border-color: var(--primary-color);
}

.api-input:disabled {
    background: var(--card-hover);
    cursor: not-allowed;
}

.api-hint {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 8px;
}

/* 按钮组样式 */
.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
}

.modal-actions button {
    padding: 10px 24px;
    background: var(--background-color);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.modal-actions button:hover {
    background: var(--card-hover);
}

.modal-actions button.primary {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
}

.modal-actions button.primary:hover {
    background: var(--primary-color-dark);
}

/* 兼容性选项样式 */
.compatibility-option {
    margin-top: 16px;
}

.compatibility-option label {
    display: flex;
    align-items: flex-start;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-primary);
}

.compatibility-option input[type="checkbox"] {
    margin-right: 8px;
    margin-top: 2px;
}

.compatibility-hint {
    font-size: 12px;
    color: var(--text-secondary);
    margin-left: 24px;
    margin-top: 4px;
}

/* 缩放滑块样式 */
.scale-slider-container {
    margin-top: 16px;
}

.scale-slider-label {
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 12px;
}

.scale-slider-hint {
    font-size: 12px;
    color: var(--text-secondary);
    margin-left: 8px;
}

.scale-slider-wrapper {
    margin-bottom: 8px;
}

.scale-slider {
    width: 100%;
    height: 6px;
    background: var(--card-hover);
    outline: none;
    -webkit-appearance: none;
}

.scale-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    background: var(--primary-color);
    cursor: pointer;
    transition: all 0.2s ease;
}

.scale-slider::-webkit-slider-thumb:hover {
    /* 移除了多余的视觉图层效果 */
}

.scale-marks {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-secondary);
}

/* 快捷键设置样式 */
.shortcut-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.shortcut-modal-content {
    background: var(--card-background);
    padding: 24px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
}

.shortcut-modal-content h3 {
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 18px;
    color: var(--text-primary);
}

.shortcut-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
}

.shortcut-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--card-hover);
}

.shortcut-input {
    position: relative;
    padding: 8px 16px;
    background: var(--background-color);
    border: 1px solid var(--border-color);
    min-width: 150px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.shortcut-input:hover {
    border-color: var(--primary-color);
}

.shortcut-input.recording {
    background: var(--primary-color-light);
    border-color: var(--primary-color);
    color: var(--primary-color);
}

.clear-shortcut {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    background: var(--border-color);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.clear-shortcut:hover {
    background: var(--text-secondary);
}

.shortcut-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
}

.shortcut-modal-footer button {
    padding: 10px 24px;
    background: var(--background-color);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.shortcut-modal-footer button:hover {
    background: var(--card-hover);
}

.shortcut-modal-footer button.primary {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
}

.shortcut-modal-footer button.primary:hover {
    background: var(--primary-color-dark);
}

/* 响应式设计 */
@media (max-width: 768px) {
    .settings-page {
        padding: 16px;
        min-height: calc(100vh - 80px); /* 改为最小高度 */
    }
    
    .settings-content {
        padding: 16px;
    }
    
    .setting-card {
        padding: 12px;
    }
    
    .modal-content {
        width: 95%;
        padding: 20px;
    }
    
    .shortcut-modal-content {
        width: 95%;
        padding: 20px;
    }
    
    .setting-card-header i {
        font-size: 16px;
    }
    
    .setting-card-header span {
        font-size: 14px;
    }
    
    .setting-card-value {
        font-size: 12px;
    }
    
    .refresh-hint {
        font-size: 10px;
        padding: 1px 6px;
    }
}

@media (max-width: 480px) {
    .settings-page {
        padding: 12px;
        min-height: calc(100vh - 80px); /* 改为最小高度 */
    }
    
    .settings-content {
        padding: 12px;
    }
    
    .setting-section h3 {
        font-size: 16px;
        margin-bottom: 12px;
    }
    
    .setting-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
    
    .setting-card-value {
        align-self: stretch;
        justify-content: space-between;
    }
    
    .modal-actions {
        flex-direction: column;
    }
    
    .modal-actions button {
        width: 100%;
    }
    
    .shortcut-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
    
    .shortcut-input {
        width: 100%;
    }
    
    .shortcut-modal-footer {
        flex-direction: column;
    }
    
    .shortcut-modal-footer button {
        width: 100%;
    }
}
</style>