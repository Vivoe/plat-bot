var request = require('request')

var utils = require('./utils.js');
var relic_table_builder = require('./build_relic_tables.js');

var exec = require('child_process').exec;

/**
 * commands.js
 *
 * Contains all the functions for the commands after primary parsing.
 *
 * Consider separating this into separate files (command, admin_command, etc)
 *
 */

/*
 * Admin commands.
 */

 // Sets the price of a given part.
exports.set_price = function(tokens){
    var item = tokens[1];
    var itemid = utils.to_itemid(item);
    var price = parseInt(tokens[2]);

    var pricemods = utils.load_json(utils.path.pricemods);

    if (itemid in pricemods){
        pricemods[itemid]['price'] = price;
    } else {
        pricemods[itemid] = {'price': price};
    }

    utils.save_json(utils.path.pricemods, pricemods);
}

// Sets the price multiplier for a given part.
exports.set_mult = function(tokens){
    var item = tokens[1];
    var itemid = utils.to_itemid(item);
    var mult = parseFloat(tokens[2]);

    var pricemods = utils.load_json(utils.path.pricemods);

    if (itemid in pricemods){
        pricemods[itemid]['mult'] = mult;
    } else {
        pricemods[itemid] = {'mult': mult};
    }

    utils.save_json(utils.path.pricemods, pricemods);
}

// Lists the price modifications.
exports.list_pricemods = function(bot, channelID){
    var pricemods = utils.load_pricemods();
    bot.sendMessage({
        to: channelID,
        message: JSON.stringify(pricemods, null, 4)
    });
}

// Resets all price modifications.
exports.reset_pricemods = function(bot, channelID){
    utils.save_json(utils.path.pricemods, {});
    bot.sendMessage({
        to: channelID,
        message: "Price mods reset."
    });
}

// Restarts the bot server.
// Should update to master verion on GitHub.
exports.restart = function(bot, channelID){
    bot.sendMessage({
        to: channelID,
        message: "Restarting bot."
    }, function(){
        console.log("Restarting...");
        exec('./log_run_bot ' + channelID);
    });
}

exports.get_host_url = function(bot, channelID){
    var config = utils.load_json('config.json');

    if (config.host){
        exec('./get_aws_addr ' + config.host, function(err, stdout, stderr){
            var url = stdout.trim();
            if (url == "null"){
                bot.sendMessage({
                    to: channelID,
                    message: "Error: Host name misconfigured."
                });
            } else {
                bot.sendMessage({
                    to: channelID,
                    message: stdout.trim()
                });
            }
        });
    } else {
        bot.sendMessage({
            to: channelID,
            message: "AWS host not configured."
        });
    }

}

/*
 * Public commands.
 */

 // Gets void trader info.
exports.void_trader = function(bot, channelID){
    var traderurl = 'http://deathsnacks.com/wf/data/voidtraders.json';
    request(traderurl, function(error, response, body){
        var traderdata = JSON.parse(body)[0];

        var ctime = Math.floor(Date.now() / 1000);

        var timestring = utils.format_seconds(traderdata['Activation']['sec'] - ctime);

        bot.sendMessage({
            to: channelID,
            message: 'Void trader info:\n' +
                traderdata['Character'] + ' @ ' +
                traderdata['Node'] + ' in ' +
                timestring + '.'
        });
    });
}

// Updates cached relic info.
exports.update_relics = function(bot, channelID){
    relic_table_builder.update_relic_info();
    bot.sendMessage({
        to: channelID,
        message: 'Relic tables updated.'
    });
}

// Lists all currently active relics.
exports.list_relics = function(bot, channelID){
    var relics_table = utils.load_json(utils.path.relic_table);
    var relics = Object.keys(relics_table);

    bot.sendMessage({
        to: channelID,
        message: 'Currently droppable relics:\n' +
            relics.join('\n')
    });
}

