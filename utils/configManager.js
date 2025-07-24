const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '..', 'config.json');
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                return JSON.parse(data);
            } else {
                // Create default config if it doesn't exist
                const defaultConfig = {
                    ticketCategories: [
                        {
                            name: "General Support",
                            description: "General questions and support",
                            staffRoles: {
                                access: [],
                                claim: [],
                                close: [],
                                persistent: [],
                                ping: []
                            },
                            color: "#00ff00",
                            emoji: "🎫"
                        },
                        {
                            name: "Technical Issues",
                            description: "Technical problems and bugs",
                            staffRoles: {
                                access: [],
                                claim: [],
                                close: [],
                                persistent: [],
                                ping: []
                            },
                            color: "#ff0000",
                            emoji: "🔧"
                        },
                        {
                            name: "Billing",
                            description: "Payment and billing questions",
                            staffRoles: {
                                access: [],
                                claim: [],
                                close: [],
                                persistent: [],
                                ping: []
                            },
                            color: "#0000ff",
                            emoji: "💰"
                        }
                    ],
                    permissions: {
                        // Legacy support - will be migrated to category-specific
                        ticketAccessRoles: [],
                        claimRoles: [],
                        closeRoles: []
                    },
                    channels: {
                        ticketCategory: null,
                        transcriptChannel: null,
                        ticketPanelChannel: null,
                        ticketPanelMessage: null
                    },
                    settings: {
                        ticketPrefix: "ticket-",
                        maxTicketsPerUser: 3,
                        autoCloseInactive: false,
                        inactiveTimeout: 168
                    }
                };
                this.saveConfig(defaultConfig);
                return defaultConfig;
            }
        } catch (error) {
            console.error('Error loading config:', error);
            return {};
        }
    }

    saveConfig(config = null) {
        try {
            const configToSave = config || this.config;
            fs.writeFileSync(this.configPath, JSON.stringify(configToSave, null, 2));
            this.config = configToSave;
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    }

    getConfig() {
        return this.config;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this.saveConfig();
    }

    // Ticket Categories
    getTicketCategories() {
        return this.config.ticketCategories || [];
    }

    getTicketCategory(name) {
        return this.config.ticketCategories?.find(cat => cat.name === name);
    }

    addTicketCategory(category) {
        if (!this.config.ticketCategories) {
            this.config.ticketCategories = [];
        }
        this.config.ticketCategories.push(category);
        return this.saveConfig();
    }

    removeTicketCategory(categoryName) {
        if (this.config.ticketCategories) {
            this.config.ticketCategories = this.config.ticketCategories.filter(
                cat => cat.name !== categoryName
            );
            return this.saveConfig();
        }
        return false;
    }

    updateTicketCategory(categoryName, newData) {
        if (this.config.ticketCategories) {
            const index = this.config.ticketCategories.findIndex(cat => cat.name === categoryName);
            if (index !== -1) {
                this.config.ticketCategories[index] = { ...this.config.ticketCategories[index], ...newData };
                return this.saveConfig();
            }
        }
        return false;
    }

    // Permissions
    getPermissions() {
        return this.config.permissions || {};
    }

    updatePermissions(permissions) {
        this.config.permissions = { ...this.config.permissions, ...permissions };
        return this.saveConfig();
    }

    // Channels
    getChannels() {
        return this.config.channels || {};
    }

    updateChannels(channels) {
        this.config.channels = { ...this.config.channels, ...channels };
        return this.saveConfig();
    }

    // Settings
    getSettings() {
        return this.config.settings || {};
    }

    updateSettings(settings) {
        this.config.settings = { ...this.config.settings, ...settings };
        return this.saveConfig();
    }

    // Helper methods
    isAdmin(userId, member) {
        if (!member) return false;
        return member.permissions.has('Administrator');
    }

    canAccessTickets(member, categoryName = null) {
        if (!member) return false;
        
        // Admins can always access tickets
        if (member.permissions.has('Administrator')) return true;
        
        // If no specific category, check legacy general ticket access roles
        if (!categoryName) {
            return member.roles.cache.some(role => 
                this.config.permissions?.ticketAccessRoles?.includes(role.id)
            );
        }
        
        // Check category-specific staff roles
        const category = this.config.ticketCategories?.find(cat => cat.name === categoryName);
        if (category && category.staffRoles) {
            // Check if member has access permissions
            return member.roles.cache.some(role => 
                category.staffRoles.access?.includes(role.id) ||
                category.staffRoles.claim?.includes(role.id) ||
                category.staffRoles.close?.includes(role.id) ||
                category.staffRoles.persistent?.includes(role.id) ||
                category.staffRoles.ping?.includes(role.id)
            );
        }
        
        return false;
    }

    canClaimTickets(member, categoryName = null) {
        if (!member) return false;
        
        // Admins can always claim tickets
        if (member.permissions.has('Administrator')) return true;
        
        // If no specific category, check legacy general claim roles
        if (!categoryName) {
            return member.roles.cache.some(role => 
                this.config.permissions?.claimRoles?.includes(role.id)
            );
        }
        
        // Check category-specific staff roles
        const category = this.config.ticketCategories?.find(cat => cat.name === categoryName);
        if (category && category.staffRoles) {
            return member.roles.cache.some(role => 
                category.staffRoles.claim?.includes(role.id)
            );
        }
        
        return false;
    }

    canCloseTickets(member, categoryName = null) {
        if (!member) return false;
        
        // Admins can always close tickets
        if (member.permissions.has('Administrator')) return true;
        
        // If no specific category, check legacy general close roles
        if (!categoryName) {
            return member.roles.cache.some(role => 
                this.config.permissions?.closeRoles?.includes(role.id)
            );
        }
        
        // Check category-specific staff roles
        const category = this.config.ticketCategories?.find(cat => cat.name === categoryName);
        if (category && category.staffRoles) {
            return member.roles.cache.some(role => 
                category.staffRoles.close?.includes(role.id)
            );
        }
        
        return false;
    }

    // New method to check if a role should maintain access when ticket is claimed
    hasPersistentAccess(member, categoryName = null) {
        if (!member) return false;
        
        // Admins always have persistent access
        if (member.permissions.has('Administrator')) return true;
        
        // Check category-specific persistent roles
        const category = this.config.ticketCategories?.find(cat => cat.name === categoryName);
        if (category && category.staffRoles) {
            return member.roles.cache.some(role => 
                category.staffRoles.persistent?.includes(role.id)
            );
        }
        
        return false;
    }

    // Helper method to get all staff roles for a category (for pinging)
    getStaffRolesForCategory(categoryName) {
        const category = this.config.ticketCategories?.find(cat => cat.name === categoryName);
        
        if (category && category.staffRoles) {
            // Always use ping roles if the ping property exists (even if empty)
            if (category.staffRoles.ping !== undefined) {
                return category.staffRoles.ping || [];
            }
            
            // Fallback to all roles only if ping property doesn't exist (old format)
            const allRoles = [];
            if (category.staffRoles.access) allRoles.push(...category.staffRoles.access);
            if (category.staffRoles.claim) allRoles.push(...category.staffRoles.claim);
            if (category.staffRoles.close) allRoles.push(...category.staffRoles.close);
            if (category.staffRoles.persistent) allRoles.push(...category.staffRoles.persistent);
            return [...new Set(allRoles)]; // Remove duplicates
        }
        return [];
    }
}

module.exports = ConfigManager; 