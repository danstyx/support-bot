# Discord Ticket Bot

A powerful Discord.js bot for managing support tickets with advanced role-based permissions, transcript generation, and automated staff management.

## Quick Setup

### Prerequisites
- Node.js 18+ (required for Discord.js v14)
- Discord Bot Token
- Discord Application ID
- Discord Guild ID

### Installation
1. Clone or download the bot files
2. Install dependencies: `npm install`
3. Create `.env` file with your credentials:
   ```env
   BOT_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here
   ```
4. Deploy commands: `node deploy-commands.js`
5. Start the bot: `npm start`

### Initial Setup
1. Invite bot to your server with Administrator permissions
2. Run `/setup help` to see available commands
3. Set up channels: `/setup channels ticket_category #category`
4. Set up transcript channel: `/setup channels transcript #channel`
5. Create ticket panel: `/setup channels panel #channel`
6. Add staff roles: `/setup staff_roles "Category" @Role add access`

## Features

- **🎫 Ticket Creation**: Dropdown-based ticket creation with categories
- **👥 Role Management**: Granular permissions (access, claim, close, persistent, ping)
- **📋 Staff Control**: Claim/unclaim tickets with automatic permission management
- **📄 Transcripts**: HTML transcripts generated when tickets are closed
- **🔄 Dynamic Panel**: Auto-updating ticket panel with category changes
- **🔔 Smart Pinging**: Configurable role pinging for ticket notifications

## Commands

### Setup (Administrators)
- `/setup help` - Show setup guide
- `/setup category` - Manage ticket categories
- `/setup channels` - Configure bot channels
- `/setup staff_roles` - Configure staff permissions
- `/setup settings` - Configure bot settings

### Staff Commands
- `/claim` - Claim a ticket
- `/unclaim` - Unclaim a ticket
- `/close <reason>` - Close ticket with transcript

## Permission Types

- **access**: View and respond to tickets
- **claim**: Claim tickets (restricts other staff)
- **close**: Close tickets and generate transcripts
- **persistent**: Keep access when ticket is claimed
- **ping**: Get pinged when tickets are created
- **all**: Add to all permission types

## Configuration

The bot uses `config.json` for persistent configuration and `.env` for sensitive credentials. See `DOCUMENTATION.md` for detailed configuration options.

## Troubleshooting

### Common Issues
- **Bot won't start**: Check Node.js version (needs 18+)
- **Commands not working**: Ensure bot has Administrator permission
- **Pings not working**: Check role IDs and bot permissions
- **Panel not updating**: Use `/setup refresh_panel`

### Required Bot Permissions
- Administrator (recommended) or:
  - Send Messages
  - Embed Links
  - Use Slash Commands
  - Manage Channels
  - Manage Roles
  - Read Message History
  - Mention Everyone

## Support

For detailed documentation, see `DOCUMENTATION.md`.

## License

This project is open source and available under the MIT License. 