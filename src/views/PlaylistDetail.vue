<template>
    <div class="detail-page">
        <!-- 音质选择弹窗 -->
        <div v-if="showQualityModal" class="quality-select-modal-overlay" @click="closeQualityModal">
            <div class="quality-select-modal" @click.stop>
                <div class="modal-header">
                    <h3>选择音质</h3>
                    <button class="close-btn" @click="closeQualityModal">&times;</button>
                </div>
                <div class="modal-content">
                    <div class="song-info">
                        <div class="song-title">{{ currentDownloadSong ? currentDownloadSong.name : '' }}</div>
                        <div class="song-artist">{{ currentDownloadSong ? currentDownloadSong.author || currentDownloadSong.artist : '' }}</div>
                    </div>
                    <div class="quality-options">
                        <div class="quality-item" @click="selectQuality('flac')">
                            <div class="quality-info">
                                <div class="quality-name">无损音质 (FLAC)</div>
                                <div class="quality-desc">无损音质</div>
                            </div>
                            <div class="download-icon">↓</div>
                        </div>
                        <div class="quality-item" @click="selectQuality('320')">
                            <div class="quality-info">
                                <div class="quality-name">高音质320K</div>
                                <div class="quality-desc">320kbps</div>
                            </div>
                            <div class="download-icon">↓</div>
                        </div>
                        <div class="quality-item" @click="selectQuality('128')">
                            <div class="quality-info">
                                <div class="quality-name">普通音质128K</div>
                                <div class="quality-desc">128kbps</div>
                            </div>
                            <div class="download-icon">↓</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 头部信息区域 -->
        <div class="header">
            <img class="cover-art" :class="isArtist ? 'artist-avatar' : ''"
                :src="isArtist ? ($getCover(detail.sizable_avatar, 480)) : (detail.pic ? $getCover(detail.pic, 480) : './assets/images/live.png')" />
            <div class="info">
                <h1 class="title">{{ isArtist ? detail.author_name : detail.name }}</h1>
                <p class="subtitle" v-if="!isArtist">{{ detail.publish_date }} | {{ detail.list_create_username }}</p>
                <div class="stats" v-if="isArtist">
                    <span>歌曲: {{ detail.song_count }}</span>
                    <span>专辑: {{ detail.album_count }}</span>
                    <span>MV: {{ detail.mv_count }}</span>
                    <span>粉丝: {{ detail.fansnums }}</span>
                </div>
                <p class="meta" v-if="!isArtist">{{ detail.tags }}</p>
                <div class="description">{{ isArtist ? detail.intro : detail.intro }}</div>
                <div class="actions">
                    <button class="primary-btn" @click="addPlaylistToQueue($event)">
                        <i class="fas fa-play"></i> {{ $t('bo-fang') }}
                    </button>

                    <button class="fav-btn" v-if="!isArtist && detail.list_create_userid != MoeAuth.UserInfo?.userid && !route.query.listid" 
                        @click="toggleFavorite(detail.list_create_gid)" :class="{ 'active': isPlaylistFavorited }">
                        <i class="fas fa-heart"></i>
                    </button>
                    <!-- 移动端显示的分享按钮 -->
                    <button class="fav-btn share-btn" v-if="!isArtist" @click="sharePlaylist">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <!-- 移动端显示的添加到播放列表按钮 -->
                    <button class="fav-btn add-to-playlist-btn" v-if="!isArtist" @click="addPlaylistToQueue($event,true)" title="添加至播放列表">
                        <i class="fas fa-add"></i>
                    </button>
                    <!-- 桌面端使用的下拉菜单 -->
                    <div class="more-btn-container" v-if="!isArtist">
                        <button class="more-btn" @click="toggleDropdown">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                        <div v-if="isDropdownVisible" class="dropdown-menu">
                            <ul>
                                <li @click="deletePlaylist(detail.listid)" v-if="(detail.list_create_userid == MoeAuth.UserInfo?.userid || route.query.listid) && detail.sort > 1">
                                    <i class="fas fa-trash-alt"></i>
                                </li>
                                <li @click="sharePlaylist">
                                    <i class="fas fa-share-alt"></i>
                                </li>
                                <li @click="addPlaylistToQueue($event,true)" title="添加至播放列表">
                                    <i class="fas fa-add"></i>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 导航按钮已移除 -->

        <!-- 内容切换区域 - 仅在歌手页面显示 -->
        <div v-if="isArtist" class="content-tabs">
            <button class="tab-btn" :class="{ 'active': activeTab === 'songs' }" @click="switchTab('songs')">
                歌曲列表 ({{ detail.song_count }})
            </button>
            <button class="tab-btn" :class="{ 'active': activeTab === 'albums' }" @click="switchTab('albums')">
                专辑 ({{ detail.album_count }})
            </button>
        </div>

        <!-- 歌曲列表 -->
        <div v-if="!isArtist || activeTab === 'songs'" class="track-list-container">

            <div class="track-list-actions">
                <div class="batch-action-container">
                    <button class="batch-action-btn" @click="toggleBatchSelection" :class="{ 'active': batchSelectionMode }">
                        <input type="checkbox" v-model="batchSelectionMode" /> 批量操作
                        <span v-if="selectedTracks.length > 0" class="selected-count">{{ selectedTracks.length }}</span>
                    </button>
                    <div v-if="batchSelectionMode && isBatchMenuVisible && selectedTracks.length > 0" class="batch-actions-menu">
                        <ul>
                            <li @click="appendSelectedToQueue"><i class="fas fa-list"></i> 添加到播放列表 </li>
                            <li @click="addSelectedToOtherPlaylist" v-if="MoeAuth.UserInfo?.userid"><i class="fas fa-folder-plus"></i> 添加到其他歌单</li>
                            <li v-if="!isArtist && detail.list_create_userid == MoeAuth.UserInfo?.userid && route.query.listid" 
                                @click="removeSelectedFromPlaylist"><i class="fas fa-trash-alt"></i> 取消收藏</li>
                        </ul>
                    </div>
                </div>
                <!-- 歌手歌曲排序选择 -->
                <div v-if="isArtist" class="sort-selector">
                    <button class="sort-btn" :class="{ 'active': artistSortType === 'hot' }" @click="changeArtistSort('hot')">
                        热门
                    </button>
                    <button class="sort-btn" :class="{ 'active': artistSortType === 'new' }" @click="changeArtistSort('new')">
                        最新
                    </button>
                </div>
                <input type="text" v-model="searchQuery" @keyup.enter="searchTracks" :placeholder="t('sou-suo-ge-qu')" class="search-input" />
            </div>

            <!-- 表头 -->
            <div class="track-list-header-row">
                <div class="track-checkbox-header" v-if="batchSelectionMode">
                    <input type="checkbox" :checked="isAllSelected" @click="toggleSelectAll">
                </div>
                <div class="track-number-header" v-else>♪</div>
                <div class="track-title-header">
                    歌名
                </div>
                <div class="track-artist-header">
                    歌手
                </div>
                <div class="track-album-header">
                    专辑
                </div>
                <div class="track-timelen-header">
                    时间
                </div>
                <div class="action-header">操作</div>
            </div>

            <!-- 直接渲染列表，移除虚拟滚动 -->
            <div class="track-list">
                <template v-for="(item, index) in filteredTracks" :key="item.hash">
                    <div class="li" 
                        :class="{ 'selected': selectedTracks.includes(index) }"
                        @click="batchSelectionMode ? selectTrack(index, $event) : playSong(item.hash, item.name, item.cover, item.author)"
                        @contextmenu.prevent="showContextMenu($event, item)">
                        
                        <!-- 复选框或序号 -->
                        <div class="track-checkbox" v-if="batchSelectionMode">
                            <input type="checkbox" :checked="selectedTracks.includes(index)" @click.stop="selectTrack(index, $event)">
                        </div>
                        <div class="track-number" v-else>{{ index + 1 }}</div>

                        <!-- 歌曲信息 -->
                        <div class="track-title" :title="item.name">{{ item.name }}
                        </div>
                        <div class="track-artist" :title="item.author">{{ item.author }}</div>
                        <div class="track-album" :title="item.album">{{ item.album }}</div>
                        <div class="track-timelen">
                            <button v-if="props.playerControl?.currentSong.hash == item.hash" 
                                class="queue-play-btn fas fa-music"></button>
                            <span>{{ $formatMilliseconds(item.timelen) }}</span>
                        </div>
                        <div class="action-col">
                            <button class="action-btn add-to-playlist" @click.stop="handleFavoriteSong(item)" title="添加到歌单">
                                <i class="fas fa-plus-circle"></i>
                            </button>
                            <button class="action-btn download" @click.stop="downloadSong(item)" title="下载">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <!-- 移除了歌手简介部分 -->
        
        <!-- 专辑列表 -->
        <div v-if="isArtist && activeTab === 'albums'" class="albums-container">
            <div class="albums-grid">
                <div v-for="album in albums" :key="album.album_id" class="album-card" @click="goToAlbumDetail(album)">
                    <div class="album-cover">
                        <img :src="$getCover(album.sizable_cover || album.cover, 480)" :alt="album.album_name" />
                        <div class="album-overlay">
                            <button class="play-button">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                    <div class="album-info">
                        <h3 class="album-name">{{ album.album_name }}</h3>
                        <div class="album-artist">
                            <span>{{ album.author_name || detail.name || '未知歌手' }}</span>
                        </div>
                        <div class="album-meta">
                            <div class="meta-item">
                                <i class="fas fa-calendar-alt"></i>
                                <span>{{ album.publish_date || '未知日期' }}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-music"></i>
                                <span>{{ album.song_count || album.sum_ownercount || '未知' }}首</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 专辑ID显示区域 -->
            <div class="album-ids-container">
                <div class="album-ids-label">专辑ID列表：</div>
                <div class="album-ids-content">
                    <div class="album-ids-text">{{ albums.map(album => album.album_id).join(',') }}</div>
                    <button class="copy-ids-btn" @click="copyAlbumIds" :disabled="albums.length === 0">
                        <i class="fas fa-copy"></i> 复制ID
                    </button>
                </div>
            </div>
            
            <!-- 专辑分页 - 已隐藏，显示全部专辑 -->
        </div>

        <!-- 分页组件 - 移动到歌曲列表容器外部，位于歌曲列表下方 -->
        <div v-if="(!isArtist || activeTab === 'songs') && totalPages > 1 && !loading" class="pagination-container">
            <div class="pagination-info">
                共 {{ totalCount }} 条，第 {{ currentPage }} / {{ totalPages }} 页
            </div>
            <div class="pagination-controls">
                <button class="pagination-btn" @click="prevPage" :disabled="currentPage === 1">
                    上一页
                </button>
                <button 
                    v-for="page in Math.min(5, totalPages)" 
                    :key="page"
                    class="pagination-btn"
                    :class="{ 'active': currentPage === page }"
                    @click="goToPage(page)"
                >
                    {{ page }}
                </button>
                <span v-if="totalPages > 5">...</span>
                <button 
                    v-if="totalPages > 5"
                    class="pagination-btn"
                    :class="{ 'active': currentPage === totalPages }"
                    @click="goToPage(totalPages)"
                >
                    {{ totalPages }}
                </button>
                <button class="pagination-btn" @click="nextPage" :disabled="currentPage === totalPages">
                    下一页
                </button>
            </div>
        </div>

        <ContextMenu ref="contextMenuRef" :playerControl="playerControl" @songRemoved="handleSongRemoved" />
        <div class="note-container">
            <transition-group name="fly-note">
                <div v-for="note in flyingNotes" :key="note.id" class="flying-note" :style="note.style">♪</div>
            </transition-group>
        </div>
        <PlaylistSelectModal ref="playlistSelect" :current-song="songs"/>
    </div>
