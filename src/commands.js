var request = require('request')

var utils = require('./utils.js');
var relic_table_builder = require('./build_relic_tables.js');

/*
 * Admin commands.
 */
exports.admin_help = function(bot, channelID){
    bot.sendMessage({
        to: channelID,
        message:
            'Privileged command list:\n' +
            '!!setprice itemid price\n' +
            '!!setmult itemid mult\n' +
            '!!listpricemods\n' +
            '!!resetpricemods\n'
    });
}

exports.set_price = function(tokens){
    var item = tokens[1];
    var itemid = utils.to_itemid(item);
    var price = parseInt(tokens[2]);

    var pricemods = utils.load_pricemods();

    if (itemid in pricemods){
        pricemods[itemid]['price'] = price;
    } else {
        pricemods[itemid] = {'price': price};
    }

    utils.save_pricemods(pricemods);
}

exports.set_mult = function(tokens){
    var item = tokens[1];
    var itemid = utils.to_itemid(item);
    var mult = parseFloat(tokens[2]);

    var pricemods = utils.load_pricemods();

    if (itemid in pricemods){
        pricemods[itemid]['mult'] = mult;
    } else {
        pricemods[itemid] = {'mult': mult};
    }

    utils.save_pricemods(pricemods);
}

exports.list_pricemods = function(bot, channelID){
    var pricemods = utils.load_pricemods();
    bot.sendMessage({
        to: channelID,
        message: JSON.stringify(pricemods, null, 4)
    });
}

exports.reset_pricemods = function(bot, channelID){
    utils.save_pricemods({});
    bot.sendMessage({
        to: channelID,
        message: "Price mods reset."
    });
}

/*
 * Public commands.
 */
exports.help = function(bot, channelID){
    bot.sendMessage({
        to: channelID,
        message:
            'Command list:\n' +
            '!voidtrader\n' +
            '!updaterelics\n' +
            '!listrelics\n' +
            '!relic "relic name" [-c]' +
            '!part "part name"'
    });
}

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

exports.update_relics = function(bot, channelID){
    relic_table_builder.update_relic_info(function(){
        bot.sendMessage({
            to: channelID,
            message: 'Relic tables updated.'
        });
    });
}

exports.list_relics = function(bot, channelID){
    var relics_table = utils.load_relics_table();
    var relics = Object.keys(relics_table);

    bot.sendMessage({
        to: channelID,
        message: 'Currently droppable relics:\n' +
            relics.join('\n')
    });
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

    var relic_args = args['_'][1]
        .substring(1, args['_'][1].length - 1)
        .split(' ');

    var era = relic_args[0].capitalize();
    var type = relic_args[1].capitalize();
    var relicname = era + ' ' + type;

    var relic_table = utils.load_relics_table();

    if (!(relicname in relic_table)){
        bot.sendMessage({
            to: channelID,
            message: "Relic " + relicname + " not found."
        });
        return;
    }

    var drops = relic_table[relicname]['drops'];

    // Relic drops
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

    // Relic locations
    var locs = relic_table[relicname]['drop_locations'];

    if (args['c']){
        locs = locs.sort(function(a, b){
            var a_chance = parseFloat(a['chance'].substring(0, a['chance'].length - 1));
            var b_chance = parseFloat(b['chance'].substring(0, a['chance'].length - 1));
            return (a_chance - b_chance);
        });
    }

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

exports.parts_info = function(bot, channelID, message){
    console.log("Part price");
    console.log('MESSAGE: ' + message);

    var tokens = utils.tokenize(message);
    if (tokens.length != 2){
        bot.sendMessage({
            to: channelID,
            message: "Invalid syntax for command !part."
        });
    }
    var item = tokens[1].substring(1, tokens[1].length - 1);

    var item_id = utils.to_itemid(item);
    console.log("Item: " + item);
    console.log("Item ID: " + item_id);

    // Get link to relics if possible.
    var parts_table = utils.load_parts_table();
    if (item_id in parts_table){
        bot.sendMessage({
            to: channelID,
            message: 'Item ' + item +
                ' is dropped by ' +
                parts_table[item_id].join(', ') + '.'
        });
    }


    // Scamming functionality.
    var pricemods = utils.load_pricemods();

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
                var json = JSON.parse(body);

                var prices = json['payload']['orders'].map((obj) => obj['platinum']);

                var mult = 1;
                if (item_id in pricemods && 'mult' in pricemods[item_id]){
                    mult = pricemods[item_id]['mult'];
                }

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
                    message: 'Bad item name ' + item + '.'
                });
            }
        });
    }
}