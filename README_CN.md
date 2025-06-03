中文 ｜ [English](./README.md)

<div align="center">

# 🎯 ComfyUI-Copilot: ComfyUI 智能助手

<h4 align="center">

<div align="center">
<img src="https://img.shields.io/badge/Version-1.0.0-blue.svg" alt="版本"> 
<img src="https://img.shields.io/badge/License-MIT-green.svg" alt="许可证">
<img src="https://img.shields.io/github/stars/AIDC-AI/ComfyUI-Copilot?color=yellow" alt="星标">
<img src="https://img.shields.io/github/issues/AIDC-AI/ComfyUI-Copilot?color=red" alt="问题">
<img src="https://img.shields.io/badge/python-3.10%2B-purple.svg" alt="Python">

</h4>

👾 _**阿里巴巴国际数字商业集团**_ 👾

<p align="center">
          :octocat: <a href="https://github.com/AIDC-AI/ComfyUI-Copilot"><b>Github</b></a>&nbsp&nbsp | &nbsp&nbsp 💬 <a href="https://github.com/AIDC-AI/ComfyUI-Copilot/blob/main/assets/qrcode.png"><b>微信</b></a>&nbsp&nbsp
</p>

</div>

https://github.com/user-attachments/assets/0372faf4-eb64-4aad-82e6-5fd69f349c2c

## 🌟 介绍

欢迎使用 **ComfyUI-Copilot**，这是一个基于 ComfyUI 框架构建的智能助手，通过自然语言交互简化并增强 AI 算法调试和部署过程。

无论是生成文本、图像还是音频，ComfyUI-Copilot 都提供直观的节点推荐、工作流构建辅助和模型查询服务，以简化您的开发过程。

<div align="center">
<img src="assets/Framework.png"/>
</div>

---

## 🤔 为什么选择 ComfyUI-Copilot？

- 🍀 **易于使用**：通过自然语言交互降低入门门槛，使 Comfy-UI 即便对初学者也能轻松上手。
- 🍀 **智能推荐**：利用 AI 驱动的节点建议和工作流实现来提高开发效率。
- 🍀 **实时帮助**：享受全天候互动支持，以解决开发过程中遇到的任何问题。

---
## 🚀 Updates
### 2025.05.16 发布
#### ✨ 新功能
- GenLab历史：支持参数探索后历史结果的查询。
- 个性化工作流程生成：用户可以输入自己的需求，大语言模型为他们生成定制的工作流程。

<div align="center">
<img src="assets/GenLabHistory.png" width=50% />
</div>


### 2025.04.28 发布
#### ✨ 新功能
- 我们的前端用户界面嵌入在ComfyUI界面中。只需点击左侧栏中的ComfyUI-Copilot图标即可启动我们的服务。
- 界面会自动适应ComfyUI的黑/白主题，背景颜色会相应切换。

<img src="assets/comfyui_ui_icon.png"/>

### 2025.04.08 发布

#### ✨ 新功能

##### 1. 🎉 GenLab 上线
我们很高兴地宣布 GenLab 现已正式上线，带来两个强大的新功能：

###### a. 🔍 参数探索：对参数进行遍历，生成的结果在视觉层面进行比较，帮助您快速找到最佳参数配置
- 使用方法：
 - 1、点击您希望探索的节点
 - 2、选择要探索的参数
 - 3、设置参数值范围
 - 4、系统将自动批量执行不同的参数组合
   
     https://github.com/user-attachments/assets/8069744a-411e-4a25-b1a5-4503a303bc6c

###### b. ✏️ 提示词重写助手：新功能帮助用户生成丰富、高质量的"咒语"
  
   https://github.com/user-attachments/assets/85decdbf-9ae5-4c78-818b-8db444ed4e7b

#### 🛠️ 错误修复
- 🐛 修复了多个已知问题，提高了系统稳定性

