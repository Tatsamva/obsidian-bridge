import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import dotenv from "dotenv";
import { MineUser } from "../models/MineUser.models.js";
import {Client,GatewayIntentBits,Partials,Events, ChannelType,EmbedBuilder }  from "discord.js";
import redis from "../utils/redisClient.js";

dotenv.config();

// Setup Discord client
const client = new Client({
   intents: [
       GatewayIntentBits.Guilds,
       GatewayIntentBits.GuildMessages,
       GatewayIntentBits.MessageContent, 
       GatewayIntentBits.DirectMessages,// Ensure this intent is included for message content
   ],
   partials: [Partials.Channel]
});
client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
   console.error('Error logging into Discord:', error);
});
 client.once('ready', () => {
   console.log('Bot is online!');
});
 // Setup Discord client


 const player_joined = asyncHandler(async (req, res) => {
  const { username, uuid } = req.body;

  if (!username || !uuid) {
    throw new ApiError(400, "Missing player UUID or username");
  }

  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    throw new ApiError(500, "Discord channel not found");
  }

  const user = await MineUser.findOne({ uuid });


  if (user && user.discordId) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00) // Green for "joined"
      .setDescription(`🎮 Player <@${user.discordId}> **joined** the Minecraft server!`);
  
    channel.send({ embeds: [embed] });
  }
  else {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00) // Green for "joined"
      .setDescription(`🎮 Player ${username} joined the Minecraft server!`);
  
    channel.send({ embeds: [embed] });
  }
  await redis.sadd("online_players", username);

  return res.status(201).json(new ApiResponse(201, { username }, "Player join logged"));
});


 const player_left = asyncHandler(async (req, res) => {
  const { username, uuid } = req.body;

  if (!username || !uuid) {
    throw new ApiError(400, "Missing player UUID or username");
  }

  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    throw new ApiError(500, "Discord channel not found");
  }

  const user = await MineUser.findOne({ uuid });


  if (user && user.discordId) {
    const embed = new EmbedBuilder()
    .setColor(0xff0000) // Red for "left"
    .setDescription(`🎮 Player <@${user.discordId}> **left** the Minecraft server!`);

  
    channel.send({ embeds: [embed] });
  }
  else {
    const embed = new EmbedBuilder()
    .setColor(0xff0000) // Green for "joined"
    .setDescription(`🎮 Player ${username} left the Minecraft server!`);

  channel.send({ embeds: [embed] });
  }
  
  await redis.srem("online_players", username);

  return res.status(201).json(new ApiResponse(201, { username }, "Player left logged"));
});


 const online_player_list = asyncHandler(async (req, res) => {
   // Fetch online players from Redis
   const onlinePlayers = await redis.smembers("online_players");
   
   if (!onlinePlayers || onlinePlayers.length === 0) {
     return res.status(200).json(new ApiResponse(200, [], "No players online"));
   }

   // Example: Send a Discord message
   const channelId = process.env.DISCORD_CHANNEL_ID;
   const channel = await client.channels.fetch(channelId);
 
   if (!channel) {
     throw new ApiError(500, "Discord channel not found");
   }
   
   // Send a message to Discord about the current players online
   await channel.send({
      content: "```diff\n+ 🎮 Currently online players: " + onlinePlayers.join(", ") + "\n```"
   });

   return res.status(200).json(new ApiResponse(200, { onlinePlayers }, "Online players fetched"));
});

const checkLinkStatus = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  if (!uuid) {
    throw new ApiError(400, "Missing UUID");
  }

  const user = await MineUser.findOne({ uuid });

  if (!user) {
    console.log("User not found");
    return res.status(404).json({ status: "not_found" });
  }

  let discordUsername = null;

  if (user.discordId) {
    try {
      const discordUser = await client.users.fetch(user.discordId);
      discordUsername = discordUser.username || "Unknown";
    } catch (err) {
      console.error("Failed to fetch Discord user:", err);
      discordUsername = "Unknown or not found";
    }
  }

  return res.status(200).json(
    new ApiResponse(200, { discordUsername }, "User found")
  );
});