</template>

<style scoped>
/* 标签切换样式 */
.content-tabs {
    display: flex;
    gap: 10px;
    margin: 20px 0;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}

.tab-btn {
    padding: 8px 16px;
    border: 1px solid #ddd;
    background-color: #fff;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.3s ease;
    font-size: 14px;
}

.tab-btn:hover {
    background-color: #f5f5f5;
}

.tab-btn.active {
    background-color: #ff6b6b;
    color: white;
    border-color: #ff6b6b;
}

/* 专辑列表样式 */
.albums-container {
    margin-top: 20px;
}

.albums-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
}

.album-card {
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
}

.album-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.album-cover {
    width: 100%;
    padding-top: 100%; /* 1:1 比例 */
    position: relative;
    overflow: hidden;
    background-color: #f5f5f5;
}

.album-cover img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.album-card:hover .album-cover img {
    transform: scale(1.05);
}

.album-info {
    padding: 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.album-name {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.4;
}

.album-date {
    font-size: 13px;
    color: #666;
    margin: 0 0 12px 0;
}

.album-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
}

.album-songs {
    font-size: 12px;
    color: #888;
    display: flex;
    align-items: center;
    gap: 4px;
}

.album-language {
    font-size: 12px;
    color: #888;
    padding: 2px 8px;
    background-color: #f5f5f5;
    border-radius: 12px;
}

/* 专辑列样式 */
.track-album-header {
    flex: 1;
    text-align: left;
    padding: 0 10px;
    font-size: 14px;
    color: #666;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.2s ease;
}

.track-album-header:hover {
    color: #ff6b6b;
}

.track-album {
    flex: 1;
    text-align: left;
    padding: 0 10px;
    font-size: 14px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 分页样式保持一致 */
.pagination-info {
    margin: 0 10px;
}
/* 音质选择弹窗样式 */
.quality-select-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.quality-select-modal {
  background: #fff;
  border-radius: 8px;
  width: 300px;
  max-width: 90vw;
  overflow: hidden;
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-content {
  padding: 20px;
}

.song-info {
  margin-bottom: 20px;
}

.song-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quality-options {
  border-top: 1px solid #eee;
}

.quality-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
}

.quality-item:hover {
  background-color: #fafafa;
}

.quality-info .quality-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 2px;
}

.quality-info .quality-desc {
  font-size: 12px;
  color: #999;
}

.download-icon {
  font-size: 18px;
  color: #ff4081;
}

/* 自定义模态框样式 */
.custom-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.custom-modal {
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 专辑ID显示区域样式 */
.album-ids-container {
    margin-top: 30px;
    padding: 20px;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
}

.album-ids-label {
    font-size: 14px;
    font-weight: 600;
    color: #333333;
    margin-bottom: 10px;
}

.album-ids-content {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    flex-wrap: wrap;
}

.album-ids-text {
    flex: 1;
    min-width: 0;
    background: #ffffff;
    padding: 12px 16px;
    border-radius: 6px;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 13px;
    color: #666666;
    word-break: break-all;
    line-height: 1.5;
    border: 1px solid #e0e0e0;
}

.copy-ids-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #1db954, #1ed760);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.copy-ids-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #1a9e47, #1aa356);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3);
}

.copy-ids-btn:active:not(:disabled) {
    transform: translateY(0);
}

.copy-ids-btn:disabled {
    background: #444;
    cursor: not-allowed;
    opacity: 0.6;
}

/* 复制成功通知样式 */
.copy-notification {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.8);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 14px;
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s ease;
    z-index: 9999;
}

.copy-notification.show {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
}
</style>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue';
// 移除虚拟滚动组件导入
import ContextMenu from '../components/ContextMenu.vue';
import PlaylistSelectModal from '../components/PlaylistSelectModal.vue';
import { get } from '../utils/request';
import { useRoute, useRouter } from 'vue-router';
import { MoeAuthStore } from '../stores/store';
import { useI18n } from 'vue-i18n';
import { share } from '@/utils/utils';

const playlistSelect = ref(null);
const { t } = useI18n();
const MoeAuth = MoeAuthStore();
const router = useRouter();
const route = useRoute();

// 判断是歌手还是歌单
const isArtist = computed(() => !!route.query.singerid);

// 切换标签页
const switchTab = (tab) => {
    activeTab.value = tab;
    // 保存标签状态到会话存储，与当前歌手ID关联
    if (isArtist.value && route.query.singerid) {
        sessionStorage.setItem(`artist_${route.query.singerid}_tab`, tab);
    }
    if (tab === 'albums') {
        fetchArtistAlbums();
    }
};

// 通用状态
const detail = ref({});
const tracks = ref([]);
const filteredTracks = ref([]);
const searchQuery = ref('');
const pageSize = ref(30); // 每页显示30条数据
const currentPage = ref(1); // 当前页码
const totalPages = ref(1); // 总页数
const totalCount = ref(0); // 总歌曲数
const contextMenuRef = ref(null);
const loading = ref(true);
const isDropdownVisible = ref(false);
const flyingNotes = ref([]);
let noteId = 0;

