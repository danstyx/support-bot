const fs = require('fs');
const path = require('path');

class TranscriptGenerator {
    constructor() {
        this.transcriptsDir = path.join(__dirname, '..', 'transcripts');
        this.ensureTranscriptsDir();
    }

    ensureTranscriptsDir() {
        if (!fs.existsSync(this.transcriptsDir)) {
            fs.mkdirSync(this.transcriptsDir, { recursive: true });
        }
    }

    generateHTML(messages, ticketInfo) {
        const { channelName, topic, createdBy, closedBy, createdAt, closedAt } = ticketInfo;
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket Transcript - ${channelName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #36393f;
            color: #dcddde;
        }
        .header {
            background-color: #2f3136;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #7289da;
        }
        .ticket-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
        }
        .info-item {
            background-color: #40444b;
            padding: 10px;
            border-radius: 4px;
        }
        .info-label {
            font-weight: bold;
            color: #7289da;
            font-size: 0.9em;
        }
        .info-value {
            margin-top: 5px;
        }
        .messages {
            background-color: #2f3136;
            border-radius: 8px;
            padding: 20px;
        }
        .message {
            margin-bottom: 15px;
            padding: 10px;
            background-color: #40444b;
            border-radius: 4px;
            border-left: 3px solid #7289da;
        }
        .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            margin-right: 10px;
            background-color: #7289da;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
        }
        .username {
            font-weight: bold;
            color: #7289da;
        }
        .timestamp {
            color: #72767d;
            font-size: 0.8em;
            margin-left: 10px;
        }
        .message-content {
            margin-left: 42px;
            line-height: 1.4;
        }
        .embed {
            background-color: #2f3136;
            border-left: 4px solid #7289da;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .embed-title {
            font-weight: bold;
            color: #7289da;
            margin-bottom: 5px;
        }
        .embed-description {
            color: #dcddde;
        }
        .attachment {
            background-color: #2f3136;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            border: 1px solid #40444b;
        }
        .attachment-name {
            color: #7289da;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background-color: #2f3136;
            border-radius: 8px;
            color: #72767d;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Ticket Transcript</h1>
        <div class="ticket-info">
            <div class="info-item">
                <div class="info-label">Channel Name</div>
                <div class="info-value">${channelName}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Topic</div>
                <div class="info-value">${topic || 'No topic specified'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Created By</div>
                <div class="info-value">${createdBy}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Closed By</div>
                <div class="info-value">${closedBy || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Created At</div>
                <div class="info-value">${createdAt}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Closed At</div>
                <div class="info-value">${closedAt || 'N/A'}</div>
            </div>
        </div>
    </div>
    
    <div class="messages">
        <h2>Messages</h2>
`;

        messages.forEach(message => {
            const timestamp = new Date(message.createdTimestamp).toLocaleString();
            const avatarText = message.author.username.charAt(0).toUpperCase();
            
            html += `
        <div class="message">
            <div class="message-header">
                <div class="avatar">${avatarText}</div>
                <div class="username">${message.author.username}</div>
                <div class="timestamp">${timestamp}</div>
            </div>
            <div class="message-content">`;

            // Handle message content
            if (message.content) {
                html += `<div>${this.escapeHtml(message.content)}</div>`;
            }

            // Handle embeds
            if (message.embeds && message.embeds.length > 0) {
                message.embeds.forEach(embed => {
                    html += `
                    <div class="embed">
                        ${embed.title ? `<div class="embed-title">${this.escapeHtml(embed.title)}</div>` : ''}
                        ${embed.description ? `<div class="embed-description">${this.escapeHtml(embed.description)}</div>` : ''}
                    </div>`;
                });
            }

            // Handle attachments
            if (message.attachments && message.attachments.size > 0) {
                message.attachments.forEach(attachment => {
                    html += `
                    <div class="attachment">
                        <div class="attachment-name">📎 ${attachment.name}</div>
                        <div>${attachment.url}</div>
                    </div>`;
                });
            }

            html += `
            </div>
        </div>`;
        });

        html += `
    </div>
    
    <div class="footer">
        <p>Transcript generated on ${new Date().toLocaleString()}</p>
        <p>Discord Ticket Bot</p>
    </div>
</body>
</html>`;

        return html;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    async saveTranscript(messages, ticketInfo) {
        const html = this.generateHTML(messages, ticketInfo);
        const filename = `transcript-${ticketInfo.channelName}-${Date.now()}.html`;
        const filepath = path.join(this.transcriptsDir, filename);
        
        try {
            fs.writeFileSync(filepath, html);
            return { filepath, filename };
        } catch (error) {
            console.error('Error saving transcript:', error);
            throw error;
        }
    }

    cleanupOldTranscripts(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
        try {
            const files = fs.readdirSync(this.transcriptsDir);
            const now = Date.now();
            
            files.forEach(file => {
                const filepath = path.join(this.transcriptsDir, file);
                const stats = fs.statSync(filepath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filepath);
                    console.log(`Cleaned up old transcript: ${file}`);
                }
            });
        } catch (error) {
            console.error('Error cleaning up transcripts:', error);
        }
    }
}

module.exports = TranscriptGenerator; 