const checkcodeStatus = asyncHandler(async (req, res) => {
  const { code } = req.params;

  if (!code) {
    throw new ApiError(400, "Missing UUID");
  }

  const user = await MineUser.findOne({ code: code });

  if (!user) {
    return res.status(404).json({ status: "code_not_found" });
  }

  return res.status(200).json(new ApiResponse(200, user, "User found"));
});


const linkPlayer = asyncHandler(async (req, res) => {
  const { uuid, code, minecraftUserName } = req.body;
  console.log("UUID:", uuid);
  console.log("Code:", code);
  console.log("Minecraft Username:", minecraftUserName);

  if (!uuid || !code) {
    throw new ApiError(400, "Missing UUID or Code");
  }

  const existingCode = await MineUser.findOne({ code });
  if (existingCode) {
    return res.status(409).json({ status: "code_exists", message: "Link code already exists." });
  }

  const existingUser = await MineUser.findOne({ uuid });
  if (existingUser) {
    return res.status(409).json({ status: "user_exists", message: "User already linked." });
  }

  const newUser = new MineUser({ uuid, code, minecraftUserName });
  await newUser.save();

  return res.status(201).json(new ApiResponse(201, { uuid, code }, "Player linked and saved successfully"));
});

const player_death = asyncHandler(async (req, res) => {
  const { location, uuid } = req.body;
  if (!location || !uuid) {
    throw new ApiError(400, "Missing location or UUID in request body");
  }

  const user = await MineUser.findOne({ uuid });
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  const { x, y, z } = location;
  const formattedLocation = `X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}`;
  // Emoji map for dimensions
  const dimensionEmojiMap = {
    "overworld": "<:overworld:1364662060675498116>", // Replace with your actual emoji
    "nether": "<:nether:1364662011333709955>",
    "end": "<:end:1364662671403782186>",
  };

  const readableDimensionMap = {
    "overworld": "Overworld",
    "nether": "Nether",
    "end": "End",
  };

  const emoji = dimensionEmojiMap[location.dimension] || "🌍";
  const dimensionName = readableDimensionMap[location.dimension] || "Unknown";

  if (user?.discordId) {
    try {
      const discordUser = await client.users.fetch(user.discordId, { force: true });

      const dmChannel = await discordUser.createDM();
      if (dmChannel.type === ChannelType.DM) {
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("💀 You Died!")
          .setDescription(`You died in ${emoji} **${dimensionName}** at:\n\`${formattedLocation}\``)
          .setTimestamp();

        await dmChannel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error(`Failed to DM user ${user.discordId}:`, error);
    }
  }

  return res.status(201).json(new ApiResponse(201, { uuid, location }, "Player death logged"));
});

const player_coord = asyncHandler(async (req, res) => {
  const { uuid, location } = req.body;

  if (!uuid || !location) {
    throw new ApiError(400, "Missing UUID or location");
  }

  const user = await MineUser.findOne({ uuid });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { x, y, z, dimension } = location;
  const formattedLocation = `X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}`;

  const dimensionEmojiMap = {
    "overworld": "<:overworld:1364662060675498116>",
    "nether": "<:nether:1364662011333709955>",
    "end": "<:end:1364662671403782186>",
  };

  const readableDimensionMap = {
    "overworld": "Overworld",
    "nether": "Nether",
    "end": "End",
  };

  const emoji = dimensionEmojiMap[dimension] || "🌍";
  const dimensionName = readableDimensionMap[dimension] || "Unknown";

  const channelId = process.env.DISCORD_CHANNEL_ID;
  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    throw new ApiError(500, "Discord channel not found");
  }

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("📍 Player Coordinate")
    .setDescription(`🧭 Player <@${user.discordId || "unknown"}> shared their location:`)
    .addFields(
      { name: "Dimension", value: `${emoji} ${dimensionName}`, inline: true },
      { name: "Coordinates", value: `\`${formattedLocation}\``, inline: true }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  return res.status(201).json(new ApiResponse(201, { uuid, location }, "Player coordinates shared"));
});

// Bot commands registration
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
     if (commandName === 'link') {
      const code = interaction.options.getString('code');
    
      if (!code || !/^\d{6}$/.test(code)) {
        const embed = {
          color: 0xF9D301, // Warning yellow
          title: "⚠️ Invalid Code",
          description: "Please provide a valid **6-digit** code to link your accounts.",
          timestamp: new Date(),
        };
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    
      const user = await MineUser.findOne({ code });
    
      if (!user) {
        const embed = {
          color: 0xED4245, // Error red
          title: "❌ Invalid or Expired Code",
          description: "The code you entered is either invalid or has expired. Please generate a new one.",
          timestamp: new Date(),
        };
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    
      if (user.discordId) {
        const embed = {
          color: 0xF9D301, // Warning yellow
          title: "⚠️ Code Already Used",
          description: "This code has already been used to link another account. Please generate a new one.",
          timestamp: new Date(),
        };
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    
      user.discordId = interaction.user.id;
      await user.save();
    
      const successEmbed = {
        color: 0x32B876, // Success green
        title: "✅ Successfully Linked!",
        description: `Your **Minecraft** and **Discord** accounts are now linked!\n\nWelcome aboard, ${interaction.user.username}!`,
        timestamp: new Date(),
        footer: {
          text: "Account Linking Complete",
        },
      };
    
      await interaction.reply({ embeds: [successEmbed] });
    
      try {
        const linkedUser = await client.users.fetch(user.discordId);
        if (linkedUser) {
          const dmEmbed = {
            color: 0x32B876,
            title: "🎉 Account Linked!",
            description: "Your **Minecraft** and **Discord** accounts have been successfully linked.\n\nEnjoy your adventure!",
            timestamp: new Date(),
          };
          await linkedUser.send({ embeds: [dmEmbed] });
        }
      } catch (dmErr) {
        console.warn("Could not DM user after linking:", dmErr);
      }
    }
    

    else if (commandName === 'online') {
      const onlinePlayers = await redis.smembers('online_players');
    
      if (!onlinePlayers.length) {
        return await interaction.reply("No players online.");
      }
    
      const maxPlayers = 10;
      const playerCount = onlinePlayers.length;
    
      const playerList = onlinePlayers.map((player, index) => `**${index + 1}.** ${player}`).join('\n');
    
      const embed = new EmbedBuilder()
        .setColor(0x32B876)
        .setTitle(`🟢 Online Players (${playerCount}/${maxPlayers})`)
        .setDescription(playerList)
        .setTimestamp()
        .setFooter({ text: 'Server Status' });
    
      return await interaction.reply({ embeds: [embed] });
    }
    
    

    else if (commandName === 'whois') {
      const user = interaction.options.getUser('user');
      const linkedUser = await MineUser.findOne({ discordId: user.id });
    
      if (!linkedUser) {
        const embed = {
          color: 0xED4245, // Error red
          title: "❌ No Linked Account",
          description: `No Minecraft account is linked to **${user.tag}**.`,
          timestamp: new Date(),
        };
        return await interaction.reply({ embeds: [embed] });
      }
    
      const successEmbed = {
        color: 0x32B876, // Success green
        title: "🧍‍♂️ Linked Account Found",
        fields: [
          {
            name: "Discord User",
            value: `${user.tag}`,
            inline: true,
          },
          {
            name: "Minecraft Username",
            value: `**${linkedUser.minecraftUserName}**`,
            inline: true,
          },
        ],
        timestamp: new Date(),
        footer: {
          text: "Account Link Checker",
        },
      };
    
      return await interaction.reply({ embeds: [successEmbed] });
    }
     else if (commandName === 'help') {
  const helpEmbed = {
    color: 0x5865F2, // Discord blurple
    title: "📖 Bot & Minecraft Commands Help",
    description:
      "**🔧 Discord Bot Commands:**\n" +
      "• `/link <code>` – Link your Minecraft account (get code in-game using `/link`)\n" +
      "• `/online` – Show currently online players\n" +
      "• `/whois <user>` – Show linked Minecraft account for a Discord user\n" +
      "• `/help` – Show this help menu\n\n" +
      "**🎮 In-Game Minecraft Commands:**\n" +
      "• `/link` – Generate a 6-digit code to link your Minecraft with Discord\n" +
      "• `/mycoord` – Sends your current coordinates to the linked Discord account (server channel)\n" +
      "• `/sethome` – Set your home location (saves coordinates)\n" +
      "• `/gethome` – Sends your home coordinates to your Discord DMs",
    timestamp: new Date(),
    footer: {
      text: "Minecraft & Discord Integration Help",
    },
  };

  return await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
}

    
  } catch (err) {
    console.error("Slash command error:", err);
    if (interaction.replied || interaction.deferred) {
      return interaction.editReply("⚠️ An unexpected error occurred. Please try again later.");
    } else {
      return interaction.reply({ content: "⚠️ Something went wrong while executing the command.", ephemeral: true });
    }
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase().trim();

  // Handle DM commands
  if (message.channel.type === ChannelType.DM) {
    if (content.startsWith("/link")) {
      const parts = content.split(" ");
      const code = parts[1];

      if (!code || !/^\d{6}$/.test(code)) {
        return message.reply("⚠️ Please provide a valid 6-digit code. Usage: /link 123456");
      }

      try {
        const user = await MineUser.findOne({ code });

        if (!user) {
          return message.reply("❌ Invalid or expired code.");
        }

        if (user.discordId) {
          return message.reply("⚠️ This code has already been used to link another account.");
        }

        user.discordId = message.author.id;
        await user.save();

        await message.reply("✅ Your Minecraft and Discord accounts are now linked!");

        const linkedUser = await client.users.fetch(user.discordId);
        if (linkedUser) {
          linkedUser.send("Your Minecraft and Discord accounts have been successfully linked! 🎮");
        }
      } catch (err) {
        console.error("Linking error:", err);
        return message.reply("⚠️ Something went wrong. Please try again later.");
      }
    }

    return; // Exit after handling DM command
  }

  // Server commands
  if (content === "help") {
    return message.channel.send(
      `Hi ${message.author}, here are some commands you can try:\n` +
      `- /online: List online players\n` +
      `- hi: Get a friendly greeting\n` +
      `- yo: Casual greeting\n` +
      `- /whois @user: Get linked Minecraft account`
    );
  }

  if (content === "/online") {
    try {
      const onlinePlayers = await redis.smembers("online_players");
      if (!onlinePlayers || onlinePlayers.length === 0) {
        return message.reply("No players are currently online.");
      }

      return message.reply(`🎮 Currently online players: ${onlinePlayers.join(", ")}`);
    } catch (err) {
      console.error("Error fetching players:", err);
      return message.reply("⚠️ Could not retrieve online players.");
    }
  }

  if (content.startsWith("/whois")) {
    const mentionedUser = message.mentions.users.first();

    if (!mentionedUser) {
      return message.reply("⚠️ Please mention a user. Usage: /whois @username");
    }

    try {
      const linkedUser = await MineUser.findOne({ discordId: mentionedUser.id });

      if (!linkedUser) {
        return message.reply(`❌ No Minecraft account linked to ${mentionedUser.tag}.`);
      }

      return message.reply(`🧍‍♂️ ${mentionedUser} is linked to Minecraft username: **${linkedUser.minecraftUserName}**`);
    } catch (err) {
      console.error("Error in /whois command:", err);
      return message.reply("⚠️ Something went wrong. Please try again later.");
    }
  }
});

export 
{
   player_joined,
   player_left,
   checkLinkStatus,
   checkcodeStatus,
   linkPlayer,
   player_death,
   player_coord
   
   
}