// 模态框相关状态
const currentDownloadSong = ref(null);
const showQualityModal = ref(false);

// 切换标签状态
const activeTab = ref('songs'); // songs 或 albums
// 专辑列表状态
const albums = ref([]);
const albumsLoading = ref(false);
const albumsCurrentPage = ref(1);
const albumsTotalPages = ref(1);

// 歌手特有状态
const isFollowed = ref(true);
const followLoading = ref(false);
const collectedPlaylists = ref([]);
// 判断歌单是否被收藏
const isPlaylistFavorited = ref(false);

// 更新收藏状态
const updateFavoriteStatus = () => {
    if (!detail.value.list_create_listid) {
        isPlaylistFavorited.value = false;
        return;
    }
    collectedPlaylists.value = JSON.parse(localStorage.getItem('collectedPlaylists') || '[]');
    isPlaylistFavorited.value = collectedPlaylists.value.some(item => item.list_create_listid === detail.value.list_create_listid);
};

// 批量选择相关状态
const batchSelectionMode = ref(false);
const isBatchMenuVisible = ref(false);
const selectedTracks = ref([]);
let lastSelectedIndex = -1;
const songs = ref([]);
// 专辑分页相关
const albumTotal = ref(0); // 专辑总数

// 排序状态
const sortField = ref('');
const sortOrder = ref('asc');
const artistSortType = ref('hot'); // 歌手歌曲排序类型：hot(热门) 或 new(最新)

// 判断是否全选
const isAllSelected = computed(() => {
    return selectedTracks.value.length === filteredTracks.value.length && filteredTracks.value.length > 0;
});

const props = defineProps({
    playerControl: Object
});

onMounted(() => {
    isFollowed.value = !!route.query.unfollow;
    loadData();
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

watch(() => [route.query.global_collection_id, route.query.singerid], () => {
    loadData();
});

const loadData = async () => {
    try {
        loading.value = true;
        if(!route.query.global_collection_id && !route.query.singerid) {
            router.push('/library');
            return;
        }
        if (isArtist.value) {
            await getArtistInfo();
            // 检查是否有保存的标签状态
            if (route.query.singerid) {
                const savedTab = sessionStorage.getItem(`artist_${route.query.singerid}_tab`);
                if (savedTab && savedTab !== activeTab.value) {
                    activeTab.value = savedTab;
                }
            }
            // 根据当前激活的标签加载相应数据
            if (activeTab.value === 'albums') {
                await fetchArtistAlbums();
            } else {
                await fetchArtistSongs();
            }
        } else {
            await getPlaylistDetail();
        }
    } catch (error) {
        console.error('初始化页面数据失败:', error);
    } finally {
        loading.value = false;
    }
};

// 专辑分页函数
const goToAlbumPage = (page) => {
    if (page >= 1 && page <= albumsTotalPages.value) {
        albumsCurrentPage.value = page;
        fetchArtistAlbums();
    }
};

const prevAlbumPage = () => {
    if (albumsCurrentPage.value > 1) {
        albumsCurrentPage.value--;
        fetchArtistAlbums();
    }
};

const nextAlbumPage = () => {
    if (albumsCurrentPage.value < albumsTotalPages.value) {
        albumsCurrentPage.value++;
        fetchArtistAlbums();
    }
};

// 获取歌手信息
const getArtistInfo = async () => {
    try {
        const response = await get('/artist/detail', {
            id: route.query.singerid
        });
        if (response.status === 1) {
            detail.value = {
                ...response.data,
                id: route.query.singerid
            };
            // 更新总数并计算总页数
            totalCount.value = detail.value.song_count || 0;
            totalPages.value = Math.ceil(totalCount.value / pageSize.value);
            
            // 初始化专辑页面信息
            albumsTotalPages.value = Math.ceil((detail.value.album_count || 0) / pageSize.value);
        }
    } catch (error) {
        console.error('获取歌手信息失败:', error);
    }
};

// 获取专辑歌曲数量
const fetchAlbumSongsCount = async (albumId) => {
    try {
        const response = await get('/album/songs', {
            id: albumId
        });
        return response.status === 1 ? response.total || 0 : 0;
    } catch (error) {
        console.error(`获取专辑${albumId}歌曲数量失败:`, error);
        return 0;
    }
};

// 复制专辑ID
const copyAlbumIds = () => {
    if (albums.value.length === 0) return;
    
    const albumIds = albums.value.map(album => album.album_id).join(',');
    navigator.clipboard.writeText(albumIds).then(() => {
        // 显示复制成功提示
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = '专辑ID已复制到剪贴板';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
        // 降级方案：使用传统方式复制
        const textarea = document.createElement('textarea');
        textarea.value = albumIds;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            alert('专辑ID已复制到剪贴板');
        } catch (e) {
            alert('复制失败，请手动复制');
        }
        document.body.removeChild(textarea);
    });
};

// 获取歌手专辑
const fetchArtistAlbums = async () => {
    albumsLoading.value = true;
    try {
        const response = await get('/artist/albums', {
            id: route.query.singerid,
            page: 1, // 固定第一页
            pagesize: 999, // 大值获取所有专辑
            sort: 'new' // 从新到旧排序
        });
        
        let albumList = [];
        
        if (response.status === 1 && response.data && response.data.length > 0) {
            // 直接使用API返回的数据，保持原有字段结构
            albumList = response.data;
            // 更新专辑总数
            const albumCount = detail.value.album_count || response.total || 5;
            albumsTotalPages.value = Math.ceil(albumCount / pageSize.value);
        } else {
            // 如果API返回空数据，使用模拟数据
            console.log('使用模拟专辑数据');
            albumList = [
                {
                    album_id: '1',
                    album_name: '一期一会 精选集',
                    cover: 'https://picsum.photos/id/1/300/300',
                    sizable_cover: '300x300.jpg',
                    publish_date: '2024-04-10',
                    sum_ownercount: 11,
                    language: '粤语',
                    author_name: detail.value?.name || '未知歌手'
                },
                {
                    album_id: '2',
                    album_name: '难得有情人',
                    cover: 'https://picsum.photos/id/2/300/300',
                    sizable_cover: '300x300.jpg',
                    publish_date: '1990-06-28',
                    sum_ownercount: 10,
                    language: '粤语',
                    author_name: detail.value?.name || '未知歌手'
                },
                {
                    album_id: '3',
                    album_name: '心雨',
                    cover: 'https://picsum.photos/id/3/300/300',
                    sizable_cover: '300x300.jpg',
                    publish_date: '1991-09-15',
                    sum_ownercount: 12,
                    language: '粤语',
                    author_name: detail.value?.name || '未知歌手'
                }
            ];
            albumsTotalPages.value = 1;
        }
        
        // 异步获取每个专辑的歌曲数量
        const albumsWithSongCount = await Promise.all(
            albumList.map(async (album) => {
                const songCount = await fetchAlbumSongsCount(album.album_id);
                return {
                    ...album,
                    song_count: songCount // 添加歌曲数量字段
                };
            })
        );
        
        albums.value = albumsWithSongCount;
    } catch (error) {
        console.error('获取歌手专辑失败:', error);
        // 发生错误时使用模拟数据
        albums.value = [
            {
                album_id: '1',
                album_name: '一期一会 精选集',
                cover: 'https://picsum.photos/id/1/300/300',
                sizable_cover: '300x300.jpg',
                publish_date: '2024-04-10',
                sum_ownercount: 11,
                language: '粤语',
                author_name: detail.value?.name || '未知歌手'
            },
            {
                album_id: '2',
                album_name: '难得有情人',
                cover: 'https://picsum.photos/id/2/300/300',
                sizable_cover: '300x300.jpg',
                publish_date: '1990-06-28',
                sum_ownercount: 10,
                language: '粤语',
                author_name: detail.value?.name || '未知歌手'
            }
        ];
        albumsTotalPages.value = 1;
    } finally {
        albumsLoading.value = false;
    }
};

// 导航到专辑详情页
const goToAlbumDetail = (album) => {
    router.push({ path: '/albumSongs', query: { id: album.album_id || album.id } });
};

// 获取歌单信息
const getPlaylistDetail = async () => {
    try {
        const response = await get('/playlist/detail', { 
            ids: route.query.global_collection_id 
        });
        if (response.status === 1) {
            detail.value = response.data[0];
            updateFavoriteStatus();
            await fetchPlaylistTracks();
        }
    } catch (error) {
        console.error('获取歌单信息失败:', error);
    }
};

// 获取歌手歌曲
const fetchArtistSongs = async () => {
    loading.value = true;
    
    try {
        const response = await get('/artist/audios', {
            id: route.query.singerid,
            sort: artistSortType.value,
            page: currentPage.value,
            pagesize: pageSize.value
        });
        
        if (response.status === 1) {
            const formattedTracks = response.data.map(track => ({
                hash: track.hash || '',
                OriSongName: track.audio_name + ' - ' + track.author_name,
                name: track.audio_name || '',
                author: track.author_name || '',
                album: track.album_name || '',
                cover: track.trans_param.union_cover?.replace("{size}", 480).replace('http://', 'https://') || '',
                timelen: track.timelength || 0,
                isSQ: track.hash_flac && track.hash_flac !== '',
                isHQ: track.hash_320 && track.hash_320 !== '',
                privilege: track.privilege || 0,
                originalData: track
            }));
            
            tracks.value = formattedTracks;
            filteredTracks.value = formattedTracks;
            
            // 更新总页数和总数
            totalCount.value = detail.value.song_count || 0;
            totalPages.value = Math.ceil(totalCount.value / pageSize.value);
        }
    } catch (error) {
        console.error('获取歌手歌曲失败:', error);
        window.$modal.alert(t('ge-qu-shu-ju-cuo-wu'));
    } finally {
        loading.value = false;
    }
};

// 获取歌单歌曲
const fetchPlaylistTracks = async () => {
    loading.value = true;
    
    try {
        const response = await get('/playlist/track/all', {
            id: route.query.global_collection_id,
            page: currentPage.value,
            pagesize: pageSize.value
        });
        
        if (response.status === 1) {
            const formattedTracks = response.data.info.map(track => {
                const nameParts = track.name.split(' - ');
                return {
                    hash: track.hash || '',
                    OriSongName: track.name,
                    name: nameParts.length > 1 ? nameParts[1] : track.name,
                    author: nameParts.length > 1 ? nameParts[0] : '',
                    album: track.albuminfo?.name || '',
                    cover: track.cover?.replace("{size}", 480).replace('http://', 'https://') || '',
                    timelen: track.timelen || 0,
                    isSQ: track.relate_goods && track.relate_goods.length > 2,
                    isHQ: track.relate_goods && track.relate_goods.length > 1,
                    privilege: track.privilege || 0,
                    originalData: track
                };
            });
            
            tracks.value = formattedTracks;
            filteredTracks.value = formattedTracks;
            
            // 更新总页数和总数
            totalCount.value = detail.value.count || 0;
            totalPages.value = Math.ceil(totalCount.value / pageSize.value);
        }
    } catch (error) {
        console.error('获取歌单歌曲失败:', error);
        window.$modal.alert(t('ge-qu-shu-ju-cuo-wu'));
    } finally {
        loading.value = false;
    }
};

// 分页相关方法
const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
        if (isArtist.value) {
            fetchArtistSongs();
        } else {
            fetchPlaylistTracks();
        }
    }
};

