var Discord = require('discord.io');
var auth_token = require('./data/auth.json');

var auth = require('./src/auth.js');
var relic_table_builder = require('./src/build_relic_tables.js');
var cmd_menu = require('./src/command_menu.js');

// Create bot.
var bot = new Discord.Client({
    token: auth_token.token,
    autorun: true
});

console.log("Bot started.");

// Logging initialization.
bot.on('ready', function(evt){
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(bot.username + ' - (' + bot.id + ')');

    relic_table_builder.update_relic_info();
    auth.init_auth(bot);
});

bot.on('message', function(user, userID, channelID, message, evt){
    cmd_menu.exec_command(bot, channelID, message, user);
});
