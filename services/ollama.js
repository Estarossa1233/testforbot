const axios = require("axios");

const identitas = require("../prompt/identitas");
const rules = require("../prompt/rules");
const rungkat = require("../prompt/rungkat");


const OLLAMA_URL =
    process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/chat";

const MODEL =
    process.env.OLLAMA_MODEL || "qwen2.5:1.5b"

const systemPrompt = `
${identitas}
${rules}
${rungkat}
`;

async function askOllama(prompt) {

        const start = Date.now();


    const response = await axios.post(OLLAMA_URL, {

        
        model: MODEL,
        keep_alive: "30m",
        stream: false,

        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: prompt
            }
        ],

        options: {
            num_predict: 250,
            temperature: 0.5,
            num_ctx: 2048
        }

    });

    console.log("Ollama:", Date.now() - start, "ms");
    console.log(response.data);

    return response.data.message.content;

}

module.exports = {
    askOllama,
    MODEL
};