### 2025.02.27 版本更新
* **多模型支持**：增加集成DeepSeek AI和Qwen-plus模型;
* **节点安装体验优化**：增加当用户尝试加载未安装的节点时，智能跳转至 GitHub 仓库或相关谷歌搜索结果的功能。
* **提示词生成改进**：增强 SD 提示生成能力，改进了错误日志分析能力。
* **性能优化**：解决了在使用 Copilot 时在 GitHub Issue中报告的延迟问题。
* **多语种优化**：修复节点信息查询实现了多语言环境响应，增加节点查询的上下文响应。
* **子图推荐优化**：重新设计下游子图生成逻辑，以过滤冗余子图，移除过大的子图推荐，并过滤上游节点以改善用户体验。
* **模型数据库迭代**：新增覆盖60000+个LoRA和Checkpoint数据。
---

## 🔥 核心功能（V1.0.0）

- 💎 **互动问答机器人**：访问强大的问答平台，用户可以轻松询问模型细节、节点详情和参数使用。
- 💎 **自然语言节点建议**：使用我们先进的搜索机制快速找到所需节点，提高工作流构建效率。
<img src="assets/comfycopilot_nodes_recommend.gif"/>

- 💎 **节点查询系统**：深入探索节点，查看其说明、参数定义、使用技巧和下游工作流推荐。
<img src="assets/comfycopilot_nodes_search.gif"/>

- 💎 **智能工作流助手**：自动识别开发者需求，推荐并构建合适的工作流框架，减少手动设置时间。
- 💎 **模型查询**：根据需求提示 Copilot 查找基础模型和 'lora'。
- 💎 **即将推出的功能**：
  
  - **自动参数调整**：利用机器学习算法无缝分析和优化关键工作流参数。
  - **错误诊断和修复建议**：获取全面的错误见解和修正建议，以快速定位和解决问题。

---

## 🚀 快速开始

**仓库概览**：访问 [GitHub 仓库](https://github.com/AIDC-AI/ComfyUI-Copilot) 以获取完整代码库。

1. **安装**：
   
   ```bash
   cd ComfyUI/custom_nodes
   git clone git@github.com:AIDC-AI/ComfyUI-Copilot.git
   ```
   
   或
   
   ```bash
   cd ComfyUI/custom_nodes
   git clone https://github.com/AIDC-AI/ComfyUI-Copilot
   ```

   或
   
   **使用 ComfyUI 管理器**：打开 ComfyUI 管理器，点击自定义节点管理器，搜索 ComfyUI-Copilot，并点击安装按钮。
   <img src="assets/comfyui_manager.png"/>
   <img src="assets/comfyui_manager_install.png"/>

2. **激活**：在运行 ComfyUI 项目后，在面板右上角找到 Copilot 激活按钮以启动其服务。
<img src="assets/start.png"/>

3.  **API Key 生成**：在链接中输入您的电子邮件地址，API Key 将稍后自动发送到您的电子邮件地址。
<img src="assets/keygen.png"/>

4. **注意**：本项目处于早期阶段。请更新到最新代码以获取新功能。您可以使用 git pull 获取最新代码，或在 ComfyUI Manager 插件中点击“更新”。

---

## 🤝 贡献

我们欢迎任何形式的贡献！可以随时提出 Issues、提交 Pull Request 或建议新功能。


## 📞 联系我们

如有任何疑问或建议，请在[GitHub仓库](https://github.com/shadabidrishii/ComfyUI-Copilot-Enhanced/issues)上提交问题。

微信服务群：
<div align="center">
<img src='https://github.com/AIDC-AI/ComfyUI-Copilot/blob/main/assets/qrcode.jpg' width='300'>
</div>

## 📚 许可证

该项目采用 MIT 许可证 - 有关详情，请参阅 [LICENSE](https://opensource.org/licenses/MIT) 文件。

## ⭐ 星标历史

[![星标历史图](https://api.star-history.com/svg?repos=AIDC-AI/ComfyUI-Copilot&type=Date)](https://star-history.com/#AIDC-AI/ComfyUI-Copilot&Date)
