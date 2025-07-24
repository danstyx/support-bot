# Discord Ticket Bot Documentation

## Overview
A Discord.js bot that creates and manages support tickets with advanced role-based permissions, transcript generation, and automated staff management.

## Features
- **Ticket Creation**: Users can create tickets via dropdown selection from a panel
- **Role-Based Permissions**: Granular permissions (access, claim, close, persistent, ping)
- **Staff Management**: Claim/unclaim tickets with automatic permission management
- **Transcript Generation**: HTML transcripts saved when tickets are closed
- **Category Management**: Multiple ticket categories with custom settings
- **Public Notifications**: Claim/unclaim messages sent to ticket channels
- **Panel Management**: Dynamic ticket panel with automatic updates

## File Structure
```
├── index.js                    # Main bot entry point
├── deploy-commands.js          # Command deployment script
├── package.json               # Dependencies and scripts
├── config.json               # Bot configuration and data
├── .env                      # Environment variables (BOT_TOKEN, CLIENT_ID, GUILD_ID)
├── commands/
│   ├── setup.js              # Setup and configuration commands
│   ├── claim.js              # Ticket claiming command
│   ├── unclaim.js            # Ticket unclaiming command
│   └── close.js              # Ticket closing command
├── handlers/
│   ├── eventHandler.js       # Main event handler
│   └── ticketManager.js      # Core ticket management logic
├── utils/
│   ├── configManager.js      # Configuration management
│   └── transcriptGenerator.js # HTML transcript generation
└── DOCUMENTATION.md          # This file
```

## Configuration

### Environment Variables (.env)
```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
```

### Config.json Structure
```json
{
  "ticketCategories": [
    {
      "name": "Category Name",
      "description": "Category description",
      "color": "#hexcolor",
      "emoji": "🎫",
      "staffRoles": {
        "access": ["role_id1", "role_id2"],
        "claim": ["role_id1", "role_id2"],
        "close": ["role_id1", "role_id2"],
        "persistent": ["role_id1"],
        "ping": ["role_id1", "role_id2"]
      }
    }
  ],
  "permissions": {
    "ticketAccessRoles": ["role_id"],
    "claimRoles": [],
    "closeRoles": []
  },
  "channels": {
    "ticketCategory": "category_id",
    "transcriptChannel": "channel_id",
    "ticketPanelChannel": "channel_id",
    "ticketPanelMessage": "message_id"
  },
  "settings": {
    "ticketPrefix": "ticket-",
    "maxTicketsPerUser": 3,
    "autoCloseInactive": false,
    "inactiveTimeout": 168
  }
}
```

## Permission Types

### Staff Role Permissions
- **access**: Can view and respond to tickets
- **claim**: Can claim tickets (restricts other staff from typing)
- **close**: Can close tickets and generate transcripts
- **persistent**: Keeps access even when ticket is claimed by someone else
- **ping**: Gets pinged when tickets are created
- **all**: Adds role to all permission types at once

## Commands

### Setup Commands (Administrators only)
- `/setup help` - Show setup help
- `/setup category <action> [options]` - Manage ticket categories
  - `add` - Add new category
  - `remove` - Remove category
  - `list` - List all categories
  - `edit` - Edit existing category
  - `info` - Show detailed category information
- `/setup channels <type> <channel>` - Configure channels
  - `ticket_category` - Set ticket storage category
  - `transcript` - Set transcript channel
  - `panel` - Set and create ticket panel
- `/setup staff_roles <category> <role> <action> [permission]` - Configure staff roles
  - `add` - Add role to permissions
  - `remove` - Remove role from permissions
  - Permission types: `access`, `claim`, `close`, `persistent`, `ping`, `all`
- `/setup settings <setting> <value>` - Configure bot settings
  - `ticket_prefix` - Set ticket channel prefix
  - `max_tickets_per_user` - Set maximum tickets per user
- `/setup refresh_panel` - Refresh existing ticket panel

### Staff Commands
- `/claim` - Claim a ticket (restricts other staff)
- `/unclaim` - Unclaim a ticket (restores staff access)
- `/close <reason>` - Close ticket and generate transcript

