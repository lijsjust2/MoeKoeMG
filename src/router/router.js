import { createRouter, createWebHistory } from 'vue-router';
import HomeLayout from '@/layouts/HomeLayout.vue';
import Home from '@/views/Home.vue';
import Discover from '@/views/Discover.vue';
import Library from '@/views/Library.vue';
import Login from '@/views/Login.vue';
import Settings from '@/views/Settings.vue';
import PlaylistDetail from '@/views/PlaylistDetail.vue';
import AlbumDetail from '@/views/AlbumDetail.vue';
import AlbumSongs from '@/views/AlbumSongs.vue';
import Search from '@/views/Search.vue';
import Lyrics from '@/views/Lyrics.vue';
import Ranking from '@/views/Ranking.vue';
import CloudDrive from '@/views/CloudDrive.vue';
import BatchDownload from '@/views/BatchDownload.vue';
import BatchAlbumDownload from '@/views/BatchAlbumDownload.vue';
import BatchArtistAlbumDownload from '@/views/BatchArtistAlbumDownload.vue';
// FullScreenQueue已整合到主界面中
import { MoeAuthStore } from '@/stores/store';


const routes = [
    {
        path: '/',
        name: 'Home',
        component: HomeLayout,
        children: [
            { path: '', name: 'Index', component: Home },
            { path: '/share', name: 'Share', component: Home },
            { path: '/discover', name: 'Discover', component: Discover },
            { path: '/library', name: 'Library', component: Library, meta: { requiresAuth: true } },
            { path: '/login', name: 'Login', component: Login },
            { path: '/settings', name: 'Settings', component: Settings },
            { path: '/playlistDetail', name: 'PlaylistDetail', component: PlaylistDetail },
            { path: '/albumDetail', name: 'AlbumDetail', component: AlbumDetail },
            { path: '/album/:id', name: 'AlbumDetailAlt', component: AlbumDetail },
            { path: '/search', name: 'Search', component: Search },
            { path: '/ranking', name: 'Ranking', component: Ranking },
            { path: '/CloudDrive', name: 'CloudDrive', component: CloudDrive },
            { path: '/albumSongs', name: 'AlbumSongs', component: AlbumSongs },
            { path: '/album/:id/songs', name: 'AlbumSongsAlt', component: AlbumSongs },
            { path: '/batchDownload', name: 'BatchDownload', component: BatchDownload },
            { path: '/batchAlbumDownload', name: 'BatchAlbumDownload', component: BatchAlbumDownload },
            { path: '/batchArtistAlbumDownload', name: 'BatchArtistAlbumDownload', component: BatchArtistAlbumDownload }
        ],
    },
    { path: '/lyrics', name: 'Lyrics', component: Lyrics },
    // 全屏播放列表已整合到主界面中
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        ...savedPosition,
                        behavior: 'smooth'
                    });
                }, 100);
            });
        }
        if (to.hash) {
            return {
                el: to.hash,
                behavior: 'smooth',
                top: 80, 
            };
        }
        if (to.path === from.path && JSON.stringify(to.params) === JSON.stringify(from.params)) {
            return false;
        }
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ top: 0, behavior: 'smooth' });
            }, 50);
        });
    }
});

// 全局导航守卫
router.beforeEach((to, from, next) => {
    console.log('完整的路由地址:', to.fullPath);
    const MoeAuth = MoeAuthStore()
    // 检查是否需要登录
    if (to.matched.some(record => record.meta.requiresAuth)) {
        // 需要认证的路由
        if (!MoeAuth.isAuthenticated) {
            // 未认证用户重定向到登录页，并携带当前页面路径作为参数
            next({
                name: 'Login',
                query: { redirect: to.fullPath } 
            });
        } else {
            // 已认证用户允许访问
            next();
        }
    } else {
        // 不需要认证的页面，直接访问
        next();
    }
});

export default router;