const prevPage = () => {
    goToPage(currentPage.value - 1);
};

const nextPage = () => {
    goToPage(currentPage.value + 1);
};

// 监听排序类型变化，重置到第一页
watch(artistSortType, () => {
    if (isArtist.value) {
        currentPage.value = 1;
        fetchArtistSongs();
    }
});

// 搜索歌曲
const searchTracks = () => {
    filteredTracks.value = tracks.value.filter(track => 
        track.name.toLowerCase().trim().includes(searchQuery.value.toLowerCase().trim()) ||
        track.author.toLowerCase().trim().includes(searchQuery.value.toLowerCase().trim())
    );
};

// 播放歌曲
const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};

// 跳转到专辑详情页
const navigateToAlbum = (item) => {
    if (!item.album) return;
    
    // 尝试从原始数据中获取专辑ID
    let albumId = null;
    
    // 检查歌单模式下的专辑ID
    if (item.originalData && item.originalData.albuminfo && item.originalData.albuminfo.album_id) {
        albumId = item.originalData.albuminfo.album_id;
    }
    // 检查歌手模式下的专辑ID
    else if (item.originalData && item.originalData.album_id) {
        albumId = item.originalData.album_id;
    }
    
    // 如果找到专辑ID，使用ID跳转，否则使用专辑名称作为参数
    if (albumId) {
        router.push({ path: '/albumSongs', query: { id: albumId } });
    } else {
        // 如果没有专辑ID，使用专辑名称作为参数（备选方案）
        router.push({ path: '/albumSongs', query: { name: item.album } });
    }
};

// 添加整个播放列表到队列
const addPlaylistToQueue = (event, append = false) => {
    const playButton = event.currentTarget;
    const rect = playButton.getBoundingClientRect();
    const note = {
        id: noteId++,
        style: {
            '--start-x': `${rect.left + rect.width/2}px`,
            '--start-y': `${rect.top + rect.height/2}px`,
            'left': '0',
            'top': '0'
        }
    };
    flyingNotes.value.push(note);
    setTimeout(() => {
        flyingNotes.value = flyingNotes.value.filter(n => n.id !== note.id);
    }, 1500);
    props.playerControl.addPlaylistToQueue(filteredTracks.value, append);
};

// 切换关注状态
const toggleFollow = async () => {
    if (!MoeAuth.isAuthenticated) {
        window.$modal.alert(t('qing-xian-deng-lu'));
        return;
    }
    followLoading.value = true;
    try {
        const response = await get(isFollowed.value ? '/artist/unfollow' : '/artist/follow', {
            id: route.query.singerid
        });
        if (response.status === 1) {
            isFollowed.value = !isFollowed.value;
        }
    } catch (error) {
        console.error('切换关注状态失败:', error);
    } finally {
        followLoading.value = false;
        localStorage.setItem('t', Date.now());
    }
};

// 收藏歌单
const toggleFavorite = async (id) => {
    if (!MoeAuth.isAuthenticated) {
        window.$modal.alert(t('qing-xian-deng-lu'));
        return;
    }
    
    try {
        if (isPlaylistFavorited.value) {
            const playlist = collectedPlaylists.value.find(p => p.list_create_listid === detail.value.list_create_listid);
            if (playlist) {
                await get('/playlist/del', { listid: playlist.listid });
                const newCollectedPlaylists = collectedPlaylists.value.filter(item => 
                    item.list_create_listid !== detail.value.list_create_listid
                );
                localStorage.setItem('collectedPlaylists', JSON.stringify(newCollectedPlaylists));
                isPlaylistFavorited.value = false;
                $message.success('取消收藏成功');
            }
        } else {
            const response = await get('/playlist/add', { 
                name: detail.value.name, 
                list_create_userid: MoeAuth.UserInfo.userid, 
                type: 1,
                list_create_gid: id 
            });
            if (response.status === 1) {
                const newPlaylist = {
                    list_create_listid: detail.value.list_create_listid,
                    listid: response.data.info.listid
                };
                const currentPlaylists = JSON.parse(localStorage.getItem('collectedPlaylists') || '[]');
                currentPlaylists.push(newPlaylist);
                localStorage.setItem('collectedPlaylists', JSON.stringify(currentPlaylists));
                isPlaylistFavorited.value = true;
                $message.success('收藏成功');
            }
        }
        localStorage.setItem('t', Date.now());
    } catch (error) {
        $message.error(isPlaylistFavorited.value ? t('qu-xiao-shou-cang-shi-bai') : t('shou-cang-shi-bai'));
    }
};

