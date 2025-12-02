<template>
  <div class="batch-artist-album-download">
    <div class="container">
      <h1 class="title">歌手专辑ID查询</h1>
      
      <div class="input-section">
        <div class="form-group">
          <label for="artistId">歌手ID</label>
          <input 
            id="artistId" 
            v-model="artistId"
            placeholder="例如：123456,789012,345678"
            type="text"
          >
        </div>
        
        <div class="button-group">
          <button 
            class="btn btn-primary" 
            @click="queryArtistAlbums"
            :disabled="isQuerying || !artistId"
          >
            {{ isQuerying ? '查询中...' : '查询专辑ID' }}
          </button>
        </div>
      </div>
      
      <div class="result-section" v-if="albumIds.length > 0 || errorMessage">
        <h3>查询结果</h3>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <div v-if="albumIds.length > 0">
          <div class="form-group">
            <label>专辑ID列表：</label>
            <textarea 
              v-model="albumIdsText"
              rows="3"
              readonly
            ></textarea>
          </div>
          
          <div class="album-list">
            <!-- 全选复选框 -->
            <div class="album-item album-select-all">
              <label class="checkbox-label">
                <input type="checkbox" v-model="selectAll" @change="toggleSelectAll">
                <span>全选</span>
              </label>
              <span class="selected-count">{{ selectedAlbums.length }} / {{ albums.length }} 已选择</span>
            </div>
            
            <!-- 专辑列表 -->
            <div 
              v-for="(album, index) in albums" 
              :key="album.album_id || album.id || index"
              class="album-item"
              :class="{ selected: isAlbumSelected(album) }"
            >
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  :value="album.album_id || album.id" 
                  v-model="selectedAlbums"
                  @change="updateSelectAllState"
                >
              </label>
              <span class="album-id">{{ album.album_id || album.id }}</span>
              <span class="album-name">{{ album.album_name || album.albumname || album.name || '未知专辑名' }}</span>
              <span class="artist-info">
                {{ album.author_name || album.artist_name || (Array.isArray(album.artist_id) ? album.artist_id.join(', ') : album.artist_id) || '未知' }}
              </span>
            </div>
          </div>
          
          <p class="album-count">共 {{ albumIds.length }} 张专辑</p>
          
          <!-- 专辑歌曲批量下载功能 -->
          <div class="download-section">
            <h3>专辑歌曲批量下载</h3>
            
            <div class="download-options">
              <div class="form-group">
                <label for="quality">下载音质</label>
                <select id="quality" v-model="downloadQuality" class="form-control">
                  <option value="flac">无损音质(FLAC)</option>
                  <option value="mp3_320">高品质(MP3 320kbps)</option>
                  <option value="mp3_192">标准品质(MP3 128kbps)</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>歌曲下载时间间隔</label>
                <div class="interval-inputs">
                  <input 
                    type="number" 
                    v-model.number="minInterval" 
                    min="1" 
                    max="60" 
                    class="interval-input"
                  >
                  <span>秒 - </span>
                  <input 
                    type="number" 
                    v-model.number="maxInterval" 
                    min="1" 
                    max="60" 
                    class="interval-input"
                  >
                  <span>秒</span>
                </div>
                <small>请输入适当时间间隔，以防频繁访问服务器</small>
              </div>
              
              <div class="form-group">
                <label for="pushToken">输入pushplus token，下载完成即可发送通知</label>
                <input 
                  id="pushToken" 
                  v-model="pushToken" 
                  type="text" 
                  placeholder="输入pushplus token"
                >
              </div>
              
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="excludeLiveAlbums">
                  <span>排除演唱会专辑</span>
                </label>
                <small>勾选后将过滤掉专辑名称中包含演唱会相关关键词的专辑</small>
              </div>
              
              <button 
                class="btn btn-primary"
                @click="startBatchDownload"
                :disabled="isDownloading || albumIds.length === 0"
              >
                {{ isDownloading ? '下载中...' : '开始批量下载' }}
              </button>
              <button 
                class="btn btn-secondary"
                @click="stopDownload"
                v-if="isDownloading"
              >
                停止下载
              </button>
              <div class="countdown-info" v-if="isDownloading && countdown > 0">
                下一首下载倒计时: {{ countdown }}秒
              </div>
            </div>
          </div>
          
          <!-- 下载状态区域 -->
          <div class="download-status-section" v-if="downloadHistory.length > 0">
            <h3>下载状态</h3>
            
            <!-- 总体进度 -->
            <div class="progress-section">
              <div class="progress-info">
                <span>总进度</span>
                <span>{{ currentDownloadIndex >= 0 ? currentDownloadIndex + 1 : 0 }} / {{ totalSongs }}</span>
              </div>
              <div class="progress-bar-container">
                <div 
                  class="progress-bar" 
                  :style="{ width: totalSongs > 0 ? Math.round(((currentDownloadIndex + 1) / totalSongs) * 100) + '%' : '0%' }"
                ></div>
              </div>
            </div>
            
            <!-- 下载列表 -->
            <div class="download-list">
              <div 
                v-for="(songs, albumName) in groupByAlbum" 
                :key="albumName"
                class="album-group"
              >
                <div 
                  class="album-header" 
                  @click="toggleAlbumCollapse(albumName)"
                >
                  <div class="album-info">
                    <span class="album-name">{{ albumName }}</span>
                    <span class="song-count">{{ songs.length }}</span>
                  </div>
                  <span class="collapse-arrow" :class="{ collapsed: collapsedAlbums[albumName] }">▼</span>
                </div>
                
                <div class="album-songs" v-show="!collapsedAlbums[albumName]">
                  <div 
                    v-for="item in songs" 
                    :key="item.song.hash || Math.random()"
                    class="download-item"
                    :class="item.status"
                  >
                    <div class="song-info">
                      <div class="song-name">{{ item.song.name }}</div>
                      <div class="song-author">{{ item.song.author }}</div>
                    </div>
                    <div class="download-status">
                      <span v-if="item.status === 'pending'">等待下载</span>
                      <span v-else-if="item.status === 'downloading'">下载中</span>
                      <span v-else-if="item.status === 'success'">下载成功</span>
                      <span v-else-if="item.status === 'error'">下载失败</span>
                      <div 
                        class="single-progress-bar-container" 
                        v-if="item.status === 'downloading'"
                      >
                        <div 
                          class="single-progress-bar" 
                          :style="{ width: item.progress + '%' }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { get, post } from '../utils/request'

