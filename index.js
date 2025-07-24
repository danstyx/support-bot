const { Client, GatewayIntentBits, Collection } = require('discord.js');
const EventHandler = require('./handlers/eventHandler');
const ConfigManager = require('./utils/configManager');
require('dotenv').config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize collections
client.commands = new Collection();

// Initialize managers
const configManager = new ConfigManager();

// Initialize event handler
const eventHandler = new EventHandler(client);
eventHandler.registerEvents();

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// Login to Discord
client.login(process.env.BOT_TOKEN).catch(error => {
    console.error('❌ Failed to login to Discord:', error);
    process.exit(1);
});

console.log('🚀 Starting Discord Ticket Bot...');
console.log('📋 Loaded configuration:', configManager.getConfig()); 