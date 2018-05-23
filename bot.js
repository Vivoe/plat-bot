var Discord = require('discord.io');
var auth_token = require('./keys/auth.json');

var utils = require('./src/utils.js');
var auth = require('./src/auth.js');
var relic_table_builder = require('./src/build_relic_tables.js');
var cmd_menu = require('./src/command_menu.js');
var poll = require('./src/poll.js');


/**
 * Bot.js
 *
 * Handles initialization of the bot and adding the base event listeners.
 *
 * Usage: node bot.js [channelID]
 *    channelID specifies the channel the bot was restarted from, if restarted.
 */


// Create bot.
var bot = new Discord.Client({
    token: auth_token.token,
    autorun: true
});

console.log("Bot started.");

// Initialization.
bot.on('ready', function(evt){
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(bot.username + ' - (' + bot.id + ')');

    console.log(process.argv);

    // If restarted (There should be 3 arguments if so)
    if (process.argv.length == 3){
        var restartChannelID = process.argv[2];
        console.log("Restarted from channelID " + restartChannelID);

        bot.sendMessage({
            to: restartChannelID,
            message: "Bot restarted!"
        });
    }

    // Ensure all required files are generated.
    utils.create_if_not_exists(utils.path.pricemods, {});
    utils.create_if_not_exists(utils.path.wanted_list, []);

    // Make sure relics are up to date.
    relic_table_builder.update_relic_info();

    // Get authorized channels and admin channels.
    auth.init_auth(bot);

    poll.start_polling(bot);
});

// Adding message hooks.
bot.on('message', function(user, userID, channelID, message, evt){
    cmd_menu.exec_command(bot, channelID, message, user, userID);
});
