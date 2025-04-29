// registerCommands.js
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Minecraft account')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('6-digit link code')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('online')
    .setDescription('Show currently online players'),

  new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Get Minecraft username linked to a Discord user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(true)),
  new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show a list of available commands'),

].map(command => command.toJSON());

export const registerCommands = async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  try {
    console.log('🔁 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered successfully!');
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
};
