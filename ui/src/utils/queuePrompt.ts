import { getHistory, getImage, runPrompt } from "../apis/comfyApiCustom";
import { app } from "../utils/comfyapp";

export type WidgetParamConf = {
    nodeId: number;
    paramName: string;
    paramValue: string;
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
            prompt_output[config.nodeId]["inputs"][config.paramName] = config.paramValue;
            
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

function createErrorImage(errorMessage: string): Blob {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 512;
    const height = 512;
    canvas.width = width;
    canvas.height = height;
    if(ctx) {
        ctx.fillStyle = 'red';
        ctx.font = '20px Arial';
        ctx.fillText(errorMessage, 10, 30);
    }
    return new Blob([canvas.toDataURL('image/png')], { type: 'image/png' });
}

export async function getOutputImagesByPromptId(promptId: string): Promise<{[nodeId: string]: Blob[]}> {
    try {
      if(!promptId || promptId === "") {
        console.log("No prompt ID provided");
        return { "1": [createErrorImage("Fail to generate prompt ID")] };
      }
  
      // Get the history for the prompt
      const history = await getHistory(promptId);
      
      if (!history || !history[promptId]) {
        console.log("Not finished for prompt ID:", promptId);
        return {};
      }

      const promptHistory = history[promptId];
      if(promptHistory.status && promptHistory.status.status_str === "error") {
        console.error("Error for prompt ID:", promptId);
        const messages = promptHistory.status.messages;
        if(messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if(lastMessage && lastMessage.length > 0) {
                const errorMessage = lastMessage[0];
                // Return an error image with the error message
                const errorImage = createErrorImage(errorMessage);
                return { "1": [errorImage] }; // Return with default nodeId of 1
            }
        }
      }
      
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