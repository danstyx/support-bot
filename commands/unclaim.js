const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unclaim')
        .setDescription('Unclaim a ticket (Staff only)'),

    async execute(interaction) {
        try {
            // Use the ticket manager passed from the event handler, or create a new one
            let ticketManager = interaction.ticketManager;
            if (!ticketManager) {
                const TicketManager = require('../handlers/ticketManager');
                ticketManager = new TicketManager(interaction.client);
            }
            
            // Check if this is a ticket channel
            if (!ticketManager.getActiveTickets().has(interaction.channel.id)) {
                return interaction.reply({ 
                    content: '❌ This command can only be used in ticket channels.', 
                    ephemeral: true 
                });
            }
            
            const result = await ticketManager.unclaimTicket(interaction);
            
            if (!result.success) {
                await interaction.reply({ 
                    content: `❌ ${result.message}`, 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: `✅ ${result.message}`, 
                    ephemeral: true 
                });
            }
        } catch (error) {
            console.error('Error executing unclaim command:', error);
            const errorMessage = 'An error occurred while unclaiming the ticket.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
}; 