export default {
  name: 'BatchArtistAlbumDownload',
  setup() {
    // 输入参数
    const artistId = ref('')
    const isQuerying = ref(false)
    const albums = ref([])
    const errorMessage = ref('')
    const artistInfoMap = ref(new Map()) // 存储歌手ID和歌手信息的映射
    // 多选相关
    const selectedAlbums = ref([]) // 存储选中的专辑ID
    const selectAll = ref(false) // 全选状态
    
    // 下载参数
    const downloadQuality = ref('flac')
    const minInterval = ref(10)
    const maxInterval = ref(15)
    const pushToken = ref(localStorage.getItem('pushplusToken') || '')
    const excludeLiveAlbums = ref(false)
    const isDownloading = ref(false)
    const downloadHistory = ref([])
    const currentDownloadIndex = ref(-1)
    const totalSongs = ref(0)
    const isStopRequested = ref(false)
    const countdown = ref(0)
    const collapsedAlbums = ref({})
    
    // 计算专辑ID列表（所有专辑）
    const albumIds = computed(() => {
      return albums.value.map(album => album.album_id || album.id)
    })
    
    // 检查专辑是否被选中
    const isAlbumSelected = (album) => {
      const albumId = album.album_id || album.id
      return selectedAlbums.value.includes(albumId)
    }
    
    // 切换全选状态
    const toggleSelectAll = () => {
      if (selectAll.value) {
        // 全选：选择所有专辑ID
        selectedAlbums.value = albums.value.map(album => album.album_id || album.id)
      } else {
        // 取消全选：清空选择
        selectedAlbums.value = []
      }
    }
    
    // 更新全选状态
    const updateSelectAllState = () => {
      selectAll.value = selectedAlbums.value.length === albums.value.length && albums.value.length > 0
    }
    
    // 计算专辑ID文本（逗号分隔）
    const albumIdsText = computed(() => {
      return albumIds.value.join(', ')
    })
    
    // 查询歌手专辑
    const queryArtistAlbums = async () => {
      if (!artistId.value) {
        errorMessage.value = '请输入歌手ID';
        return;
      }
      
      // 清空之前的选择
      selectedAlbums.value = []
      selectAll.value = false
      
      // 解析逗号分隔的歌手ID列表
      const artistIds = artistId.value
        .split(',')
        .map(id => id.trim())
        .filter(id => id && /^\d+$/.test(id));
      
      if (artistIds.length === 0) {
        errorMessage.value = '请输入有效的歌手ID（数字）';
        return;
      }
      
      isQuerying.value = true;
      errorMessage.value = '';
      albums.value = [];
      artistInfoMap.value.clear();
      
      try {
        // 为每个歌手ID获取专辑数据
        const allAlbumsData = [];
        const artistPromises = artistIds.map(async (currentArtistId) => {
          try {
            const response = await get('/artist/albums', { 
              id: currentArtistId,
              page: 1,
              pagesize: 999,
              sort: 'new'
            });
            
            if (response.status === 1 && response.data) {
              // 确保数据是数组格式
              const albumData = Array.isArray(response.data) ? response.data : [];
              
              console.log(`成功获取歌手ID ${currentArtistId} 的专辑列表，共 ${albumData.length} 张专辑`);
              
              // 添加详细的调试日志，显示第一张专辑的所有字段
              if (albumData.length > 0) {
                console.log(`歌手ID ${currentArtistId} 的专辑数据结构示例:`, albumData[0]);
                console.log(`歌手ID ${currentArtistId} 的专辑数据所有可用字段:`, Object.keys(albumData[0]));
              }
              
              // 处理专辑数据，确保包含必要字段和歌手ID
              const processedAlbums = albumData.map(album => {
                // 规范化字段名称
                const normalizedAlbum = {
                  album_id: album.album_id || album.id,
                  album_name: album.album_name || album.albumname || album.name || '未知专辑名',
                  artist_id: currentArtistId, // 添加歌手ID标识
                  // 保留原始数据的其他字段
                  ...album
                };
                
                // 如果是特定的专辑ID，添加硬编码的专辑名
                if (normalizedAlbum.album_id === '707774') {
                  normalizedAlbum.album_name = '个人单曲（妈妈的吻，故乡情，金梭和银梭）';
                } else if (normalizedAlbum.album_id === '93945780') {
                  normalizedAlbum.album_name = '未知专辑';
                }
                
                return normalizedAlbum;
              });
              
              allAlbumsData.push(...processedAlbums);
            }
          } catch (error) {
            console.error(`获取歌手ID ${currentArtistId} 的专辑列表失败:`, error);
            // 继续处理其他歌手，不抛出错误中断整个过程
          }
        });
        
        // 等待所有歌手的专辑数据获取完成
        await Promise.all(artistPromises);
        
        // 对专辑数据进行去重处理，相同专辑ID的专辑只保留一个
        const uniqueAlbumsMap = new Map();
        allAlbumsData.forEach(album => {
          const albumId = album.album_id || album.id;
          if (albumId) {
            if (uniqueAlbumsMap.has(albumId)) {
              // 如果专辑已存在但歌手信息不同，保留两个歌手的信息
              const existingAlbum = uniqueAlbumsMap.get(albumId);
              if (existingAlbum.artist_id !== album.artist_id) {
                // 如果已有多个歌手，确保是数组格式
                if (!Array.isArray(existingAlbum.artist_id)) {
                  existingAlbum.artist_id = [existingAlbum.artist_id];
                }
                // 添加新的歌手ID，避免重复
                if (!existingAlbum.artist_id.includes(album.artist_id)) {
                  existingAlbum.artist_id.push(album.artist_id);
                  uniqueAlbumsMap.set(albumId, existingAlbum);
                }
              }
            } else {
              // 如果专辑不存在，添加到Map
              uniqueAlbumsMap.set(albumId, { ...album });
            }
          }
        });
        
        // 将去重后的专辑数据转换为数组
        albums.value = Array.from(uniqueAlbumsMap.values());
        
        // 默认全选所有专辑
        if (albums.value.length > 0) {
          selectedAlbums.value = albums.value.map(album => album.album_id || album.id);
          selectAll.value = true;
        }
        
        // 如果没有获取到任何专辑数据，显示提示信息
        if (allAlbumsData.length === 0) {
          errorMessage.value = '未找到专辑数据，请检查歌手ID是否正确';
        }
      } catch (error) {
        errorMessage.value = `查询失败: ${error.message || '未知错误'}`;
        console.error('获取专辑列表过程中发生错误:', error);
      } finally {
        isQuerying.value = false;
      }
    }
    
    // 重置下载状态
    const resetDownloadState = () => {
      downloadHistory.value = [];
      currentDownloadIndex.value = -1;
      totalSongs.value = 0;
      isDownloading.value = false;
      isStopRequested.value = false;
      countdown.value = 0;
    }
    
    // 停止下载
    const stopDownload = () => {
      isStopRequested.value = true;
      countdown.value = 0;
    }
    
    // 按专辑分组下载历史
    const groupByAlbum = computed(() => {
      const groups = {};
      downloadHistory.value.forEach(item => {
        const album = item.song.album || '未知专辑';
        if (!groups[album]) {
          groups[album] = [];
        }
        groups[album].push(item);
      });
      return groups;
    })
    
    // 切换专辑折叠状态
    const toggleAlbumCollapse = (album) => {
      collapsedAlbums.value[album] = !collapsedAlbums.value[album];
    }
    
    // 获取专辑歌曲
    const getAlbumSongs = async (albumIds) => {
      try {
        const allSongs = [];
        for (const id of albumIds) {
          console.log('正在获取专辑ID:', id, '的歌曲');
          const response = await post('/album/songs', {
            id: id,
            pagesize: 9999
          });
          
          console.log('专辑歌曲API响应:', response);
          
          // 统一处理不同响应结构
          let songsList = [];
          if (response.data?.audios?.length) {
            songsList = response.data.audios;
          } else if (response.data?.songs?.length) {
            songsList = response.data.songs;
          } else if (response.data?.list?.length) {
            songsList = response.data.list;
          } else if (Array.isArray(response.data)) {
            songsList = response.data;
          }
          
          // 提取专辑名称 - 增强版本，支持更多响应格式
          let albumName = '未知专辑';
          
          // 1. 从顶级响应中提取
          if (response.data) {
            albumName = response.data.album_name || response.data.albumName || response.data.name || response.data.album || albumName;
          }
          
          // 2. 如果还是未知专辑，尝试从歌曲列表中提取
          if (songsList.length > 0 && albumName === '未知专辑') {
            const firstTrack = songsList[0];
            albumName = firstTrack.album_name || firstTrack.albumName || firstTrack.album || albumName;
          }
          
          // 3. 最后检查专辑ID对应的原始查询结果中的专辑名
          if (albumName === '未知专辑') {
            const originalAlbum = albumList.value.find(item => item.id === id);
            if (originalAlbum && originalAlbum.name) {
              albumName = originalAlbum.name;
            }
          }
          
          // 创建安全的专辑名称
          const safeAlbumName = albumName.replace(/[\/\\:*?"<>|]/g, "") || '未知专辑';
          
          const songs = songsList.map(track => {
            // 提取歌曲信息
            const songName = track.audio_name || track.title || track.songname || track.name || '';
            const singerName = track.author_name || track.singer || track.artist || track.author || '';
            
            // 创建安全的文件名
            const safeSongName = songName.replace(/[\/\\:*?"<>|]/g, "") || '未知歌曲';
            const safeSingerName = singerName.replace(/[\/\\:*?"<>|]/g, "") || '未知歌手';
            
            return {
              hash: track.hash || track.audio_info?.hash || track.audio_id || track.id || '',
              name: safeSongName,
              author: safeSingerName,
              album: safeAlbumName,
              cover: track.trans_param?.union_cover?.replace("{size}", 480).replace('http://', 'https://') || track.album_pic || '',
              timelen: track.timelength || track.duration || track.audio_info?.duration || 0,
              isSQ: (track.hash_flac || track.audio_info?.hash_flac) && (track.hash_flac || track.audio_info?.hash_flac) !== '',
              isHQ: (track.hash_320 || track.audio_info?.hash_320) && (track.hash_320 || track.audio_info?.hash_320) !== '',
              originalData: track
            };
          });
          
          allSongs.push(...songs);
        }
        
        return allSongs;
      } catch (error) {
        console.error('获取专辑歌曲失败:', error);
        return [];
      }
    }
    
    // 下载单个歌曲
    const downloadSingleSong = async (song, index) => {
      try {
        // 根据选择的音质获取对应的歌曲hash
        let hash;
        switch (downloadQuality.value) {
          case 'flac':
            hash = song.originalData?.hash_flac || song.originalData?.audio_info?.hash_flac || song.hash || song.id;
            break;
          case 'mp3_320':
            hash = song.originalData?.hash_320 || song.originalData?.audio_info?.hash_320 || song.hash || song.id;
            break;
          default:
            hash = song.originalData?.hash || song.originalData?.audio_info?.hash || song.hash || song.id;
            break;
        }
        
        // 获取下载链接
        const downloadParams = {
          hash: hash,
          quality: downloadQuality.value === 'flac' ? 'flac' : downloadQuality.value === 'mp3_320' ? '320' : '128'
        };

        // 未登录用户添加free_part参数
        if (!window.MoeAuth?.isAuthenticated) {
          downloadParams.free_part = 1;
        }

        const response = await get('/song/url', downloadParams);
        
        // 解析下载链接
        let downloadUrl = null;
        const data = response?.data || {};
        
        if (response.url) {
          downloadUrl = Array.isArray(response.url) ? response.url[0] : response.url;
        } else if (data.url) {
          downloadUrl = Array.isArray(data.url) ? data.url[0] : data.url;
        } else if (Array.isArray(data) && data[0]?.url) {
          downloadUrl = data[0].url;
        } else if (response.data?.url) {
          downloadUrl = Array.isArray(response.data.url) ? response.data.url[0] : response.data.url;
        }
        
        if (!downloadUrl) {
          throw new Error('未找到下载链接');
        }
        
        // 使用XMLHttpRequest实现带进度的下载
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', downloadUrl, true);
          xhr.responseType = 'blob';

          // 跟踪下载进度
          xhr.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              downloadHistory.value[index].progress = progress;
            }
            
            // 检查是否需要停止下载
            if (isStopRequested.value) {
              xhr.abort();
            }
          };

          // 下载完成
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const blob = xhr.response;
              const downloadLink = document.createElement('a');
              const blobUrl = URL.createObjectURL(blob);
              
              // 创建安全的文件名
              const safeFileName = `${song.name || '未知歌曲'} - ${song.author || '未知歌手'}.${downloadQuality.value === 'flac' ? 'flac' : 'mp3'}`;
              
              downloadLink.href = blobUrl;
              downloadLink.download = safeFileName;
              
              // 模拟点击下载
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
              
              // 释放Blob URL
              URL.revokeObjectURL(blobUrl);
              
              resolve(true);
            } else {
              reject(new Error('下载失败，状态码: ' + xhr.status));
            }
          };

          // 下载错误
          xhr.onerror = () => {
            reject(new Error('网络错误'));
          };

          xhr.send();
        });
      } catch (error) {
        console.error('下载歌曲失败:', error);
        return false;
      }
    }
    
    // 发送PushPlus通知
    const sendPushPlusNotification = async (successCount, failedCount) => {
      try {
        const totalCount = successCount + failedCount;
        const title = '批量下载完成通知';
        
        let content = `批量下载已完成：\n- 总下载数：${totalCount}\n- 成功数：${successCount}\n- 失败数：${failedCount}\n\n下载明细：\n`;
        
        downloadHistory.value.forEach(item => {
          const song = item.song;
          const statusText = item.status === 'success' ? '下载成功' : '下载失败';
          content += `${song.album || '未知专辑'}-${song.name || '未知歌曲'}  ${statusText}\n`;
        });
        
        const response = await fetch('http://www.pushplus.plus/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: pushToken.value.trim(),
            title: title,
            content: content,
            template: 'txt',
          }),
        });
        
        const result = await response.json();
        if (result.code !== 200) {
          console.error('PushPlus通知发送失败:', result);
        }
      } catch (error) {
        console.error('发送PushPlus通知时出错:', error);
      }
    }
    
    // 开始批量下载
    const startBatchDownload = async () => {
      if (albumIds.value.length === 0) {
        errorMessage.value = '请先查询获取专辑列表';
        return;
      }
      
      // 检查是否选择了专辑
      if (selectedAlbums.value.length === 0) {
        errorMessage.value = '请至少选择一个专辑进行下载';
        return;
      }
      
      // 保存token到localStorage
      localStorage.setItem('pushplusToken', pushToken.value);
      
      // 重置下载状态
      resetDownloadState();
      
      isDownloading.value = true;
      isStopRequested.value = false;
      
      try {
        // 获取选中专辑的歌曲
        let songs = await getAlbumSongs(selectedAlbums.value);
        if (songs.length === 0) {
          alert('未找到选中专辑的歌曲');
          isDownloading.value = false;
          return;
        }
        
        // 排除演唱会专辑
        if (excludeLiveAlbums.value) {
          const concertKeywords = ['演唱会', '现场', 'Live现场', 'Live版'];
          songs = songs.filter(song => {
            const albumName = song.album || '';
            return !concertKeywords.some(keyword => albumName.includes(keyword));
          });
          
          if (songs.length === 0) {
            alert('过滤演唱会专辑后，没有可下载的歌曲');
            isDownloading.value = false;
            return;
          }
        }
        
        totalSongs.value = songs.length;
        
        // 初始化下载历史
        downloadHistory.value = songs.map(song => ({
          song,
          status: 'pending',
          progress: 0
        }));
        
        // 批量下载歌曲
        for (let i = 0; i < songs.length; i++) {
          if (isStopRequested.value) {
            break;
          }
          
          currentDownloadIndex.value = i;
          
          // 更新下载状态
          downloadHistory.value[i].status = 'downloading';
          downloadHistory.value[i].progress = 0;
          
          // 下载歌曲
          const success = await downloadSingleSong(songs[i], i);
          
          // 更新下载结果
          downloadHistory.value[i].status = success ? 'success' : 'error';
          
          // 下载间等待
          if (i < songs.length - 1 && !isStopRequested.value) {
            const actualMin = Math.min(minInterval.value, maxInterval.value) * 1000;
            const actualMax = Math.max(minInterval.value, maxInterval.value) * 1000;
            const delay = Math.floor(Math.random() * (actualMax - actualMin + 1)) + actualMin;
            const delaySeconds = Math.round(delay / 1000);
            
            // 显示倒计时
            for (let sec = delaySeconds; sec > 0 && !isStopRequested.value; sec--) {
              countdown.value = sec;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            countdown.value = 0;
          }
        }
        
        // 检查是否被停止
        if (isStopRequested.value) {
          alert('批量下载已停止');
        } else {
          alert('批量下载完成');
        }
        
        // 下载完成后发送PushPlus通知
        if (pushToken.value.trim()) {
          const successCount = downloadHistory.value.filter(item => item.status === 'success').length;
          const failedCount = downloadHistory.value.filter(item => item.status === 'error').length;
          sendPushPlusNotification(successCount, failedCount);
        }
        
      } catch (error) {
        console.error('批量下载失败:', error);
        alert('批量下载失败');
      } finally {
        isDownloading.value = false;
      }
    }
    
    return {
      artistId,
      isQuerying,
      albums,
      albumIds,
      albumIdsText,
      errorMessage,
      artistInfoMap,
      queryArtistAlbums,
      // 多选相关
      selectedAlbums,
      selectAll,
      isAlbumSelected,
      toggleSelectAll,
      updateSelectAllState,
      // 下载相关
      downloadQuality,
      minInterval,
      maxInterval,
      pushToken,
      excludeLiveAlbums,
      isDownloading,
      downloadHistory,
      currentDownloadIndex,
      totalSongs,
      countdown,
      groupByAlbum,
      collapsedAlbums,
      startBatchDownload,
      stopDownload,
      toggleAlbumCollapse
    }
  }
}
</script>

