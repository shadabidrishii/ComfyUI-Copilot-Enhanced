import { getHistory, getImage, runPrompt } from "../apis/comfyApiCustom";
import { app } from "../utils/comfyapp";

export type WidgetPair = {
    paramName: string;
    paramValue: string;
}

export type WidgetParamConf = {
    nodeId: number;
    params: WidgetPair[];
}

function updatePrompt(prompt_output: any, paramConfigs: WidgetParamConf[]): any {
    try {
        if (!prompt_output) {
            console.error("Invalid prompt_output: ", prompt_output);
            return prompt_output;
        }
        
        // Apply each parameter configuration
        for (const config of paramConfigs) {
            if (!prompt_output[config.nodeId]) {
                console.error(`Node with ID ${config.nodeId} not found`);
                continue;
            }
            
            if (!prompt_output[config.nodeId]["inputs"]) {
                console.error(`Inputs not found for node with ID ${config.nodeId}`);
                continue;
            }
            
            // Update each parameter for this node
            for (const param of config.params) {
                prompt_output[config.nodeId]["inputs"][param.paramName] = param.paramValue;
            }
        }
        
        return prompt_output;
    } catch (error) {
        console.error("Error updating prompt:", error);
        return prompt_output;
    }
}

export async function queuePrompt(paramConfigs: WidgetParamConf[]): Promise<any> {
    const prompt = await app.graphToPrompt()
    const updated_prompt = updatePrompt(prompt.output, paramConfigs)
    console.log("queuePrompt updated_prompt:", updated_prompt);
    const request_body = {
        prompt: updated_prompt,
        client_id: app.api.clientId,
        extra_data: {
            extra_pageinfo: {
                workflow: prompt.workflow,
            }
        }
    }
    console.debug("queuePrompt request_body.prompt:", updated_prompt);
    const response = await runPrompt(request_body);
    console.debug("queuePrompt response:", response);
    return response;
}

// export async function batchQueuePrompt(paramsBatch: WidgetParamConf[]): Promise<any> {
//     const responses = [];
//     for (const params of paramsBatch) {
//         const response = await queuePrompt(params);
//         responses.push(response);
//     }
//     return responses;
// }

export async function getOutputImagesByPromptId(promptId: string): Promise<{[nodeId: string]: Blob[]}> {
    try {
      if(!promptId || promptId === "") {
        console.log("No prompt ID provided");
        return {};
      }
  
      // Get the history for the prompt
      const history = await getHistory(promptId);
      
      if (!history || !history[promptId]) {
        console.log("Not finished for prompt ID:", promptId);
        return {};
      }
      
      const promptHistory = history[promptId];
      const outputImages: {[nodeId: string]: Blob[]} = {};
      
      // Process all outputs in the history
      if (promptHistory.outputs) {
        for (const nodeId in promptHistory.outputs) {
          const nodeOutput = promptHistory.outputs[nodeId];
          
          if (nodeOutput.images) {
            const imagesOutput: Blob[] = [];
            
            for (const image of nodeOutput.images) {
              const imageData = await getImage(
                image.filename,
                image.subfolder,
                image.type
              );
              imagesOutput.push(imageData);
            }
            
            outputImages[nodeId] = imagesOutput;
          }
        }
      }
      
      return outputImages;
    } catch (error) {
      console.error("Error getting output images from prompt:", error);
      throw error;
    }
  }

export async function getOutputImageByPromptId(promptId: string): Promise<Blob[]> {
    const outputImages = await getOutputImagesByPromptId(promptId);
    // If no images were found, return an empty array
    if (Object.keys(outputImages).length === 0) {
        return [];
    }
    
    // Find the maximum nodeId
    const nodeIds = Object.keys(outputImages).map(id => parseInt(id));
    const maxNodeId = Math.max(...nodeIds).toString();
    
    // Return the images from the node with the maximum ID
    return outputImages[maxNodeId] || [];
}