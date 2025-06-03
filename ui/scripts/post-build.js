import fs from 'fs';
import path from 'path';
import glob from 'glob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find JS files containing __vite__mapDeps in the dist/copilot_web directory
const distDir = path.resolve(__dirname, '../../dist/copilot_web');
const files = glob.sync(`${distDir}/**/App-*.js`);

files.forEach(file => {
    console.log('start modify', file)
    let content = fs.readFileSync(file, 'utf-8');

    if (content.includes('__vite__mapDeps')) {
        // Extract the new format dependencies array using non-greedy matching
        const depsMatch = content.match(/const __vite__mapDeps=\(.*?m\.f=\[(.*?)\]/);
        if (depsMatch && depsMatch[1]) {
            const originalDeps = depsMatch[1];
            
            // Add path transformation logic if not already present in the file
            if (!content.includes('window.comfyAPI?.api?.api?.api_base')) {
                content = content.replace(
                    /const __vite__mapDeps=.*?\)=>i\.map\(i=>d\[i\]\);/,
                    `const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=[${originalDeps}].map(path => {
                        const apiBase = window.comfyAPI?.api?.api?.api_base;
                        const prefix = apiBase ? \`\${apiBase.substring(1)}/\` : '';
                        return \`\${prefix}\${path}\`;
                    }))))=>i.map(i=>d[i]);`
                );
            } else {
                // If path transformation logic already exists, only replace the dependencies array part
                content = content.replace(
                    /const __vite__mapDeps=\(.*?\)=>i\.map\(i=>d\[i\]\);/,
                    `const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=[${originalDeps}])))=>i.map(i=>d[i]);`
                );
            }

            fs.writeFileSync(file, content, 'utf-8');
            console.log(`Modified ${path.basename(file)}`);
        } else {
            console.log(`No deps pattern found in ${path.basename(file)}`);
        }
    } else {
        console.log(`No __vite__mapDeps found in ${path.basename(file)}`);
    }
}); 