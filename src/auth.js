var fs = require('fs');
var utils = require('./utils.js');

/**
 * auth.js
 *
 * Gets which channels are authorized for the bot to listen to.
 * Also determines which channels are to be authorized as admin.
 *
 * REFACTOR NOTICE: Turn into auth object instead of a global thing!
 */

/**
 * Gets the authorized channels.
 * Currently can only whitelist entire servers for general channels.
 *
 */
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

/**
 * Reads the auth configuration file, gets the valid channels and admin channels.
 *
 * auth_config.json:
 *
 * {
 *    "servers": ["serverID"],
 *    "admin_channels": ["channelID"] | "*"
 * }
 * Set admin_channels to "*" for all channels to have admin access.
 *
 */
exports.init_auth = function(bot){
    var auth_config = utils.load_json('config.json');

    channels = get_channels_from_servers(bot, auth_config['servers']);
    admin_channels = auth_config['admin_channels'];

    console.log("Channels:");
    console.log(channels);
    console.log("Admin channels:");
    console.log(admin_channels);

    initialized = true;

    console.log("Authentication initialized.")
}

/**
 * Returns an int based on authentication level.
 * 0: Not authorized
 * 1: General authorization
 * 2: Admin
 */
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