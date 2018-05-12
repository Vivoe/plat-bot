var Discord = require('discord.io');
var auth = require('./auth.json');
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

var utils = require('./src/utils.js');
var relic_table_builder = require('./src/build_relic_tables.js');

// Helper functions.
function load_admin_channels(){
    var admin_channels = 
        fs.readFileSync('data/admin_channels.txt', 'utf8')
        .split('\n').filter((x) => x != '');
    return admin_channels;
}

function load_pricemods(){

    if (!fs.existsSync('data/pricemods.json')){
        fs.writeFileSync('data/pricemods.json', '{}', 'utf8');
        return {};
    }

    var pricemods = JSON.parse(fs.readFileSync('data/pricemods.json', 'utf8'));
    return pricemods;
}

function save_pricemods(pricemods){
    fs.writeFileSync('data/pricemods.json', JSON.stringify(pricemods) + '\n', 'utf8');
}

function load_relics_table(){
    if (!fs.existsSync('data/relic_table.json')){
        relic_table_builder.update_relic_info();
    }

    var relic_table = JSON.parse(fs.readFileSync('data/relic_table.json'));

    return relic_table;
}

function load_parts_table(){
    if (!fs.existsSync('data/parts_table.json')){
        relic_table_builder.update_relic_info();
    }

    var parts_table = JSON.parse(fs.readFileSync('data/parts_table.json'));

    return parts_table;
}

var admin_only = false;


// Create bot.
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

console.log("Bot started.");

// Logging initialization.
bot.on('ready', function(evt){
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(bot.username + ' - (' + bot.id + ')');
});


// Bot actions.
bot.on('message', function(user, userID, channelID, message, evt){

    if (user == 'plat-bot'){
        return;
    }
 

    var channel_name = bot.channels[channelID]['name'];
    var admin_channels = load_admin_channels();

    if (admin_only && admin_channels.indexOf(channel_name) == -1){
        console.log('Ignoring command from channel ' + channel_name);
        return;
    }

    message = message.toLowerCase();

    var platregex = /([0-9]+)( )?(p|plat|platinum)/g;
    var partregex = /{(.*)}/g;
    var relicregex = /{(lith|meso|neo|axi) ([a-z][0-9])}/g;

    var platmatch = platregex.exec(message);
    var partmatch = partregex.exec(message);
    var relicmatch = relicregex.exec(message);
    
    // Admin commands.
    if (message.substring(0, 2) == '!!'){
        console.log("Admin command");
        console.log('MESSAGE: ' + message);
        // Authenticating channel.
        var channel_name = bot.channels[channelID]['name'];
        var admin_channels = load_admin_channels();
        console.log(admin_channels);

        if (admin_channels.indexOf(channel_name) == -1){
            console.log('Ignoring command from channel ' + channel_name);
            return
        }

        var tokens = message.split(' ');
        
        if (tokens[0] == '!!help'){
            bot.sendMessage({
                to: channelID,
                message:
                    'Privileged command list:\n' +
                    '!!setprice itemid price\n' +
                    '!!setmult itemid mult\n' +
                    '!!listpricemods\n' +
                    '!!adminonly\n'
            });
        } else if (tokens[0] == '!!setprice'){
            var item = tokens[1];
            var itemid = utils.to_itemid(item);
            var price = parseInt(tokens[2]);

            var pricemods = load_pricemods();

            if (itemid in pricemods){
                pricemods[itemid]['price'] = price;
            } else {
                pricemods[itemid] = {'price': price};
            }

            save_pricemods(pricemods);

        } else if (tokens[0] == '!!setmult'){
            var item = tokens[1];
            var itemid = utils.to_itemid(item);
            var mult = parseFloat(tokens[2]);

            var pricemods = load_pricemods();

            if (itemid in pricemods){
                pricemods[itemid]['mult'] = mult;
            } else {
                pricemods[itemid] = {'mult': mult};
            }

            save_pricemods(pricemods);

        } else if (tokens[0] == '!!listpricemods'){
            var pricemods = load_pricemods();
            bot.sendMessage({
                to: channelID,
                message: JSON.stringify(pricemods, null, 2)
            });
        } else if (tokens[0] == '!!adminonly'){
            admin_only = !admin_only;
            console.log(admin_only);
            bot.sendMessage({
                to: channelID,
                message: 'Bot set adminonly to ' + admin_only + '.'
            });
        } else {
            bot.sendMessage({
                to: channelID,
                message: "Unknown command " + tokens[0] + '.'
            });
        }

    // Public commands.
    } else if (message[0] == '!'){
        console.log("Public command.");
        console.log('MESSAGE: ' + message);
        var tokens = message.split(' ');

        if (tokens[0] == '!help'){
            bot.sendMessage({
                to: channelID,
                message:
                    'Command list:\n' + 
                    '!voidtrader\n' +
                    '!updaterelics\n' +
                    '!listrelics\n'
            });
        } else if (tokens[0] == '!voidtrader'){
            
            var traderurl = 'http://deathsnacks.com/wf/data/voidtraders.json';
            request(traderurl, function(error, response, body){
                var traderdata = JSON.parse(body)[0];
                console.log(traderdata);

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
        } else if (tokens[0] == '!updaterelics'){
           relic_table_builder.update_relic_info(function(){
              bot.sendMessage({
                  to: channelID,
                  message: 'Relic tables updated.'
              });
           });
        } else if (tokens[0] == '!listrelics'){
            var relics_table = load_relics_table();
            var relics = Object.keys(relics_table);
            
            bot.sendMessage({
                to: channelID,
                message: 'Currently droppable relics:\n' +
                    relics.join('\n')
            });
        } else {
            bot.sendMessage({
                to: channelID,
                message: 'Unknown command ' + tokens[0] + '.'
            });
        }

    // Plat to CAD conversion.
    } else if (platmatch != null){
        console.log("plat conversion.");

        var cad = parseInt(platmatch[1]) * (5.49/75.0);

        bot.sendMessage({
            to: channelID,
            message: 'Aka $' + cad.toFixed(2) + '.'
        });


    // Relic drops/location.
    } else if (relicmatch != null){
        console.log("Relic")
        console.log('MESSAGE: ' + message);
        var era = relicmatch[1].capitalize();
        var type = relicmatch[2].capitalize();
        var relicname = era + ' ' + type;

        var relic_table = load_relics_table();
        var drops = relic_table[relicname]['drops']; 
        var locs = relic_table[relicname]['drop_locations'];

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
        var tablestr = '';
        var locmatches = null;
 
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

    // Market price
    } else if (partmatch != null){
        console.log("Part price");
        console.log('MESSAGE: ' + message);

        var item = partmatch[1];
        var item_id = utils.to_itemid(item);
        console.log("Item: " + item);
        console.log("Item ID: " + item_id);
        
        // Get link to relics if possible.
        var parts_table = load_parts_table();
        if (item_id in parts_table){
            bot.sendMessage({
                to: channelID,
                message: 'Item ' + item + 
                    ' is dropped by ' + 
                    parts_table[item_id].join(', ') + '.'
            });
        }


        // Scamming functionality.
        var pricemods = load_pricemods();

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
    } else {
        console.log("Not bot command.");
    }

});

