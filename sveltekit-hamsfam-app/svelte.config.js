import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(
      // {
      // // SPA 모드: 어떤 라우트든 index.html로 fallback
      // fallback: 'index.html'
      // }
    ),
    prerender: {
      // ✅ 모든 페이지를 미리 HTML로 뽑지 않겠다 = SPA처럼 동작
      entries: []
    }
  }
};

export default config;
