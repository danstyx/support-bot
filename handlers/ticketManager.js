const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const ConfigManager = require('../utils/configManager');
const TranscriptGenerator = require('../utils/transcriptGenerator');

class TicketManager {
    constructor(client) {
        this.client = client;
        this.configManager = new ConfigManager();
        this.transcriptGenerator = new TranscriptGenerator();
        this.activeTickets = new Map(); // channelId -> ticketInfo
        this.claimedTickets = new Map(); // channelId -> claimedBy
    }

    // Restore bot state on startup
    async restoreState() {
        try {
            console.log('🔄 Restoring bot state...');
            
            // Restore active tickets from existing channels
            const channels = this.configManager.getChannels();
            if (channels.ticketCategory) {
                const ticketCategory = this.client.channels.cache.get(channels.ticketCategory);
                if (ticketCategory) {
                    const ticketChannels = ticketCategory.children.cache.filter(
                        channel => channel.name.startsWith(this.configManager.getSettings().ticketPrefix)
                    );
                    
                    console.log(`🔍 Found ${ticketChannels.size} potential ticket channels`);
                    
                    for (const [channelId, channel] of ticketChannels) {
                        const topic = channel.topic;
                        if (topic) {
                            // Extract ticket info from channel topic
                            // Format: "Ticket created by User#1234 (123456789) - Category: CategoryName"
                            const createdByMatch = topic.match(/created by (.+?) \((\d+)\)/);
                            const categoryMatch = topic.match(/Category: (.+?)$/);
                            
                            if (createdByMatch && categoryMatch) {
                                const createdByTag = createdByMatch[1];
                                const createdById = createdByMatch[2];
                                const categoryName = categoryMatch[1].trim();
                                
                                this.activeTickets.set(channelId, {
                                    channelId: channelId,
                                    channelName: channel.name,
                                    category: categoryName,
                                    createdBy: createdById,
                                    createdByTag: createdByTag,
                                    createdAt: new Date().toISOString(), // We don't have the exact time, so use current
                                    topic: categoryName
                                });
                                
                                console.log(`✅ Restored ticket: ${channel.name} (${categoryName})`);
                            }
                        }
                    }
                } else {
                    console.log('❌ Ticket category not found in cache');
                }
            } else {
                console.log('❌ No ticket category configured');
            }
            
            console.log(`✅ Restored ${this.activeTickets.size} active tickets`);
        } catch (error) {
            console.error('Error restoring bot state:', error);
        }
    }