// Adds a part to the wanted list.
exports.addpart = function(bot, channelID, userID, message){
    var item = utils.tokenize(message)[1];
    var item_id = utils.to_itemid(item);

    var user = bot.users[userID].username

    // Validate part name.
    var url = 'https://api.warframe.market/v1/items/' +
        item_id + '/orders?include=item';

    request(url, function(error, response, body){
        try {

            // Not a part if JSON is invalid.
            JSON.parse(body);

            // If the part drops from an active relic, list them.
            var parts_table = utils.load_json(utils.path.parts_table);
            var drop_relic_list = null;
            if (item_id in parts_table){
                drop_relic_list = parts_table[item_id];
            }

            var new_item = {
                'item_id': item_id,
                'user': user,
                'userID': userID,
                'drop_list': drop_relic_list
            };

            // Save to wanted list file.
            var wanted_list = utils.load_json(utils.path.wanted_list);
            wanted_list.push(new_item);
            utils.save_json(utils.path.wanted_list, wanted_list);

            bot.sendMessage({
                to: channelID,
                message: 'Adding ' + item_id + ' to wanted list for ' + user + '.'
            });

        } catch (err) {
            console.log("Bad item id.");
            bot.sendMessage({
                to: channelID,
                message: 'Bad item name "' + item + '".'
            });
        }
    });
}

// Removes a part from the wanted list.
// Only remove if the user who added it removes it.
exports.removepart = function(bot, channelID, userID, message){
    var item = utils.tokenize(message)[1];
    var item_id = utils.to_itemid(item);

    var user = bot.users[userID].username

    var wanted_list = utils.load_json(utils.path.wanted_list);
    var drop_idx = wanted_list.findIndex(function(want){
        return ((want.userID == userID) && (want.item_id == item_id));
    });

    if (drop_idx < 0){
        bot.sendMessage({
            to: channelID,
            message: "Could not find entry for part " +
            item_id + " for user " + user + "."
        });
        return;
    }

    // Remove and save.
    wanted_list.splice(drop_idx, 1);
    utils.save_json(utils.path.wanted_list, wanted_list);

    bot.sendMessage({
        to: channelID,
        message: "Removed entry for part " +
            item_id + " for user " + user + "."
    });
}

// Print out the wanted list.
// -t for time based sorting, -u for user, default sorting by part.
exports.list_wanted = function(bot, channelID, message){

    var tokens = utils.tokenize(message);
    var args = require('minimist')(tokens);
    console.log(args);

    // Sorting methods for the list.
    var wanted_list = utils.load_json(utils.path.wanted_list);
    var strcmp = function(a, b){
        if (a < b){
            return -1;
        } else if (a > b){
            return 1;
        } else {
            return 0;
        }
    }

    if (!('t' in args)){
        wanted_list.sort(function(a, b){
            if (args.u){
                return strcmp(a.user, b.user);
            } else {
                return strcmp(a.item_id, b.item_id);
            }
        });
    }

            bot.sendMessage({
            to: channelID,
            message: 'Wanted list:\n'
        });

    for (var iter = 0; iter < Math.ceil(wanted_list.length / 10); iter++){
        var sub_wanted_list = wanted_list.slice(iter * 10, (iter + 1) * 10);

        // Formatting and spacing for prettyprinting.
        var user_tab = Math.max(10,
            Math.max.apply(null, sub_wanted_list.map((x) => x.user.length)) + 5);
        var item_tab = Math.max(10,
            Math.max.apply(null, sub_wanted_list.map((x) => x.item_id.length)) + 5);

        var drop_strings = sub_wanted_list.map((x) => {
            if (Array.isArray(x.drop_list)){
                return x.drop_list.join(', ');
            } else {
                return '';
            }
        });
        var drop_tab = Math.max.apply(null, drop_strings.map((x) => x.length )) + 5;

        drop_tab = Math.max(20, drop_tab);

        var tablestr = '';
        for (var i = 0; i < sub_wanted_list.length; i++){
            var want = sub_wanted_list[i];

            tablestr +=
                want['item_id'].pad(item_tab) + '| ' +
                want['user'].pad(user_tab) + '| ' +
                drop_strings[i].pad(drop_tab) + '\n';
        }

        bot.sendMessage({
            to: channelID,
            message: '```' +
            'Part'.pad(item_tab) + '| ' +
            'User'.pad(user_tab) + '| ' +
            'Drop location\n' +
            '-'.repeat(user_tab + item_tab + drop_tab) + '\n' +
            tablestr + '```'
        });
    }
}


/*
 * Special syntax commands.
 * Executed from primary menu.
 */
exports.plat_conversion = function(bot, channelID, message, platmatch){
    console.log("plat conversion.");

    var cad = parseInt(platmatch[1]) * (5.49/75.0);

    bot.sendMessage({
        to: channelID,
        message: 'Aka $' + cad.toFixed(2) + '.'
    });
}

