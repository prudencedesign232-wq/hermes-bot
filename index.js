const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 Bot Hermes est en ligne !');
});

app.listen(PORT, () => {
    console.log(`🌐 Serveur web démarré sur le port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Configuration de l'API OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "nvidia/nemotron-3-super-120b-a12b:free"; // Le modèle gratuit qu'on a choisi

client.once('ready', () => {
    console.log(`✅ Bot connecté ! Identifié en tant que ${client.user.tag}`);
    console.log(`🤖 IA configurée: ${MODEL}`);
    console.log(`💡 Commandes: @bot ask <question> ou @bot code <ton code>`);
});

// Fonction pour appeler l'API OpenRouter
async function askAI(prompt) {
    try {
        console.log(`🤔 Appel API pour: ${prompt.substring(0, 50)}...`);
        console.log(`🔑 Clé API présente: ${OPENROUTER_API_KEY ? 'OUI' : 'NON!'}`);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/prudencedesign232-wq/hermes-bot',
                'X-Title': 'Hermes Discord Bot'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content: "Tu es Hermes, un assistant IA intelligent et utile."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        console.log(`📊 Status HTTP: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erreur API:`, errorText);
            return `Erreur API (${response.status}): ${errorText}`;
        }

        const data = await response.json();
        console.log(`✅ Réponse API reçue!`);
        return data.choices[0].message.content;
    } catch (error) {
        console.error("❌ Erreur complète:", error.message);
        return `Erreur: ${error.message}`;
    }
}

// Gestion des messages
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const content = message.content.toLowerCase();
    
    // Vérifier si le bot est mentionné ou si le message commence par son nom
    const isBotMentioned = message.mentions.users.has(client.user.id);
    const startsWithBotName = content.startsWith(client.user.username.toLowerCase());
    
    if (isBotMentioned || startsWithBotName) {
        // Extraire la commande
        let command = message.content;
        if (isBotMentioned) {
            command = command.replace(/<@\d+>\s*/, '').trim();
        } else {
            command = command.substring(client.user.username.length).trim();
        }
        
        console.log(`📨 Commande reçue: ${command}`);
        
        // Indiquer qu'on est en train de réfléchir
        await message.channel.sendTyping();
        
        // Commande: ask
        if (command.startsWith('ask ') || command.startsWith('question ')) {
            const question = command.replace(/^(ask|question)\s+/, '');
            
            const typingIndicator = await message.reply("🤔 Je réfléchis...");
            
            const response = await askAI(question);
            
            await typingIndicator.edit(`💬 **Réponse:**\n${response}`);
        }
        // Commande: code
        else if (command.startsWith('code ') || command.startsWith('help code')) {
            const codeQuestion = command.replace(/^(code|help code)\s+/, '');
            
            const typingIndicator = await message.reply("💻 J'analyse ton code...");
            
            const prompt = `Tu es un expert en programmation. Aide l'utilisateur avec cette question:\n${codeQuestion}`;
            const response = await askAI(prompt);
            
            await typingIndicator.edit(`👨‍💻 **Aide au code:**\n${response}`);
        }
        // Commande: ping
        else if (command === 'ping') {
            const sent = await message.reply("🏓 Pong!");
            const latency = sent.createdTimestamp - message.createdTimestamp;
            await sent.edit(`🏓 Pong! Latence: ${latency}ms`);
        }
        // Commande: help
        else if (command === 'help' || command === 'aide') {
            await message.reply({
                embeds: [{
                    title: "🤖 Commandes Hermes Bot",
                    description: "Voici ce que je peux faire pour toi :",
                    color: 0x00FF00,
                    fields: [
                        {
                            name: "💬 Poser une question",
                            value: "`@Hermes ask <ta question>`\nEx: `@Hermes ask Qu'est-ce que Python?`",
                            inline: false
                        },
                        {
                            name: "💻 Aide au code",
                            value: "`@Hermes code <ton problème>`\nEx: `@Hermes code Comment trier un tableau en JavaScript?`",
                            inline: false
                        },
                        {
                            name: "🏓 Tester le bot",
                            value: "`@Hermes ping`",
                            inline: false
                        }
                    ],
                    footer: { text: "Propulsé par OpenRouter + NVIDIA Nemotron" }
                }]
            });
        }
        // Réponse par défaut
        else if (command && command.length > 0) {
            // Envoyer directement à l'IA
            const typingIndicator = await message.reply("🤔 Je réfléchis...");
            const response = await askAI(command);
            // Limiter la réponse à 1900 caractères (Discord limite à 2000)
let limitedResponse = response;
if (response.length > 1900) {
    limitedResponse = response.substring(0, 1897) + '...';
    console.log(`⚠️ Réponse tronquée (${response.length} -> 1900 caractères)`);
}

await typingIndicator.edit(`💬 **Réponse:**\n${limitedResponse}`);
        }
        // Juste une mention sans commande
        else {
            await message.reply("👋 Salut ! Je suis Hermes, ton assistant IA !\nTape `help` pour voir les commandes disponibles.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ Erreur de connexion Discord:");
    console.error(err);
});