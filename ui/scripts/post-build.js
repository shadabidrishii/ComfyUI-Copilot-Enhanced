import fs from 'fs';
import path from 'path';
import glob from 'glob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 获取 __dirname 的等效值
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 在 dist/copilot_web 目录下查找包含 __vite__mapDeps 的 JS 文件
const distDir = path.resolve(__dirname, '../../dist/copilot_web');
const files = glob.sync(`${distDir}/**/App-*.js`);

files.forEach(file => {
    console.log('start modify', file)
    let content = fs.readFileSync(file, 'utf-8');

    if (content.includes('__vite__mapDeps')) {
        // 提取原始依赖数组
        const depsMatch = content.match(/__vite__mapDeps\.viteFileDeps = \[(.*?)\]/);
        if (depsMatch && depsMatch[1]) {
            const originalDeps = depsMatch[1];

            // 替换函数实现
            content = content.replace(
                /function __vite__mapDeps\(indexes\) {[\s\S]*?return indexes\.map\(\(i\) => __vite__mapDeps\.viteFileDeps\[i\]\)\s*}/,
                `function __vite__mapDeps(indexes) {
          const apiBase = window.comfyAPI?.api?.api?.api_base;
          const prefix = apiBase ? \`\${apiBase.substring(1)}/\` : '';
          if (!__vite__mapDeps.viteFileDeps) {
            __vite__mapDeps.viteFileDeps = [${originalDeps}].map(
              path => \`\${prefix}\${path}\`
            );
          }
          return indexes.map((i) => __vite__mapDeps.viteFileDeps[i]);
        }`
            );

            fs.writeFileSync(file, content, 'utf-8');
            console.log(`Modified ${path.basename(file)}`);
        }
    }
}); 