var fs = require('fs');

get_channels_from_servers = function(bot, servers){
    var channels = []

    for (channelID in bot.channels){
        var channel = bot.channels[channelID];

        if ([0,1,3].indexOf(channel.type) >= 0 &&
            servers.indexOf(channel.guild_id) >= 0){

            channels.push(channelID);
        }
    }

    return channels;
}

var channels = undefined;
var admin_channels = undefined;
var initialized = false;

exports.init_auth = function(bot){
    var auth_config = require('./../data/auth_config.json');

    channels = get_channels_from_servers(bot, auth_config['servers']);
    admin_channels = auth_config['admin_channels'];

    console.log("Channels:");
    console.log(channels);
    console.log("Admin channels:");
    console.log(admin_channels);

    initialized = true;

    console.log("Authentication initialized.")
}

exports.authenticate = function(channelID){

    if (!initialized) throw "Auth not initialized!";

    if (admin_channels === '*' || admin_channels.indexOf(channelID) >= 0){
        return 2;
    } else if (channels.indexOf(channelID) >= 0){
        return 1;
    } else {
        return 0;
    }
}