<style scoped>
.batch-artist-album-download {
  padding: 20px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.title {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.input-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.result-section {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  font-family: inherit;
  background-color: #f5f5f5;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #40a9ff;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  color: #ff4d4f;
  padding: 10px;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  margin-bottom: 15px;
}

.album-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
}

.album-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  transition: background-color 0.2s;
}

.album-item:last-child {
  border-bottom: none;
}

.album-item.selected {
  background-color: #e6f7ff;
}

.album-select-all {
  background-color: #f5f5f5;
  padding: 10px 0;
  font-weight: 500;
  border-bottom: 2px solid #ddd;
}

.selected-count {
  margin-left: auto;
  color: #1890ff;
  font-size: 14px;
}

.checkbox-label {
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  min-width: 60px;
}

.album-id {
  font-weight: 500;
  color: #1890ff;
  min-width: 100px;
}

.album-name {
  color: #333;
  flex: 1;
  min-width: 200px;
}

.artist-info {
  color: #666;
  font-size: 13px;
  background-color: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: auto;
}

.album-count {
  text-align: right;
  color: #666;
  font-size: 14px;
  margin-top: 10px;
}

.download-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}

.download-section h3 {
  margin-bottom: 20px;
  color: #333;
}

.download-options {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.download-options .form-group {
  margin-bottom: 15px;
}

.download-options select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

.interval-inputs {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
}

.interval-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.checkbox-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.download-options small {
  color: #888;
  font-size: 12px;
  display: block;
  margin-top: 4px;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  margin-top: 10px;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.countdown-info {
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #e3f2fd;
  border-radius: 4px;
  font-size: 14px;
  color: #1976d2;
}

/* 下载状态区域 */
.download-status-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}

.download-status-section h3 {
  margin-bottom: 20px;
  color: #333;
}

.download-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}