// Gets relic information.
exports.relic_info = function(bot, channelID, message){
    console.log("Relic")
    console.log('MESSAGE: ' + message);

    var tokens = utils.tokenize(message);
    var args = require('minimist')(tokens);

    console.log(args);
    if (args['_'].length != 2){
        bot.sendMessage({
            to: channelID,
            message: "Invalid syntax for command !relic."
        });
        return;
    }

    // Parse out relic name.
    var relic_args = args['_'][1].split(' ');

    var era = relic_args[0].capitalize();
    var type = relic_args[1].capitalize();
    var relicname = era + ' ' + type;

    var relic_table = utils.load_json(utils.path.relic_table);

    // Confirm command, validate that it's currently dropping/is cached.
    if (!(relicname in relic_table)){
        bot.sendMessage({
            to: channelID,
            message: "Relic " + relicname + " not found."
        });
        return;
    }

    // Print relic drops.
    var drops = relic_table[relicname]['drops'];


    bot.sendMessage({
        to: channelID,
        message: 'Drops for relic ' + relicname + ':\n' + '```' +
            'Common:\n' +
            '\t' + drops[0] + '\n' +
            '\t' + drops[1] + '\n' +
            '\t' + drops[2] + '\n' +
            'Uncommon:\n' +
            '\t' + drops[3] + '\n' +
            '\t' + drops[4] + '\n' +
            'Rare:\n' +
            '\t' + drops[5] + '\n' + '```'
    });

    // Print relic locations
    var locs = relic_table[relicname]['drop_locations'];

    if (args['c']){
        locs = locs.sort(function(a, b){
            var a_chance = parseFloat(a['chance'].substring(0, a['chance'].length - 1));
            var b_chance = parseFloat(b['chance'].substring(0, a['chance'].length - 1));
            return (a_chance - b_chance);
        });
    }

    // Prettyprinting
    var tablestr = '';
    for (var i = 0; i < locs.length; i++){
        var loc = locs[i];

        tablestr +=
            loc['mission_type'].pad(17) + '| ' +
            loc['tier'].pad(17) + '| ' +
            loc['rotation'].pad(9) + '| ' +
            loc['chance'].pad(10) + '\n'
    }


    bot.sendMessage({
        to: channelID,
        message: relicname + ' drop locations:\n' + '```' +
        'Mission type     | Category         | Rotation | Chance\n' +
        '-------------------------------------------------------\n' +
        tablestr + '```'
    });
}

// Get information for parts.
exports.parts_info = function(bot, channelID, message){
    console.log("Part price");
    console.log('MESSAGE: ' + message);

    // Parsing part name.
    var tokens = utils.tokenize(message);
    if (tokens.length != 2){
        bot.sendMessage({
            to: channelID,
            message: "Invalid syntax for command !part."
        });
    }
    var item = tokens[1];

    var item_id = utils.to_itemid(item);
    console.log("Item: " + item);
    console.log("Item ID: " + item_id);

    // Get link to relics if possible.
    var parts_table = utils.load_json(utils.path.parts_table);
    if (item_id in parts_table){
        bot.sendMessage({
            to: channelID,
            message: 'Item ' + item +
                ' is dropped by ' +
                parts_table[item_id].join(', ') + '.'
        });
    }


    // Scamming functionality: Set price
    var pricemods = utils.load_json(utils.path.pricemods);

    if (item_id in pricemods && 'price' in pricemods[item_id]){
        var price = pricemods[item_id]['price'];
        bot.sendMessage({
            to: channelID,
            message: 'Market price for ' +
                item + ': ' + price + ' plat.'
        });

    } else {

        var url = 'https://api.warframe.market/v1/items/' + item_id + '/orders?include=item';

        request(url, function(error, response, body){
            try {
                // This will error if the part is not a valid part.
                // Error is caught below and an error message is printed.
                var json = JSON.parse(body);

                var prices = json['payload']['orders'].map((obj) => obj['platinum']);

                // Scamming: Set price multiplier
                var mult = 1;
                if (item_id in pricemods && 'mult' in pricemods[item_id]){
                    mult = pricemods[item_id]['mult'];
                }

                // Use median price.
                var price = Math.round(utils.median(prices) * mult);
                bot.sendMessage({
                    to: channelID,
                    message: 'Market price for ' +
                        item + ': ' + price + ' plat.'
                });


            } catch (err) {
                console.log("Bad item id.");
                bot.sendMessage({
                    to: channelID,
                    message: 'Bad item name "' + item + '".'
                });
            }
        });
    }
}