import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import dotenv from "dotenv";
import { MineUser } from "../models/MineUser.models.js";
import {Client,GatewayIntentBits,Partials,Events, ChannelType }  from "discord.js";
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
   const {username } = req.body;
 
   if (!username) {
     throw new ApiError(400, "Missing player UUID or username");
   }
 
   // You can later store this in DB here or fetch linked Discord
 
   // Example: Send a Discord message
   const channelId = process.env.DISCORD_CHANNEL_ID;
   const channel = await client.channels.fetch(channelId);
 
   if (!channel) {
     throw new ApiError(500, "Discord channel not found");
   }
 
   await channel.send({
      content: "```diff\n+ 🎮 Player " + username + " joined the Minecraft server!\n```"
    });
    await redis.sadd("online_players", username);
 
   return res
  .status(201)
  .json(new ApiResponse(201, { username }, "Player join logged"));
 });

 const player_left = asyncHandler(async (req, res) => {
   const {username } = req.body;
 
   if (!username) {
     throw new ApiError(400, "Missing player UUID or username");
   }
 
   // You can later store this in DB here or fetch linked Discord
 
   // Example: Send a Discord message
   const channelId = process.env.DISCORD_CHANNEL_ID;
   const channel = await client.channels.fetch(channelId);
 
   if (!channel) {
     throw new ApiError(500, "Discord channel not found");
   }
 
   await channel.send({
      content: "```diff\n- 🎮 Player " + username + " left the Minecraft server!\n```"
    });
    await redis.srem("online_players", username); 
   return res
  .status(201)
  .json(new ApiResponse(201, { username }, "Player left logged"));
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

  const user = await MineUser.findOne({ uuid: uuid });

  if (!user) {
    return res.status(404).json({ status: "not_found" });
  }

  return res.status(200).json(new ApiResponse(200, user, "User found"));
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
  const { uuid, code } = req.body;

  if (!uuid || !code) {
    throw new ApiError(400, "Missing UUID or Code");
  }

  // Check if the code already exists in the database
  const existingCode = await MineUser.findOne({ code });

  if (existingCode) {
    return res.status(409).json({ status: "code_exists", message: "Link code already exists." });
  }

  // Check if the user already exists
  const existingUser = await MineUser.findOne({ uuid });

  if (existingUser) {
    return res.status(409).json({ status: "user_exists", message: "User already linked." });
  }

  // Create a new user document and link the code
  const newUser = new MineUser({
    uuid,
    code,
  });

  // Save the new user to the database
  await newUser.save();

  // Respond back to the client with success
  return res.status(201).json(new ApiResponse(201, { uuid, code }, "Player linked and saved successfully"));
});


//bot commands

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const content = message.content.toLowerCase().trim();
 

  if (message.channel.type === ChannelType.DM) {

    
    // Handle DM-specific commands
    if (content.startsWith("/link")) {
      const parts = content.split(" ");
      const code = parts[1];
  
      if (!code || !/^\d{6}$/.test(code)) {
        return message.reply("⚠️ Please provide a valid 6-digit code. Usage: `/link 123456`");
      }
  
      try {
        const user = await MineUser.findOne({ code });
  
        if (!user) {
          return message.reply("❌ Invalid or expired code.");
        }
  
        if (user.discordId) {
          return message.reply("⚠️ This code has already been used to link another account.");
        }
  
        // Save the Discord ID to the user's Minecraft account
        user.discordId = message.author.id;
        await user.save();
  
        // Send confirmation message to the user who linked the account
        await message.reply("✅ Your Minecraft and Discord accounts are now linked!");
  
        // Send a message to the user who was linked
        const linkedUser = await client.users.fetch(user.discordId);
        if (linkedUser) {
          linkedUser.send("Your Minecraft and Discord accounts have been successfully linked! 🎮");
        }
  
      } catch (err) {
        console.error("Linking error:", err);
        return message.reply("⚠️ Something went wrong. Please try again later.");
      }
    }
  }

 

  // Handle server messages
  if (content === "help") {
    return message.channel.send(
      `Hi ${message.author}, here are some commands you can try:\n- \`/online_player_list\`: List online players\n- \`hi\`: Get a friendly greeting\n- \`yo\`: Casual greeting\nLet me know if you need anything else!`
    );
  }

  if (content === "/online_player_list") {
    try {
      const onlinePlayers = await redis.smembers("online_players");
      if (!onlinePlayers || onlinePlayers.length === 0) {
        return message.reply("No players are currently online.");
      }

      return message.reply(`🎮 Currently online players: ${onlinePlayers.join(", ")}`);
    } catch (err) {
      console.error("Error fetching players:", err);
    }
  }
  const targetUserId = '745704600283250748'; // Manually replace this with the user ID each time

  // Command to say hi to the specified user

});

export 
{
   player_joined,
   player_left,
   checkLinkStatus,
   checkcodeStatus,
   linkPlayer
   
   
}