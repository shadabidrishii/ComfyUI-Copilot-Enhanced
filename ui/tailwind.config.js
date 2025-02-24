/*
 * @Author: ai-business-hql ai.bussiness.hql@gmail.com
 * @Date: 2025-02-17 20:53:45
 * @LastEditors: ai-business-hql ai.bussiness.hql@gmail.com
 * @LastEditTime: 2025-02-24 16:29:03
 * @FilePath: /comfyui_copilot/ui/tailwind.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'

export default {
  corePlugins: { 
    preflight: false 
  },
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        // bounce: 'bounce 1s infinite',
      },
    },
  },
  plugins: [
    typography,
  ],
}