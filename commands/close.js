const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close a ticket (Staff only)')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for closing the ticket')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
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
            
            const result = await ticketManager.closeTicket(interaction, reason);
            
            if (result.success) {
                await interaction.reply({ 
                    content: `✅ ${result.message}`,
                    ephemeral: true
                });
                
                // Delete the channel after sending the reply
                try {
                    await result.channel.delete();
                } catch (error) {
                    console.error('Error deleting channel:', error);
                }
            } else {
                await interaction.reply({ 
                    content: `❌ ${result.message}`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error executing close command:', error);
            const errorMessage = 'An error occurred while closing the ticket.';
            
            if (interaction.replied) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
}; 