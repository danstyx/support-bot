const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ConfigManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup the ticket bot (Administrators only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('Show setup help and available commands'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('category')
                .setDescription('Manage ticket categories')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'add', value: 'add' },
                            { name: 'remove', value: 'remove' },
                            { name: 'list', value: 'list' },
                            { name: 'edit', value: 'edit' },
                            { name: 'info', value: 'info' }
                        ))
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Category name')
                        .setRequired(false)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Category description')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Category color (hex)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Category emoji (e.g., 🎫, 🔧, 💰)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('new_name')
                        .setDescription('New name for the category (when editing)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channels')
                .setDescription('Configure channels')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of channel to configure')
                        .setRequired(true)
                        .addChoices(
                            { name: 'ticket_category', value: 'ticket_category' },
                            { name: 'transcript', value: 'transcript' },
                            { name: 'panel', value: 'panel' }
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to set')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('staff_roles')
                .setDescription('Configure staff roles for ticket categories')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Category name')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to add/remove')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'add', value: 'add' },
                            { name: 'remove', value: 'remove' }
                        ))
                .addStringOption(option =>
                    option.setName('permission')
                        .setDescription('Permission type for this role')
                        .setRequired(false)
                        .addChoices(
                            { name: 'access', value: 'access' },
                            { name: 'claim', value: 'claim' },
                            { name: 'close', value: 'close' },
                            { name: 'persistent', value: 'persistent' },
                            { name: 'ping', value: 'ping' },
                            { name: 'all', value: 'all' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Configure bot settings')
                .addStringOption(option =>
                    option.setName('setting')
                        .setDescription('Setting to configure')
                        .setRequired(true)
                        .addChoices(
                            { name: 'ticket_prefix', value: 'ticket_prefix' },
                            { name: 'max_tickets_per_user', value: 'max_tickets_per_user' }
                        ))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('New value')
                        .setRequired(true)))

        .addSubcommand(subcommand =>
            subcommand
                .setName('refresh_panel')
                .setDescription('Refresh the existing ticket panel with current categories')),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const subcommand = interaction.options.getSubcommand();
        const configManager = new ConfigManager();
        
        if (subcommand === 'category' || subcommand === 'staff_roles') {
            const categories = configManager.getTicketCategories();
            const filtered = categories
                .filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()))
                .map(choice => ({ name: choice.name, value: choice.name }))
                .slice(0, 25);
            
            await interaction.respond(filtered);
        }
    },

    async execute(interaction) {
        try {
            const configManager = new ConfigManager();
            const subcommand = interaction.options.getSubcommand();

            // Check if user has Administrator permission (for all commands except help)
            if (subcommand !== 'help' && !configManager.isAdmin(interaction.user.id, interaction.member)) {
                return interaction.reply({ 
                    content: '❌ You need Administrator permission to use setup commands.', 
                    ephemeral: true 
                });
            }

            switch (subcommand) {
                case 'help':
                    await this.showHelp(interaction);
                    break;
                case 'category':
                    await this.manageCategories(interaction, configManager);
                    break;
                case 'channels':
                    await this.manageChannels(interaction, configManager);
                    break;
                case 'staff_roles':
                    await this.manageStaffRoles(interaction, configManager);
                    break;
                case 'settings':
                    await this.manageSettings(interaction, configManager);
                    break;

                case 'refresh_panel':
                    await this.refreshPanel(interaction, configManager);
                    break;
                default:
                    await interaction.reply({ 
                        content: '❌ Unknown subcommand. Use `/setup help` for available commands.', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('Error executing setup command:', error);
            const errorMessage = 'An error occurred while executing this setup command. Please try again.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },

    async showHelp(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Bot Setup Guide')
            .setDescription('Here are all the available setup commands:')
            .setColor('#7289da')
            .addFields(
                { name: '📋 Setup Commands', value: 
                    '`/setup help` - Show this help\n' +
                    '`/setup category <action> [options]` - Manage ticket categories\n' +
                    '`/setup channels <type> <channel>` - Configure channels\n' +
                    '`/setup staff_roles <category> <role> <action> [permission]` - Configure staff roles\n' +
                    '`/setup settings <setting> <value>` - Configure bot settings\n' +
                    '`/setup refresh_panel` - Refresh existing panel'
                },
                { name: '🔧 Quick Setup Steps', value: 
                    '1. Set ticket category: `/setup channels ticket_category #category`\n' +
                    '2. Set transcript channel: `/setup channels transcript #channel`\n' +
                    '3. Add staff roles: `/setup staff_roles "General Support" @Support add access`\n' +
                    '4. Create ticket panel: `/setup channels panel #channel`'
                },
                { name: '📝 Category Actions', value: 
                    '`add` - Add new category (with optional emoji)\n' +
                    '`remove` - Remove category\n' +
                    '`list` - List all categories\n' +
                    '`edit` - Edit existing category (name, description, color, emoji)\n' +
                    '`info` - Show detailed category information and staff roles'
                },
                { name: '🎭 Permission Types', value: 
                    '`access` - Can view and respond to tickets\n' +
                    '`claim` - Can claim tickets\n' +
                    '`close` - Can close tickets\n' +
                    '`persistent` - Keeps access even when ticket is claimed\n' +
                    '`ping` - Gets pinged when tickets are created\n' +
                    '`all` - Adds role to all permission types at once'
                }
            )
            .setFooter({ text: 'Discord Ticket Bot Setup' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async manageCategories(interaction, configManager) {
        const action = interaction.options.getString('action');
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const color = interaction.options.getString('color');
        const emoji = interaction.options.getString('emoji');
        const newName = interaction.options.getString('new_name');

        switch (action) {
            case 'add':
                if (!name || !description) {
                    return interaction.reply({ 
                        content: '❌ Name and description are required for adding a category.', 
                        ephemeral: true 
                    });
                }
                
                const newCategory = {
                    name: name,
                    description: description,
                    color: color || '#7289da',
                    emoji: emoji || '🎫', // Default emoji if not provided
                    staffRoles: {
                        access: [],
                        claim: [],
                        close: [],
                        persistent: []
                    }
                };
                
                configManager.addTicketCategory(newCategory);
                
                // Update the ticket panel if it exists
                const TicketManager = require('../handlers/ticketManager');
                const ticketManager = new TicketManager(interaction.client);
                await ticketManager.updateTicketPanel();
                
                await interaction.reply({ 
                    content: `✅ Category "${name}" added successfully! Panel updated.`, 
                    ephemeral: true 
                });
                break;

            case 'remove':
                if (!name) {
                    return interaction.reply({ 
                        content: '❌ Category name is required for removal.', 
                        ephemeral: true 
                    });
                }
                
                const removed = configManager.removeTicketCategory(name);
                if (removed) {
                    // Update the ticket panel if it exists
                    const TicketManager = require('../handlers/ticketManager');
                    const ticketManager = new TicketManager(interaction.client);
                    
                    const updateResult = await ticketManager.updateTicketPanel();
                    
                    if (updateResult.success) {
                        await interaction.reply({ 
                            content: `✅ Category "${name}" removed successfully! Panel updated.`, 
                            ephemeral: true 
                        });
                    } else {
                        await interaction.reply({ 
                            content: `✅ Category "${name}" removed successfully! Panel update failed: ${updateResult.message}`, 
                            ephemeral: true 
                        });
                    }
                } else {
                    await interaction.reply({ 
                        content: `❌ Category "${name}" not found.`, 
                        ephemeral: true 
                    });
                }
                break;

            case 'list':
                const categories = configManager.getTicketCategories();
                if (categories.length === 0) {
                    await interaction.reply({ 
                        content: '📋 No categories configured.', 
                        ephemeral: true 
                    });
                } else {
                    const categoryList = categories.map(cat => {
                        // Initialize staffRoles if it doesn't exist (migration from old format)
                        if (!cat.staffRoles || Array.isArray(cat.staffRoles)) {
                            cat.staffRoles = {
                                access: [],
                                claim: [],
                                close: [],
                                persistent: []
                            };
                        }
                        
                        // Build detailed role breakdown
                        const roleBreakdown = [];
                        if (cat.staffRoles.access && cat.staffRoles.access.length > 0) {
                            const accessRoles = cat.staffRoles.access.map(roleId => {
                                const guildRole = interaction.guild.roles.cache.get(roleId);
                                return guildRole ? `<@&${roleId}>` : `Unknown Role (${roleId})`;
                            }).join(', ');
                            roleBreakdown.push(`**Access:** ${accessRoles}`);
                        }
                        if (cat.staffRoles.claim && cat.staffRoles.claim.length > 0) {
                            const claimRoles = cat.staffRoles.claim.map(roleId => {
                                const guildRole = interaction.guild.roles.cache.get(roleId);
                                return guildRole ? `<@&${roleId}>` : `Unknown Role (${roleId})`;
                            }).join(', ');
                            roleBreakdown.push(`**Claim:** ${claimRoles}`);
                        }
                        if (cat.staffRoles.close && cat.staffRoles.close.length > 0) {
                            const closeRoles = cat.staffRoles.close.map(roleId => {
                                const guildRole = interaction.guild.roles.cache.get(roleId);
                                return guildRole ? `<@&${roleId}>` : `Unknown Role (${roleId})`;
                            }).join(', ');
                            roleBreakdown.push(`**Close:** ${closeRoles}`);
                        }
                        if (cat.staffRoles.persistent && cat.staffRoles.persistent.length > 0) {
                            const persistentRoles = cat.staffRoles.persistent.map(roleId => {
                                const guildRole = interaction.guild.roles.cache.get(roleId);
                                return guildRole ? `<@&${roleId}>` : `Unknown Role (${roleId})`;
                            }).join(', ');
                            roleBreakdown.push(`**Persistent:** ${persistentRoles}`);
                        }
                        if (cat.staffRoles.ping && cat.staffRoles.ping.length > 0) {
                            const pingRoles = cat.staffRoles.ping.map(roleId => {
                                const guildRole = interaction.guild.roles.cache.get(roleId);
                                return guildRole ? `<@&${roleId}>` : `Unknown Role (${roleId})`;
                            }).join(', ');
                            roleBreakdown.push(`**Ping:** ${pingRoles}`);
                        }
                        
                        const rolesText = roleBreakdown.length > 0 ? roleBreakdown.join('\n') : 'No roles configured';
                        
                        return `${cat.emoji || '🎫'} **${cat.name}**\n└ ${cat.description}\n└ Color: ${cat.color}\n└ Emoji: ${cat.emoji || '🎫'}\n└ Staff Roles:\n${rolesText}`;
                    }).join('\n\n');
                    
                    const embed = new EmbedBuilder()
                        .setTitle('📋 Ticket Categories')
                        .setDescription(categoryList)
                        .setColor('#7289da')
                        .setFooter({ text: 'Persistent roles keep access when tickets are claimed' });
                    
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
                break;

            case 'edit':
                if (!name) {
                    return interaction.reply({ 
                        content: '❌ Category name is required for editing.', 
                        ephemeral: true 
                    });
                }
                
                const updateData = {};
                if (description) updateData.description = description;
                if (color) updateData.color = color;
                if (emoji) updateData.emoji = emoji;
                if (newName) updateData.name = newName;
                
                const updated = configManager.updateTicketCategory(name, updateData);
                if (updated) {
                    // Update the ticket panel if it exists
                    const TicketManager = require('../handlers/ticketManager');
                    const ticketManager = new TicketManager(interaction.client);
                    await ticketManager.updateTicketPanel();
                    
                    await interaction.reply({ 
                        content: `✅ Category "${name}" updated successfully! Panel updated.`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: `❌ Category "${name}" not found.`, 
                        ephemeral: true 
                    });
                }
                break;
            case 'info':
                const infoCategory = configManager.getTicketCategory(name);
                if (infoCategory) {
                    // Initialize staffRoles if it doesn't exist (migration from old format)
                    if (!infoCategory.staffRoles || Array.isArray(infoCategory.staffRoles)) {
                        infoCategory.staffRoles = {
                            access: [],
                            claim: [],
                            close: [],
                            persistent: [],
                            ping: []
                        };
                    }
                    
                    const staffRolesText = Object.entries(infoCategory.staffRoles)
                        .map(([type, roles]) => {
                            if (!roles || roles.length === 0) {
                                return `**${type.charAt(0).toUpperCase() + type.slice(1)}:** None`;
                            }
                            const roleMentions = roles.map(roleId => {
                                const guildRole = interaction.guild.roles.cache.get(roleId);
                                return guildRole ? `<@&${roleId}>` : `Unknown Role (${roleId})`;
                            }).join(', ');
                            return `**${type.charAt(0).toUpperCase() + type.slice(1)}:** ${roleMentions}`;
                        })
                        .join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setTitle(`📋 Category: ${infoCategory.name}`)
                        .setDescription(`**Description:** ${infoCategory.description}\n**Color:** ${infoCategory.color}\n**Emoji:** ${infoCategory.emoji || '🎫'}\n\n**Staff Roles:**\n${staffRolesText}`)
                        .setColor(infoCategory.color || '#7289da')
                        .setFooter({ text: 'Roles with persistent access keep permissions when tickets are claimed' });
                    
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                } else {
                    await interaction.reply({ 
                        content: `❌ Category "${name}" not found.`, 
                        ephemeral: true 
                    });
                }
                break;
        }
    },

    async manageRoles(interaction, configManager) {
        const type = interaction.options.getString('type');
        const role = interaction.options.getRole('role');
        const action = interaction.options.getString('action');
        const permissions = configManager.getPermissions();

        let roleArray;
        switch (type) {
            case 'ticket_access':
                roleArray = permissions.ticketAccessRoles || [];
                break;
            case 'claim':
                roleArray = permissions.claimRoles || [];
                break;
            case 'close':
                roleArray = permissions.closeRoles || [];
                break;
        }

        if (action === 'add') {
            if (!roleArray.includes(role.id)) {
                roleArray.push(role.id);
                permissions[`${type}Roles`] = roleArray;
                configManager.updatePermissions(permissions);
                await interaction.reply({ 
                    content: `✅ Role ${role.name} added to ${type} roles.`, 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: `ℹ️ Role ${role.name} is already in ${type} roles.`, 
                    ephemeral: true 
                });
            }
        } else if (action === 'remove') {
            const index = roleArray.indexOf(role.id);
            if (index > -1) {
                roleArray.splice(index, 1);
                permissions[`${type}Roles`] = roleArray;
                configManager.updatePermissions(permissions);
                await interaction.reply({ 
                    content: `✅ Role ${role.name} removed from ${type} roles.`, 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: `❌ Role ${role.name} is not in ${type} roles.`, 
                    ephemeral: true 
                });
            }
        }
    },

    async manageChannels(interaction, configManager) {
        const type = interaction.options.getString('type');
        const channel = interaction.options.getChannel('channel');
        const channels = configManager.getChannels();

        switch (type) {
            case 'ticket_category':
                if (channel.type !== 4) { // CategoryChannel
                    return interaction.reply({ 
                        content: '❌ Please select a category channel for ticket storage.', 
                        ephemeral: true 
                    });
                }
                channels.ticketCategory = channel.id;
                break;
            case 'transcript':
                if (channel.type !== 0) { // TextChannel
                    return interaction.reply({ 
                        content: '❌ Please select a text channel for transcripts.', 
                        ephemeral: true 
                    });
                }
                channels.transcriptChannel = channel.id;
                break;
            case 'panel':
                if (channel.type !== 0) { // TextChannel
                    return interaction.reply({ 
                        content: '❌ Please select a text channel for the ticket panel.', 
                        ephemeral: true 
                    });
                }
                
                // Check if bot has permissions in the target channel
                if (!channel.permissionsFor(interaction.client.user).has(['SendMessages', 'EmbedLinks'])) {
                    return interaction.reply({ 
                        content: `❌ I don't have permission to send messages and embeds in ${channel}. Please check my permissions.`, 
                        ephemeral: true 
                    });
                }
                
                // If there's an existing panel, delete the old message
                if (channels.ticketPanelMessage && channels.ticketPanelChannel) {
                    try {
                        const oldChannel = interaction.guild.channels.cache.get(channels.ticketPanelChannel);
                        if (oldChannel) {
                            const oldMessage = await oldChannel.messages.fetch(channels.ticketPanelMessage).catch(() => null);
                            if (oldMessage) {
                                await oldMessage.delete().catch(() => {});
                            }
                        }
                    } catch (error) {
                        // Old message might not exist, that's okay
                    }
                }
                
                // Update the panel channel
                channels.ticketPanelChannel = channel.id;
                channels.ticketPanelMessage = null; // Clear old message ID
                
                // Create new panel in the new channel
                try {
                    const TicketManager = require('../handlers/ticketManager');
                    const ticketManager = new TicketManager(interaction.client);
                    
                    // Check if categories are configured
                    const categories = configManager.getTicketCategories();
                    if (categories.length === 0) {
                        return interaction.reply({ 
                            content: '❌ No ticket categories are configured. Please add categories first using `/setup category add`.', 
                            ephemeral: true 
                        });
                    }
                    
                    const result = await ticketManager.createTicketPanel(channel);
                    
                    if (result.success) {
                        configManager.updateChannels(channels);
                        await interaction.reply({ 
                            content: `✅ Ticket panel created successfully in ${channel}!`, 
                            ephemeral: true 
                        });
                    } else {
                        await interaction.reply({ 
                            content: `❌ ${result.message}`, 
                            ephemeral: true 
                        });
                    }
                } catch (error) {
                    console.error('Error creating panel:', error);
                    await interaction.reply({ 
                        content: '❌ An error occurred while creating the ticket panel. Please try again.', 
                        ephemeral: true 
                    });
                }
                return; // Exit early since we handled the reply
        }

        configManager.updateChannels(channels);
        await interaction.reply({ 
            content: `✅ ${type.replace('_', ' ')} channel set to ${channel.name}.`, 
            ephemeral: true 
        });
    },

    async manageStaffRoles(interaction, configManager) {
        const categoryName = interaction.options.getString('category');
        const role = interaction.options.getRole('role');
        const action = interaction.options.getString('action');
        const permissionType = interaction.options.getString('permission') || 'access';
        
        const categories = configManager.getTicketCategories();
        const category = categories.find(cat => cat.name === categoryName);
        
        if (!category) {
            return interaction.reply({ 
                content: `❌ Category "${categoryName}" not found.`, 
                ephemeral: true 
            });
        }

        // Initialize staffRoles structure if it doesn't exist (migration from old format)
        if (!category.staffRoles || Array.isArray(category.staffRoles)) {
            category.staffRoles = {
                access: [],
                claim: [],
                close: [],
                persistent: [],
                ping: []
            };
            // Save the updated structure immediately
            configManager.updateTicketCategory(categoryName, { staffRoles: category.staffRoles });
        }

        // Ensure all permission types exist
        const requiredTypes = ['access', 'claim', 'close', 'persistent', 'ping'];
        for (const type of requiredTypes) {
            if (!Array.isArray(category.staffRoles[type])) {
                category.staffRoles[type] = [];
            }
        }

        if (action === 'add') {
            if (permissionType === 'all') {
                // Add role to all permission types
                let addedToAny = false;
                const permissionTypes = ['access', 'claim', 'close', 'persistent', 'ping'];
                
                for (const type of permissionTypes) {
                    if (!category.staffRoles[type].includes(role.id)) {
                        category.staffRoles[type].push(role.id);
                        addedToAny = true;
                    }
                }
                
                if (addedToAny) {
                    configManager.updateTicketCategory(categoryName, { staffRoles: category.staffRoles });
                    
                    // Update the ticket panel if it exists
                    const TicketManager = require('../handlers/ticketManager');
                    const ticketManager = new TicketManager(interaction.client);
                    await ticketManager.updateTicketPanel();
                    
                    await interaction.reply({ 
                        content: `✅ Role ${role.name} added to all permissions (access, claim, close, persistent, ping) for "${categoryName}". Panel updated.`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: `ℹ️ Role ${role.name} already has all permissions for "${categoryName}".`, 
                        ephemeral: true 
                    });
                }
            } else {
                // Add role to specific permission type
                if (!category.staffRoles[permissionType].includes(role.id)) {
                    category.staffRoles[permissionType].push(role.id);
                    configManager.updateTicketCategory(categoryName, { staffRoles: category.staffRoles });
                    
                    // Update the ticket panel if it exists
                    const TicketManager = require('../handlers/ticketManager');
                    const ticketManager = new TicketManager(interaction.client);
                    await ticketManager.updateTicketPanel();
                    
                    await interaction.reply({ 
                        content: `✅ Role ${role.name} added to ${permissionType} permissions for "${categoryName}". Panel updated.`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: `ℹ️ Role ${role.name} already has ${permissionType} permissions for "${categoryName}".`, 
                        ephemeral: true 
                    });
                }
            }
        } else if (action === 'remove') {
            if (permissionType === 'all') {
                // Remove role from all permission types
                let removedFromAny = false;
                const permissionTypes = ['access', 'claim', 'close', 'persistent', 'ping'];
                
                for (const type of permissionTypes) {
                    const index = category.staffRoles[type].indexOf(role.id);
                    if (index > -1) {
                        category.staffRoles[type].splice(index, 1);
                        removedFromAny = true;
                    }
                }
                
                if (removedFromAny) {
                    configManager.updateTicketCategory(categoryName, { staffRoles: category.staffRoles });
                    
                    // Update the ticket panel if it exists
                    const TicketManager = require('../handlers/ticketManager');
                    const ticketManager = new TicketManager(interaction.client);
                    await ticketManager.updateTicketPanel();
                    
                    await interaction.reply({ 
                        content: `✅ Role ${role.name} removed from all permissions for "${categoryName}". Panel updated.`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: `❌ Role ${role.name} doesn't have any permissions for "${categoryName}".`, 
                        ephemeral: true 
                    });
                }
            } else {
                // Remove role from specific permission type
                const index = category.staffRoles[permissionType].indexOf(role.id);
                if (index > -1) {
                    category.staffRoles[permissionType].splice(index, 1);
                    configManager.updateTicketCategory(categoryName, { staffRoles: category.staffRoles });
                    
                    // Update the ticket panel if it exists
                    const TicketManager = require('../handlers/ticketManager');
                    const ticketManager = new TicketManager(interaction.client);
                    await ticketManager.updateTicketPanel();
                    
                    await interaction.reply({ 
                        content: `✅ Role ${role.name} removed from ${permissionType} permissions for "${categoryName}". Panel updated.`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: `❌ Role ${role.name} doesn't have ${permissionType} permissions for "${categoryName}".`, 
                        ephemeral: true 
                    });
                }
            }
        }
    },

    async manageSettings(interaction, configManager) {
        const setting = interaction.options.getString('setting');
        const value = interaction.options.getString('value');
        const settings = configManager.getSettings();

        switch (setting) {
            case 'ticket_prefix':
                settings.ticketPrefix = value;
                break;
            case 'max_tickets_per_user':
                const maxTickets = parseInt(value);
                if (isNaN(maxTickets) || maxTickets < 1) {
                    return interaction.reply({ 
                        content: '❌ Max tickets per user must be a positive number.', 
                        ephemeral: true 
                    });
                }
                settings.maxTicketsPerUser = maxTickets;
                break;
        }

        configManager.updateSettings(settings);
        await interaction.reply({ 
            content: `✅ Setting "${setting}" updated to "${value}".`, 
            ephemeral: true 
        });
    },



    async refreshPanel(interaction, configManager) {
        try {
            const TicketManager = require('../handlers/ticketManager');
            const ticketManager = new TicketManager(interaction.client);
            
            const result = await ticketManager.refreshPanel();
            
            if (result.success) {
                await interaction.reply({ 
                    content: `✅ Ticket panel refreshed successfully!`, 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: `❌ ${result.message}`, 
                    ephemeral: true 
                });
            }
        } catch (error) {
            console.error('Error refreshing panel:', error);
            const errorMessage = 'An error occurred while refreshing the ticket panel. Please try again.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
}; 