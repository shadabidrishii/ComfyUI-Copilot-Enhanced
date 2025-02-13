import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// 定义事件常量
const COPILOT_EVENTS = {
    EXPLAIN_NODE: 'copilot:explain-node'
};

function addExtraMenuOptions(nodeType, nodeData, app) {
    const original_getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function (_, options) {
        original_getExtraMenuOptions?.apply(this, arguments);
        options.push({
            content: "Explain with Copilot",
            callback: async () => {
                const nodeTypeUniqueId = nodeType?.comfyClass;
                // 触发自定义事件
                window.dispatchEvent(new CustomEvent(COPILOT_EVENTS.EXPLAIN_NODE, {
                    detail: { nodeType: nodeTypeUniqueId }
                }));
            }
        })
    }
}

app.registerExtension({
    name: "ComfyUI-Copilot-Bridge",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        addExtraMenuOptions(nodeType, nodeData, app);
    },
})