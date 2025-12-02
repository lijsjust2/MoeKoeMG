import request from '../../utils/request'

/**
 * 获取歌手专辑列表
 * @param {number} artistId - 歌手ID
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getArtistAlbums(artistId, params = {}) {
  return request({
    url: '/artist/albums',
    method: 'get',
    params: {
      artistid: artistId,
      ...params
    }
  })
}

/**
 * 获取歌手专辑详情
 * @param {number} albumId - 专辑ID
 * @returns {Promise}
 */
export function getArtistAlbumDetail(albumId) {
  return request({
    url: '/artist/album_detail',
    method: 'get',
    params: {
      albumid: albumId
    }
  })
}