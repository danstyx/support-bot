const { Events, InteractionType } = require('discord.js');
const TicketManager = require('./ticketManager');
const ConfigManager = require('../utils/configManager');

class EventHandler {
    constructor(client) {
        this.client = client;
        this.ticketManager = new TicketManager(client);
        this.configManager = new ConfigManager();
    }

    async handleInteractionCreate(interaction) {
        try {
            if (interaction.type === InteractionType.ApplicationCommand) {
                await this.handleSlashCommand(interaction);
            } else if (interaction.type === InteractionType.MessageComponent) {
                // Handle both buttons and select menus
                if (interaction.isStringSelectMenu()) {
                    await this.handleSelectMenu(interaction);
                } else if (interaction.isButton()) {
                    await this.handleButtonClick(interaction);
                } else {
                    await interaction.reply({ 
                        content: '❌ Unknown component interaction.', 
                        ephemeral: true 
                    });
                }
            } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
                await this.handleAutocomplete(interaction);
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            const errorMessage = 'An error occurred while processing your request.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }

    async handleSlashCommand(interaction) {
        try {
            const commandName = interaction.commandName;
            
            // Load command dynamically
            let command;
            try {
                command = require(`../commands/${commandName}.js`);
            } catch (error) {
                console.error(`Command ${commandName} not found:`, error);
                await interaction.reply({ 
                    content: '❌ Unknown command.', 
                    ephemeral: true 
                });
                return;
            }
            
            // Pass the ticket manager to commands that need it
            if (commandName === 'close' || commandName === 'unclaim' || commandName === 'claim') {
                // Add ticket manager to the interaction object
                interaction.ticketManager = this.ticketManager;
            }
            

            
            await command.execute(interaction);
        } catch (error) {
            console.error('Error executing command:', error);
            const errorMessage = 'An error occurred while executing this command.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }

    async handleAutocomplete(interaction) {
        const commandName = interaction.commandName;
        
        try {
            const command = require(`../commands/${commandName}.js`);
            if (command.autocomplete) {
                await command.autocomplete(interaction);
            }
        } catch (error) {
            console.error(`Error handling autocomplete for ${commandName}:`, error);
        }
    }

    async handleSelectMenu(interaction) {
        if (interaction.customId === 'ticket_category_select') {
            // Check if this is from a valid ticket panel
            if (interaction.message && this.ticketManager.isTicketPanel(interaction.message)) {
                await this.handleTicketCategorySelect(interaction);
            } else {
                await interaction.reply({ 
                    content: '❌ This panel is outdated. Please ask an administrator to update the ticket panel.', 
                    ephemeral: true 
                });
            }
        }
    }

    async handleButtonClick(interaction) {
        const customId = interaction.customId;
        
        try {
            switch (customId) {
                case 'claim_ticket':
                    await this.handleClaimButton(interaction);
                    break;
                default:
                    await interaction.reply({ 
                        content: '❌ Unknown button interaction. This button may be from an outdated panel.', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('Error handling button click:', error);
            const errorMessage = 'An error occurred while processing this button.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }

    async handleTicketCategorySelect(interaction) {
        const categoryName = interaction.values[0];
        
        try {
            // Check if bot is properly configured
            const configManager = new ConfigManager();
            const channels = configManager.getChannels();
            const categories = configManager.getTicketCategories();
            
            if (categories.length === 0) {
                await interaction.reply({ 
                    content: '❌ No ticket categories are configured. Please ask an administrator to set up categories first.', 
                    ephemeral: true 
                });
                return;
            }
            
            if (!channels.ticketCategory) {
                await interaction.reply({ 
                    content: '❌ Ticket category is not configured. Please ask an administrator to set up the ticket category first.', 
                    ephemeral: true 
                });
                return;
            }
            
            // Defer the reply since ticket creation might take time
            await interaction.deferReply({ ephemeral: true });
            
            const result = await this.ticketManager.createTicket(interaction, categoryName);
            
            if (result.success) {
                await interaction.editReply({ 
                    content: `✅ ${result.message}` 
                });
                
                // Update the panel to make the select menu available again
                try {
                    await this.ticketManager.updateTicketPanel();
                } catch (panelError) {
                    console.error('Error updating panel after ticket creation:', panelError);
                    // Don't fail the ticket creation if panel update fails
                }
            } else {
                await interaction.editReply({ 
                    content: `❌ ${result.message}` 
                });
            }
        } catch (error) {
            console.error('Error handling ticket category select:', error);
            const errorMessage = 'An error occurred while creating your ticket. Please try again or contact an administrator.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }

    async handleClaimButton(interaction) {
        try {
            // Check if this is a ticket channel
            if (!this.ticketManager.getActiveTickets().has(interaction.channel.id)) {
                await interaction.reply({ 
                    content: '❌ This is not a valid ticket channel.', 
                    ephemeral: true 
                });
                return;
            }
            
            // Defer the reply since unclaim operations might take time
            await interaction.deferReply({ ephemeral: true });
            
            // Check if ticket is already claimed by this user
            const claimedTickets = this.ticketManager.getClaimedTickets();
            const isClaimedByUser = claimedTickets.has(interaction.channel.id) && 
                                   claimedTickets.get(interaction.channel.id) === interaction.user.id;
            
            let result;
            if (isClaimedByUser) {
                // Unclaim the ticket
                result = await this.ticketManager.unclaimTicket(interaction);
            } else {
                // Claim the ticket
                result = await this.ticketManager.claimTicket(interaction);
            }
            
            if (!result.success) {
                await interaction.editReply({ 
                    content: `❌ ${result.message}` 
                });
            } else {
                // If successful, the reply is already sent in the claimTicket/unclaimTicket method
                // But we need to handle it since we deferred
                await interaction.editReply({ 
                    content: `✅ ${result.message}` 
                });
            }
        } catch (error) {
            console.error('Error handling claim button:', error);
            const errorMessage = 'An error occurred while processing the claim/unclaim action.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }

    async handleCloseButton(interaction) {
        try {
            // Check if this is a ticket channel
            if (!this.ticketManager.getActiveTickets().has(interaction.channel.id)) {
                await interaction.reply({ 
                    content: '❌ This is not a valid ticket channel.', 
                    ephemeral: true 
                });
                return;
            }
            
            // Defer the reply since closing might take time (transcript generation, etc.)
            await interaction.deferReply({ ephemeral: true });
            
            // For button clicks, we'll use a default reason
            const result = await this.ticketManager.closeTicket(interaction, 'Closed via button');
            
            if (result.success) {
                await interaction.editReply({ 
                    content: `✅ ${result.message}` 
                });
            } else {
                await interaction.editReply({ 
                    content: `❌ ${result.message}` 
                });
            }
        } catch (error) {
            console.error('Error handling close button:', error);
            const errorMessage = 'An error occurred while closing the ticket.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }

    async handleReady() {
        console.log(`✅ ${this.client.user.tag} is online and ready!`);
        console.log(`📊 Serving ${this.client.guilds.cache.size} guilds`);
        console.log(`👥 Serving ${this.client.users.cache.size} users`);
        
        // Restore bot state from existing channels
        await this.ticketManager.restoreState();
        
        // Set bot status
        this.client.user.setActivity('tickets | /setup help', { type: 'WATCHING' });
    }

    async handleGuildCreate(guild) {
        console.log(`🎉 Joined new guild: ${guild.name} (${guild.id})`);
    }

    async handleGuildDelete(guild) {
        console.log(`👋 Left guild: ${guild.name} (${guild.id})`);
    }

    async handleError(error) {
        console.error('Discord.js error:', error);
    }

    async handleWarn(warning) {
        console.warn('Discord.js warning:', warning);
    }

    // Register all event handlers
    registerEvents() {
        this.client.on(Events.InteractionCreate, (interaction) => this.handleInteractionCreate(interaction));
        this.client.on(Events.ClientReady, () => this.handleReady());
        this.client.on(Events.GuildCreate, (guild) => this.handleGuildCreate(guild));
        this.client.on(Events.GuildDelete, (guild) => this.handleGuildDelete(guild));
        this.client.on(Events.Error, (error) => this.handleError(error));
        this.client.on(Events.Warn, (warning) => this.handleWarn(warning));
    }
}

module.exports = EventHandler; 