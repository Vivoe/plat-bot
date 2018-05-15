var cmds = require('./commands.js')
var auth = require('./auth.js');

/**
 * Command menu for admin commands.
 * Lists admin help and parses commands.
 */
admin_commands_menu = function(bot, channelID, message){

    console.log("Admin command");
    console.log('MESSAGE: ' + message);

    var tokens = message.split(' ');

    if (tokens[0] == '!!help'){
        bot.sendMessage({
            to: channelID,
            message:
                'Privileged command list:\n' +
                '!!setprice itemid price\n' +
                '!!setmult itemid mult\n' +
                '!!listpricemods\n' +
                '!!resetpricemods\n' +
                '!!restart' +
                '!!gethosturl'
        });
    } else if (tokens[0] == '!!setprice'){
        cmds.set_price(tokens);
    } else if (tokens[0] == '!!setmult'){
        cmds.set_mult(tokens);
    } else if (tokens[0] == '!!listpricemods'){
        cmds.list_pricemods(bot, channelID);
    } else if(tokens[0] == '!!resetpricemods'){
        cmds.reset_pricemods(bot, channelID);
    } else if (tokens[0] == '!!restart'){
        cmds.restart(bot, channelID);
    } else if (tokens[0] == '!!gethosturl'){
        cmds.get_host_url(bot, channelID);
    } else {
        bot.sendMessage({
            to: channelID,
            message: "Unknown command " + tokens[0] + '.'
        });
    }
}

/**
 * Command menu for non-admin commands.
 * Lists help and parses commands.
 */
commands_menu = function(bot, channelID, user, message){
    console.log("Public command.");
    var tokens = message.split(' ');

    if (tokens[0] == '!help'){
        bot.sendMessage({
            to: channelID,
            message:
                'Command list:\n' +
                '!voidtrader\n' +
                '!updaterelics\n' +
                '!listrelics\n' +
                '!relic "relic name" [-c]\n' +
                '!part "part name"\n' +
                '!want "part name"\n' +
                '!remove "part name"\n' +
                '!listwanted [-u | -t]'
        });
    } else if (tokens[0] == '!voidtrader'){
        cmds.void_trader(bot, channelID);
    } else if (tokens[0] == '!updaterelics'){
        cmds.update_relics(bot, channelID);
    } else if (tokens[0] == '!listrelics'){
        cmds.list_relics(bot, channelID);
    } else if (tokens[0] == '!relic'){
        cmds.relic_info(bot, channelID, message);
    } else if (tokens[0] == '!part'){
        cmds.parts_info(bot, channelID, message);
    } else if (tokens[0] == '!want'){
        cmds.addpart(bot, channelID, user, message);
    } else if (tokens[0] == '!remove'){
        cmds.removepart(bot, channelID, user, message);
    } else if (tokens[0] == '!listwanted'){
        cmds.list_wanted(bot, channelID, message);
    } else {
        bot.sendMessage({
            to: channelID,
            message: 'Unknown command ' + tokens[0] + '.'
        });
    }
}

/**
 * Executes a command.
 * Authenticates the channel and determines what type of command to be run.
 *
 * Commands requiring a regex match are defined here for now.
 * Consider moving them to a separate module if it grows too much.
 */
exports.exec_command = function(bot, channelID, message, user){

    // Ignore self-messages.
    if (user == 'plat-bot') return;

    var auth_level = auth.authenticate(channelID);
    if (auth_level <= 0) return;

    // Parse command syntax.
    message = message.toLowerCase();

    var platregex = /([0-9]+)( )?(p|plat|platinum)(\.| |$)/g;
    var goodbotregex = /(^| )good bot($| )/g;
    var badbotregex = /(^| )bad bot($| )/g;

    var platmatch = platregex.exec(message);
    var goodbotmatch = goodbotregex.exec(message);
    var badbotmatch = badbotregex.exec(message);


    if (auth_level >= 2 && message.substring(0, 2) == '!!'){
        admin_commands_menu(bot, channelID, message);
    } else if (message[0] == '!'){
        commands_menu(bot, channelID, user, message);
    } else if (platmatch != null){
        cmds.plat_conversion(bot, channelID, message, platmatch);
    } else if (goodbotmatch != null){
        bot.sendMessage({
            to: channelID,
            message:":blush:"
        });
    } else if (badbotmatch != null){
        bot.sendMessage({
            to: channelID,
            message:":cry:"
        });
    }
}

