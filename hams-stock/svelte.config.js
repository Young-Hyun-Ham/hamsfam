import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
    // 모든 a11y(접근성) 관련 경고를 무시하고 싶을 때
    warningFilter: (warning) => !warning.code.startsWith('a11y_')
  },
	kit: {
		adapter: adapter()
	}
};

export default config;