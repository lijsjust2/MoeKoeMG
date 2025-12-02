const { clientver, appid, cryptoMd5, signParamsKey } = require('../util');

// 专辑音乐列表
const albumSongsHandler = async (params, useAxios) => {
  const dfid = params?.cookie?.dfid || params?.dfid || '-';
  const userid = params?.cookie?.userid || params?.userid || 0;
  const token = params?.cookie?.token || params?.token || 0;
  const page = params.page || 1;
  const pagesize = params.pagesize || 20;

  // 处理批量专辑ID（支持逗号分隔字符串）
  const parseAlbumIds = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(id => id.trim()).filter(Boolean);
    return value ? [String(value).trim()] : [];
  };

  const albumIdsFromBody = [
    ...parseAlbumIds(params?.body?.albumIds),
    ...parseAlbumIds(params?.body?.album_id),
    ...parseAlbumIds(params?.body?.id),
    ...parseAlbumIds(params?.body?.albumId)
  ].filter(Boolean);

  // 处理查询参数中的专辑ID（支持逗号分隔字符串）
  const queryAlbumIds = [
    ...parseAlbumIds(params?.albumIds),
    ...parseAlbumIds(params?.album_id),
    ...parseAlbumIds(params?.id),
    ...parseAlbumIds(params?.albumId)
  ].filter(Boolean);



  // 合并并去重所有专辑ID
  const allAlbumIds = [...new Set([...albumIdsFromBody, ...queryAlbumIds])];
  
  // 过滤掉空字符串
  const validAlbumIds = allAlbumIds.filter(albumId => albumId && albumId.toString().trim() !== '');
  


  // 如果没有有效的专辑ID，直接返回空数组
  if (validAlbumIds.length === 0) {
    return { headers: {}, status: 200, body: { status: 0, data: { songs: [] } } };
  }
  
  // 批量请求所有专辑的歌曲
  const albumRequests = validAlbumIds.map(async (albumId) => {
    const dateTime = Date.now();
    const dataMap = {
      appid,
      clienttime: dateTime,
      clientver,
      album_id: Number(albumId),
      area_code: 1,
      tagid: 0,
      page,
      pagesize,
      dfid,
      key: signParamsKey(dateTime),
      mid: cryptoMd5(dfid),
    };

    if (token) dataMap['token'] = token;
    if (userid) dataMap['userid'] = userid;

    try {
      const response = await useAxios({
        url: '/v1/album_audio/lite',
        method: 'POST',
        data: dataMap,
        encryptType: 'android',
        cookie: params?.cookie || {},
        headers: { 'x-router': 'openapi.kugou.com', 'KG-TID': '78' },
      });
      

      
      // 处理不同的响应格式
  if (response.body.status === 1) {
    let songs = response.body.data?.list || response.body.data?.songs || [];
    // 过滤掉不属于当前专辑ID的歌曲
    songs = songs.filter(song => {
      const baseInfo = song.base || {};
      const songAlbumId = baseInfo.album_id || song.album_id || 0;
      return String(songAlbumId) === String(albumId);
    });
    // 为每个歌曲添加专辑ID和专辑名称，并从base对象提取关键信息
  return songs.map(song => {
    // 从base对象提取基础信息
    const baseInfo = song.base || {};
    // 提取音频信息
    const audioInfo = song.audio_info || {};
    // 提取专辑信息
    const albumInfo = song.album_info || {};
    // 提取作者信息
    const authors = Array.isArray(song.authors) ? song.authors.map(author => author.author_name).join(', ') : song.author_name || '';
    return {
      ...baseInfo,
      ...audioInfo,
      ...albumInfo,
      authors,
      albumId: albumId.toString().trim(),
      albumName: albumInfo?.album_name || response.body.data?.album_info?.album_name || response.body.data?.album_name || ''
    };
  });
  } else {
      return [];
    }
    } catch (error) {
      console.error(`获取专辑 ${albumId} 歌曲失败:`, error);
      return [];
    }
  });
  
  // 等待所有请求完成
  const albumSongs = await Promise.all(albumRequests);
  
  // 合并所有专辑的歌曲
  const allSongs = albumSongs.flat();
  
  // 返回合并后的结果，兼容前端不同的响应结构期望
  return { headers: {}, status: 200, body: { status: 1, data: { songs: allSongs, audios: allSongs } } };
};

// 导出函数
exports.getAlbumSongs = albumSongsHandler;

// 默认导出
module.exports = albumSongsHandler;

// 为支持ES模块导入，添加__esModule标记和default导出
Object.defineProperty(module.exports, '__esModule', { value: true });
module.exports.default = albumSongsHandler;