document.getElementById('sendBtn').addEventListener('click', sendMessage);

async function sendMessage() {
    const userInput = document.getElementById('chat-input');
    const message = userInput.value;

    if (message.trim() === '') return;

    appendMessage(`<fieldset class="floatright">${message}</fieldset><br>`);
    userInput.value = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        if (response.ok) {
            const data = await response.json();
            appendMessage(`<fieldset class="floatleft">${data.response}</fieldset><br>`);
        } else {
            appendMessage('Error: Failed to get response from server');
        }
    } catch (error) {
        appendMessage(`Error: ${error.message}`);
    }
}

function appendMessage(msg) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML += `${msg}`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to the bottom
}