    // Check if a message is a valid ticket panel
    isTicketPanel(message) {
        try {
            console.log('🔍 Checking if message is ticket panel:', message.id);
            
            // Check if this is the stored panel message
            const channels = this.configManager.getChannels();
            console.log('📋 Stored panel message ID:', channels.ticketPanelMessage);
            
            if (channels.ticketPanelMessage && channels.ticketPanelMessage === message.id) {
                return true;
            }
            
            // Check if message has the expected structure
            if (message.embeds.length > 0) {
                const embed = message.embeds[0];
                
                if (embed.title === '🎫 Support Tickets' && 
                    embed.description && 
                    embed.description.includes('Select a category below to create a support ticket')) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error checking if message is ticket panel:', error);
            return false;
        }
    }

    async createTicketPanel(channel) {
        const categories = this.configManager.getTicketCategories();
        
        if (categories.length === 0) {
            return { success: false, message: 'No ticket categories configured. Please set up categories first.' };
        }

        const embed = new EmbedBuilder()
            .setTitle('🎫 Support Tickets')
            .setDescription('Select a category below to create a support ticket. Our staff will assist you as soon as possible.')
            .setColor('#7289da')
            .setFooter({ text: this.client.user.username, iconURL: this.client.user.displayAvatarURL() });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_category_select')
            .setPlaceholder('Choose a ticket category...')
            .addOptions(
                categories.map(category => ({
                    label: category.name,
                    description: category.description,
                    value: category.name,
                    emoji: category.emoji || '🎫'
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        try {
            const message = await channel.send({ embeds: [embed], components: [row] });
            
            // Store the panel message ID and channel ID for future updates
            const channels = this.configManager.getChannels();
            channels.ticketPanelMessage = message.id;
            channels.ticketPanelChannel = channel.id;
            this.configManager.updateChannels(channels);
            
            console.log('📋 Panel created - Message ID:', message.id, 'Channel ID:', channel.id);
            
            return { success: true, message: 'Ticket panel created successfully!' };
        } catch (error) {
            console.error('Error creating ticket panel:', error);
            return { success: false, message: 'Failed to create ticket panel.' };
        }
    }

    async createTicket(interaction, categoryName) {
        try {
            const user = interaction.user;
            const guild = interaction.guild;
            
            // Check if user already has max tickets
            const userTickets = guild.channels.cache.filter(
                channel => channel.name.startsWith(this.configManager.getSettings().ticketPrefix) &&
                          channel.topic?.includes(user.id)
            );

            const maxTickets = this.configManager.getSettings().maxTicketsPerUser;
            if (userTickets.size >= maxTickets) {
                return { 
                    success: false, 
                    message: `You already have ${userTickets.size} open tickets. Please close some before creating a new one.` 
                };
            }

            // Get category info
            const categories = this.configManager.getTicketCategories();
            const category = categories.find(cat => cat.name === categoryName);
            
            if (!category) {
                return { success: false, message: 'Invalid ticket category.' };
            }

            // Get ticket category channel
            const ticketCategoryId = this.configManager.getChannels().ticketCategory;
            if (!ticketCategoryId) {
                return { success: false, message: 'Ticket category not configured. Please ask an administrator to set up the ticket category first.' };
            }

            const ticketCategory = guild.channels.cache.get(ticketCategoryId);
            if (!ticketCategory) {
                return { success: false, message: 'Configured ticket category not found. Please ask an administrator to check the configuration.' };
            }

        // Create ticket channel
        const channelName = `${this.configManager.getSettings().ticketPrefix}${user.username}`;
        
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: ticketCategory,
            topic: `Ticket created by ${user.tag} (${user.id}) - Category: ${categoryName}`,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ]
        });

        // Add permissions for category-specific staff roles
        const categoryForRoles = this.configManager.getTicketCategories().find(cat => cat.name === categoryName);
        if (categoryForRoles && categoryForRoles.staffRoles) {
            // Initialize staffRoles if it doesn't exist (migration from old format)
            if (Array.isArray(categoryForRoles.staffRoles)) {
                categoryForRoles.staffRoles = {
                    access: categoryForRoles.staffRoles,
                    claim: [],
                    close: [],
                    persistent: []
                };
            }
            
            // Add permissions for all staff role types
            const allStaffRoles = [];
            if (categoryForRoles.staffRoles.access) allStaffRoles.push(...categoryForRoles.staffRoles.access);
            if (categoryForRoles.staffRoles.claim) allStaffRoles.push(...categoryForRoles.staffRoles.claim);
            if (categoryForRoles.staffRoles.close) allStaffRoles.push(...categoryForRoles.staffRoles.close);
            if (categoryForRoles.staffRoles.persistent) allStaffRoles.push(...categoryForRoles.staffRoles.persistent);
            
            // Remove duplicates
            const uniqueStaffRoles = [...new Set(allStaffRoles)];
            
            for (const roleId of uniqueStaffRoles) {
                await ticketChannel.permissionOverwrites.create(roleId, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
            }
        }

        // Add permissions for general ticket access roles
        const ticketAccessRoles = this.configManager.getPermissions().ticketAccessRoles || [];
        for (const roleId of ticketAccessRoles) {
            await ticketChannel.permissionOverwrites.create(roleId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
        }

            // Create ticket info
            const ticketInfo = {
                channelId: ticketChannel.id,
                channelName: channelName,
                category: categoryName,
                createdBy: user.id,
                createdByTag: user.tag,
                createdAt: new Date().toISOString(),
                topic: categoryName
            };

            this.activeTickets.set(ticketChannel.id, ticketInfo);

            // Create ticket embed
            const ticketEmbed = new EmbedBuilder()
                .setTitle(`🎫 Ticket: ${categoryName}`)
                .setDescription(`**Category:** ${categoryName}\n**Description:** ${category.description}\n**Created by:** ${user.tag}`)
                .setColor(category.color || '#7289da')
                .setFooter({ text: `Ticket ID: ${ticketChannel.id}` })
                .setTimestamp();

            // Create action buttons
            const claimButton = new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👤');

            const row = new ActionRowBuilder().addComponents(claimButton);

            // Send initial message with automatic staff role pinging
            const staffRoles = this.configManager.getStaffRolesForCategory(categoryName);
            const pingString = staffRoles.length > 0 ? staffRoles.map(roleId => `<@&${roleId}>`).join(' ') : '';
            
            await ticketChannel.send({
                content: `${pingString}\nWelcome ${user}! A staff member will be with you shortly.`,
                embeds: [ticketEmbed],
                components: [row]
            });

            return { 
                success: true, 
                message: `Ticket created successfully! Check ${ticketChannel}`,
                channel: ticketChannel
            };

        } catch (error) {
            console.error('Error creating ticket:', error);
            return { success: false, message: 'Failed to create ticket. Please try again.' };
        }
    }

    async claimTicket(interaction) {
        try {
            const channel = interaction.channel;
            const user = interaction.user;
            
            // Check if this is a ticket channel
            if (!this.activeTickets.has(channel.id)) {
                return { success: false, message: 'This is not a valid ticket channel.' };
            }

            // Check if user can claim tickets (check category-specific permissions)
            const member = interaction.member;
            const ticketInfo = this.activeTickets.get(channel.id);
            const categoryName = ticketInfo ? ticketInfo.category : null;
            
            if (!this.configManager.canClaimTickets(member, categoryName)) {
                return { success: false, message: 'You do not have permission to claim tickets.' };
            }

            // Check if ticket is already claimed
            if (this.claimedTickets.has(channel.id)) {
                const claimedBy = this.claimedTickets.get(channel.id);
                if (claimedBy === user.id) {
                    return { success: false, message: 'You have already claimed this ticket.' };
                } else {
                    const claimedUser = await this.client.users.fetch(claimedBy);
                    return { success: false, message: `This ticket is already claimed by ${claimedUser.tag}.` };
                }
            }

            // Claim the ticket
            this.claimedTickets.set(channel.id, user.id);

            // Update permissions to restrict other staff (category-specific and general)
            const category = this.configManager.getTicketCategories().find(cat => cat.name === categoryName);
            
            // Restrict category-specific staff roles (except persistent ones)
            if (category && category.staffRoles) {
                // Initialize staffRoles if it doesn't exist (migration from old format)
                if (Array.isArray(category.staffRoles)) {
                    category.staffRoles = {
                        access: category.staffRoles,
                        claim: [],
                        close: [],
                        persistent: []
                    };
                }
                
                // Get all roles that should be restricted
                const rolesToRestrict = [];
                if (category.staffRoles.access) rolesToRestrict.push(...category.staffRoles.access);
                if (category.staffRoles.claim) rolesToRestrict.push(...category.staffRoles.claim);
                if (category.staffRoles.close) rolesToRestrict.push(...category.staffRoles.close);
                
                // Remove persistent roles from restriction list
                const persistentRoles = category.staffRoles.persistent || [];
                const filteredRoles = rolesToRestrict.filter(roleId => !persistentRoles.includes(roleId));
                
                // Remove duplicates
                const uniqueRolesToRestrict = [...new Set(filteredRoles)];
                
                for (const roleId of uniqueRolesToRestrict) {
                    const role = channel.guild.roles.cache.get(roleId);
                    if (role) {
                        await channel.permissionOverwrites.edit(role, {
                            SendMessages: false
                        });
                    }
                }
            }
            
            // Restrict general claim roles (legacy support)
            const claimRoles = this.configManager.getPermissions().claimRoles || [];
            for (const roleId of claimRoles) {
                const role = channel.guild.roles.cache.get(roleId);
                if (role) {
                    await channel.permissionOverwrites.edit(role, {
                        SendMessages: false
                    });
                }
            }

            // Allow the claimant to send messages
            await channel.permissionOverwrites.edit(user.id, {
                SendMessages: true
            });

            // Update the button to show "Unclaim Ticket"
            const unclaimButton = new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Unclaim Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('👤');

            const row = new ActionRowBuilder().addComponents(unclaimButton);

            // Find and update the original ticket message
            const messages = await channel.messages.fetch({ limit: 10 });
            const ticketMessage = messages.find(msg => 
                msg.embeds.length > 0 && 
                msg.embeds[0].title && 
                msg.embeds[0].title.includes('Ticket:')
            );

            if (ticketMessage) {
                await ticketMessage.edit({ components: [row] });
            }

            // Create and send public claim message
            const claimEmbed = new EmbedBuilder()
                .setTitle('✅ Ticket Claimed')
                .setDescription(`This ticket has been claimed by ${user.tag}`)
                .setColor('#00ff00')
                .setTimestamp();

            await channel.send({ embeds: [claimEmbed] });

            return { success: true, message: 'Ticket claimed successfully!' };
        } catch (error) {
            console.error('Error claiming ticket:', error);
            return { success: false, message: 'Failed to claim ticket. Please try again.' };
        }
    }

    async closeTicket(interaction, reason = 'No reason provided') {
        try {
            const channel = interaction.channel;
            const user = interaction.user;
            
            // Check if this is a ticket channel
            if (!this.activeTickets.has(channel.id)) {
                return { success: false, message: 'This is not a valid ticket channel.' };
            }

            // Check if user can close tickets (check category-specific permissions)
            const member = interaction.member;
            const closeTicketInfo = this.activeTickets.get(channel.id);
            const closeCategoryName = closeTicketInfo ? closeTicketInfo.category : null;
            
            if (!this.configManager.canCloseTickets(member, closeCategoryName)) {
                return { success: false, message: 'You do not have permission to close tickets.' };
            }

            const ticketInfo = this.activeTickets.get(channel.id);
            ticketInfo.closedBy = user.id;
            ticketInfo.closedByTag = user.tag;
            ticketInfo.closedAt = new Date().toISOString();
            ticketInfo.closeReason = reason;

            // Generate transcript
            const messages = await channel.messages.fetch();
            const transcriptInfo = await this.transcriptGenerator.saveTranscript(
                Array.from(messages.values()).reverse(), // Reverse to get chronological order
                ticketInfo
            );

            // Send transcript to transcript channel
            const transcriptChannelId = this.configManager.getChannels().transcriptChannel;
            if (transcriptChannelId) {
                const transcriptChannel = channel.guild.channels.cache.get(transcriptChannelId);
                if (transcriptChannel) {
                    const transcriptEmbed = new EmbedBuilder()
                        .setTitle('📄 Ticket Transcript')
                        .setDescription(`**Channel:** ${ticketInfo.channelName}\n**Topic:** ${ticketInfo.topic}\n**Created by:** ${ticketInfo.createdByTag}\n**Closed by:** ${ticketInfo.closedByTag}\n**Reason:** ${reason}`)
                        .setColor('#ff0000')
                        .setTimestamp();

                    await transcriptChannel.send({
                        embeds: [transcriptEmbed],
                        files: [transcriptInfo.filepath]
                    });
                }
            }

            // Clean up data structures
            this.activeTickets.delete(channel.id);
            this.claimedTickets.delete(channel.id);

            return { success: true, message: 'Ticket closed successfully!', channel: channel };

        } catch (error) {
            console.error('Error in closeTicket method:', error);
            return { success: false, message: 'An error occurred while processing the close request.' };
        }
    }

    async unclaimTicket(interaction) {
        try {
            const channel = interaction.channel;
            const user = interaction.user;
            
            // Check if this is a ticket channel
            if (!this.activeTickets.has(channel.id)) {
                return { success: false, message: 'This is not a valid ticket channel.' };
            }

            // Check if ticket is claimed by this user
            if (!this.claimedTickets.has(channel.id) || this.claimedTickets.get(channel.id) !== user.id) {
                return { success: false, message: 'You have not claimed this ticket.' };
            }

            // Unclaim the ticket
            this.claimedTickets.delete(channel.id);

            // Restore permissions for category-specific staff roles
            const unclaimTicketInfo = this.activeTickets.get(channel.id);
            const unclaimCategoryName = unclaimTicketInfo ? unclaimTicketInfo.category : null;
            const unclaimCategory = this.configManager.getTicketCategories().find(cat => cat.name === unclaimCategoryName);
            
            if (unclaimCategory && unclaimCategory.staffRoles) {
                for (const roleId of unclaimCategory.staffRoles.access || []) {
                    const role = channel.guild.roles.cache.get(roleId);
                    if (role) {
                        await channel.permissionOverwrites.edit(role, {
                            SendMessages: true
                        });
                    }
                }
                for (const roleId of unclaimCategory.staffRoles.claim || []) {
                    const role = channel.guild.roles.cache.get(roleId);
                    if (role) {
                        await channel.permissionOverwrites.edit(role, {
                            SendMessages: true
                        });
                    }
                }
                for (const roleId of unclaimCategory.staffRoles.close || []) {
                    const role = channel.guild.roles.cache.get(roleId);
                    if (role) {
                        await channel.permissionOverwrites.edit(role, {
                            SendMessages: true
                        });
                    }
                }
            }
            
            // Restore permissions for general claim roles (legacy support)
            const claimRoles = this.configManager.getPermissions().claimRoles || [];
            for (const roleId of claimRoles) {
                const role = channel.guild.roles.cache.get(roleId);
                if (role) {
                    await channel.permissionOverwrites.edit(role, {
                        SendMessages: true
                    });
                }
            }

            // Update the button to show "Claim Ticket" again
            const claimButton = new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👤');

            const row = new ActionRowBuilder().addComponents(claimButton);

            // Find and update the original ticket message
            const messages = await channel.messages.fetch({ limit: 10 });
            const ticketMessage = messages.find(msg => 
                msg.embeds.length > 0 && 
                msg.embeds[0].title && 
                msg.embeds[0].title.includes('Ticket:')
            );

            if (ticketMessage) {
                await ticketMessage.edit({ components: [row] });
            }

            // Create and send public unclaim message
            const unclaimEmbed = new EmbedBuilder()
                .setTitle('❌ Ticket Unclaimed')
                .setDescription(`This ticket has been unclaimed by ${user.tag}`)
                .setColor('#ff9900')
                .setTimestamp();

            await channel.send({ embeds: [unclaimEmbed] });

            return { success: true, message: 'Ticket unclaimed successfully!' };
        } catch (error) {
            console.error('Error unclaiming ticket:', error);
            return { success: false, message: 'Failed to unclaim ticket. Please try again.' };
        }
    }

    getActiveTickets() {
        return this.activeTickets;
    }

    getClaimedTickets() {
        return this.claimedTickets;
    }

    async updateTicketPanel() {
        const channels = this.configManager.getChannels();
        console.log('🔍 Checking panel update - channels config:', channels);
        
        if (!channels.ticketPanelMessage || !channels.ticketPanelChannel) {
            return { success: false, message: 'No panel message found to update.' };
        }

        try {
            const channel = this.client.channels.cache.get(channels.ticketPanelChannel);
            if (!channel) {
                return { success: false, message: 'Panel channel not found.' };
            }

            const message = await channel.messages.fetch(channels.ticketPanelMessage);
            if (!message) {
                return { success: false, message: 'Panel message not found.' };
            }

            const categories = this.configManager.getTicketCategories();
            
            if (categories.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('🎫 Support Tickets')
                    .setDescription('No ticket categories configured. Please set up categories first.')
                    .setColor('#ff0000')
                    .setFooter({ text: this.client.user.username, iconURL: this.client.user.displayAvatarURL() });

                await message.edit({ embeds: [embed], components: [] });
                return { success: true, message: 'Panel updated - no categories available.' };
            }


            const embed = new EmbedBuilder()
                .setTitle('🎫 Support Tickets')
                .setDescription('Select a category below to create a support ticket. Our staff will assist you as soon as possible.')
                .setColor('#7289da')
                .setFooter({ text: this.client.user.username, iconURL: this.client.user.displayAvatarURL() });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_category_select')
                .setPlaceholder('Choose a ticket category...')
                .addOptions(
                    categories.map(category => ({
                        label: category.name,
                        description: category.description,
                        value: category.name,
                        emoji: category.emoji || '🎫'
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await message.edit({ embeds: [embed], components: [row] });
            return { success: true, message: 'Panel updated successfully!' };

        } catch (error) {
            console.error('❌ Error updating ticket panel:', error);
            return { success: false, message: 'Failed to update ticket panel.' };
        }
    }

    // Refresh panel - creates a new panel message and updates the stored ID
    async refreshPanel() {
        const channels = this.configManager.getChannels();
        if (!channels.ticketPanelChannel) {
            return { success: false, message: 'Panel channel not configured.' };
        }

        try {
            const channel = this.client.channels.cache.get(channels.ticketPanelChannel);
            if (!channel) {
                return { success: false, message: 'Panel channel not found.' };
            }

            // Delete old panel message if it exists
            if (channels.ticketPanelMessage) {
                try {
                    const oldMessage = await channel.messages.fetch(channels.ticketPanelMessage);
                    await oldMessage.delete();
                } catch (error) {
                    // Old message might not exist, that's okay
                    console.log('Old panel message not found, creating new one...');
                }
            }

            // Create new panel
            const result = await this.createTicketPanel(channel);
            return result;

        } catch (error) {
            console.error('Error refreshing ticket panel:', error);
            return { success: false, message: 'Failed to refresh ticket panel.' };
        }
    }
}

module.exports = TicketManager; 