## Ticket Lifecycle

### 1. Ticket Creation
1. User selects category from dropdown panel
2. Bot creates channel with user and staff permissions
3. Bot sends welcome message with staff role pings
4. Ticket is added to active tickets list

### 2. Ticket Claiming
1. Staff member claims ticket via button or command
2. Bot restricts other staff roles from typing
3. Persistent roles maintain access
4. Public claim message sent to channel
5. Button changes to "Unclaim Ticket"

### 3. Ticket Unclaiming
1. Claiming staff unclaims ticket
2. Bot restores all staff role permissions
3. Public unclaim message sent to channel
4. Button changes back to "Claim Ticket"

### 4. Ticket Closing
1. Staff closes ticket with reason
2. Bot generates HTML transcript
3. Transcript sent to transcript channel
4. Success message sent to user
5. Channel deleted
6. Ticket removed from active tickets

## Key Features

### Role-Based Pinging
- Only roles with `ping` permission get pinged
- If no `ping` roles configured, no one gets pinged
- Fallback to all roles only for old format categories

### Persistent Access
- Roles with `persistent` permission keep typing access when ticket is claimed
- Useful for senior staff who should always have access

### Transcript Generation
- HTML transcripts include all messages in chronological order
- Transcripts posted to designated channel with embed
- Topic shows category name (not description)

### Panel Management
- Dynamic panel updates when categories are modified
- Panel persists through bot restarts
- Automatic cleanup of old panel messages

## Error Handling

### Common Issues
1. **Node.js Version**: Requires Node.js 18+ for Discord.js v14
2. **Bot Permissions**: Bot needs Administrator or specific permissions
3. **Role IDs**: Ensure role IDs in config exist in the server
4. **Channel Permissions**: Bot needs access to all configured channels

### Interaction Timeouts
- Close command doesn't defer reply to avoid channel deletion issues
- Claim/unclaim commands use deferred replies for long operations
- Error handling for invalid interactions

## Technical Details

### State Management
- Active tickets stored in memory with channel ID mapping
- Claimed tickets tracked separately
- State restored from channel topics on bot restart

### Permission Overwrites
- Category-specific staff roles get channel permissions
- General access roles also get permissions
- Permissions updated dynamically during claim/unclaim

### Message Components
- Select menu for category selection
- Buttons for claim/unclaim actions
- Embeds for ticket information and status

## Troubleshooting

### Bot Won't Start
- Check Node.js version (needs 18+)
- Verify environment variables
- Check bot token validity

### Commands Not Working
- Ensure bot has Administrator permission
- Check if commands are deployed (`node deploy-commands.js`)
- Verify bot is in the server

### Pings Not Working
- Check role IDs exist in server
- Verify bot has "Mention Everyone" permission
- Ensure roles have `ping` permission configured

### Panel Not Updating
- Use `/setup refresh_panel` to force update
- Check if panel channel and message IDs are correct
- Verify bot has permission to edit panel message

## Development Notes

### Code Architecture
- Modular design with separate handlers and utilities
- Event-driven architecture using Discord.js events
- Configuration management with JSON persistence

### Key Classes
- **EventHandler**: Main event router and interaction handler
- **TicketManager**: Core ticket creation and management logic
- **ConfigManager**: Configuration loading, saving, and validation
- **TranscriptGenerator**: HTML transcript generation

### Important Methods
- `createTicket()`: Creates new ticket channels
- `claimTicket()`: Handles ticket claiming logic
- `closeTicket()`: Handles ticket closing and transcript generation
- `getStaffRolesForCategory()`: Returns roles to ping for category

## Recent Changes

### Latest Updates
- Fixed close command interaction timeout issues
- Added public claim/unclaim messages
- Updated transcript topic to use category name
- Removed redundant create_panel command
- Enhanced channel management for panel updates
- Fixed ping role functionality

### Known Issues
- Node.js version compatibility (requires 18+)
- Some interaction timeout edge cases
- Role ID validation not implemented

## Future Enhancements
- Role ID validation
- Ticket statistics and analytics
- Auto-close for inactive tickets
- Ticket priority levels
- Staff performance tracking
- Integration with external systems 