/* 专辑分组样式 */
.album-group {
  border-bottom: 1px solid #eee;
}

.album-group:last-child {
  border-bottom: none;
}

.album-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f8f9fa;
  cursor: pointer;
  transition: background-color 0.3s;
}

.album-header:hover {
  background-color: #e9ecef;
}

.album-info {
  display: flex;
  align-items: center;
}

.album-name {
  font-weight: 500;
  color: #333;
}

.song-count {
  margin-left: 10px;
  font-size: 12px;
  color: #666;
  background-color: #e9ecef;
  padding: 2px 8px;
  border-radius: 10px;
}

.collapse-arrow {
  transition: transform 0.3s;
}

.collapse-arrow.collapsed {
  transform: rotate(-180deg);
}

.album-songs {
  padding-left: 15px;
}

.download-item {
  padding: 10px 15px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.download-item:last-child {
  border-bottom: none;
}

.song-info {
  flex: 1;
}

.song-name {
  font-weight: 500;
  color: #333;
}

.download-status {
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.downloading {
  background-color: #fff3f3;
}

.success {
  background-color: #f0fff4;
  color: #10b981;
}

.error {
  background-color: #fff5f5;
  color: #ef4444;
}

.progress-section {
  margin-top: 20px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  color: #666;
}

.progress-bar-container {
  width: 100%;
  height: 6px;
  background-color: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: #1890ff;
  transition: width 0.3s;
}

.single-progress-bar-container {
  width: 150px;
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
  margin-top: 5px;
  overflow: hidden;
}

.single-progress-bar {
  height: 100%;
  background-color: #1890ff;
  transition: width 0.1s;
}
</style>