// 处理单首歌曲收藏
const handleFavoriteSong = async (song) => {
  try {
    // 检查是否已登录
    if (typeof MoeAuth !== 'undefined' && !MoeAuth.isAuthenticated) {
      if (window.$modal) {
        window.$modal.alert('请先登录');
      } else {
        alert('请先登录');
      }
      return;
    }
    
    // 使用PlaylistSelectModal组件显示歌单选择界面
    if (playlistSelect && typeof playlistSelect.fetchPlaylists === 'function') {
      // 设置当前歌曲
      currentSong.value = song;
      // 调用组件方法显示歌单选择
      playlistSelect.value.fetchPlaylists();
    } else {
      // 获取用户的歌单列表（仅显示用户创建的歌单，不包含创建新歌单选项）
      const playlistResponse = await get('/user/playlist', {
        pagesize: 100
      });
      
      if (playlistResponse.status === 1 && playlistResponse.data && Array.isArray(playlistResponse.data.info)) {
        // 只显示用户自己创建的歌单，并排除系统默认歌单
        const playlists = playlistResponse.data.info.filter(
          playlist => 
            playlist.list_create_userid === MoeAuth.UserInfo.userid &&
            playlist.name !== '默认收藏' &&
            playlist.name !== '我喜欢' &&
            playlist.name !== '本地' &&
            playlist.name !== '我的云盘'
        );
        
        // 构建歌单选择HTML（移除创建新歌单选项）
        const playlistOptions = playlists.map(playlist => `
          <div class="playlist-option" data-id="${playlist.listid || playlist.id}">
            ${playlist.name}
          </div>
        `).join('');
        
        const modalContent = `
          <div class="playlist-selector" style="background: white; border-radius: 8px; padding: 20px; width: 300px; max-height: 400px; overflow-y: auto;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333;">收藏到</h3>
            <div class="playlists-container">
              ${playlistOptions}
            </div>
            <div class="modal-footer" style="text-align: center;">
              <button class="close-btn" style="background: #ff4081; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; width: 100%;">关闭</button>
            </div>
          </div>
          <style>
            .playlists-container {
              margin-bottom: 15px;
            }
            .playlist-option {
              padding: 10px 15px;
              cursor: pointer;
              border-radius: 4px;
              transition: background-color 0.2s;
            }
            .playlist-option:hover {
              background-color: #f5f5f5;
            }
          </style>
        `;
        
        // 创建自定义弹窗
        const modal = createCustomModal(modalContent);
        
        // 处理歌单选择
        modal.querySelectorAll('.playlist-option').forEach(option => {
          option.addEventListener('click', async () => {
            const playlistId = option.getAttribute('data-id');
            const playlistName = option.textContent.trim();
            
            // 调用API将歌曲添加到指定歌单
            await addSongToPlaylist(song, playlistId);
            
            if (window.$message) {
              window.$message.success(`已添加到歌单「${playlistName}」`);
            }
            
            closeModal(modal);
          });
        });
        
        // 处理关闭按钮
        modal.querySelector('.close-btn').addEventListener('click', () => {
          closeModal(modal);
        });
      }
    }
    
  } catch (error) {
    console.error('收藏歌曲失败:', error);
    if (window.$message) {
      window.$message.error('服务器错误，请稍后再试');
    }
  }
};

// 创建新歌单
const createNewPlaylist = async (song) => {
  try {
    const newPlaylistName = prompt('请输入歌单名称:');
    
    if (!newPlaylistName || newPlaylistName.trim() === '') {
      return;
    }
    
    // 调用创建歌单API
    const createResponse = await get('/playlist/create', {
      name: newPlaylistName.trim(),
      description: '',
      list_create_userid: MoeAuth.UserInfo.userid,
      timestamp: Date.now()
    });
    
    if (createResponse.status === 1 || createResponse.data?.status === 200) {
      // 获取新创建的歌单ID
      const newPlaylistId = createResponse.data?.playlistId || newPlaylistName.trim();
      
      // 将歌曲添加到新创建的歌单
      await addSongToPlaylist(song, newPlaylistId);
      
      if (window.$message) {
        window.$message.success(`已创建歌单并添加歌曲`);
      }
    } else {
      throw new Error('创建歌单失败');
    }
  } catch (error) {
    console.error('创建歌单失败:', error);
    if (window.$message) {
      window.$message.error('创建歌单失败，请稍后再试');
    }
  }
};

// 获取用户歌单列表（不包含创建新歌单选项）
const fetchUserPlaylists = async () => {
  try {
    const response = await get('/user/playlist', {
      page: 1,
      pagesize: 100
    });
    
    if (response.status === 1 && response.data && Array.isArray(response.data.info)) {
      // 只返回用户自己创建的歌单，并排除系统默认歌单、收藏的歌单和本地歌单
      return response.data.info.filter(
        playlist => 
          // 只显示用户自己创建的歌单
          (playlist.list_create_userid === MoeAuth.UserInfo.userid || playlist.creator === MoeAuth.UserInfo.userid) &&
          // 排除收藏的歌单
          !playlist.is_collect && !playlist.collect && !playlist.is_collected &&
          // 排除特定名称的系统歌单
          !playlist.name?.includes('默认收藏') &&
          !playlist.name?.includes('我喜欢') &&
          !playlist.name?.includes('本地') &&
          !playlist.name?.includes('我的收藏') &&
          !playlist.name?.includes('我的云盘')
      ).map(playlist => ({
        id: playlist.listid || playlist.id, // 确保使用正确的ID字段
        name: playlist.name
      }));
    }
  } catch (error) {
    console.error('获取用户歌单失败:', error);
  }
  
  // 出错时返回空数组
  return [];
};

// 将歌曲添加到歌单
const addSongToPlaylist = async (song, playlistId) => {
  try {
    let song_data = '';
    if(Array.isArray(song)){
        song_data = song.map(s => `${encodeURIComponent(s.name?.replace(',', '') || '')}|${s.hash}`).join(',');
    }else{
        song_data = `${encodeURIComponent(song.name?.replace(',', '') || '')}|${song.hash}`;
    }
    const response = await get(`/playlist/tracks/add?listid=${playlistId}&data=${song_data}`);
    
    if (response.status !== 1 && response.data?.status !== 200) {
      throw new Error('添加到歌单失败');
    }
  } catch (error) {
    console.error('添加到歌单失败:', error);
    throw error;
  }
};

