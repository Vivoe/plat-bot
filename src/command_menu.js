var cmds = require('./commands.js')
var auth = require('./auth.js');

admin_commands_menu = function(bot, channelID, message){

    console.log("Admin command");
    console.log('MESSAGE: ' + message);

    var tokens = message.split(' ');

    if (tokens[0] == '!!help'){
        cmds.admin_help(bot, channelID);
    } else if (tokens[0] == '!!setprice'){
        cmds.set_price(tokens);
    } else if (tokens[0] == '!!setmult'){
        cmds.set_mult(tokens);
    } else if (tokens[0] == '!!listpricemods'){
        cmds.list_pricemods(bot, channelID);
    } else if(tokens[0] == '!!resetpricemods'){
        cmds.reset_pricemods(bot, channelID);
    } else {
        bot.sendMessage({
            to: channelID,
            message: "Unknown command " + tokens[0] + '.'
        });
    }
}

commands_menu = function(bot, channelID, message){
    console.log("Public command.");
    console.log('MESSAGE: ' + message);
    var tokens = message.split(' ');

    if (tokens[0] == '!help'){
        cmds.help(bot, channelID);
    } else if (tokens[0] == '!voidtrader'){
        cmds.void_trader(bot, channelID);
    } else if (tokens[0] == '!updaterelics'){
        cmds.update_relics(bot, channelID);
    } else if (tokens[0] == '!listrelics'){
        cmds.list_relics(bot, channelID);
    } else {
        bot.sendMessage({
            to: channelID,
            message: 'Unknown command ' + tokens[0] + '.'
        });
    }
}

exports.exec_command = function(bot, channelID, message, user){

    // Ignore self-messages.
    if (user == 'plat-bot') return;

    var auth_level = auth.authenticate(channelID);
    if (auth_level <= 0) return;

    // Parse command syntax.
    message = message.toLowerCase();

    var platregex = /([0-9]+)( )?(p|plat|platinum)(\.| |$)/g;
    var partregex = /{(.*)}/g;
    var relicregex = /{(lith|meso|neo|axi) ([a-z][0-9])}/g;

    var platmatch = platregex.exec(message);
    var partmatch = partregex.exec(message);
    var relicmatch = relicregex.exec(message);

    // Admin commands.
    if (auth_level >= 2 && message.substring(0, 2) == '!!'){
        admin_commands_menu(bot, channelID, message);
    } else if (message[0] == '!'){
        commands_menu(bot, channelID, message);
    } else if (platmatch != null){
        cmds.plat_conversion(bot, channelID, message, platmatch);
    } else if (relicmatch != null){
        cmds.relic_info(bot, channelID, message, relicmatch);
    } else if (partmatch != null){
        cmds.parts_info(bot, channelID, message, partmatch);
    }
}
