import express from 'express';
import path from 'path';
import ollama from 'ollama';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { WebSocketServer } from 'ws';
import http from 'http';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 8080;

// Create an HTTP server to share between Express and WebSocket
const server = http.createServer(app);

// Initialize WebSocket server on the same port
const wss = new WebSocketServer({ server });

// Middleware to parse JSON requests
app.use(express.json());

// Serve static files (your HTML, CSS, JavaScript)
app.use(express.static(path.join(__dirname, 'public')));

// Chat API endpoint for HTTP requests (Express)
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    try {
        // Read system message from file
        const systemMessage = await fs.readFile('personas/persona.txt', 'utf8');

        // Send chat request to the model with system message
        const response = await ollama.chat({
            model: 'gemma2:2b',
            messages: [
                { role: 'system', content: systemMessage.trim() },
                { role: 'user', content: userMessage }
            ]
        });

        // Convert the response content from Markdown to HTML
        const htmlResponse = marked(response.message.content);
        res.json({ response: htmlResponse });
    } catch (error) {
        res.status(500).send({ error: 'Failed to connect to Ollama or read system message' });
    }
});

// WebSocket handling for continuous chat sessions
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    const chatHistory = [];

    ws.on('message', async (message) => {
        const userMessage = message.toString();
        chatHistory.push({ role: 'user', content: userMessage });

        // Add system message if it's the first message in the session
        if (chatHistory.length === 1) {
            const systemMessage = await fs.readFile('personas/persona.txt', 'utf8');
            chatHistory.unshift({ role: 'system', content: systemMessage.trim() });
        }

        try {
            // Send chat history to Ollama for context
            const response = await ollama.chat({
                model: 'gemma2:2b',
                messages: chatHistory
            });

            // Convert the assistant's response from Markdown to HTML
            const htmlResponse = marked(response.message.content);
            chatHistory.push({ role: 'assistant', content: response.message.content });

            // Send the assistant's response back to the WebSocket client
            ws.send(htmlResponse);
        } catch (error) {
            ws.send('Error communicating with the model.');
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

// Start the server with both Express and WebSocket support
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