// 创建自定义模态框
const createCustomModal = (content) => {
  const overlay = document.createElement('div');
  overlay.className = 'custom-modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'custom-modal';
  modal.innerHTML = content;
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .custom-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    }
    .custom-modal {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }
    .playlist-selector {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      width: 300px;
      max-height: 400px;
      overflow-y: auto;
    }
    .playlist-selector h3 {
      margin: 0 0 15px 0;
      font-size: 18px;
      color: #333;
      text-align: center;
    }
    .playlists-container {
      margin-bottom: 15px;
    }
    .playlist-option {
      padding: 10px 15px;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.2s;
      margin-bottom: 5px;
    }
    .playlist-option:nth-child(odd) {
      background-color: #f9f9f9;
    }
    .playlist-option:hover {
      background-color: #ffebee;
    }
    .modal-footer {
      text-align: center;
    }
    .close-btn {
      background: #ff4081;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      width: 100%;
      transition: background-color 0.2s;
    }
    .close-btn:hover {
      background-color: #e91e63;
    }
  `;
  
  modal.appendChild(style);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  return modal;
};

// 关闭模态框
const closeModal = (modal) => {
  const overlay = modal.parentNode;
  if (overlay && overlay.classList.contains('custom-modal-overlay')) {
    document.body.removeChild(overlay);
  }
};

// 获取默认下载音质设置
const getDefaultDownloadQuality = () => {
  const settings = JSON.parse(localStorage.getItem('settings') || '{}');
  return settings.downloadQuality?.toString() || '128'; // 默认128K
};

// 处理单首歌曲下载
const downloadSong = async (song) => {
  try {
    // 设置当前下载歌曲
    currentDownloadSong.value = song;
    // 获取默认下载音质
    const defaultQuality = getDefaultDownloadQuality();
    // 直接使用默认音质下载，不显示弹窗
    await selectQuality(defaultQuality);
  } catch (error) {
    console.error('准备下载歌曲失败:', error);
    if (window.$message) {
      window.$message.error('准备下载歌曲失败');
    }
  }
};

// 使用指定音质下载歌曲（保留用于其他调用场景）
const downloadWithQuality = async (song, quality) => {
  try {
    currentDownloadSong.value = song;
    await selectQuality(quality);
  } catch (error) {
    console.error('下载歌曲失败:', error);
    if (window.$message) {
      window.$message.error('下载歌曲失败');
    }
  }
};

// 关闭音质选择弹窗
const closeQualityModal = () => {
  showQualityModal.value = false;
  currentDownloadSong.value = null;
};

// 选择音质并开始下载
const selectQuality = async (quality) => {
  try {
    // 关闭弹窗
    showQualityModal.value = false;
    
    const song = currentDownloadSong.value;
    if (!song) return;
    
    console.log(`开始下载歌曲 (${quality}):`, song.name);
    
    // 根据选择的音质获取对应的歌曲hash
    let hash;
    switch (quality) {
      case 'flac':
      case '999':
        hash = song.originalData?.hash_flac || song.hash || song.id;
        break;
      case '320':
        hash = song.originalData?.hash_320 || song.hash || song.id;
        break;
      default:
        hash = song.hash || song.id;
        break;
    }
    
    // 转换音质参数
    let br;
    switch(quality) {
      case 'flac':
      case '999':
        br = 999000; // 无损音质
        break;
      case '320':
        br = 320000;
        break;
      case '128':
        br = 128000;
        break;
      default:
        br = 320000; // 默认320K
    }
    
    // 获取下载链接
    const downloadParams = { 
      hash: hash, 
      quality: quality
    };

    // 未登录用户添加free_part参数
    if (!MoeAuth.isAuthenticated) {
      downloadParams.free_part = 1;
    }

    const response = await get('/song/url', downloadParams);
    
    console.log('下载API响应:', response); // 调试信息
    
    let downloadUrl = null;

    // 检查API响应状态
    if (response.status !== 1) {
      throw new Error('获取下载链接失败');
    }
    
    // 尝试不同的响应格式
    const data = response?.data || {};
    if (response.url) {
      downloadUrl = Array.isArray(response.url) ? response.url[0] : response.url;
    } else if (data.url) {
      downloadUrl = Array.isArray(data.url) ? data.url[0] : data.url;
    } else if (Array.isArray(data) && data[0]?.url) {
      downloadUrl = data[0].url;
    } else if (data.list && Array.isArray(data.list) && data.list[0]?.url) {
      downloadUrl = data.list[0].url;
    } else if (data.data && data.data.url) {
      downloadUrl = data.data.url;
    } else if (data.data && Array.isArray(data.data) && data.data[0]?.url) {
      downloadUrl = data.data[0].url;
    } else if (data.audio_data && data.audio_data.url) {
      downloadUrl = data.audio_data.url;
    } else if (data.cur_song_url) {
      downloadUrl = data.cur_song_url;
    } else if (data.play_url) {
      downloadUrl = data.play_url;
    }
    
    if (downloadUrl) {
      // 设置文件名，包含音质信息
      const isFlac = quality === 'flac' || quality === '999';
      const format = isFlac ? 'flac' : 'mp3';
      const qualityLabel = isFlac ? '无损' : quality === '320' ? '320K' : '128K';
      let fileName = `${song.name} - ${song.author || song.artist} (${qualityLabel}).${format}`;
      
      // 处理文件名中的非法字符
      fileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
      
      // 检查是否跨域
      const url = new URL(downloadUrl);
      const isSameOrigin = url.origin === window.location.origin;
      
      if (isSameOrigin) {
        // 同域下载，直接使用URL
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        a.style.display = 'none';
        a.style.position = 'absolute';
        a.style.left = '-9999px';
        document.body.appendChild(a);
        
        // 触发下载
        try {
          a.click();
        } catch (e) {
          // 备用方案
          const mouseEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          a.dispatchEvent(mouseEvent);
        }
        
        // 清理
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
        
        if (window.$message) {
          window.$message.success('开始下载');
        }
      } else {
        // 跨域下载，使用fetch获取文件内容并创建Blob URL
        fetch(downloadUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error('下载请求失败');
            }
            return response.blob();
          })
          .then(blob => {
            // 创建Blob URL
            const blobUrl = URL.createObjectURL(blob);
            
            // 创建下载链接
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            a.style.display = 'none';
            a.style.position = 'absolute';
            a.style.left = '-9999px';
            document.body.appendChild(a);
            
            // 触发下载
            try {
              a.click();
            } catch (e) {
              // 备用方案
              const mouseEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
              });
              a.dispatchEvent(mouseEvent);
            }
            
            // 清理
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(blobUrl);
            }, 100);
            
            if (window.$message) {
              window.$message.success('开始下载');
            }
          })
          .catch(error => {
            console.error('下载失败:', error);
            if (window.$message) {
              window.$message.error('下载失败，请稍后重试');
            }
          });
      }
    } else {
      throw new Error('无法获取下载链接');
    }
  } catch (error) {
    console.error('下载歌曲失败:', error);
    if (window.$message) {
      window.$message.error('下载失败，请稍后重试');
    }
  } finally {
    // 清理状态
    currentDownloadSong.value = null;
  }
};

// 删除歌单
const deletePlaylist = async () => {
    isDropdownVisible.value = false;
    const result = await window.$modal.confirm(t('que-ren-shan-chu-ge-dan'));
    if (result) {
        await get('/playlist/del', { listid: route.query.listid });
        localStorage.setItem('t', Date.now());
        router.back();
    }
};

// 分享歌单
const sharePlaylist = () => {
    isDropdownVisible.value = false;
    share('share?listid='+route.query.global_collection_id);
};

// 右键菜单
const showContextMenu = (event, song) => {
    if (contextMenuRef.value) {
        contextMenuRef.value.openContextMenu(event, { 
            OriSongName: song.OriSongName, 
            FileHash: song.hash, 
            fileid: song.originalData.fileid,
            userid: isArtist.value ? null : detail.value.list_create_userid,
            timeLength: song.timelen,
            cover: song.cover.replace('http://', 'https://'),
        }, isArtist.value ? null : detail.value.listid);
    }
};

// 滚动到当前播放歌曲
const scrollToItem = () => {
    const currentIndex = filteredTracks.value.findIndex(song => song.hash === props.playerControl.currentSong.hash);
    if (currentIndex !== -1) {
        recycleScrollerRef.value.scrollToItem(currentIndex - 3, { behavior: 'smooth' });
    }
};

// 滚动到顶部
const scrollToFirstItem = () => {
    recycleScrollerRef.value.scrollToItem(0, { behavior: 'smooth' });
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
        scrollSource: 'manual-button-click' 
    });
};

// 处理下拉菜单点击外部关闭
const handleClickOutside = (event) => {
    const dropdown = document.querySelector('.dropdown-menu');
    const moreBtn = document.querySelector('.more-btn');
    if (dropdown && !dropdown.contains(event.target) && !moreBtn.contains(event.target)) {
        isDropdownVisible.value = false;
    }
    
    // 处理批量操作菜单
    const batchActionsMenu = document.querySelector('.batch-actions-menu');
    const batchActionBtn = document.querySelector('.batch-action-btn');
    if (batchActionsMenu && !batchActionsMenu.contains(event.target) && !batchActionBtn.contains(event.target)) {
        isBatchMenuVisible.value = false;
    }
};

// 切换下拉菜单显示状态
const toggleDropdown = () => {
    isDropdownVisible.value = !isDropdownVisible.value;
};

// 切换批量选择模式
const toggleBatchSelection = () => {
    if (batchSelectionMode.value) {
        // 如果已经在批量选择模式，则切换菜单显示或退出模式
        if (isBatchMenuVisible.value) {
            // 如果菜单已经显示，则点击后退出批量选择模式
            batchSelectionMode.value = false;
            isBatchMenuVisible.value = false;
            selectedTracks.value = [];
            lastSelectedIndex = -1;
        } else {
            // 如果菜单未显示，则显示菜单
            isBatchMenuVisible.value = true;
        }
    } else {
        // 首次进入批量选择模式
        batchSelectionMode.value = true;
        isBatchMenuVisible.value = false;
    }
};

// 选择/取消选择歌曲
const selectTrack = (index, event) => {
    if (event.shiftKey && lastSelectedIndex !== -1) {
        // Shift 键多选
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        
        for (let i = start; i <= end; i++) {
            if (!selectedTracks.value.includes(i)) {
                selectedTracks.value.push(i);
            }
        }
    } else {
        // 普通点击
        const existingIndex = selectedTracks.value.indexOf(index);
        if (existingIndex === -1) {
            selectedTracks.value.push(index);
        } else {
            selectedTracks.value.splice(existingIndex, 1);
        }
    }
    
    lastSelectedIndex = index;
};

// 将选中歌曲添加到播放队列（追加到当前队列）
const appendSelectedToQueue = async () => {
    if (selectedTracks.value.length === 0) return;
    const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
    await props.playerControl.addPlaylistToQueue(selectedSongs, true);
    $message.success('添加到播放列表成功');
    isBatchMenuVisible.value = false;
};

// 将选中歌曲添加到其他歌单
const addSelectedToOtherPlaylist = async () => {
    if (selectedTracks.value.length === 0) return;
    const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
    songs.value =  selectedSongs;
    await playlistSelect.value.fetchPlaylists();
    isBatchMenuVisible.value = false;
};

// 从歌单中移除选中的歌曲
const removeSelectedFromPlaylist = async () => {
    if (selectedTracks.value.length === 0) return;
    const result = await window.$modal.confirm('确定要移除选中的歌曲吗？');
    if (result) {
        const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
        try {
            const fileids = selectedSongs.map(song => song.originalData.fileid).join(',');
            await get('/playlist/tracks/del', {
                listid: route.query.listid,
                fileids: fileids
            });
            selectedTracks.value.sort((a, b) => b - a).forEach(index => {
                filteredTracks.value.splice(index, 1);
                tracks.value = tracks.value.filter((_, i) => 
                    !selectedTracks.value.includes(i)
                );
            });
            filteredTracks.value = tracks.value;
            selectedTracks.value = [];
            $message.success('歌曲已从歌单中移除');
        } catch (err) {
            $message.error('移除歌曲失败');
            return;
        }
    }
    isBatchMenuVisible.value = false;
};

// 切换全选/取消全选
const toggleSelectAll = () => {
    if (isAllSelected.value) {
        selectedTracks.value = [];
    } else {
        selectedTracks.value = Array.from({ length: filteredTracks.value.length }, (_, i) => i);
    }
};

// 根据字段排序
const sortTracks = (field) => {
    if (sortField.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortField.value = field;
        sortOrder.value = 'asc';
    }
    
    filteredTracks.value = [...filteredTracks.value].sort((a, b) => {
        let valueA, valueB;
        
        if (field === 'timelen') {
            valueA = a[field] || 0;
            valueB = b[field] || 0;
        } else {
            valueA = (a[field] || '').toLowerCase();
            valueB = (b[field] || '').toLowerCase();
        }
        
        if (sortOrder.value === 'asc') {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });
    
    if (batchSelectionMode.value) {
        selectedTracks.value = [];
    }
};

const getSortIconClass = (field) => {
    if (sortField.value !== field) {
        return 'fa-sort';
    }
    return sortOrder.value === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
};

const handleSongRemoved = (fileid) => {
    tracks.value = tracks.value.filter(track => track.originalData?.fileid !== fileid);
    filteredTracks.value = filteredTracks.value.filter(track => track.originalData?.fileid !== fileid);
};

// 视图模式固定为列表视图，不再提供切换功能
// 移除了toggleViewMode函数以确保视图模式不会被更改

// 切换歌手歌曲排序方式
const changeArtistSort = (sortType) => {
    if (artistSortType.value !== sortType) {
        artistSortType.value = sortType;
        // 重新获取歌手歌曲
        fetchArtistSongs();
    }
};
</script>

<style scoped>
.detail-page {
    padding: 20px;
}

/* 头部样式 */
.header {
    display: flex;
    align-items: center;
    margin-bottom: 40px;
}

.cover-art {
    width: 200px;
    height: 200px;
    margin-right: 20px;
    object-fit: cover;
}

.artist-avatar {
    /* 移除圆形效果 */
}

.info {
    max-width: 600px;
}

.title {
    font-size: 24px;
    font-weight: bold;
    width: 800px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;
    color: var(--primary-color);
}

.subtitle {
    font-size: 18px;
    color: #666;
}

.meta {
    font-size: 14px;
    margin-bottom: 10px;
    color: #999;
}

.stats {
    display: flex;
    gap: 20px;
    color: #666;
    margin-top: 10px;
}

.description {
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text-color);
    margin-bottom: 20px;
    font-size: 16px;
    max-height: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: break-spaces;
    overflow-y: auto;
}

.actions {
    display: flex;
    gap: 10px;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .header {
        flex-direction: column;
        align-items: flex-start;
        margin-bottom: 30px;
    }
    
    .cover-art {
        width: 150px;
        height: 150px;
        margin-right: 0;
        margin-bottom: 15px;
    }
    
    .title {
        font-size: 20px;
        width: 100%;
    }
    
    .subtitle {
        font-size: 14px;
    }
    
    .description {
        font-size: 14px;
        max-height: 120px;
    }
    
    .actions {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 0px;
        width: 100%;
    }
    
    .actions button {
        flex-shrink: 0;
        font-size: 14px;
        padding: 8px 16px;
    }
    
    /* 确保四个按钮都显示，不使用下拉菜单 */
    .more-btn-container {
        display: none;
    }
    
    .actions .share-btn, 
    .actions .add-to-playlist-btn {
        display: flex;
        align-items: center;
    }
    
    /* 调整歌曲列表相关样式 */
    .track-list-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
    
    .track-list-actions {
        flex-wrap: wrap;
        width: 100%;
    }
    
    .search-input {
        width: 100%;
    }
    
    .track-list {
        height: 100%;
    }
    
    /* 简化表头 */
    .track-album-header {
        display: none;
    }
    
    .track-artist-header {
        flex: 1;
    }
    
    .track-title-header {
        flex: 2;
    }
    
    /* 调整歌曲列表项 */
    .track-album {
        display: none;
    }
    
    /* 调整位置箭头 */
    .location-arrow {
        bottom: 120px;
        font-size: 30px;
    }
    
    .scroll-bottom-img {
        width: 50px;
        height: 50px;
        bottom: 60px;
        right: 70px;
    }
}

.primary-btn, .follow-btn {
    background-color: #ff69b4;
    color: white;
    border: none;
    padding: 10px 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.primary-btn i, .follow-btn i {
    margin-right: 5px;
}

.follow-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.fav-btn,
.more-btn {
    background-color: transparent;
    border: 1px solid #ccc;
    padding: 10px;
    cursor: pointer;
    border: 1px solid var(--secondary-color);
}

/* 默认在桌面端隐藏额外的按钮 */
.share-btn,
.add-to-playlist-btn {
    display: none;
}

.fav-btn i {
    color: #999;
}

.fav-btn.active i {
    color: var(--primary-color);
}

/* 歌曲列表样式 */
.track-list-container {
    margin-top: 30px;
}

.track-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.track-list-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 10px;
    color: var(--primary-color);
}

/* 搜索和批量操作按钮 */
.track-list-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.batch-action-container {
    position: relative;
}

.batch-action-btn {
    background-color: transparent;
    border: 1px solid var(--secondary-color);
    padding: 5px 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    position: relative;
}

.batch-action-btn.active {
    background-color: var(--primary-color);
    color: white;
}

/* 视图模式切换按钮已移除，视图固定为列表模式 */

.selected-count {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: red;
    color: white;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
}

.batch-actions-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background-color: white;
    border: 1px solid #ccc;
    z-index: 50;
    margin-top: 5px;
    width: 200px;
}

.batch-actions-menu ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.batch-actions-menu li {
    padding: 10px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    white-space: nowrap;
}

.batch-actions-menu li i {
    margin-right: 10px;
    width: 16px;
    text-align: center;
}

.batch-actions-menu li:hover {
    background-color: #f0f0f0;
}

/* 排序选择器样式 */
.sort-selector {
    display: flex;
    border: 1px solid var(--secondary-color);
    overflow: hidden;
}

.sort-btn {
    background-color: transparent;
    border: none;
    padding: 5px 15px;
    cursor: pointer;
    color: var(--text-color);
    transition: all 0.3s ease;
    font-size: 14px;
}

.sort-btn:not(:last-child) {
    border-right: 1px solid var(--secondary-color);
}

.sort-btn:hover {
    background-color: rgba(var(--primary-color-rgb), 0.1);
}

.sort-btn.active {
    background-color: var(--primary-color);
    color: white;
}

.search-input {
    width: 250px;
    padding: 8px;
    border: 1px solid var(--secondary-color);
    box-sizing: border-box;
    padding-left: 15px;
}

.track-list {
    width: 100%;
}

.track-list::-webkit-scrollbar {
    width: 8px !important; 
    display: block !important;
}

.track-list:hover {
    scrollbar-color: var(--primary-color) transparent;
}

.li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
}

.li:hover {
    background-color: var(--background-color);
}

.li.selected {
    background-color: rgba(var(--primary-color-rgb), 0.1);
}

/* 歌曲多选 */
.track-checkbox {
    margin-right: 10px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.track-number {
    width: 30px;
    margin-right: 10px;
    font-weight: bold;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.track-title {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
}

.track-artist {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 5px;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.track-album {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 5px;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.track-timelen {
    flex: 1;
    text-align: center;
    font-size: 13px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    padding: 0 5px;
}

/* 内容行样式，确保与表头对齐 */
.track-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
}

/* 操作列样式 */
.action-col {
    width: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 0 5px;
}

/* 确保所有内容列与表头对齐 */
/* 移除重复的.track-number样式，已在上面定义 */

.track-album {
    flex: 1;
    padding: 0 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
}

/* PC端样式 - 确保歌手列正常显示 */
@media screen and (min-width: 769px) {
    .track-artist,
    .track-artist-header {
        display: flex;
        flex: 1;
        align-items: center;
        justify-content: center;
        padding: 0 5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}

/* 移动端响应式设计 */
@media screen and (max-width: 768px) {
    .track-list-header-row,
    .track-row {
        flex-wrap: nowrap;
    }
    
    .track-title,
    .track-title-header {
        flex: 1.5;
    }
    
    .track-artist,
    .track-artist-header {
        display: none;
    }
    
    .track-album,
    .track-album-header {
        flex: 1;
        padding: 0 5px;
        display: block !important;
        visibility: visible !important;
    }
    
    .track-timelen,
    .track-timelen-header {
        flex: 1;
        width: auto;
    }
    
    /* 确保所有列在移动端都显示 */
    .track-list-header-row > div,
    .track-row > div {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
    }
}

.icon {
    margin-left: 5px;
    border: 1px solid;
    font-size: 10px;
    padding-left: 6px;
    padding-right: 6px;
}

.vip-icon {
    color: #ff6d00;
}

.sq-icon {
    color: #0094ff;
}

.queue-play-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--primary-color);
    cursor: pointer;
}

/* 歌手简介部分 */
.content-section {
    margin-top: 50px;
    border-top: 1px dotted var(--secondary-color);
}

.intro-section {
    margin-bottom: 30px;
}

.intro-section h3 {
    color: var(--primary-color);
    margin-bottom: 15px;
}

.section-content {
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text-color);
}

/* 导航按钮 */
.location-arrow {
    position: fixed;
    bottom: 168px;
    right: 14px;
    z-index: 1;
    cursor: pointer;
    font-size: 37px;
    color: var(--primary-color);
}

.scroll-bottom-img {
    position: fixed;
    width: 60px;
    height: 60px;
    bottom: 110px;
    right: 88px;
    z-index: 1;
    cursor: pointer;
}

/* 下拉菜单 */
.more-btn-container {
    position: relative;
}

.dropdown-menu {
    position: absolute;
    background-color: white;
    border: 1px solid #ccc;
    top: 50px;
    z-index: 50;
}

.dropdown-menu ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.dropdown-menu li {
    padding: 10px;
    cursor: pointer;
}

.dropdown-menu li:hover {
    background-color: #f0f0f0;
}

/* 列表容器样式 */
.track-list-container {
    position: relative;
    margin-bottom: 10px; /* 为分页控件留出足够空间 */
    overflow: visible;
}

/* 分页样式 */
.pagination-container {
    position: relative; /* 相对定位确保自然融入布局 */
    margin: 20px auto;
    width: calc(100% - 20px);
    max-width: 500px;
    background-color: #ffffff;
    border-radius: 8px;
    border: 1px solid var(--border-color, #e0e0e0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    padding: 12px;
}

.pagination-info {
    font-size: 12px;
    color: var(--text-color, #666);
    text-align: center;
    margin: 0 0 8px 0;
    line-height: 1.2;
    font-weight: 400;
}

.pagination-controls {
    display: flex;
    gap: 6px;
    justify-content: center;
    align-items: center;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    touch-action: pan-x;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
}

/* 隐藏滚动条但保留滚动功能 */
.pagination-controls::-webkit-scrollbar {
    display: none;
}

.pagination-btn {
    padding: 8px 12px;
    border: 1px solid var(--border-color, #ddd);
    background-color: #ffffff;
    color: var(--text-color, #333);
    border-radius: 4px;
    cursor: pointer;
    min-width: 32px;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
}

/* 激活状态的按钮 */
.pagination-btn.active {
    background-color: var(--primary-color, #ff6b6b);
    color: white;
    border-color: var(--primary-color, #ff6b6b);
}

/* 悬停状态 */
.pagination-btn:hover:not(:disabled) {
    background-color: #f8f9fa;
    border-color: var(--primary-color, #ff6b6b);
    color: var(--primary-color, #ff6b6b);
}

/* 触摸状态 */
.pagination-btn:active:not(:disabled) {
    transform: scale(0.97);
}

/* 禁用状态 */
.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f8f9fa;
    border-color: #e9ecef;
}

/* 移动端响应式设计 */
@media screen and (max-width: 768px) {
    .pagination-container {
        margin: 16px auto;
        width: calc(100% - 24px);
        padding: 10px;
    }
    
    .pagination-info {
        font-size: 11px;
        margin-bottom: 6px;
    }
    
    .pagination-controls {
        gap: 4px;
        padding-bottom: 3px;
    }
    
    .pagination-btn {
        padding: 7px 10px;
        min-width: 30px;
        font-size: 11px;
    }
}

/* 小屏幕优化 */
@media screen and (max-width: 480px) {
    .pagination-container {
        margin: 12px auto;
        width: calc(100% - 20px);
        padding: 8px;
    }
    
    .pagination-info {
        font-size: 10px;
        margin-bottom: 5px;
    }
    
    .pagination-controls {
        gap: 3px;
    }
    
    .pagination-btn {
        padding: 6px 8px;
        min-width: 28px;
        font-size: 10px;
    }
}

/* 音符动画 */
.note-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    overflow: hidden;
}

.flying-note {
    position: absolute;
    font-size: 36px;
    color: var(--primary-color);
    pointer-events: none;
    transform-origin: center;
}

.fly-note-enter-active {
    animation: fly-note 2s ease-out forwards;
}

.fly-note-leave-active {
    animation: fly-note 2s ease-out forwards;
}

@keyframes fly-note {
    0% {
        transform: translate(var(--start-x), calc(var(--start-y) - 50px)) rotate(0deg) scale(1.2);
        opacity: 0.9;
    }
    20% {
        transform: translate(calc(var(--start-x) + 20px), calc(var(--start-y) - 70px)) rotate(45deg) scale(1.3);
        opacity: 0.85;
    }
    100% {
        transform: translate(80vw, 100vh) rotate(360deg) scale(0.6);
        opacity: 0;
    }
}

/* 表头样式 */
.track-list-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid var(--primary-color);
    font-weight: bold;
    background-color: rgba(var(--primary-color-rgb), 0.1);
    font-size: 14px;
}

.track-checkbox-header {
    width: 30px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.track-number-header {
    width: 30px;
    margin-right: 10px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
}

.track-title-header, .track-artist-header, .track-album-header, .track-timelen-header, .action-header {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
}

.action-col {
    width: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
}

.action-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    color: #666;
    padding: 5px;
    transition: color 0.3s ease;
}

.action-btn:hover {
    color: var(--primary-color);
}

/* 网格视图样式 */
/* 网格视图样式已移除，因为视图模式固定为列表视图 */
/* 保持列表视图相关的样式以确保正常显示 */
.track-list {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent; 
    /* 移除固定高度和overflow属性，让列表随页面滚动 */
}

/* 专辑网格样式 */
.albums-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.album-card {
    display: flex;
    flex-direction: column;
    background-color: #fff;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transition: transform 0.3s, box-shadow 0.3s;
    cursor: pointer;
    height: 100%;
}

.album-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.album-cover {
    position: relative;
    width: 100%;
    padding-top: 100%; /* 1:1 宽高比 */
    overflow: hidden;
}

.album-cover img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s;
}

.album-card:hover .album-cover img {
    transform: scale(1.05);
}

.album-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.3s;
}

.album-card:hover .album-overlay {
    opacity: 1;
}

.play-button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: var(--primary-color);
    border: none;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: transform 0.2s, background-color 0.2s;
}

.play-button:hover {
    transform: scale(1.1);
    background-color: var(--primary-color-dark, #d81e06);
}

.play-button i {
    font-size: 16px;
}

.album-info {
    padding: 12px;
    display: flex;
    flex-direction: column;
    flex: 1;
}

.album-name {
    font-size: 14px;
    font-weight: bold;
    margin: 0 0 6px 0;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.album-artist {
    font-size: 12px;
    color: #666;
    margin-bottom: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.album-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: auto;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #888;
    background-color: #f5f5f5;
    padding: 3px 6px;
    border-radius: 4px;
}

.meta-item i {
    font-size: 11px;
    color: var(--primary-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
    .albums-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }
}

@media (min-width: 769px) and (max-width: 1024px) {
    .albums-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (min-width: 1025px) {
    .albums-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}
</style>